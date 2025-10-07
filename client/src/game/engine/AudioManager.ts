// Audio management system
export class AudioManager {
  private sounds: Map<string, any> = new Map()
  private music: any = null
  private isMuted = false
  private masterVolume = 1.0
  private sfxVolume = 0.8
  private musicVolume = 0.6

  constructor() {
    this.setupAudioContext()
  }

  private setupAudioContext() {
    // Initialize Web Audio API context
    try {
      // const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      // this._audioContext = new AudioContext() // Commented out unused variable
    } catch (error) {
      console.warn('Web Audio API not supported:', error)
    }
  }

  // private _audioContext: AudioContext | null = null // Unused for now

  // Sound loading and management
  loadSound(name: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url)
      audio.preload = 'auto'
      
      audio.addEventListener('canplaythrough', () => {
        this.sounds.set(name, audio)
        resolve()
      })
      
      audio.addEventListener('error', (error: Event) => {
        console.error(`Failed to load sound ${name}:`, error)
        reject(error)
      })
      
      audio.load()
    })
  }

  playSound(name: string, volume: number = 1.0): void {
    if (this.isMuted) return

    const sound = this.sounds.get(name)
    if (sound) {
      sound.volume = volume * this.sfxVolume * this.masterVolume
      sound.currentTime = 0
      sound.play().catch((error: Error) => {
        console.warn(`Failed to play sound ${name}:`, error)
      })
    }
  }

  playMusic(name: string, loop: boolean = true): void {
    if (this.isMuted) return

    this.stopMusic()
    
    const music = this.sounds.get(name)
    if (music) {
      music.volume = this.musicVolume * this.masterVolume
      music.loop = loop
      music.play().catch((error: Error) => {
        console.warn(`Failed to play music ${name}:`, error)
      })
      this.music = music
    }
  }

  stopMusic(): void {
    if (this.music) {
      this.music.pause()
      this.music.currentTime = 0
      this.music = null
    }
  }

  // Game-specific sound effects
  playShootSound(weaponType: string): void {
    const sounds = {
      pistol: 'shoot_pistol',
      rifle: 'shoot_rifle',
      smg: 'shoot_smg',
      cyber: 'shoot_cyber'
    }
    
    const soundName = sounds[weaponType as keyof typeof sounds] || 'shoot_pistol'
    this.playSound(soundName)
  }

  playHitSound(damageType: string): void {
    const sounds = {
      kinetic: 'hit_kinetic',
      energy: 'hit_energy',
      emp: 'hit_emp'
    }
    
    const soundName = sounds[damageType as keyof typeof sounds] || 'hit_kinetic'
    this.playSound(soundName)
  }

  playHackSound(stage: string): void {
    const sounds = {
      start: 'hack_start',
      progress: 'hack_progress',
      success: 'hack_success',
      failure: 'hack_failure'
    }
    
    const soundName = sounds[stage as keyof typeof sounds] || 'hack_progress'
    this.playSound(soundName)
  }

  playUISound(action: string): void {
    const sounds = {
      click: 'ui_click',
      hover: 'ui_hover',
      success: 'ui_success',
      error: 'ui_error',
      notification: 'ui_notification'
    }
    
    const soundName = sounds[action as keyof typeof sounds] || 'ui_click'
    this.playSound(soundName, 0.5)
  }

  playAmbientSound(environment: string): void {
    const sounds = {
      corporate: 'ambient_corporate',
      residential: 'ambient_residential',
      industrial: 'ambient_industrial',
      underground: 'ambient_underground',
      wasteland: 'ambient_wasteland'
    }
    
    const soundName = sounds[environment as keyof typeof sounds] || 'ambient_corporate'
    this.playSound(soundName, 0.3)
  }

  // Volume controls
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    this.updateAllVolumes()
  }

  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume))
    this.updateAllVolumes()
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume))
    if (this.music) {
      this.music.volume = this.musicVolume * this.masterVolume
    }
  }

  private updateAllVolumes(): void {
    this.sounds.forEach(sound => {
      if (sound !== this.music) {
        sound.volume = this.sfxVolume * this.masterVolume
      }
    })
  }

  // Mute controls
  toggleMute(): void {
    this.isMuted = !this.isMuted
    if (this.isMuted) {
      this.stopMusic()
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted
    if (muted) {
      this.stopMusic()
    }
  }

  isAudioMuted(): boolean {
    return this.isMuted
  }

  // Cleanup
  destroy(): void {
    this.stopMusic()
    this.sounds.forEach(sound => {
      sound.pause()
      sound.src = ''
    })
    this.sounds.clear()
  }
}


