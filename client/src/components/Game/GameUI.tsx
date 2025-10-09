import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Inventory } from './Inventory';
import { ContractPanel } from './ContractPanel';
import { HackingInterface } from './HackingInterface';

export function GameUI() {
  const { player, contracts } = useGameStore();
  const [activePanel, setActivePanel] = useState<
    'inventory' | 'contracts' | 'hacking' | null
  >(null);

  if (!player) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top HUD */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <div className="bg-cyberpunk-gray/90 backdrop-blur-sm border border-cyberpunk-primary rounded-lg p-4">
          <div className="text-cyberpunk-primary font-bold text-lg">
            {player.username}
          </div>
          <div className="text-cyberpunk-light text-sm">
            Credits: {player.credits.toLocaleString()}
          </div>
          <div className="text-cyberpunk-light text-sm">
            Health: {player.health}/100
          </div>
        </div>
      </div>

      {/* Contract Notifications */}
      {contracts.length > 0 && (
        <div className="absolute top-4 right-4 pointer-events-auto">
          <div className="bg-cyberpunk-gray/90 backdrop-blur-sm border border-neon-pink rounded-lg p-4 max-w-sm">
            <div className="text-neon-pink font-bold mb-2">NEW CONTRACT</div>
            <div className="text-cyberpunk-light text-sm">
              {contracts[0].description}
            </div>
            <div className="text-cyberpunk-primary text-sm mt-2">
              Reward: {contracts[0].reward} credits
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <div className="bg-cyberpunk-gray/90 backdrop-blur-sm border border-cyberpunk-primary rounded-lg p-2 flex space-x-2">
          <button
            onClick={() =>
              setActivePanel(activePanel === 'inventory' ? null : 'inventory')
            }
            className="cyber-button text-sm px-3 py-1"
          >
            INVENTORY
          </button>
          <button
            onClick={() =>
              setActivePanel(activePanel === 'contracts' ? null : 'contracts')
            }
            className="cyber-button text-sm px-3 py-1"
          >
            CONTRACTS
          </button>
          <button
            onClick={() =>
              setActivePanel(activePanel === 'hacking' ? null : 'hacking')
            }
            className="cyber-button text-sm px-3 py-1"
          >
            HACK
          </button>
        </div>
      </div>

      {/* Panels */}
      {activePanel === 'inventory' && (
        <div className="absolute inset-0 pointer-events-auto">
          <Inventory onClose={() => setActivePanel(null)} />
        </div>
      )}

      {activePanel === 'contracts' && (
        <div className="absolute inset-0 pointer-events-auto">
          <ContractPanel onClose={() => setActivePanel(null)} />
        </div>
      )}

      {activePanel === 'hacking' && (
        <div className="absolute inset-0 pointer-events-auto">
          <HackingInterface onClose={() => setActivePanel(null)} />
        </div>
      )}
    </div>
  );
}
