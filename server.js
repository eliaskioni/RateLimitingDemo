const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Store active limiters for dynamic configuration
let activeLimiters = {
  fixedWindow: null,
  slidingWindow: null,
  tokenBucket: null
};

// Token bucket implementation using rate-limiter-flexible
let tokenBucketLimiter = null;

// Default rate limiting parameters
let rateLimitConfig = {
  fixedWindow: {
    windowMs: 60000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many requests from this IP, please try again after a minute'
  },
  slidingWindow: {
    points: 10, // Number of points
    duration: 60, // Per 60 seconds
    blockDuration: 0 // Do not block if consumed more than points
  },
  tokenBucket: {
    points: 10, // Number of tokens
    duration: 60, // Per 60 seconds
    refillRate: 1, // Tokens added per interval
    refillInterval: 6 // Interval in seconds (10 tokens per minute)
  }
};

// Configure fixed window limiter (express-rate-limit)
const configureFixedWindowLimiter = () => {
  // Create the limiter at initialization time, not in a request handler
  activeLimiters.fixedWindow = rateLimit({
    windowMs: rateLimitConfig.fixedWindow.windowMs,
    max: rateLimitConfig.fixedWindow.max,
    message: rateLimitConfig.fixedWindow.message,
    standardHeaders: true,
    legacyHeaders: false,
    // Add a custom key generator that doesn't rely on req.ip for simulation
    keyGenerator: (req) => req.ip || 'default-ip'
  });
};

// Configure sliding window limiter (rate-limiter-flexible)
const configureSlidingWindowLimiter = () => {
  activeLimiters.slidingWindow = new RateLimiterMemory({
    points: rateLimitConfig.slidingWindow.points,
    duration: rateLimitConfig.slidingWindow.duration,
    blockDuration: rateLimitConfig.slidingWindow.blockDuration
  });
};

// Configure token bucket limiter (rate-limiter-flexible with refill)
const configureTokenBucketLimiter = () => {
  tokenBucketLimiter = new RateLimiterMemory({
    points: rateLimitConfig.tokenBucket.points,
    duration: rateLimitConfig.tokenBucket.duration
  });
  
  // Set up token refill interval
  if (global.tokenRefillInterval) {
    clearInterval(global.tokenRefillInterval);
  }
  
  global.tokenRefillInterval = setInterval(() => {
    tokenBucketLimiter.reward(rateLimitConfig.tokenBucket.refillRate);
  }, rateLimitConfig.tokenBucket.refillInterval * 1000);
  
  activeLimiters.tokenBucket = tokenBucketLimiter;
};

// Initialize all limiters
configureFixedWindowLimiter();
configureSlidingWindowLimiter();
configureTokenBucketLimiter();

// API endpoint to update rate limiting configuration
app.post('/api/config', (req, res) => {
  const { algorithm, config } = req.body;
  
  if (!algorithm || !config) {
    return res.status(400).json({ error: 'Missing algorithm or configuration' });
  }
  
  if (!rateLimitConfig[algorithm]) {
    return res.status(400).json({ error: 'Invalid algorithm' });
  }
  
  // Update configuration
  rateLimitConfig[algorithm] = { ...rateLimitConfig[algorithm], ...config };
  
  // Reconfigure the appropriate limiter
  switch (algorithm) {
    case 'fixedWindow':
      configureFixedWindowLimiter();
      break;
    case 'slidingWindow':
      configureSlidingWindowLimiter();
      break;
    case 'tokenBucket':
      configureTokenBucketLimiter();
      break;
  }
  
  res.json({ success: true, config: rateLimitConfig[algorithm] });
});

// API endpoint to get current configuration
app.get('/api/config', (req, res) => {
  res.json(rateLimitConfig);
});

// Fixed Window Rate Limited endpoint
app.get('/api/fixed-window', activeLimiters.fixedWindow, (req, res) => {
  res.json({
    success: true,
    message: 'Request successful',
    timestamp: new Date().toISOString(),
    headers: {
      'X-RateLimit-Limit': req.rateLimit.limit,
      'X-RateLimit-Remaining': req.rateLimit.remaining,
      'X-RateLimit-Reset': req.rateLimit.resetTime
    }
  });
});

// Sliding Window Rate Limited endpoint
app.get('/api/sliding-window', async (req, res) => {
  try {
    const rateLimiterRes = await activeLimiters.slidingWindow.consume(req.ip);
    res.json({
      success: true,
      message: 'Request successful',
      timestamp: new Date().toISOString(),
      headers: {
        'X-RateLimit-Limit': rateLimitConfig.slidingWindow.points,
        'X-RateLimit-Remaining': rateLimiterRes.remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
      }
    });
  } catch (error) {
    res.status(429).json({
      success: false,
      message: 'Too many requests',
      timestamp: new Date().toISOString(),
      headers: {
        'X-RateLimit-Limit': rateLimitConfig.slidingWindow.points,
        'X-RateLimit-Reset': new Date(Date.now() + error.msBeforeNext).toISOString()
      }
    });
  }
});

