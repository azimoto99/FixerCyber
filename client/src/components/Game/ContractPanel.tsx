import { useGameStore } from '../../stores/gameStore'

interface ContractPanelProps {
  onClose: () => void
}

export function ContractPanel({ onClose }: ContractPanelProps) {
  const { contracts } = useGameStore()

  return (
    <div className="w-full h-full bg-cyberpunk-dark/95 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-cyberpunk-gray border border-cyberpunk-primary rounded-lg p-6 w-full max-w-4xl h-5/6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyberpunk-primary">CONTRACTS</h2>
          <button
            onClick={onClose}
            className="cyber-button text-sm px-4 py-2"
          >
            CLOSE
          </button>
        </div>

        <div className="space-y-4">
          {contracts.length === 0 ? (
            <div className="text-cyberpunk-light/50 text-center py-8">
              No active contracts
            </div>
          ) : (
            contracts.map((contract) => (
              <div
                key={contract.id}
                className="bg-cyberpunk-dark border border-cyberpunk-primary rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-cyberpunk-primary">
                      {contract.type.toUpperCase()}
                    </h3>
                    <div className="text-sm text-cyberpunk-light">
                      Status: {contract.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-cyberpunk-accent font-bold">
                      {contract.reward} credits
                    </div>
                    <div className="text-sm text-cyberpunk-light">
                      Time: {contract.timeLimit}min
                    </div>
                  </div>
                </div>
                
                <div className="text-cyberpunk-light mb-4">
                  {contract.description}
                </div>
                
                <div className="flex space-x-2">
                  <button className="cyber-button text-sm px-4 py-2">
                    ACCEPT
                  </button>
                  <button className="bg-cyberpunk-gray border border-cyberpunk-light text-cyberpunk-light hover:bg-cyberpunk-light hover:text-cyberpunk-dark text-sm px-4 py-2 rounded transition-colors">
                    DECLINE
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}



