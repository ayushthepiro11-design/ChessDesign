/**
 * @fileoverview Network resilience infrastructure and profile/game validation schemas.
 * Includes concurrency-controlled RequestQueue, PersistentCache managers,
 * retry-with-backoff fetch engines, and dynamic monthly crawl utilities.
 */

import { COUNTRY_NAMES } from './api.js'

/* ----------------------------------------------------------------------------
 * 1. Storage & Memory Fallbacks
 * ---------------------------------------------------------------------------- */

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    const keys = Array.from(this.store.keys());
    return keys[index] !== undefined ? keys[index] : null;
  }
  getItem(key) {
    const k = String(key);
    return this.store.has(k) ? this.store.get(k) : null;
  }
  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
  removeItem(key) {
    this.store.delete(String(key));
  }
  clear() {
    this.store.clear();
  }
}

/* ----------------------------------------------------------------------------
 * 2. Custom Errors & Normalization
 * ---------------------------------------------------------------------------- */

/**
 * Custom error class representing API resilience and network failures.
 */
export class ChessResilienceError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ChessResilienceError';
    this.code = options.code || 'API_ERROR';
    this.status = options.status || null;
    this.platform = options.platform || 'unknown';
    this.raw = options.raw || null;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}



/**
 * Normalizes diverse HTTP and network errors into standard ChessResilienceError shapes.
 *
 * @param {any} error - Raw error object, Response, or string.
 * @param {string} platform - Target platform (e.g. 'chess.com', 'lichess').
 * @param {string} username - User account identifier.
 * @returns {Promise<ChessResilienceError>} The normalized error instance.
 */
export async function normalizeError(error, platform, username) {
  const cleanPlatform = (platform || 'unknown').toLowerCase();
  const cleanUsername = (username || '').trim();

  if (error instanceof Response || (error && typeof error.text === 'function')) {
    const status = error.status;
    let bodyText = '';
    let bodyJson = null;

    try {
      bodyText = await error.text();
      bodyJson = JSON.parse(bodyText);
    } catch (e) {
      bodyJson = null;
    }

    let message = `Failed to fetch data from ${platform} (HTTP Status ${status})`;
    let code = 'API_ERROR';

    if (cleanPlatform === 'chess.com') {
      if (status === 404) {
        code = 'USER_NOT_FOUND';
        message = `Chess.com user "${cleanUsername}" was not found.`;
      } else if (status === 410) {
        code = 'ACCOUNT_CLOSED';
        message = `Chess.com account for "${cleanUsername}" is closed.`;
      } else if (status === 429) {
        code = 'RATE_LIMITED';
        message = 'Chess.com rate limit exceeded. Please wait a few minutes and try again.';
      } else if (bodyJson && bodyJson.message) {
        const msg = bodyJson.message.toLowerCase();
        if (msg.includes('inactive') || msg.includes('closed') || msg.includes('fair-play') || msg.includes('abuse')) {
          code = 'ACCOUNT_CLOSED';
          message = `Chess.com account for "${cleanUsername}" is inactive or closed.`;
        } else {
          message = bodyJson.message;
        }
      }
    } else if (cleanPlatform === 'lichess') {
      if (status === 404) {
        code = 'USER_NOT_FOUND';
        message = `Lichess user "${cleanUsername}" was not found.`;
        if (bodyJson && bodyJson.error) {
          const errStr = bodyJson.error.toLowerCase();
          if (errStr.includes('closed') || errStr.includes('disabled')) {
            code = 'ACCOUNT_CLOSED';
            message = `Lichess account for "${cleanUsername}" is closed.`;
          }
        }
      } else if (status === 410) {
        code = 'ACCOUNT_CLOSED';
        message = `Lichess account for "${cleanUsername}" is closed.`;
      } else if (status === 429) {
        code = 'RATE_LIMITED';
        message = 'Lichess rate limit exceeded. Please wait a minute and try again.';
      } else if (bodyJson && bodyJson.error) {
        message = bodyJson.error;
        const errStr = bodyJson.error.toLowerCase();
        if (errStr.includes('closed') || errStr.includes('disabled')) {
          code = 'ACCOUNT_CLOSED';
          message = `Lichess account for "${cleanUsername}" is closed.`;
        }
      }
    }

    return new ChessResilienceError(message, {
      code,
      status,
      platform: cleanPlatform,
      raw: bodyJson || bodyText || error,
    });
  }

  if (error instanceof DOMException || (error && (error.name === 'AbortError' || error.name === 'TimeoutError'))) {
    if (error.name === 'TimeoutError' || error.message?.toLowerCase().includes('timeout') || error.message?.toLowerCase().includes('timed out')) {
      return new ChessResilienceError(`Request to ${platform} timed out. The operation exceeded the 10-second limit.`, {
        code: 'TIMEOUT',
        platform: cleanPlatform,
        raw: error,
      });
    }
    return new ChessResilienceError(`Request to ${platform} was aborted by the application.`, {
      code: 'ABORTED',
      platform: cleanPlatform,
      raw: error,
    });
  }

  if (error instanceof Error) {
    const errorMsg = error.message || '';
    const isNetwork = errorMsg.toLowerCase().includes('network') ||
                      errorMsg.toLowerCase().includes('failed to fetch') ||
                      errorMsg.toLowerCase().includes('dns') ||
                      error.code === 'ENOTFOUND' ||
                      error.code === 'ECONNREFUSED';

    return new ChessResilienceError(errorMsg || `An unexpected network error occurred on ${platform}.`, {
      code: isNetwork ? 'NETWORK_ERROR' : 'API_ERROR',
      platform: cleanPlatform,
      raw: error,
    });
  }

  return new ChessResilienceError(String(error || 'An unknown error occurred.'), {
    code: 'UNKNOWN',
    platform: cleanPlatform,
    raw: error,
  });
}

