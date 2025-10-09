// Game settings system with competitive fairness features
export interface GameSettings {
  // Display settings
  enforceZoomFairness: boolean
  manualZoom?: number
  maxViewDistance: number
  
  // Performance settings
  maxBuildingsPerChunk: number
  maxRenderDistance: number
  
  // Competitive settings
  allowCustomZoom: boolean
  competitiveMode: boolean
}

export class GameSettingsManager {
  private settings: GameSettings
  private static readonly STORAGE_KEY = 'fixer_game_settings'
  
  constructor() {
    this.settings = this.loadSettings()
  }
  
  private getDefaultSettings(): GameSettings {
    return {
      // Fair play by default
      enforceZoomFairness: true,
      manualZoom: undefined,
      maxViewDistance: 1000,
      
      // Performance defaults
      maxBuildingsPerChunk: 50,
      maxRenderDistance: 1500,
      
      // Competitive settings
      allowCustomZoom: false,
      competitiveMode: true
    }
  }
  
  private loadSettings(): GameSettings {
    try {
      const stored = localStorage.getItem(GameSettingsManager.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with defaults to ensure all properties exist
        return { ...this.getDefaultSettings(), ...parsed }
      }
    } catch (error) {
      console.warn('Failed to load game settings:', error)
    }
    
    return this.getDefaultSettings()
  }
  
  saveSettings(): void {
    try {
      localStorage.setItem(GameSettingsManager.STORAGE_KEY, JSON.stringify(this.settings))
      console.log('🎮 Game settings saved')
    } catch (error) {
      console.warn('Failed to save game settings:', error)
    }
  }
  
  getSettings(): Readonly<GameSettings> {
    return { ...this.settings }
  }
  
  updateSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
    this.settings[key] = value
    this.saveSettings()
    
    // Special handling for competitive mode
    if (key === 'competitiveMode' && value === true) {
      // Force fair settings in competitive mode
      this.settings.enforceZoomFairness = true
      this.settings.allowCustomZoom = false
      this.settings.maxViewDistance = 1000
      console.log('🏆 Competitive mode enabled - enforcing fair play settings')
    }
  }
  
  // Get the effective zoom for the current resolution
  getEffectiveZoom(rendererZoom: number, canvasWidth: number, canvasHeight: number): number {
    if (!this.settings.enforceZoomFairness && this.settings.manualZoom !== undefined) {
      // Allow manual zoom only if not enforcing fairness
      return Math.max(1.0, Math.min(5.0, this.settings.manualZoom))
    }
    
    // Use renderer's fair zoom calculation
    return rendererZoom
  }
  
  // Check if the current configuration gives unfair advantage
  isConfigurationFair(canvasWidth: number, canvasHeight: number, zoom: number): boolean {
    const aspectRatio = canvasWidth / canvasHeight
    const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight)
    
    // Reference: 1920x1080 with zoom 2.7
    const referenceDiagonal = Math.sqrt(1920 * 1920 + 1080 * 1080)
    const referenceAspectRatio = 1920 / 1080
    
    // Calculate effective view area
    const viewArea = (diagonal / zoom) / (referenceDiagonal / 2.7)
    
    // Check for unfair advantages
    const hasUltraWideAdvantage = aspectRatio > referenceAspectRatio * 1.6
    const hasViewDistanceAdvantage = viewArea > 1.3
    
    return !hasUltraWideAdvantage && !hasViewDistanceAdvantage
  }
  
  // Get settings validation warnings
  getValidationWarnings(canvasWidth: number, canvasHeight: number, zoom: number): string[] {
    const warnings: string[] = []
    
    if (!this.isConfigurationFair(canvasWidth, canvasHeight, zoom)) {
      warnings.push('Current display configuration may provide unfair advantage in multiplayer')
    }
    
    if (!this.settings.enforceZoomFairness && !this.settings.competitiveMode) {
      warnings.push('Zoom fairness is disabled - this may impact competitive balance')
    }
    
    const aspectRatio = canvasWidth / canvasHeight
    if (aspectRatio > 2.5) {
      warnings.push('Ultra-wide display detected - consider enabling competitive mode for fair play')
    }
    
    return warnings
  }
}

// Global instance
export const gameSettings = new GameSettingsManager()