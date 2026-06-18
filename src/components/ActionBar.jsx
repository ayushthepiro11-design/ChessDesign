import { useState, memo } from 'react'
import { toPng } from 'html-to-image'
import toast from 'react-hot-toast'
import { Download, Share } from './Icons'

/**
 * ActionBar — the icon-and-text button group that appears below the card.
 * Download uses html-to-image (foreignObject) to snapshot the card;
 * Share uses Web Share API when available, falls back to Twitter intent.
 */
export default memo(function ActionBar({ data, data2, isCompare, cardRef, isDark }) {
  const [downloading, setDownloading] = useState(false)

  if (!data) return null

  const shareUrl = (() => {
    if (typeof window === 'undefined') return ''
    const sp = new URLSearchParams()
    sp.set('p', data.platform)
    sp.set('u', data.profile.username)
    if (isCompare && data2) {
      sp.set('p2', data2.platform)
      sp.set('u2', data2.profile.username)
    }
    return `${window.location.origin}${window.location.pathname}?${sp.toString()}`
  })()

  const handleDownload = async () => {
    if (!cardRef?.current) return
    setDownloading(true)

    const filename = isCompare && data2
      ? `chesscard-compare-${data.profile.username}-vs-${data2.profile.username}.png`
      : `chesscard-${data.profile.username}-${data.platform}.png`

    try {
      await toast.promise(
        (async () => {
          const el = cardRef.current
          const isDarkTheme = isDark !== undefined ? isDark : document.documentElement.classList.contains('dark')

          el.classList.add('exporting')
          if (isDarkTheme) el.classList.add('dark')

          await new Promise((r) => setTimeout(r, 80))

          const dataUrl = await toPng(el, {
            pixelRatio: 2,
            cacheBust: true,
            filter: (node) => {
              if (!(node instanceof HTMLElement)) return true
              const label = node.getAttribute?.('aria-label')
              if (label === 'Previous section' || label === 'Next section') return false
              if (node.style?.mixBlendMode && node.style.mixBlendMode !== 'normal') return false
              return true
            },
            style: { perspective: 'none' },
          })

          el.classList.remove('exporting')
          el.classList.remove('dark')

          const res = await fetch(dataUrl)
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename.toLowerCase()
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
        })(),
        {
          loading: 'Rendering card…',
          success: 'Card downloaded!',
          error: 'Download failed — try again',
        }
      )
    } catch {
      if (cardRef?.current) {
        cardRef.current.classList.remove('exporting')
        cardRef.current.classList.remove('dark')
      }
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return

    let text = ''
    if (isCompare && data2) {
      text = `Chess match-up! ♟\n\n@${data.profile.username} (${data.primary.rating} ${data.primary.label}) vs @${data2.profile.username} (${data2.primary.rating} ${data2.primary.label})`
    } else {
      text = `My chess profile, as a card. ♟\n\n@${data.profile.username} · ${data.primary.rating} ${data.primary.label} (peak ${data.primary.peak})`
    }

    // Try native Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: isCompare && data2
            ? `ChessCard: ${data.profile.username} vs ${data2.profile.username}`
            : `ChessCard: ${data.profile.username}`,
          text,
          url: shareUrl,
        })
        return
      } catch (err) {
        // User cancelled or not supported — fall through to Twitter
      }
    }

    // Fallback: Twitter intent
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + '\n')}&url=${encodeURIComponent(shareUrl)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="relative mt-6 w-full flex flex-col items-center gap-3 animate-fadeUp">
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="btn-icon disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Download card as PNG"
        >
          {downloading ? (
            <>
              <span
                aria-hidden
                className="inline-block h-3.5 w-3.5 rounded-full border-2 border-muted/30 border-t-ink dark:border-t-ink-dark animate-spin"
              />
              Rendering…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download PNG
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="btn-icon"
          aria-label="Share card"
        >
          <Share className="h-4 w-4" />
          Share
        </button>
      </div>
    </div>
  )
})
