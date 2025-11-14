// config/maintenance.ts
// Toggle this flag before and after maintenance windows to show or hide
// the client-side maintenance notice without touching the JSX hierarchy.

const envValue = process.env.NEXT_PUBLIC_SHOW_MAINTENANCE_NOTICE;

export const SHOW_MAINTENANCE_NOTICE =
  envValue === undefined ? true : envValue === "true";
