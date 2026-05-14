'use client'

export function GiftProgress({ count, target }: { count: number; target: number }) {
  const progress = Math.min(count, target)
  const isComplete = progress >= target

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">🎁</span>
        <div>
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Offre cadeau
          </h3>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {isComplete
              ? 'Félicitations ! Vous avez gagné un ticket gratuit !'
              : `Achetez ${target} tickets de 1 000 Ar cette semaine et recevez 1 ticket gratuit !`}
          </p>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-2">
        {Array.from({ length: target }).map((_, i) => (
          <div
            key={i}
            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < progress
                ? 'bg-amber-500 text-white shadow-sm scale-110'
                : 'bg-amber-200 dark:bg-amber-800 text-amber-400 dark:text-amber-600'
            }`}
          >
            {i < progress ? '✓' : i + 1}
          </div>
        ))}
        <div className="ml-1 text-lg">→</div>
        <div
          className={`h-8 w-8 rounded-full flex items-center justify-center text-sm transition-all ${
            isComplete
              ? 'bg-green-500 text-white shadow-md animate-bounce'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
          }`}
        >
          🎁
        </div>
      </div>

      <p className="text-xs text-amber-600 dark:text-amber-400">
        <span className="font-semibold">{progress}/{target}</span> tickets cette semaine
        {!isComplete && ` — encore ${target - progress} pour le cadeau`}
      </p>
    </div>
  )
}
