import { useGameStore } from '../../stores/gameStore';

interface InventoryProps {
  onClose: () => void;
}

export function Inventory({ onClose }: InventoryProps) {
  const { inventory } = useGameStore();

  return (
    <div className="w-full h-full bg-cyberpunk-dark/95 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-cyberpunk-gray border border-cyberpunk-primary rounded-lg p-6 w-full max-w-4xl h-5/6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyberpunk-primary">
            INVENTORY
          </h2>
          <button onClick={onClose} className="cyber-button text-sm px-4 py-2">
            CLOSE
          </button>
        </div>

        {/* Grid Inventory */}
        <div className="grid grid-cols-10 gap-1 bg-cyberpunk-dark p-4 rounded border border-cyberpunk-primary">
          {Array.from({ length: 60 }, (_, i) => {
            const item = inventory.find(
              item =>
                item.position.x <= i % 10 &&
                item.position.x + item.gridSize.width > i % 10 &&
                item.position.y <= Math.floor(i / 10) &&
                item.position.y + item.gridSize.height > Math.floor(i / 10)
            );

            return (
              <div
                key={i}
                className="aspect-square border border-cyberpunk-primary/30 bg-cyberpunk-gray/50 hover:bg-cyberpunk-primary/20 transition-colors"
              >
                {item && (
                  <div
                    className="w-full h-full bg-cyberpunk-primary/80 border border-cyberpunk-primary flex items-center justify-center text-xs text-cyberpunk-dark font-bold"
                    style={{
                      gridColumn: `span ${item.gridSize.width}`,
                      gridRow: `span ${item.gridSize.height}`,
                    }}
                  >
                    {item.name.charAt(0)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Item Details */}
        <div className="mt-6">
          <h3 className="text-lg font-bold text-cyberpunk-primary mb-4">
            ITEMS
          </h3>
          <div className="space-y-2">
            {inventory.length === 0 ? (
              <div className="text-cyberpunk-light/50 text-center py-8">
                No items in inventory
              </div>
            ) : (
              inventory.map(item => (
                <div
                  key={item.id}
                  className="bg-cyberpunk-dark border border-cyberpunk-primary rounded p-3 flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold text-cyberpunk-primary">
                      {item.name}
                    </div>
                    <div className="text-sm text-cyberpunk-light">
                      {item.type}
                    </div>
                  </div>
                  <div className="text-cyberpunk-accent">
                    {item.gridSize.width}x{item.gridSize.height}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
