// Server-side instrumentation hook (reserved for future analytics/error tracking)
export async function register() {}

export const onRequestError = async (err: unknown, request: Request) => {
  void err;
  void request;
};
