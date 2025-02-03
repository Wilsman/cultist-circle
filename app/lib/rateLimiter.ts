// app/lib/rateLimiter.ts

import { NextRequest, NextResponse } from "next/server";

const WINDOW_SIZE = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS = 5; // Maximum number of requests per window

interface RequestLog {
  timestamp: number;
  count: number;
}

const ipRequestMap = new Map<string, RequestLog>();

export function rateLimiter(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const now = Date.now();
  const windowStart = now - WINDOW_SIZE;

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

  if (requestLog.count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": MAX_REQUESTS.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": (requestLog.timestamp + WINDOW_SIZE).toString(),
        },
      }
    );
  }

  // If the request is allowed, return null
  return null;
}
