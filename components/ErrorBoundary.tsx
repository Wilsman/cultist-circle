// components/ErrorBoundary.tsx

"use client";

import React, { ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
    // Optionally, send the error to a monitoring service like Sentry
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-2xl font-bold text-red-500">
            Something went wrong.
          </h2>
          <p className="mt-4 text-gray-300">
            We're sorry for the inconvenience. Please try refreshing the page or
            come back later.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
