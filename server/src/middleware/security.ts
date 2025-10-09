import { NextFunction, Request, Response } from 'express';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance();

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Recursively sanitize object properties
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove potential XSS and injection attempts
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Request validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /(\$\{.*\})/g, // Template injection
    /(union\s+select)/gi, // SQL injection
    /(script\s*>)/gi, // XSS
    /(eval\s*\()/gi, // Code injection
    /(document\s*\.\s*cookie)/gi, // Cookie theft
  ];

  const checkForSuspiciousContent = (content: string): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(content));
  };

  // Check request body
  const bodyString = JSON.stringify(req.body || {});
  if (checkForSuspiciousContent(bodyString)) {
    logger.securityEvent('Suspicious request body detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      body: req.body,
    });
    
    return res.status(400).json({
      error: 'Invalid request content',
      code: 'SUSPICIOUS_CONTENT',
    });
  }

  // Check query parameters
  const queryString = JSON.stringify(req.query || {});
  if (checkForSuspiciousContent(queryString)) {
    logger.securityEvent('Suspicious query parameters detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      query: req.query,
    });
    
    return res.status(400).json({
      error: 'Invalid query parameters',
      code: 'SUSPICIOUS_CONTENT',
    });
  }

  next();
};

// Request size limiter
export const requestSizeLimit = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    
    if (contentLength > maxSize) {
      logger.securityEvent('Request size limit exceeded', {
        ip: req.ip,
        contentLength,
        maxSize,
        url: req.url,
      });
      
      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: `${maxSize} bytes`,
      });
    }
    
    next();
  };
};

// IP whitelist/blacklist middleware
export const ipFilter = (options: {
  whitelist?: string[];
  blacklist?: string[];
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Check blacklist first
    if (options.blacklist && options.blacklist.includes(clientIp)) {
      logger.securityEvent('Blocked IP attempted access', {
        ip: clientIp,
        url: req.url,
        userAgent: req.get('User-Agent'),
      });
      
      return res.status(403).json({
        error: 'Access denied',
        code: 'IP_BLOCKED',
      });
    }
    
    // Check whitelist if provided
    if (options.whitelist && options.whitelist.length > 0) {
      if (!options.whitelist.includes(clientIp)) {
        logger.securityEvent('Non-whitelisted IP attempted access', {
          ip: clientIp,
          url: req.url,
          userAgent: req.get('User-Agent'),
        });
        
        return res.status(403).json({
          error: 'Access denied',
          code: 'IP_NOT_WHITELISTED',
        });
      }
    }
    
    next();
  };
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log request
  logger.debug('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    logger.debug('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
    });
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
      });
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};