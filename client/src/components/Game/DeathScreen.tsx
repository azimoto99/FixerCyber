interface DeathScreenProps {
  deathInfo: {
    killerId: string
    hadHousing: boolean
  }
  onRestart: () => void
}

export function DeathScreen({ deathInfo, onRestart }: DeathScreenProps) {
  return (
    <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50">
      <div className="text-center max-w-2xl">
        {/* Death Title */}
        <div className="mb-8">
          <h1 className="text-7xl font-bold text-red-600 mb-4 glitch-text tracking-wider">
            FLATLINED
          </h1>
          <div className="text-2xl text-red-400 mb-2">
            PERMADEATH ACTIVATED
          </div>
          <p className="text-xl text-cyberpunk-light">
            Terminated by: <span className="text-red-500 font-bold">{deathInfo.killerId}</span>
          </p>
        </div>
        
        {/* Lost Progress Warning */}
        <div className="mb-8 border border-red-600 rounded-lg p-6 bg-red-900/20">
          <h2 className="text-2xl text-red-500 font-bold mb-4">ALL PROGRESS LOST</h2>
          <div className="text-cyberpunk-light space-y-2">
            <p>✗ All items deleted</p>
            <p>✗ All credits lost</p>
            <p>✗ All augmentations removed</p>
            <p>✗ All contracts cancelled</p>
            {deathInfo.hadHousing && (
              <p className="text-red-400">✗ Housing rental expired</p>
            )}
          </div>
        </div>
        
        {/* Restart Button */}
        <button
          onClick={onRestart}
          className="cyber-button text-xl px-8 py-4 bg-red-900 hover:bg-red-800 border-red-600"
        >
          START NEW RUN
        </button>
        
        {/* Roguelike Tips */}
        <div className="mt-8 text-cyberpunk-light/60 text-sm space-y-1">
          <p>TIP: Rent housing at safehouses to save your progress</p>
          <p>TIP: Death without housing means losing everything</p>
          <p>TIP: Each run is unique - learn from your mistakes</p>
        </div>
      </div>
      
      <style>{`
        @keyframes glitch {
          0% {
            text-shadow: 
              2px 2px 0 #ff0000,
              -2px -2px 0 #00ffff;
          }
          25% {
            text-shadow: 
              -2px 2px 0 #ff0000,
              2px -2px 0 #00ffff;
          }
          50% {
            text-shadow: 
              2px -2px 0 #ff0000,
              -2px 2px 0 #00ffff;
          }
          75% {
            text-shadow: 
              -2px -2px 0 #ff0000,
              2px 2px 0 #00ffff;
          }
          100% {
            text-shadow: 
              2px 2px 0 #ff0000,
              -2px -2px 0 #00ffff;
          }
        }
        
        .glitch-text {
          animation: glitch 0.5s infinite;
        }
      `}</style>
    </div>
  )
}