/* ----------------------------------------------------------------------------
 * 3. Concurrency Queuing
 * ---------------------------------------------------------------------------- */

/**
 * Orchestrates tasks in a concurrency-limited execution queue.
 * Adds artificial spacing between requests to minimize API rate limit bans.
 */
export class RequestQueue {
  constructor(options = {}) {
    this.maxConcurrency = typeof options.maxConcurrency === 'number' ? options.maxConcurrency : 3;
    this.minDelay = typeof options.minDelay === 'number' ? options.minDelay : 100;
    
    if (this.maxConcurrency < 1) {
      throw new Error('maxConcurrency must be at least 1');
    }
    if (this.minDelay < 0) {
      throw new Error('minDelay cannot be negative');
    }

    this._queue = [];
    this._activeCount = 0;
    this._lastStartTime = 0;
    this._timer = null;
    this._isPaused = false;
  }

  add(task) {
    if (typeof task !== 'function') {
      return Promise.reject(new TypeError('Task must be a function'));
    }
    return new Promise((resolve, reject) => {
      this._queue.push({ task, resolve, reject });
      this._process();
    });
  }

  addMany(tasks) {
    if (!Array.isArray(tasks)) {
      return Promise.reject(new TypeError('Tasks must be an array'));
    }
    return Promise.all(tasks.map(task => this.add(task)));
  }

  pause() {
    this._isPaused = true;
  }

  resume() {
    if (this._isPaused) {
      this._isPaused = false;
      this._process();
    }
  }

  clear(reason = new Error('Queue cleared')) {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    const currentQueue = this._queue;
    this._queue = [];
    for (const item of currentQueue) {
      item.reject(reason);
    }
  }

  get size() {
    return this._queue.length;
  }

  get activeCount() {
    return this._activeCount;
  }

  get isPaused() {
    return this._isPaused;
  }

  _process() {
    if (this._isPaused) return;

    while (
      this._queue.length > 0 &&
      this._activeCount < this.maxConcurrency &&
      !this._timer
    ) {
      const now = Date.now();
      const timeSinceLastStart = now - this._lastStartTime;
      const timeToWait = Math.max(0, this.minDelay - timeSinceLastStart);

      if (timeToWait > 0) {
        this._timer = setTimeout(() => {
          this._timer = null;
          this._process();
        }, timeToWait);
        break;
      }

      const { task, resolve, reject } = this._queue.shift();
      this._activeCount++;
      this._lastStartTime = Date.now();

      Promise.resolve()
        .then(() => task())
        .then(resolve, reject)
        .finally(() => {
          this._activeCount--;
          this._process();
        });
    }
  }
}

/* ----------------------------------------------------------------------------
 * 4. Persistent Cache Manager
 * ---------------------------------------------------------------------------- */

/**
 * Manages key-value serialization for network caches.
 * Integrates storage fallback to memory if local storage is disabled.
 */
export class PersistentCache {
  constructor(options = {}) {
    this.options = {
      storageType: 'local',
      ttl: 5 * 60 * 1000, // 5 minutes TTL
      prefix: 'pcache_',
      maxEntries: Infinity,
      ...options
    };

    this.prefix = this.options.prefix;
    this.inFlight = new Map();
    this.memoryFallback = new Map();
    this.storage = this._initStorage(this.options.storageType);
  }

  _initStorage(type) {
    if (type === 'memory') {
      return new MemoryStorage();
    }
    const storageKey = type === 'session' ? 'sessionStorage' : 'localStorage';
    if (typeof window !== 'undefined' && window[storageKey]) {
      try {
        const storage = window[storageKey];
        const testKey = `__pcache_test_${Date.now()}`;
        storage.setItem(testKey, 'test');
        storage.removeItem(testKey);
        return storage;
      } catch (e) {
        console.warn(`PersistentCache: ${storageKey} is inaccessible. Falling back to memory.`);
      }
    }
    return new MemoryStorage();
  }

