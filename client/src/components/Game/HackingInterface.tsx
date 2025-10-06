import { useState, useEffect } from 'react'

interface HackingInterfaceProps {
  onClose: () => void
}

export function HackingInterface({ onClose }: HackingInterfaceProps) {
  const [isHacking, setIsHacking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [circuit, setCircuit] = useState<boolean[]>([])

  useEffect(() => {
    // Initialize circuit with random connections
    const newCircuit = Array.from({ length: 16 }, () => Math.random() > 0.5)
    setCircuit(newCircuit)
  }, [])

  const startHack = () => {
    setIsHacking(true)
    setProgress(0)
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsHacking(false)
          clearInterval(interval)
          return 100
        }
        return prev + 2
      })
    }, 100)
  }

  const toggleConnection = (index: number) => {
    if (isHacking) return
    
    setCircuit(prev => {
      const newCircuit = [...prev]
      newCircuit[index] = !newCircuit[index]
      return newCircuit
    })
  }

  return (
    <div className="w-full h-full bg-cyberpunk-dark/95 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-cyberpunk-gray border border-cyberpunk-primary rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyberpunk-primary">HACKING INTERFACE</h2>
          <button
            onClick={onClose}
            className="cyber-button text-sm px-4 py-2"
          >
            CLOSE
          </button>
        </div>

        {/* Circuit Grid */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {circuit.map((isConnected, index) => (
            <button
              key={index}
              onClick={() => toggleConnection(index)}
              disabled={isHacking}
              className={`aspect-square border-2 rounded transition-all ${
                isConnected
                  ? 'bg-cyberpunk-primary border-cyberpunk-primary text-cyberpunk-dark'
                  : 'bg-cyberpunk-dark border-cyberpunk-primary text-cyberpunk-primary'
              } ${
                isHacking ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cyberpunk-primary/20'
              }`}
            >
              {isConnected ? '●' : '○'}
            </button>
          ))}
        </div>

        {/* Progress Bar */}
        {isHacking && (
          <div className="mb-6">
            <div className="text-cyberpunk-light mb-2">HACKING PROGRESS</div>
            <div className="w-full bg-cyberpunk-dark rounded-full h-4 border border-cyberpunk-primary">
              <div
                className="bg-cyberpunk-primary h-full rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-cyberpunk-accent text-sm mt-1">{progress}%</div>
          </div>
        )}

        {/* Controls */}
        <div className="flex space-x-4">
          <button
            onClick={startHack}
            disabled={isHacking}
            className="cyber-button disabled:opacity-50"
          >
            {isHacking ? 'HACKING...' : 'START HACK'}
          </button>
          
          <button
            onClick={() => {
              setProgress(0)
              setIsHacking(false)
              setCircuit(Array.from({ length: 16 }, () => Math.random() > 0.5))
            }}
            disabled={isHacking}
            className="bg-cyberpunk-gray border border-cyberpunk-light text-cyberpunk-light hover:bg-cyberpunk-light hover:text-cyberpunk-dark disabled:opacity-50 px-4 py-2 rounded transition-colors"
          >
            RESET
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-sm text-cyberpunk-light">
          <div className="mb-2">Instructions:</div>
          <div>• Click nodes to create connections</div>
          <div>• Complete the circuit to hack the target</div>
          <div>• Avoid detection by security systems</div>
        </div>
      </div>
    </div>
  )
}



