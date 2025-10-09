export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = this.getLogLevel();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    switch (level) {
      case 'ERROR':
        return LogLevel.ERROR;
      case 'WARN':
        return LogLevel.WARN;
      case 'INFO':
        return LogLevel.INFO;
      case 'DEBUG':
        return LogLevel.DEBUG;
      default:
        return this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    
    let logMessage = `[${timestamp}] [${levelName}] ${message}`;
    
    if (data) {
      if (this.isDevelopment) {
        logMessage += `\n${JSON.stringify(data, null, 2)}`;
      } else {
        logMessage += ` ${JSON.stringify(data)}`;
      }
    }
    
    return logMessage;
  }

  private writeLog(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, data);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
    }

    // In production, you might want to send logs to external service
    if (!this.isDevelopment && level <= LogLevel.ERROR) {
      this.sendToExternalLogging(level, message, data);
    }
  }

  private sendToExternalLogging(level: LogLevel, message: string, data?: any): void {
    // Placeholder for external logging service integration
    // Could integrate with services like Winston, Loggly, DataDog, etc.
    // For now, just ensure critical errors are visible
    if (level === LogLevel.ERROR) {
      console.error('CRITICAL ERROR:', message, data);
    }
  }

  public error(message: string, data?: any): void {
    this.writeLog(LogLevel.ERROR, message, data);
  }

  public warn(message: string, data?: any): void {
    this.writeLog(LogLevel.WARN, message, data);
  }

  public info(message: string, data?: any): void {
    this.writeLog(LogLevel.INFO, message, data);
  }

  public debug(message: string, data?: any): void {
    this.writeLog(LogLevel.DEBUG, message, data);
  }

  // Game-specific logging methods
  public gameEvent(event: string, playerId?: string, data?: any): void {
    this.info(`Game Event: ${event}`, {
      playerId,
      ...data,
      category: 'game_event',
    });
  }

  public playerAction(action: string, playerId: string, data?: any): void {
    this.debug(`Player Action: ${action}`, {
      playerId,
      ...data,
      category: 'player_action',
    });
  }

  public securityEvent(event: string, data?: any): void {
    this.warn(`Security Event: ${event}`, {
      ...data,
      category: 'security',
    });
  }

  public performanceMetric(metric: string, value: number, unit?: string): void {
    this.debug(`Performance: ${metric}`, {
      value,
      unit,
      category: 'performance',
    });
  }
}