// Token Bucket Rate Limited endpoint
app.get('/api/token-bucket', async (req, res) => {
  try {
    const rateLimiterRes = await activeLimiters.tokenBucket.consume(req.ip);
    res.json({
      success: true,
      message: 'Request successful',
      timestamp: new Date().toISOString(),
      headers: {
        'X-RateLimit-Limit': rateLimitConfig.tokenBucket.points,
        'X-RateLimit-Remaining': rateLimiterRes.remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString(),
        'X-RateLimit-RefillRate': rateLimitConfig.tokenBucket.refillRate,
        'X-RateLimit-RefillInterval': rateLimitConfig.tokenBucket.refillInterval
      }
    });
  } catch (error) {
    res.status(429).json({
      success: false,
      message: 'Too many requests',
      timestamp: new Date().toISOString(),
      headers: {
        'X-RateLimit-Limit': rateLimitConfig.tokenBucket.points,
        'X-RateLimit-Reset': new Date(Date.now() + error.msBeforeNext).toISOString(),
        'X-RateLimit-RefillRate': rateLimitConfig.tokenBucket.refillRate,
        'X-RateLimit-RefillInterval': rateLimitConfig.tokenBucket.refillInterval
      }
    });
  }
});

// Simulation endpoint to test multiple requests
app.post('/api/simulate', async (req, res) => {
  const { algorithm, requests, delay } = req.body;
  
  if (!algorithm || !requests || requests <= 0) {
    return res.status(400).json({ error: 'Invalid simulation parameters' });
  }
  
  const results = [];
  
  // Create a unique IP for this simulation to avoid affecting other tests
  const simulationIP = `simulation-${Date.now()}`;
  
  // Simulate requests
  for (let i = 0; i < requests; i++) {
    if (delay > 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    try {
      let response;
      if (algorithm === 'fixedWindow') {
        // For fixed window, we'll use a different approach
        // Instead of using the middleware directly, we'll track requests manually
        const currentTime = Date.now();
        const windowMs = rateLimitConfig.fixedWindow.windowMs;
        const maxRequests = rateLimitConfig.fixedWindow.max;
        
        // Create a simple in-memory store for this simulation
        if (!global.fixedWindowSimulations) {
          global.fixedWindowSimulations = {};
        }
        
        if (!global.fixedWindowSimulations[simulationIP]) {
          global.fixedWindowSimulations[simulationIP] = {
            count: 0,
            resetTime: currentTime + windowMs
          };
        }
        
        const simulation = global.fixedWindowSimulations[simulationIP];
        
        // Reset if window has expired
        if (currentTime > simulation.resetTime) {
          simulation.count = 0;
          simulation.resetTime = currentTime + windowMs;
        }
        
        if (simulation.count < maxRequests) {
          simulation.count++;
          response = {
            success: true,
            status: 200,
            message: 'Request successful',
            remaining: maxRequests - simulation.count
          };
        } else {
          response = {
            success: false,
            status: 429,
            message: 'Rate limit exceeded',
            msBeforeNext: simulation.resetTime - currentTime
          };
        }
      } else if (algorithm === 'slidingWindow') {
        try {
          const rateLimiterRes = await activeLimiters.slidingWindow.consume(simulationIP);
          response = {
            success: true,
            status: 200,
            message: 'Request successful',
            remaining: rateLimiterRes.remainingPoints
          };
        } catch (error) {
          response = {
            success: false,
            status: 429,
            message: 'Rate limit exceeded',
            msBeforeNext: error.msBeforeNext
          };
        }
      } else if (algorithm === 'tokenBucket') {
        try {
          const rateLimiterRes = await activeLimiters.tokenBucket.consume(simulationIP);
          response = {
            success: true,
            status: 200,
            message: 'Request successful',
            remaining: rateLimiterRes.remainingPoints
          };
        } catch (error) {
          response = {
            success: false,
            status: 429,
            message: 'Rate limit exceeded',
            msBeforeNext: error.msBeforeNext
          };
        }
      }
      
      results.push({
        requestNumber: i + 1,
        timestamp: new Date().toISOString(),
        ...response
      });
    } catch (error) {
      console.error('Simulation error:', error);
      results.push({
        requestNumber: i + 1,
        timestamp: new Date().toISOString(),
        success: false,
        status: 500,
        message: 'Internal server error'
      });
    }
  }
  
  res.json({
    algorithm,
    totalRequests: requests,
    delay,
    results
  });
});

// Serve static files if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});