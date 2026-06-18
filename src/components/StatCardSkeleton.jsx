import { memo } from 'react'

/**
 * StatCardSkeleton — the placeholder shown before the user generates a card.
 * It mirrors the new compact horizontal top-header and bottom-tab landscape geometry.
 */
export default memo(function StatCardSkeleton({ isCompare = false }) {
  return (
    <div className={[
      'max-w-full rounded-2xl overflow-hidden bg-canvas dark:bg-canvas-dark border border-line dark:border-line-dark shadow-card dark:shadow-cardDark',
      isCompare ? 'w-full max-w-[760px]' : 'w-full max-w-[650px]'
    ].join(' ')}>
      <div className={[
        'flex flex-col',
        isCompare ? 'min-h-[210px] lg:min-h-[220px]' : 'min-h-[215px] lg:min-h-[225px]'
      ].join(' ')}>
        
        {/* ==================== TOP HEADER PANEL SKELETON ==================== */}
        {isCompare ? (
          /* Comparison Mode Header Row SKELETON */
          <div className="w-full border-b border-line dark:border-line-dark p-3.5 bg-chip/5 dark:bg-chip-dark/10 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 overflow-hidden">
            {/* Player 1 skeleton */}
            <div className="flex items-center gap-3 min-w-0 flex-1 border-l-4 border-l-pixel-red pl-2.5 md:border-l-0 md:pl-0">
              <div className="h-10 w-10 rounded-full skeleton border border-pixel-red shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-3.5 w-12 rounded skeleton" />
                  <div className="h-4 w-24 rounded skeleton" />
                </div>
                <div className="h-2.5 w-36 rounded skeleton" />
                <div className="h-5 w-20 rounded skeleton" />
              </div>
            </div>

            {/* VS center badge skeleton */}
            <div className="flex flex-row md:flex-col items-center gap-2 shrink-0 justify-center">
              <div className="h-7 w-7 rounded-full skeleton" />
              <div className="h-3.5 w-12 rounded skeleton" />
            </div>

            {/* Player 2 skeleton (reversed) */}
            <div className="flex items-center gap-3 min-w-0 flex-1 border-r-4 border-r-pixel-green pr-2.5 md:border-r-0 md:pr-0 md:justify-end">
              <div className="flex md:flex-row-reverse items-center gap-3 min-w-0 w-full justify-start md:justify-start">
                <div className="h-10 w-10 rounded-full skeleton border border-pixel-green shrink-0" />
                <div className="min-w-0 flex-1 md:text-right space-y-1">
                  <div className="flex md:flex-row-reverse items-center gap-1.5">
                    <div className="h-3.5 w-12 rounded skeleton" />
                    <div className="h-4 w-24 rounded skeleton" />
                  </div>
                  <div className="h-2.5 w-36 rounded skeleton md:ml-auto" />
                  <div className="h-5 w-20 rounded skeleton md:ml-auto" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Single Player Mode Header Row SKELETON */
          <div className="w-full border-b border-line dark:border-line-dark p-3 bg-chip/10 dark:bg-chip-dark/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 overflow-hidden">
            {/* Profile credentials skeleton */}
            <div className="flex items-center gap-2.5 relative z-10 min-w-0">
              <div className="h-10 w-10 rounded-full skeleton border border-line shrink-0" />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-3.5 w-8 rounded skeleton" />
                  <div className="h-4 w-24 rounded skeleton" />
                </div>
                <div className="h-3 w-36 rounded skeleton" />
              </div>
            </div>

            {/* Style Badge skeleton */}
            <div className="relative z-10 shrink-0">
              <div className="h-5 w-24 rounded-full skeleton" />
            </div>

            {/* Stats cells row skeleton */}
            <div className="flex flex-wrap items-center gap-1.5 relative z-10 min-w-0">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-lg border border-line dark:border-line-dark py-1 px-2.5 flex items-center gap-2 min-w-[70px]">
                  <div className="h-4 w-7 rounded skeleton shrink-0" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="h-2 w-5 rounded skeleton" />
                    <div className="h-2 w-8 rounded skeleton" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== BOTTOM TAB PANEL SKELETON ==================== */}
        <div className="flex-1 min-w-0 p-3.5 flex flex-col justify-between gap-3">
          {/* Tab nav skeleton */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-full border border-line dark:border-line-dark bg-chip/50 dark:bg-chip-dark/50">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={[
                  'h-7 rounded-full skeleton',
                  i === 0 ? 'opacity-100' : 'opacity-70',
                ].join(' ')}
              />
            ))}
          </div>

          {/* Tab content placeholder skeleton */}
          <div className={[
            'space-y-4 flex-1 mt-2',
            isCompare ? 'min-h-[125px] md:min-h-[135px]' : 'min-h-[135px] md:min-h-[145px]'
          ].join(' ')}>
            {isCompare ? (
              /* Versus formats table skeleton */
              <div className="space-y-3 pt-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="border-b border-line/45 pb-2 last:border-b-0 last:pb-0 space-y-1.5">
                    <div className="flex justify-between">
                      <div className="h-3 w-12 rounded skeleton" />
                      <div className="h-3 w-24 rounded skeleton" />
                    </div>
                    <div className="h-1.5 w-full rounded skeleton" />
                    <div className="flex justify-between">
                      <div className="h-2 w-20 rounded skeleton" />
                      <div className="h-2 w-20 rounded skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Single player timecontrol grid + streak skeleton */
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-xl border border-line dark:border-line-dark p-2 space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1 flex-1">
                          <div className="h-2 w-10 rounded skeleton" />
                          <div className="h-4 w-12 rounded skeleton" />
                        </div>
                        <div className="space-y-1 flex flex-col items-end">
                          <div className="h-2 w-8 rounded skeleton" />
                          <div className="h-2 w-6 rounded skeleton" />
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded skeleton" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-line dark:border-line-dark p-2.5 flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="h-2.5 w-10 rounded skeleton" />
                      <div className="h-4 w-12 rounded skeleton" />
                    </div>
                    <div className="space-y-1 flex flex-col items-end">
                      <div className="h-3 w-12 rounded skeleton" />
                      <div className="h-2.5 w-16 rounded skeleton" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-line dark:border-line-dark p-2.5 flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="h-2.5 w-16 rounded skeleton" />
                      <div className="h-4 w-20 rounded skeleton" />
                    </div>
                    <div className="space-y-1 flex flex-col items-end">
                      <div className="h-3.5 w-10 rounded skeleton" />
                      <div className="h-2.5 w-8 rounded skeleton" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer skeleton */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t-2 border-line/50 dark:border-line-dark/50">
            <div className="h-6 w-32 rounded-full skeleton" />
            <div className="h-2.5 w-20 rounded skeleton" />
          </div>
        </div>
      </div>
    </div>
  )
})
