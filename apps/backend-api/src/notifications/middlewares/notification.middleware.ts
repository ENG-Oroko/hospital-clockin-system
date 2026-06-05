// middlewares/notification.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// ==================== Request Tracking Middleware ====================

@Injectable()
export class NotificationRequestMiddleware implements NestMiddleware {
  private readonly logger = new Logger(NotificationRequestMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Add request ID for tracking
    const requestId = uuidv4();
    req['requestId'] = requestId;
    
    // Add request start time
    req['startTime'] = Date.now();
    
    // Log incoming request
    this.logger.debug(`[${requestId}] ${req.method} ${req.originalUrl}`);
    
    // Track response time
    res.on('finish', () => {
      const duration = Date.now() - req['startTime'];
      this.logger.debug(`[${requestId}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
  }
}

// ==================== Rate Limiting Middleware ====================

@Injectable()
export class NotificationRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(NotificationRateLimitMiddleware.name);
  
  // In-memory store (replace with Redis in production)
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  
  private readonly limits = {
    // Per user limits
    user: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
    },
    // Per IP limits
    ip: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    },
    // Per endpoint limits
    endpoints: {
      '/api/notifications/send': { windowMs: 60 * 1000, maxRequests: 10 },
      '/api/notifications/bulk': { windowMs: 60 * 1000, maxRequests: 5 },
      '/api/notifications/mark-read': { windowMs: 60 * 1000, maxRequests: 50 },
      '/api/notifications/preferences': { windowMs: 60 * 1000, maxRequests: 20 },
    },
  };

  use(req: Request, res: Response, next: NextFunction) {
    const userId = req['user']?.id || req.headers['x-user-id'] as string || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const endpoint = req.path;
    
    // Check user rate limit
    if (this.checkRateLimit(`user:${userId}`, this.limits.user)) {
      this.logger.warn(`Rate limit exceeded for user: ${userId}`);
      return res.status(429).json({
        statusCode: 429,
        message: 'Too many notification requests. Please try again later.',
        error: 'Rate Limit Exceeded',
        retryAfter: this.getRetryAfter(`user:${userId}`, this.limits.user.windowMs),
      });
    }
    
    // Check IP rate limit
    if (this.checkRateLimit(`ip:${ip}`, this.limits.ip)) {
      this.logger.warn(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({
        statusCode: 429,
        message: 'Too many requests from this IP. Please try again later.',
        error: 'Rate Limit Exceeded',
        retryAfter: this.getRetryAfter(`ip:${ip}`, this.limits.ip.windowMs),
      });
    }
    
    // Check endpoint-specific rate limit
    const endpointLimit = this.getEndpointLimit(endpoint);
    if (endpointLimit && this.checkRateLimit(`endpoint:${endpoint}:${userId}`, endpointLimit)) {
      this.logger.warn(`Rate limit exceeded for endpoint: ${endpoint} by user: ${userId}`);
      return res.status(429).json({
        statusCode: 429,
        message: `Too many requests to ${endpoint}. Please slow down.`,
        error: 'Rate Limit Exceeded',
        retryAfter: this.getRetryAfter(`endpoint:${endpoint}:${userId}`, endpointLimit.windowMs),
      });
    }
    
    next();
  }

  private checkRateLimit(key: string, limit: { windowMs: number; maxRequests: number }): boolean {
    const now = Date.now();
    const record = this.requests.get(key);
    
    if (!record) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + limit.windowMs,
      });
      return false;
    }
    
    if (now > record.resetTime) {
      // Reset window
      this.requests.set(key, {
        count: 1,
        resetTime: now + limit.windowMs,
      });
      return false;
    }
    
    // Increment count
    record.count++;
    this.requests.set(key, record);
    
    return record.count > limit.maxRequests;
  }

  private getRetryAfter(key: string, windowMs: number): number {
    const record = this.requests.get(key);
    if (!record) return 0;
    return Math.ceil((record.resetTime - Date.now()) / 1000);
  }

  private getEndpointLimit(endpoint: string): { windowMs: number; maxRequests: number } | null {
    for (const [pattern, limit] of Object.entries(this.limits.endpoints)) {
      if (endpoint.includes(pattern) || endpoint === pattern) {
        return limit;
      }
    }
    return null;
  }

  // Clean up expired records periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// ==================== Authentication Middleware ====================

@Injectable()
export class NotificationAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(NotificationAuthMiddleware.name);

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      this.logger.warn('Missing authorization header');
      return res.status(401).json({
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Invalid token format',
        error: 'Unauthorized',
      });
    }
    
    try {
      // Verify token and attach user to request
      // This would integrate with your auth service
      const user = await this.verifyToken(token);
      
      if (!user) {
        return res.status(401).json({
          statusCode: 401,
          message: 'Invalid or expired token',
          error: 'Unauthorized',
        });
      }
      
      req['user'] = user;
      next();
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      return res.status(401).json({
        statusCode: 401,
        message: 'Authentication failed',
        error: 'Unauthorized',
      });
    }
  }

  private async verifyToken(token: string): Promise<any> {
    // Implement token verification with your auth service
    // This is a placeholder
    // For now, accept any token in development
    if (process.env.NODE_ENV === 'development') {
      return { id: 'test-user', tenantId: 'test-tenant' };
    }
    
    // In production, verify with JWT or auth service
    // const payload = await this.jwtService.verifyAsync(token);
    // return payload;
    
    return null;
  }
}

// ==================== Request Validation Middleware ====================

@Injectable()
export class NotificationValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(NotificationValidationMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const { body, query, params } = req;
    
    // Validate content type for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'];
      
      if (!contentType || !contentType.includes('application/json')) {
        return res.status(415).json({
          statusCode: 415,
          message: 'Content-Type must be application/json',
          error: 'Unsupported Media Type',
        });
      }
      
      // Validate request body size
      const contentLength = parseInt(req.headers['content-length'] || '0');
      const maxSize = 1024 * 1024; // 1MB
      
      if (contentLength > maxSize) {
        return res.status(413).json({
          statusCode: 413,
          message: 'Request body too large. Maximum size is 1MB.',
          error: 'Payload Too Large',
        });
      }
      
      // Basic body validation
      if (!body || Object.keys(body).length === 0) {
        return res.status(400).json({
          statusCode: 400,
          message: 'Request body is required',
          error: 'Bad Request',
        });
      }
    }
    
    // Validate pagination parameters
    if (query.page) {
      const page = parseInt(query.page as string);
      if (isNaN(page) || page < 1) {
        return res.status(400).json({
          statusCode: 400,
          message: 'Page must be a positive integer',
          error: 'Bad Request',
        });
      }
      req.query.page = page.toString();
    }
    
    if (query.limit) {
      const limit = parseInt(query.limit as string);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({
          statusCode: 400,
          message: 'Limit must be between 1 and 100',
          error: 'Bad Request',
        });
      }
      req.query.limit = limit.toString();
    }
    
    next();
  }
}

// ==================== Logging Middleware ====================

@Injectable()
export class NotificationLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(NotificationLoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const requestId = req['requestId'] || uuidv4();
    
    // Log request
    this.logger.debug({
      type: 'request',
      requestId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req['user']?.id,
    });
    
    // Log response
    res.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.debug({
        type: 'response',
        requestId,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
    });
    
    next();
  }
}

// ==================== Security Headers Middleware ====================

@Injectable()
export class NotificationSecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).send();
    }
    
    next();
  }
}

// ==================== User Context Middleware ====================

@Injectable()
export class NotificationUserContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(NotificationUserContextMiddleware.name);

  async use(req: Request, res: Response, next: NextFunction) {
    const userId = req['user']?.id;
    const tenantId = req['user']?.tenantId || req.headers['x-tenant-id'] as string;
    
    if (!userId) {
      // For public endpoints, continue without user context
      if (this.isPublicEndpoint(req.path)) {
        return next();
      }
      
      return res.status(401).json({
        statusCode: 401,
        message: 'User context required',
        error: 'Unauthorized',
      });
    }
    
    if (!tenantId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Tenant context required. Provide x-tenant-id header.',
        error: 'Bad Request',
      });
    }
    
    // Attach context to request
    req['context'] = {
      userId,
      tenantId,
      requestId: req['requestId'],
      timestamp: new Date(),
    };
    
    // Validate user has access to tenant
    const hasAccess = await this.validateUserTenantAccess(userId, tenantId);
    
    if (!hasAccess) {
      return res.status(403).json({
        statusCode: 403,
        message: 'User does not have access to this tenant',
        error: 'Forbidden',
      });
    }
    
    next();
  }

  private isPublicEndpoint(path: string): boolean {
    const publicEndpoints = [
      '/health',
      '/api/health',
      '/api/notifications/webhook',
    ];
    
    return publicEndpoints.some(endpoint => path.startsWith(endpoint));
  }

  private async validateUserTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    // Implement user-tenant validation
    // This would check if the user belongs to the tenant
    // For now, return true
    return true;
  }
}

// ==================== Response Compression Middleware ====================

@Injectable()
export class NotificationCompressionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const acceptsEncoding = req.headers['accept-encoding'] as string || '';
    
    if (acceptsEncoding.includes('gzip')) {
      res.setHeader('Content-Encoding', 'gzip');
    } else if (acceptsEncoding.includes('deflate')) {
      res.setHeader('Content-Encoding', 'deflate');
    }
    
    next();
  }
}

// ==================== Idempotency Middleware ====================

@Injectable()
export class NotificationIdempotencyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(NotificationIdempotencyMiddleware.name);
  private processedRequests: Map<string, { response: any; timestamp: number }> = new Map();
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours

  use(req: Request, res: Response, next: NextFunction) {
    // Only apply to POST, PUT, PATCH requests
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }
    
    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    if (!idempotencyKey) {
      // Generate a key for response caching
      req['idempotencyKey'] = uuidv4();
      return next();
    }
    
    // Check if request was already processed
    const existing = this.processedRequests.get(idempotencyKey);
    
    if (existing && Date.now() - existing.timestamp < this.TTL) {
      this.logger.warn(`Duplicate request detected with key: ${idempotencyKey}`);
      return res.status(200).json(existing.response);
    }
    
    // Store original send function
    const originalSend = res.json.bind(res);
    
    // Override json function to cache response
    res.json = (body: any) => {
      this.processedRequests.set(idempotencyKey, {
        response: body,
        timestamp: Date.now(),
      });
      
      // Clean up old entries
      this.cleanup();
      
      return originalSend(body);
    };
    
    next();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.processedRequests.entries()) {
      if (now - value.timestamp > this.TTL) {
        this.processedRequests.delete(key);
      }
    }
  }
}

// ==================== Export all middlewares ====================

export const NotificationMiddlewares = {
  Request: NotificationRequestMiddleware,
  RateLimit: NotificationRateLimitMiddleware,
  Auth: NotificationAuthMiddleware,
  Validation: NotificationValidationMiddleware,
  Logging: NotificationLoggingMiddleware,
  Security: NotificationSecurityMiddleware,
  UserContext: NotificationUserContextMiddleware,
  Compression: NotificationCompressionMiddleware,
  Idempotency: NotificationIdempotencyMiddleware,
};