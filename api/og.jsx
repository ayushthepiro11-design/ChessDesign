import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);

  const username = searchParams.get('user')     ?? 'Player';
  const platform = searchParams.get('platform') ?? 'chesscom';
  const rating   = searchParams.get('rating')   ?? '—';
  const mode     = (searchParams.get('mode')    ?? 'blitz').toUpperCase();
  const wins     = searchParams.get('wins')     ?? '0';
  const losses   = searchParams.get('losses')   ?? '0';
  const title    = searchParams.get('title')    ?? '';

  const isChessCom   = platform !== 'lichess';
  const accent       = isChessCom ? '#81B64C' : '#FFFFFF';
  const platformName = isChessCom ? 'chess.com' : 'lichess.org';
  const platformCode = isChessCom ? 'CC' : 'LI';

  const total  = parseInt(wins) + parseInt(losses);
  const winPct = total > 0 ? Math.round((parseInt(wins) / total) * 100) : 0;

  const fontData = await fetch(
    'https://fonts.gstatic.com/s/vt323/v17/pxiKyp0ihIEF2isQFJXGdg.woff2'
  ).then(r => r.arrayBuffer());

  return new ImageResponse(
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        background: '#161513',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '60px 64px',
          flex: 1,
          borderRight: '1px solid #312E2B',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '44px' }}>
          <div
            style={{
              background: accent,
              color: '#fff',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '20px',
              fontWeight: 'bold',
            }}
          >
            {platformCode}
          </div>
          <span style={{ color: '#797673', fontSize: '22px' }}>{platformName}</span>
          {title ? (
            <div
              style={{
                border: '1px solid rgba(242,184,39,0.4)',
                color: '#F2B827',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '20px',
              }}
            >
              {title}
            </div>
          ) : null}
        </div>

        <div style={{ color: '#E1E1E0', fontSize: '54px', fontWeight: 'bold', marginBottom: '8px' }}>
          {username}
        </div>

        <div
          style={{
            color: '#E1E1E0',
            fontSize: '172px',
            lineHeight: '1',
            fontFamily: 'VT323',
            letterSpacing: '-2px',
          }}
        >
          {rating}
        </div>

        <div style={{ color: accent, fontSize: '22px', letterSpacing: '0.14em', marginTop: '-4px' }}>
          {mode} RATING
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '60px 52px',
          width: '340px',
          justifyContent: 'center',
          gap: '36px',
        }}
      >
        <div>
          <div style={{ color: '#81B64C', fontSize: '64px', fontFamily: 'VT323', lineHeight: '1' }}>
            {parseInt(wins).toLocaleString()}W
          </div>
          <div style={{ color: '#797673', fontSize: '18px', letterSpacing: '0.1em' }}>WINS</div>
        </div>
        <div>
          <div style={{ color: '#FA463A', fontSize: '64px', fontFamily: 'VT323', lineHeight: '1' }}>
            {parseInt(losses).toLocaleString()}L
          </div>
          <div style={{ color: '#797673', fontSize: '18px', letterSpacing: '0.1em' }}>LOSSES</div>
        </div>
        <div>
          <div style={{ color: '#E1E1E0', fontSize: '64px', fontFamily: 'VT323', lineHeight: '1' }}>
            {winPct}%
          </div>
          <div style={{ color: '#797673', fontSize: '18px', letterSpacing: '0.1em' }}>WIN RATE</div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 64px 28px 64px',
          borderTop: '1px solid #312E2B',
          background: '#161513',
        }}
      >
        <div style={{ color: accent, fontSize: '22px', fontWeight: 'bold' }}>&#9822; ChessCard</div>
        <div style={{ color: '#797673', fontSize: '18px' }}>chess-design.vercel.app</div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'VT323', data: fontData, style: 'normal' }],
    }
  );
}
