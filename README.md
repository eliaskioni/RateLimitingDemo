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

**Pros:**
- Simple to understand and implement
- Low memory footprint
- Predictable behavior

**Cons:**
- Can allow traffic spikes at window boundaries (e.g., a burst of requests at the end of one window and the beginning of the next)
- Less precise than other methods

### Sliding Window

The Sliding Window algorithm tracks requests over a continuous moving time window. Instead of resetting counters at fixed intervals, it gradually expires old requests as time moves forward.

**Pros:**
- More accurate rate limiting than fixed window
- Prevents boundary spike issues
- Smoother request distribution

**Cons:**
- Requires more memory to track individual request timestamps
- Slightly more complex to implement

### Token Bucket

The Token Bucket algorithm uses the concept of a bucket filled with tokens. Each request consumes one token, and tokens are replenished at a fixed rate. When the bucket is empty, requests are rejected until more tokens are added.

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