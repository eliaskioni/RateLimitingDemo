# Rate Limiting Demo

A full-stack application demonstrating different rate limiting strategies with an interactive UI for configuration and testing.

## Overview

Rate limiting is a technique used to control the amount of incoming requests a server can handle within a specific time window. This project demonstrates three popular rate limiting algorithms:

1. **Fixed Window**
2. **Sliding Window**
3. **Token Bucket**

The application provides an interactive UI to configure parameters for each algorithm and run simulations to visualize their behavior.

## Rate Limiting Strategies

### Fixed Window

The Fixed Window algorithm divides time into fixed intervals (e.g., 1 minute) and allows a maximum number of requests within each interval. When the interval ends, the counter resets.

**Example:**

If the rate limit is set to 10 requests per minute (fixed window):
- If you make 8 requests in the first 30 seconds, you have 2 remaining requests for that minute window.
- If you make 10 requests in the first 30 seconds, any additional requests in that minute will be rejected.
- At exactly the 1-minute mark, the counter resets to 0, and you can make 10 new requests immediately.
- This can lead to a "boundary problem" - if you make 10 requests at 0:59 and 10 more at 1:01, you've made 20 requests in 2 seconds, which is much higher than the intended rate.

**Pros:**
- Simple to understand and implement
- Low memory footprint
- Predictable behavior

**Cons:**
- Can allow traffic spikes at window boundaries (e.g., a burst of requests at the end of one window and the beginning of the next)
- Less precise than other methods

### Sliding Window

The Sliding Window algorithm tracks requests over a continuous moving time window. Instead of resetting counters at fixed intervals, it gradually expires old requests as time moves forward.

**Example:**

If the rate limit is set to 10 requests per minute (sliding window):
- If you make 10 requests at 0:30, all are accepted.
- At 1:00, none of those requests have expired yet, so you have 0 requests available.
- At 1:15, 5 of your requests (those made between 0:30-0:45) have now expired, so you can make 5 new requests.
- At 1:30, all 10 previous requests have expired, so your full quota is available again.
- This prevents the boundary spike problem by smoothly distributing request allowance over time.

**Pros:**
- More accurate rate limiting than fixed window
- Prevents boundary spike issues
- Smoother request distribution

**Cons:**
- Requires more memory to track individual request timestamps
- Slightly more complex to implement

### Token Bucket

The Token Bucket algorithm uses the concept of a bucket filled with tokens. Each request consumes one token, and tokens are replenished at a fixed rate. When the bucket is empty, requests are rejected until more tokens are added.

**Example:**

If the token bucket has a capacity of 10 tokens and refills at 1 token per 6 seconds (10 per minute):
- Initially, the bucket is full with 10 tokens.
- If you make 5 requests immediately, you have 5 tokens left.
- If you then make 8 more requests immediately, 5 will succeed and 3 will be rejected (as the bucket is now empty).
- After 18 seconds, 3 new tokens will have been added to the bucket (at the rate of 1 token per 6 seconds).
- You can now make 3 more requests successfully.
- If you don't make any requests for a full minute, the bucket will refill to its maximum of 10 tokens.
- This allows for bursts of traffic up to the bucket size while maintaining the long-term rate limit.

**Pros:**
- Allows for bursts of traffic (up to the bucket size)
- Provides a balance between strict rate limiting and flexibility
- Can be configured for different traffic patterns

**Cons:**
- Slightly more complex to implement and understand
- Requires tuning of multiple parameters (bucket size, refill rate, refill interval)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/RateLimitingDemo.git
cd RateLimitingDemo

# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

## Usage

```bash
# Run both server and client in development mode
npm run dev

# Run server only
npm run server

# Run client only
npm run client
```

The server will run on port 5001, and the client will run on port 3000 by default.

## Features

- Interactive UI to configure rate limiting parameters
- Real-time simulation of rate limiting behavior
- Visual representation of request success/failure
- API endpoints to test each rate limiting strategy

## Technologies Used

- **Backend**: Node.js, Express
- **Frontend**: React, TypeScript, Bootstrap
- **Rate Limiting Libraries**: express-rate-limit, rate-limiter-flexible
- **Visualization**: Chart.js

## License

MIT