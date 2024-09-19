// app/lib/rateLimiter.ts

import Bottleneck from 'bottleneck';

// Create a Bottleneck limiter with a maximum of 5 requests per minute
const limiter = new Bottleneck({
  reservoir: 5, // initial number of requests
  reservoirRefreshAmount: 5,
  reservoirRefreshInterval: 60 * 1000, // refresh every minute
  maxConcurrent: 1, // one request at a time
});

export default limiter;