  normalizeKey(key) {
    if (key === null || key === undefined) return '';
    if (typeof Request !== 'undefined' && key instanceof Request) {
      return `${key.method.toUpperCase()}:${this._normalizeUrlOrString(key.url)}`;
    }
    if (typeof key === 'object') {
      return this._deterministicStringify(key);
    }
    if (typeof key === 'string') {
      return this._normalizeUrlOrString(key);
    }
    return String(key).trim();
  }

  _normalizeUrlOrString(str) {
    const trimmed = str.trim();
    if (/^(https?:\/\/|\/|\w)/i.test(trimmed)) {
      try {
        if (/^https?:\/\//i.test(trimmed)) {
          const url = new URL(trimmed);
          url.hostname = url.hostname.toLowerCase();
          url.searchParams.sort();
          return url.toString();
        } else {
          const url = new URL(trimmed, 'http://dummy.local');
          url.searchParams.sort();
          const relativePath = url.pathname + url.search + url.hash;
          return trimmed.startsWith('/') ? relativePath : relativePath.slice(1);
        }
      } catch (e) {
        return trimmed;
      }
    }
    return trimmed;
  }

  _deterministicStringify(obj, seen = new Set()) {
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (typeof obj !== 'object') return String(obj);
    if (obj instanceof Date) return obj.toISOString();
    if (obj instanceof RegExp) return obj.toString();
    if (seen.has(obj)) return '"[Circular]"';
    seen.add(obj);
    if (Array.isArray(obj)) {
      return '[' + obj.map(item => this._deterministicStringify(item, seen)).join(',') + ']';
    }
    const sortedKeys = Object.keys(obj).sort();
    const parts = sortedKeys.map(k => `"${k}":${this._deterministicStringify(obj[k], seen)}`);
    return '{' + parts.join(',') + '}';
  }

  _has(normKey) {
    const fullKey = this.prefix + normKey;
    let dataStr = this.storage.getItem(fullKey);
    if (dataStr === null) {
      dataStr = this.memoryFallback.get(fullKey) || null;
    }
    if (dataStr === null) return false;
    try {
      const envelope = JSON.parse(dataStr);
      if (envelope.expiresAt && Date.now() > envelope.expiresAt) {
        this._delete(normKey);
        return false;
      }
      return true;
    } catch (e) {
      this._delete(normKey);
      return false;
    }
  }

  _get(normKey) {
    const fullKey = this.prefix + normKey;
    let isFallback = false;
    let dataStr = this.storage.getItem(fullKey);
    if (dataStr === null) {
      dataStr = this.memoryFallback.get(fullKey) || null;
      isFallback = true;
    }
    if (dataStr === null) return undefined;
    try {
      const envelope = JSON.parse(dataStr);
      if (envelope.expiresAt && Date.now() > envelope.expiresAt) {
        this._delete(normKey);
        return undefined;
      }
      envelope.lastAccessed = Date.now();
      const updatedDataStr = JSON.stringify(envelope);
      if (isFallback) {
        this.memoryFallback.set(fullKey, updatedDataStr);
      } else {
        try {
          this.storage.setItem(fullKey, updatedDataStr);
        } catch (e) {
          this.memoryFallback.set(fullKey, updatedDataStr);
        }
      }
      return envelope.value;
    } catch (e) {
      this._delete(normKey);
      return undefined;
    }
  }

  _set(normKey, value, ttl) {
    const fullKey = this.prefix + normKey;
    const cacheTtl = ttl !== undefined ? ttl : this.options.ttl;
    const expiresAt = Date.now() + cacheTtl;
    const envelope = {
      value,
      hasValue: value !== undefined,
      expiresAt,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };
    const dataStr = JSON.stringify(envelope);
    try {
      this.storage.setItem(fullKey, dataStr);
    } catch (e) {
      this.memoryFallback.set(fullKey, dataStr);
    }
  }

  _delete(normKey) {
    const fullKey = this.prefix + normKey;
    try {
      this.storage.removeItem(fullKey);
    } catch (e) {
      this.memoryFallback.delete(fullKey);
      return;
    }
    this.memoryFallback.delete(fullKey);
  }

  has(key) {
    return this._has(this.normalizeKey(key));
  }

  get(key) {
    return this._get(this.normalizeKey(key));
  }

  set(key, value, ttl) {
    this._set(this.normalizeKey(key), value, ttl);
  }

  delete(key) {
    this._delete(this.normalizeKey(key));
  }

