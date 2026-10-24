// Ambient fallback for the gitignored build artifacts in config/generated/
// (written by scripts/generate-changelog.ts). Module resolution prefers the
// real generated files; these declarations only apply when they are absent,
// keeping `tsc --noEmit` and editor IntelliSense working on a fresh checkout
// before any predev/prebuild/pretest hook has run.

declare module "@/config/generated/latest" {
  export const latestRelease: import("@/lib/changelog-core").ChangelogEntry | null;
}

declare module "@/config/generated/changelog" {
  export const changelog: import("@/lib/changelog-core").ChangelogEntry[];
}
