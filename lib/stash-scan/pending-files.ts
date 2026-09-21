// One-shot handoff for the stash strip's drop/paste flow: files staged here
// survive the client-side navigation to /scan, which consumes them once.

let staged: File[] = [];

export function stageScanFiles(files: File[]): void {
  staged = files;
}

export function takeStagedScanFiles(): File[] {
  const files = staged;
  staged = [];
  return files;
}