  clear() {
    const len = this.storage.length;
    const keys = [];
    for (let i = 0; i < len; i++) {
      const k = this.storage.key(i);
      if (k && k.startsWith(this.prefix)) keys.push(k);
    }
    for (const k of this.memoryFallback.keys()) {
      if (k.startsWith(this.prefix)) keys.push(k);
    }
    for (const fullKey of keys) {
      const normKey = fullKey.slice(this.prefix.length);
      this._delete(normKey);
    }
    this.inFlight.clear();
  }

  async getOrFetch(key, fetcherFn, ttl) {
    const normKey = this.normalizeKey(key);
    if (this._has(normKey)) {
      return this._get(normKey);
    }
    if (this.inFlight.has(normKey)) {
      return this.inFlight.get(normKey);
    }
    const fetchPromise = (async () => {
      try {
        const value = await fetcherFn();
        this._set(normKey, value, ttl);
        return value;
      } finally {
        this.inFlight.delete(normKey);
      }
    })();
    this.inFlight.set(normKey, fetchPromise);
    return fetchPromise;
  }
}

/* ----------------------------------------------------------------------------
 * 5. Network Resilient Fetching
 * ---------------------------------------------------------------------------- */



const sleep = (ms, signal) => {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      return reject(signal.reason || new DOMException('The user aborted the operation.', 'AbortError'));
    }
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(signal.reason || new DOMException('The user aborted the operation.', 'AbortError'));
    }
    if (signal) signal.addEventListener('abort', onAbort);
  });
};

function formatProxyUrl(proxy, targetUrl) {
  if (typeof proxy === 'function') return proxy(targetUrl);
  if (typeof proxy === 'string') {
    if (proxy.includes('{{encodedUrl}}')) return proxy.replace('{{encodedUrl}}', encodeURIComponent(targetUrl));
    if (proxy.includes('{{url}}')) return proxy.replace('{{url}}', encodeURIComponent(targetUrl));
    if (proxy.endsWith('?') || proxy.endsWith('=')) return proxy + encodeURIComponent(targetUrl);
    return proxy + (proxy.includes('?') ? '&url=' : '?url=') + encodeURIComponent(targetUrl);
  }
  throw new Error('Proxy must be a string template or a formatter function.');
}

async function unwrapProxyResponse(response, proxyUrl) {
  if (proxyUrl.includes('api.allorigins.win/get')) {
    try {
      const clone = response.clone();
      const data = await clone.json();
      if (data && 'contents' in data) {
        const headers = new Headers();
        if (data.status?.response_headers) {
          for (const [key, value] of Object.entries(data.status.response_headers)) {
            headers.set(key, value);
          }
        }
        return new Response(data.contents, {
          status: data.status?.http_code || response.status,
          statusText: 'OK',
          headers
        });
      }
    } catch (e) {
      return response;
    }
  }
  return response;
}

function getRetryAfterDelay(response) {
  const retryAfter = response.headers.get('retry-after');
  if (!retryAfter) return null;
  if (/^\d+$/.test(retryAfter)) {
    return parseInt(retryAfter, 10) * 1000;
  }
  const parsedDate = Date.parse(retryAfter);
  if (!isNaN(parsedDate)) {
    const delay = parsedDate - Date.now();
    return delay > 0 ? delay : 0;
  }
  return null;
}

const executeRequest = async (url, fetchOptions, timeout, userSignal) => {
  const controller = new AbortController();
  let timeoutId;
  let isTimedOut = false;
  const onUserAbort = () => controller.abort();
  if (userSignal) {
    if (userSignal.aborted) throw userSignal.reason || new DOMException('Aborted', 'AbortError');
    userSignal.addEventListener('abort', onUserAbort);
  }
  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, timeout);
  }
  try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
    return response;
  } catch (error) {
    if (userSignal && userSignal.aborted) throw userSignal.reason || error;
    if (isTimedOut) {
      const timeoutError = new Error(`Request timed out after ${timeout}ms`);
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (userSignal) userSignal.removeEventListener('abort', onUserAbort);
  }
};

/**
 * Orchestrates fetch requests with automatic jittered exponential backoff retries.
 * Falls back to proxy list sequentially upon remote platform request blocks.
 *
 * @param {string|URL} url - Remote API endpoint.
 * @param {Object} [options] - Custom retry options and fetch settings.
 * @returns {Promise<Response>} Resolves with the successful HTTP response.
 */
