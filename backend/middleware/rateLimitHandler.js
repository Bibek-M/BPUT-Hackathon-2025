const config = require('../config/openai-config');

// Simple in-memory store for request tracking
// In production, consider using Redis or database
const requestTracker = {
  requests: new Map(),
  
  // Clean up old entries
  cleanup() {
    const now = Date.now();
    const windowMs = config.usage.rateLimitWindow;
    
    this.requests.forEach((timestamps, ip) => {
      const validTimestamps = timestamps.filter(timestamp => now - timestamp < windowMs);
      if (validTimestamps.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, validTimestamps);
      }
    });
  },
  
  // Track a request
  track(ip) {
    const now = Date.now();
    const timestamps = this.requests.get(ip) || [];
    timestamps.push(now);
    this.requests.set(ip, timestamps);
    
    // Cleanup old entries every 100 requests
    if (Math.random() < 0.01) {
      this.cleanup();
    }
    
    return timestamps.length;
  },
  
  // Check if rate limit is exceeded
  isRateLimited(ip) {
    const timestamps = this.requests.get(ip) || [];
    const now = Date.now();
    const windowMs = config.usage.rateLimitWindow;
    const validRequests = timestamps.filter(timestamp => now - timestamp < windowMs);
    
    return validRequests.length >= 10; // 10 requests per minute per IP
  }
};

// Middleware to check rate limits before making OpenAI requests
const rateLimitMiddleware = (req, res, next) => {
  if (!config.usage.trackRequests) {
    return next();
  }
  
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (requestTracker.isRateLimited(clientIP)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many AI requests. Please wait before trying again.',
      retryAfter: Math.ceil(config.usage.rateLimitWindow / 1000) // seconds
    });
  }
  
  // Track this request
  requestTracker.track(clientIP);
  next();
};

// Enhanced OpenAI error handler
const handleOpenAIError = (error, fallbackMessage = null) => {
  console.error('OpenAI API Error:', {
    status: error.status,
    code: error.code,
    type: error.type,
    message: error.message
  });
  
  // Determine appropriate response based on error type
  let response = {
    error: 'AI service temporarily unavailable',
    message: fallbackMessage || config.fallbacks.noCompletion,
    code: error.code || 'unknown_error'
  };
  
  let statusCode = 503;
  
  switch (error.status) {
    case 429: // Rate limit
      response.message = config.fallbacks.quotaExceeded;
      response.retryAfter = error.headers?.['retry-after'] || 60;
      statusCode = 429;
      break;
      
    case 401: // Invalid API key
      response.message = 'AI service configuration error';
      statusCode = 503;
      break;
      
    case 400: // Bad request
      response.message = 'Invalid request to AI service';
      statusCode = 400;
      break;
      
    default:
      statusCode = 503;
  }
  
  return { response, statusCode };
};

// Utility function for OpenAI calls with comprehensive error handling
const callOpenAIWithRetry = async (apiCall, options = {}) => {
  const {
    maxRetries = config.rateLimit.maxRetries,
    baseDelay = config.rateLimit.baseDelayMs,
    maxDelay = config.rateLimit.maxDelayMs,
    backoffMultiplier = config.rateLimit.backoffMultiplier,
    fallbackMessage = null
  } = options;
  
  let lastError;
  let currentDelay = baseDelay;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add timeout to the API call
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), config.api.timeoutMs);
      });
      
      const result = await Promise.race([apiCall(), timeoutPromise]);
      return result;
      
    } catch (error) {
      lastError = error;
      
      // Only retry on specific errors
      const shouldRetry = (
        error.status === 429 || // Rate limit
        error.status === 503 || // Service unavailable
        error.status === 502 || // Bad gateway
        error.message === 'Request timeout' ||
        (error.error && error.error.type === 'insufficient_quota')
      );
      
      if (!shouldRetry || attempt === maxRetries - 1) {
        break;
      }
      
      console.warn(`OpenAI API call failed (attempt ${attempt + 1}/${maxRetries}):`, {
        status: error.status,
        type: error.error?.type,
        retryIn: currentDelay
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      
      // Exponential backoff with jitter
      currentDelay = Math.min(
        currentDelay * backoffMultiplier + Math.random() * 1000,
        maxDelay
      );
    }
  }
  
  // If we get here, all retries failed
  throw lastError;
};

module.exports = {
  rateLimitMiddleware,
  handleOpenAIError,
  callOpenAIWithRetry,
  requestTracker
};