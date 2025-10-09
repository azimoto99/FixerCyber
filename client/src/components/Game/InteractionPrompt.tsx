import { useEffect, useState } from 'react';
import { GameEngine } from '../../game/engine/GameEngine';

interface InteractionPromptProps {
  gameEngine: GameEngine | null;
}

export function InteractionPrompt({ gameEngine }: InteractionPromptProps) {
  const [canInteract, setCanInteract] = useState(false);
  const [buildingType, setBuildingType] = useState<string>('');

  useEffect(() => {
    if (!gameEngine) return;

    const interval = setInterval(() => {
      const interactionSystem = gameEngine.getBuildingInteractionSystem();
      if (interactionSystem) {
        const door = interactionSystem.getNearbyDoor();
        setCanInteract(door !== null);
        setBuildingType(door?.buildingType || '');
      }
    }, 100); // Check 10 times per second

    return () => clearInterval(interval);
  }, [gameEngine]);

  if (!canInteract) return null;

  const displayName =
    buildingType.charAt(0).toUpperCase() + buildingType.slice(1);

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-black/80 border-2 border-cyan-500 px-6 py-3 rounded-lg shadow-lg shadow-cyan-500/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 border-2 border-cyan-500 rounded flex items-center justify-center text-cyan-400 font-bold text-xs">
            SPACE
          </div>
          <div className="text-cyan-100 font-medium">
            Enter <span className="text-cyan-400">{displayName}</span>
          </div>
        </div>
        <div className="mt-1 text-xs text-cyan-500/70 text-center">
          Press Space to interact
        </div>
      </div>
    </div>
  );
}
