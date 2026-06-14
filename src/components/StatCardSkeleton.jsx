/**
 * StatCardSkeleton — the placeholder shown before the user generates a card.
 * It mirrors the new horizontal dual-column and three-column geometry.
 */
export default function StatCardSkeleton({ isCompare = false }) {
  return (
    <div className={[
      'max-w-full rounded-2xl overflow-hidden bg-canvas dark:bg-canvas-dark border-2 border-line dark:border-line-dark shadow-card dark:shadow-cardDark',
      isCompare ? 'w-[860px]' : 'w-[760px]'
    ].join(' ')}>
      <div className="flex flex-col md:flex-row min-h-[460px] md:min-h-[480px]">
        {/* ==================== LEFT PANEL SKELETON ==================== */}
        <div className={[
          'shrink-0 border-line dark:border-line-dark p-5 sm:p-6 bg-chip/10 dark:bg-chip-dark/15 flex flex-col justify-between gap-5',
          isCompare ? 'w-full md:w-[250px] border-b-2 md:border-b-0 md:border-r-2' : 'w-full md:w-[280px] border-b-2 md:border-b-0 md:border-r-2'
        ].join(' ')}>
          <div className="space-y-4">
            {/* Identity circle + text bars */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full skeleton border-2 border-line dark:border-line-dark shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-3.5 w-2/3 rounded skeleton" />
                <div className="h-2.5 w-1/2 rounded skeleton" />
              </div>
            </div>
            {/* Platform badge row */}
            <div className="flex justify-between items-center">
              <div className="h-2.5 w-14 rounded skeleton" />
              <div className="h-4.5 w-18 rounded skeleton" />
            </div>
          </div>

          {/* Style badge skeleton */}
          <div className="rounded-xl border-2 border-line dark:border-line-dark p-3 space-y-2 min-h-[96px] mt-2">
            <div className="h-2.5 w-1/3 rounded skeleton" />
            <div className="h-3 w-3/4 rounded skeleton" />
            <div className="h-2.5 w-1/2 rounded skeleton" />
          </div>

          {/* Stats cells grid */}
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <div className="rounded-xl border-2 border-line dark:border-line-dark p-2.5 space-y-1.5">
              <div className="h-2 w-1/2 rounded skeleton" />
              <div className="h-4.5 w-3/4 rounded skeleton" />
            </div>
            <div className="rounded-xl border-2 border-line dark:border-line-dark p-2.5 space-y-1.5">
              <div className="h-2 w-1/2 rounded skeleton" />
              <div className="h-4.5 w-3/4 rounded skeleton" />
            </div>
            {/* Puzzle Rating skeleton */}
            <div className="col-span-2 rounded-xl border-2 border-line dark:border-line-dark p-2.5 space-y-1.5">
              <div className="h-2 w-1/3 rounded skeleton" />
              <div className="h-4 w-1/2 rounded skeleton" />
            </div>
          </div>
        </div>

        {/* ==================== CENTER/RIGHT TABS SKELETON ==================== */}
        <div className="flex-1 min-w-0 p-5 sm:p-6 flex flex-col justify-between gap-5">
          {isCompare ? (
            <>
              {/* VS matchup bar skeleton */}
              <div className="flex items-center justify-between border-b-2 border-line/50 pb-2">
                <div className="h-2.5 w-24 rounded skeleton" />
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full skeleton" />
                  <div className="h-4 w-12 rounded skeleton" />
                </div>
              </div>
            </>
          ) : null}

          {/* Tab nav skeleton */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-full border-2 border-line dark:border-line-dark bg-chip/50 dark:bg-chip-dark/50">
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

          {/* Tab content placeholder */}
          <div className="space-y-4 flex-1 mt-2">
            {isCompare ? (
              /* Versus formats table skeleton */
              <div className="space-y-3 pt-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="border-b-2 border-line/45 pb-2 last:border-b-0 last:pb-0 space-y-1.5">
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
                    <div key={i} className="rounded-xl border-2 border-line dark:border-line-dark p-3 space-y-2">
                      <div className="h-2 w-1/2 rounded skeleton" />
                      <div className="h-4 w-3/4 rounded skeleton" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border-2 border-line dark:border-line-dark p-3 space-y-2 min-h-[96px]">
                    <div className="h-2 w-1/3 rounded skeleton" />
                    <div className="h-5 w-3/4 rounded skeleton" />
                  </div>
                  <div className="rounded-xl border-2 border-line dark:border-line-dark p-3 space-y-2 min-h-[96px]">
                    <div className="h-2 w-1/3 rounded skeleton" />
                    <div className="h-5 w-3/4 rounded skeleton" />
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

        {/* ==================== RIGHT PANEL (VERSUS MODE PLAYER 2 SKELETON) ==================== */}
        {isCompare ? (
          <div className="w-full md:w-[250px] shrink-0 border-t-2 md:border-t-0 md:border-l-2 border-line dark:border-line-dark p-5 sm:p-6 bg-chip/10 dark:bg-chip-dark/15 flex flex-col justify-between gap-5 relative z-10 order-last md:order-none">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full skeleton border-2 border-line dark:border-line-dark shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-3.5 w-2/3 rounded skeleton" />
                  <div className="h-2.5 w-1/2 rounded skeleton" />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="h-2.5 w-14 rounded skeleton" />
                <div className="h-4.5 w-18 rounded skeleton" />
              </div>
            </div>

            {/* P2 rating skeleton */}
            <div className="rounded-xl border-2 border-line dark:border-line-dark p-3 space-y-2 bg-gradient-to-br from-accent-soft/30 to-transparent dark:from-accent-softDark/20">
              <div className="h-2 w-1/2 rounded skeleton" />
              <div className="h-4.5 w-3/4 rounded skeleton" />
            </div>

            {/* P2 style archetype skeleton */}
            <div className="rounded-xl border-2 border-line dark:border-line-dark p-3 space-y-2 min-h-[96px] mt-2">
              <div className="h-2.5 w-1/3 rounded skeleton" />
              <div className="h-3 w-3/4 rounded skeleton" />
              <div className="h-2.5 w-1/2 rounded skeleton" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