export async function fetchWithRetry(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null,
    timeout = 10000,
    signal = null,
    maxRetries = 3,
    initialDelay = 500,
    backoffFactor = 2,
    maxDelay = 10000,
    jitter = true,
    proxies = [],
    fallbackToProxies = true,
    retryOnProxyFailure = true,
    retryStatuses = [429, 500, 502, 503, 504],
    retryOnNetworkError = true,
    onRetry = null,
    ...restFetchOptions
  } = options;

  const fetchOptions = { method, headers, body, ...restFetchOptions };
  const stringUrl = url instanceof URL ? url.toString() : String(url);
  const urlsToTry = [{ url: stringUrl, isProxy: false }];

  if (fallbackToProxies && Array.isArray(proxies) && proxies.length > 0) {
    for (const p of proxies) {
      try {
        urlsToTry.push({
          url: formatProxyUrl(p, stringUrl),
          isProxy: true,
          originalProxyConfig: p
        });
      } catch (e) {
        continue
      }
    }
  }

  let lastError = null;
  let lastResponse = null;

  for (let uIdx = 0; uIdx < urlsToTry.length; uIdx++) {
    const { url: currentUrl, isProxy, originalProxyConfig } = urlsToTry[uIdx];
    const currentMaxRetries = (isProxy && !retryOnProxyFailure) ? 0 : maxRetries;

    for (let attempt = 0; attempt <= currentMaxRetries; attempt++) {
      try {
        lastResponse = await executeRequest(currentUrl, fetchOptions, timeout, signal);
        if (isProxy) {
          lastResponse = await unwrapProxyResponse(lastResponse, currentUrl);
        }
        if (!retryStatuses.includes(lastResponse.status)) {
          return lastResponse;
        }
        lastError = new Error(`Request failed with status code ${lastResponse.status}`);
        lastError.status = lastResponse.status;
        lastError.response = lastResponse;

        // Fast-failover: if rate limited or blocked on a direct connection,
        // immediately transition to proxies if any are configured.
        if ((lastResponse.status === 429 || lastResponse.status === 403) && !isProxy && urlsToTry.length > 1) {
          break;
        }
      } catch (error) {
        if (signal && signal.aborted) throw error;
        if (!retryOnNetworkError) throw error;
        lastError = error;
      }

      if (attempt < currentMaxRetries) {
        let delay = 0;
        if (lastResponse && (lastResponse.status === 429 || lastResponse.status === 503)) {
          const retryAfterDelay = getRetryAfterDelay(lastResponse);
          if (retryAfterDelay !== null) delay = retryAfterDelay;
        }
        if (delay <= 0) {
          const exponentialDelay = initialDelay * Math.pow(backoffFactor, attempt);
          const boundedDelay = Math.min(maxDelay, exponentialDelay);
          delay = jitter ? Math.random() * boundedDelay : boundedDelay;
        }
        if (typeof onRetry === 'function') {
          try {
            onRetry({
              attempt: attempt + 1,
              maxRetries: currentMaxRetries,
              error: lastError,
              delay,
              url: currentUrl,
              proxyUsed: isProxy,
              originalProxyConfig
            });
    } catch (e) {
      bodyJson = null;
    }
        }
        await sleep(delay, signal);
      }
    }
  }

  if (lastError) throw lastError;
  return lastResponse;
}

/* ----------------------------------------------------------------------------
 * 6. Schema Validation & Normalization
 * ---------------------------------------------------------------------------- */

/**
 * Validates raw profile structures and shapes them into a uniform profile.
 *
 * @param {Object} rawProfile - Raw payload from remote API.
 * @param {string} platform - 'chess.com' or 'lichess'.
 * @param {string} [requestedUsername] - Fallback user handle.
 * @returns {Object} Normalized profile containing username, country, joined year, and metrics.
 */
