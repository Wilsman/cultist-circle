// API configuration for different environments
export const API_CONFIG = {
  // Production: Use deployed worker
  production: {
    baseURL: "https://cultist-circle-api.cultistcircle.workers.dev",
  },
  // Development: Use Vite proxy
  development: {
    baseURL: "",
  },
  // Preview/Preview builds: Use deployed worker
  preview: {
    baseURL: "https://cultist-circle-api.cultistcircle.workers.dev",
  },
} as const;

export const getApiConfig = () => {
  const env = import.meta.env.MODE || "development";
  return API_CONFIG[env as keyof typeof API_CONFIG] || API_CONFIG.development;
};
