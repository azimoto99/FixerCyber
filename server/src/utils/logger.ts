// Logging utility
export class Logger {
  private static instance: Logger
  private isDevelopment: boolean

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const baseMessage = `[${timestamp}] [${level}] ${message}`
    
    if (data) {
      return `${baseMessage} ${JSON.stringify(data)}`
    }
    
    return baseMessage
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage('INFO', message, data))
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage('WARN', message, data))
  }

  error(message: string, error?: Error | any): void {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error
    
    console.error(this.formatMessage('ERROR', message, errorData))
  }

  debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('DEBUG', message, data))
    }
  }

  gameEvent(event: string, playerId: string, data?: any): void {
    this.info(`GAME_EVENT: ${event}`, { playerId, ...data })
  }
}

export const logger = Logger.getInstance()