export function validateAndNormalizeProfile(rawProfile, platform, requestedUsername = '') {
  const cleanPlatform = (platform || 'unknown').toLowerCase();
  const fallbackUsername = requestedUsername.trim();

  if (!rawProfile || typeof rawProfile !== 'object') {
    throw new ChessResilienceError('Profile payload is missing or not a valid object.', {
      code: 'VALIDATION_ERROR',
      platform: cleanPlatform,
      raw: rawProfile
    });
  }

  if (cleanPlatform === 'chess.com') {
    const username = rawProfile.username || fallbackUsername;
    if (!username) {
      throw new ChessResilienceError('Chess.com profile response is missing the "username" identifier.', {
        code: 'VALIDATION_ERROR',
        platform: 'chess.com',
        raw: rawProfile
      });
    }

    const status = (rawProfile.status || '').toLowerCase();
    const isClosed = ['closed', 'closed-fair-play', 'abuse', 'suspended', 'inactive'].includes(status);
    if (isClosed) {
      throw new ChessResilienceError(`Chess.com account for "${username}" is inactive, closed, or restricted (${status}).`, {
        code: 'ACCOUNT_CLOSED',
        platform: 'chess.com',
        raw: rawProfile
      });
    }

    let countryCode = null;
    if (rawProfile.country && typeof rawProfile.country === 'string') {
      const parts = rawProfile.country.split('/');
      countryCode = parts[parts.length - 1]?.toUpperCase() || null;
    }
    const country = countryCode ? (COUNTRY_NAMES[countryCode] || countryCode) : null;

    let joined = null;
    if (typeof rawProfile.joined === 'number' && Number.isFinite(rawProfile.joined)) {
      joined = new Date(rawProfile.joined * 1000).getFullYear();
    }

    return {
      username: rawProfile.username || username,
      name: rawProfile.name || rawProfile.username || username,
      avatar: typeof rawProfile.avatar === 'string' ? rawProfile.avatar : null,
      title: typeof rawProfile.title === 'string' ? rawProfile.title : null,
      country,
      countryCode,
      joined,
      url: rawProfile.url || `https://www.chess.com/member/${username}`,
      followers: typeof rawProfile.followers === 'number' ? rawProfile.followers : 0,
      isStreamer: !!rawProfile.is_streamer,
      isClosed: false
    };
  }

  if (cleanPlatform === 'lichess') {
    const username = rawProfile.username || fallbackUsername;
    if (!username) {
      throw new ChessResilienceError('Lichess profile response is missing the "username" identifier.', {
        code: 'VALIDATION_ERROR',
        platform: 'lichess',
        raw: rawProfile
      });
    }

    const isClosed = rawProfile.closed === true || rawProfile.disabled === true;
    if (isClosed) {
      throw new ChessResilienceError(`Lichess account for "${username}" has been closed or disabled.`, {
        code: 'ACCOUNT_CLOSED',
        platform: 'lichess',
        raw: rawProfile
      });
    }

    const profileObj = rawProfile.profile || {};
    const countryCode = typeof profileObj.country === 'string' ? profileObj.country.toUpperCase() : null;
    const country = countryCode ? (COUNTRY_NAMES[countryCode] || countryCode) : null;

    let joined = null;
    if (typeof rawProfile.createdAt === 'number' && Number.isFinite(rawProfile.createdAt)) {
      joined = new Date(rawProfile.createdAt).getFullYear();
    }

    return {
      username: rawProfile.username || username,
      name: profileObj.realName || rawProfile.username || username,
      avatar: null,
      title: typeof rawProfile.title === 'string' ? rawProfile.title : null,
      country,
      countryCode,
      joined,
      url: `https://lichess.org/@/${username}`,
      followers: typeof rawProfile.nbFollowers === 'number' ? rawProfile.nbFollowers : 0,
      isStreamer: rawProfile.tosViolation ? false : !!rawProfile.streaming,
      isClosed: false
    };
  }

  throw new ChessResilienceError(`Unsupported platform: "${platform}"`, {
    code: 'VALIDATION_ERROR',
    platform: cleanPlatform
  });
}

function getFullmoveCountFromPgn(pgn) {
  if (!pgn || typeof pgn !== 'string') return 0;
  const matches = pgn.match(/(\d+)\.\s/g);
  if (!matches) return 0;
  const num = parseInt(matches[matches.length - 1], 10);
  return Number.isFinite(num) ? num : 0;
}

