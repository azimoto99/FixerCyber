// API service for communicating with the backend
// Prefer explicit VITE_API_URL; fallback to same-origin '/api' for production proxies
const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL as string) || '/api'

// Mock data for development when backend is not available
const MOCK_MODE = true // Set to false when backend is ready

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        // Handle different types of errors
        let errorData: any = {}
        const contentType = response.headers.get('content-type')
        
        if (contentType && contentType.includes('application/json')) {
          try {
            errorData = await response.json()
          } catch (jsonError) {
            // If JSON parsing fails, create a generic error
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
          }
        } else {
          // Non-JSON response (like 502 Bad Gateway)
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      // Handle successful response
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        try {
          return await response.json()
        } catch (jsonError) {
          console.warn('Response claimed to be JSON but failed to parse:', jsonError)
          throw new Error('Invalid JSON response from server')
        }
      } else {
        // Non-JSON successful response
        const text = await response.text()
        if (!text.trim()) {
          return {} as T // Return empty object for empty responses with proper typing
        }
        throw new Error('Expected JSON response but received: ' + contentType)
      }
    } catch (error) {
      console.error('API request failed:', error)
      
      // Provide more helpful error messages for common issues
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Is the server running?')
      }
      
      throw error
    }
  }

  // Auth endpoints
  async login(username: string, password: string) {
    if (MOCK_MODE) {
      // Mock successful login
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            token: 'mock_token_' + Date.now(),
            user: { id: 'mock_user', username, email: username + '@example.com' }
          })
        }, 500)
      })
    }
    
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  }

  async register(username: string, email: string, password: string) {
    if (MOCK_MODE) {
      // Mock successful registration
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: 'Registration successful',
            user: { id: 'mock_user', username, email }
          })
        }, 500)
      })
    }
    
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    })
  }

  async verifyToken() {
    return this.request('/auth/verify')
  }

  // Player endpoints
  async getPlayer() {
    if (MOCK_MODE) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: 'mock_player',
            username: 'TestPlayer',
            position: { x: 500, y: 500 },
            health: 100,
            credits: 1000,
            isAlive: true,
            inventory: [],
            level: 1,
            experience: 0
          })
        }, 300)
      })
    }
    
    return this.request('/players/me')
  }

  async createPlayer(username: string) {
    if (MOCK_MODE) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            player: {
              id: 'mock_player',
              username,
              position: { x: 500, y: 500 },
              health: 100,
              credits: 1000,
              isAlive: true,
              inventory: [],
              level: 1,
              experience: 0
            }
          })
        }, 300)
      })
    }
    
    return this.request('/players/create', {
      method: 'POST',
      body: JSON.stringify({ username }),
    })
  }

  async updatePlayerPosition(x: number, y: number) {
    return this.request('/players/position', {
      method: 'PUT',
      body: JSON.stringify({ x, y }),
    })
  }

  async getPlayerInventory() {
    return this.request('/players/inventory')
  }

  async updatePlayerInventory(items: any[]) {
    return this.request('/players/inventory', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    })
  }

  // Contract endpoints
  async getAvailableContracts() {
    return this.request('/contracts')
  }

  async getPlayerContracts() {
    return this.request('/contracts/active')
  }

  async acceptContract(contractId: string) {
    return this.request(`/contracts/${contractId}/accept`, {
      method: 'POST',
    })
  }

  async completeContract(contractId: string, completionData: any) {
    return this.request(`/contracts/${contractId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ completionData }),
    })
  }

  async cancelContract(contractId: string) {
    return this.request(`/contracts/${contractId}/cancel`, {
      method: 'POST',
    })
  }

  // World endpoints
  async getChunk(x: number, y: number) {
    return this.request(`/world/chunk/${x}/${y}`)
  }

  async getNearbyPlayers(x: number, y: number, radius: number = 1000) {
    return this.request(`/world/players/nearby?x=${x}&y=${y}&radius=${radius}`)
  }

  async getWorldInfo() {
    return this.request('/world/info')
  }

  async generateChunk(x: number, y: number) {
    return this.request(`/world/chunk/${x}/${y}/generate`, {
      method: 'POST',
    })
  }
}

export const apiService = new ApiService()



