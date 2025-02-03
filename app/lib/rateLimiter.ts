// app/lib/rateLimiter.ts

import { NextRequest, NextResponse } from "next/server";

interface RateLimiterOptions {
  uniqueTokenPerInterval: number;
  interval: number;
  tokensPerInterval: number;
  timeout: number;
}

interface RequestLog {
  timestamp: number;
  count: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const ipRequestMap = new Map<string, RequestLog>();

  return function rateLimiter(request: NextRequest) {
    const ip = request.ip ?? "127.0.0.1";
    const now = Date.now();
    const windowStart = now - options.interval;

    const requestLog = ipRequestMap.get(ip) ?? { timestamp: now, count: 0 };

    if (requestLog.timestamp < windowStart) {
      // Reset the counter if the window has passed
      requestLog.timestamp = now;
      requestLog.count = 1;
    } else {
      // Increment the counter
      requestLog.count++;
    }

    ipRequestMap.set(ip, requestLog);

    // If the request count exceeds the limit, return 429
    if (requestLog.count > options.tokensPerInterval) {
      return new NextResponse(null, {
        status: 429,
        statusText: "Too Many Requests",
        headers: {
          "Retry-After": Math.ceil(options.timeout / 1000).toString(),
        },
      });
    }

    return null;
  };
}