function getFirstMoveFromPgn(pgn) {
  if (!pgn || typeof pgn !== 'string') return null;
  const cleanBody = pgn.replace(/\[[^\]]+\]/g, '').trim();
  const match = cleanBody.match(/^1\.\s+([a-zA-Z0-9+#=?-]+)/);
  return match ? match[1] : null;
}

/**
 * Transforms raw platform-specific game logs into a standard NormalizedGame payload.
 *
 * @param {Object} rawGame - Raw match object.
 * @param {string} platform - 'chess.com' or 'lichess'.
 * @param {string} requestedUsername - Target player identifier.
 * @returns {Object} Normalized game structure with ratings, moves, side, and outcome.
 */
export function validateAndNormalizeGame(rawGame, platform, requestedUsername) {
  const cleanPlatform = (platform || 'unknown').toLowerCase();
  const cleanUser = (requestedUsername || '').trim().toLowerCase();

  if (!cleanUser) {
    throw new ChessResilienceError('Username is required for game perspective.', {
      code: 'VALIDATION_ERROR',
      platform: cleanPlatform
    });
  }
  if (!rawGame || typeof rawGame !== 'object') {
    throw new ChessResilienceError('Game record is missing or not a valid object.', {
      code: 'VALIDATION_ERROR',
      platform: cleanPlatform
    });
  }

  if (cleanPlatform === 'chess.com') {
    if (!rawGame.white || !rawGame.black) {
      throw new ChessResilienceError('Chess.com game record is missing player nodes.', {
        code: 'VALIDATION_ERROR',
        platform: 'chess.com',
        raw: rawGame
      });
    }

    const whiteUsername = (rawGame.white.username || '').toLowerCase();
    const blackUsername = (rawGame.black.username || '').toLowerCase();
    const isWhite = whiteUsername === cleanUser;
    const isBlack = blackUsername === cleanUser;

    if (!isWhite && !isBlack) {
      throw new ChessResilienceError(`User did not participate in this game.`, {
        code: 'VALIDATION_ERROR',
        platform: 'chess.com'
      });
    }

    const userSide = isWhite ? 'white' : 'black';
    const opponentSide = isWhite ? 'black' : 'white';
    
    const userResult = rawGame[userSide]?.result;
    let result = null;
    if (userResult === 'win') result = 'W';
    else if (['agreed', 'stalemate', 'insufficient', '50move', 'repetition', 'timevsinsufficient'].includes(userResult)) {
      result = 'D';
    } else if (userResult) {
      result = 'L';
    }

    if (!result) {
      throw new ChessResilienceError(`Could not parse Chess.com game outcome: "${userResult}"`, {
        code: 'VALIDATION_ERROR',
        platform: 'chess.com'
      });
    }

    const pgn = typeof rawGame.pgn === 'string' ? rawGame.pgn : '';
    const openingMatch = /\[Opening "([^"]+)"\]/.exec(pgn);
    const ecoMatch = /\[ECOUrl "https?:\/\/[^"]*\/openings\/[A-E]\/(\w+)\.json"\]/.exec(pgn);
    const openingName = openingMatch ? openingMatch[1] : null;
    const openingEco = ecoMatch ? ecoMatch[1] : null;

    const ts = typeof rawGame.end_time === 'number' && Number.isFinite(rawGame.end_time)
      ? rawGame.end_time * 1000
      : Date.now();

    return {
      result,
      side: userSide,
      myRating: typeof rawGame[userSide]?.rating === 'number' ? rawGame[userSide].rating : 0,
      opponentRating: typeof rawGame[opponentSide]?.rating === 'number' ? rawGame[opponentSide].rating : 0,
      opponentUsername: rawGame[opponentSide]?.username || 'opponent',
      speed: rawGame.time_class || rawGame.rules || 'rapid',
      length: getFullmoveCountFromPgn(pgn),
      ts,
      openingName,
      openingEco,
      firstMove: isWhite ? getFirstMoveFromPgn(pgn) : null
    };
  }

  if (cleanPlatform === 'lichess') {
    if (!rawGame.players || typeof rawGame.players !== 'object') {
      throw new ChessResilienceError('Lichess game record is missing player structure.', {
        code: 'VALIDATION_ERROR',
        platform: 'lichess'
      });
    }
    const { white, black } = rawGame.players;
    const whiteUsername = (white?.user?.id || white?.user?.name || '').toLowerCase();
    const blackUsername = (black?.user?.id || black?.user?.name || '').toLowerCase();
    const isWhite = whiteUsername === cleanUser;
    const isBlack = blackUsername === cleanUser;

    if (!isWhite && !isBlack) {
      throw new ChessResilienceError(`User did not participate in this game.`, {
        code: 'VALIDATION_ERROR',
        platform: 'lichess'
      });
    }

    const mySide = isWhite ? 'white' : 'black';
    const opponentSide = isWhite ? 'black' : 'white';
    const opponentNode = rawGame.players[opponentSide];

    const winner = rawGame.winner;
    let result = 'D';
    if (winner === mySide) result = 'W';
    else if (winner === opponentSide) result = 'L';

    const movesStr = typeof rawGame.moves === 'string' ? rawGame.moves : '';
    const moveList = movesStr.split(' ').filter(Boolean);
    const length = Math.ceil(moveList.length / 2);

    const ts = typeof rawGame.createdAt === 'number' && Number.isFinite(rawGame.createdAt)
      ? rawGame.createdAt
      : Date.now();

    return {
      result,
      side: mySide,
      myRating: typeof rawGame.players[mySide]?.rating === 'number' ? rawGame.players[mySide].rating : 0,
      opponentRating: typeof opponentNode?.rating === 'number' ? opponentNode.rating : 0,
      opponentUsername: opponentNode?.user?.id || opponentNode?.user?.name || 'Anonymous',
      speed: rawGame.speed || rawGame.perf || 'rapid',
      length,
      ts,
      openingName: rawGame.opening?.name || null,
      openingEco: rawGame.opening?.eco || null,
      firstMove: isWhite ? (moveList[0] || null) : null
    };
  }

  throw new ChessResilienceError(`Unsupported platform: "${platform}"`, {
    code: 'VALIDATION_ERROR',
    platform: cleanPlatform
  });
}

/* ----------------------------------------------------------------------------
 * 7. Dynamic Chess.com Month Fetcher
 * ---------------------------------------------------------------------------- */

function parseJoinedDate(profile) {
  let joinedYear = null;
  let joinedMonth = 1;
  if (profile) {
    if (typeof profile === 'number') {
      const d = new Date(profile * 1000);
      joinedYear = d.getUTCFullYear();
      joinedMonth = d.getUTCMonth() + 1;
    } else if (profile instanceof Date) {
      joinedYear = profile.getUTCFullYear();
      joinedMonth = profile.getUTCMonth() + 1;
    } else if (typeof profile === 'object') {
      const val = profile.joined;
      if (typeof val === 'number') {
        if (val > 3000) {
          const d = new Date(val * 1000);
          joinedYear = d.getUTCFullYear();
          joinedMonth = d.getUTCMonth() + 1;
        } else {
          joinedYear = val;
          joinedMonth = 1;
        }
      } else if (val instanceof Date) {
        joinedYear = val.getUTCFullYear();
        joinedMonth = val.getUTCMonth() + 1;
      }
    }
  }
  return { joinedYear, joinedMonth };
}

/**
 * Generates monthly crawl records backwards in time.
 * Yields raw game logs to caller incrementally to allow live UI progress updates.
 *
 * @param {Object} options - Generator settings.
 * @param {string} options.username - Target user profile.
 * @param {Object} options.profile - Profile payload to extract joined dates.
 * @param {number} [options.maxGames=400] - Crawler limits.
 * @param {number} [options.maxMonths=36] - Maximum month history lookup limit.
 * @param {RequestQueue} [options.queue] - Concurrency controller instance.
 * @param {Object} [options.fetchOptions] - Headers and AbortSignals.
 * @param {Function} [options.isValidGame] - Filter criteria callback.
 * @param {Array<Function|string>} [options.proxies] - Cors bypass providers.
 * @param {Function} [options.onProgress] - Execution update callbacks.
 */
export async function* dynamicMonthLookbackGenerator({
  username,
  profile,
  maxGames = 400,
  maxMonths = 36,
  queue, // RequestQueue instance
  fetchOptions = {},
  isValidGame = (g) => true,
  proxies = [],
  onProgress = null
} = {}) {
  const { joinedYear, joinedMonth } = parseJoinedDate(profile);
  const signal = fetchOptions.signal;

  let year = new Date().getUTCFullYear();
  let month = new Date().getUTCMonth() + 1;

  let validGamesCount = 0;
  let monthsChecked = 0;
  const activeFetches = [];

  try {
    const maxConcurrency = queue ? queue.maxConcurrency : 3;

    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      while (activeFetches.length < maxConcurrency && monthsChecked < maxMonths) {
        if (joinedYear !== null) {
          if (year < joinedYear || (year === joinedYear && month < joinedMonth)) {
            break;
          }
        }

        const targetYear = year;
        const targetMonth = month;
        const monthController = new AbortController();
        const cleanupSignal = () => {
          if (signal?.aborted) monthController.abort();
        };
        if (signal) signal.addEventListener('abort', cleanupSignal);

        const url = `https://api.chess.com/pub/player/${encodeURIComponent(username.trim().toLowerCase())}/games/${targetYear}/${String(targetMonth).padStart(2, '0')}`;
        
        const task = async () => {
          try {
            const res = await fetchWithRetry(url, {
              ...fetchOptions,
              signal: monthController.signal,
              proxies
            });
            if (res.status === 404) return { success: true, games: [], year: targetYear, month: targetMonth };
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            return { success: true, games: data.games || [], year: targetYear, month: targetMonth, res };
          } catch (err) {
            if (err.name === 'AbortError') throw err;
            return { success: false, error: err, year: targetYear, month: targetMonth, games: [] };
          } finally {
            if (signal) signal.removeEventListener('abort', cleanupSignal);
          }
        };

        const promise = queue ? queue.add(task) : task();

        activeFetches.push({
          year: targetYear,
          month: targetMonth,
          promise,
          controller: monthController
        });

        month--;
        if (month === 0) {
          month = 12;
          year--;
        }
        monthsChecked++;
      }

      if (activeFetches.length === 0) break;

      const head = activeFetches.shift();
      let result;
      try {
        result = await head.promise;
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        result = { success: false, error: err, year: head.year, month: head.month, games: [] };
      }

      let validGamesInMonth = [];
      if (result.success) {
        validGamesInMonth = result.games.filter(g => isValidGame(g, username));
        validGamesCount += validGamesInMonth.length;
      }

      onProgress?.({
        label: 'games',
        status: 'loading',
        loaded: validGamesCount,
        total: maxGames,
        via: result.res?.url?.includes('chess.com') ? 'direct' : 'proxy',
        latencyMs: 0
      });

      yield {
        year: result.year,
        month: result.month,
        games: validGamesInMonth,
        rawGames: result.games,
        runningTotal: validGamesCount,
        success: result.success,
        error: result.error || null,
        res: result.res || null
      };

      if (validGamesCount >= maxGames) break;
    }
  } finally {
    for (const f of activeFetches) {
      f.controller.abort();
      f.promise.catch(() => {});
    }
  }
}
