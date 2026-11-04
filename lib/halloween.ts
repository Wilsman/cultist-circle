// Halloween cursor season: 1 October to 10 November (local time).
// Covers the usual Tarkov Halloween event window.
export function isHalloweenSeason(date: Date = new Date()): boolean {
  const month = date.getMonth(); // 0-based
  const day = date.getDate();
  return month === 9 || (month === 10 && day <= 10);
}

// Point of the cursor image that clicks (top of the bucket handle).
export const BUCKET_CURSOR_HOTSPOT = { x: 16, y: 5 } as const;

// Where sweets spill from, relative to the pointer (the bucket rim).
export const BUCKET_RIM_OFFSET = { x: 0, y: 9 } as const;

const BUCKET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
<path d="M4.5 15C4.5 1.5 27.5 1.5 27.5 15" fill="none" stroke="#e7e5e4" stroke-width="2.6" stroke-linecap="round"/>
<path d="M4.5 15C4.5 1.5 27.5 1.5 27.5 15" fill="none" stroke="#18181b" stroke-width="1.3" stroke-linecap="round"/>
<g stroke="#1c1917" stroke-width=".6">
<rect x="6.5" y="8.5" width="4.5" height="7" rx=".6" fill="#5b341c" transform="rotate(-22 8.75 12)"/>
<rect x="10.5" y="7" width="4" height="8" rx=".6" fill="#eab308" transform="rotate(-8 12.5 11)"/>
<rect x="15" y="6.5" width="4.2" height="8.5" rx=".6" fill="#ea580c" transform="rotate(4 17 10.75)"/>
<rect x="19.5" y="8" width="5" height="7" rx=".6" fill="#dc2626" transform="rotate(18 22 11.5)"/>
<circle cx="8.5" cy="13.2" r="1.6" fill="#4ade80"/>
<circle cx="14.2" cy="12.8" r="1.5" fill="#a855f7"/>
<circle cx="24.8" cy="13" r="1.6" fill="#f472b6"/>
<path d="M18.5 14.5L19.6 11.4L20.8 14.6Z" fill="#facc15"/>
</g>
<path d="M4.5 15.5H27.5L25.6 28.8Q25.4 30.5 23.7 30.5H8.3Q6.6 30.5 6.4 28.8Z" fill="#f97316" stroke="#1c1917" stroke-width=".8"/>
<path d="M10.2 16.5L10.9 30M16 16.5V30.3M21.8 16.5L21.1 30" stroke="#ea580c" stroke-width=".7"/>
<rect x="3.5" y="13.2" width="25" height="3" rx="1.5" fill="#fb923c" stroke="#1c1917" stroke-width=".8"/>
<path d="M8.6 22Q8.9 18.6 11.4 18.6Q13.6 18.6 14 22ZM18 22Q18.4 18.6 20.6 18.6Q23.1 18.6 23.4 22Z" fill="#18181b"/>
<circle cx="12.6" cy="19.4" r="1" fill="#f97316"/>
<circle cx="19.4" cy="19.4" r="1" fill="#f97316"/>
<path d="M16 22.6L17.1 24.2H14.9Z" fill="#18181b"/>
<path d="M9.8 24.4Q16 30.4 22.2 24.4Q21.4 26.1 19.8 26.8V27.6L18.6 27.1L17.4 28H14.6L13.4 27.1L12.2 27.6V26.8Q10.6 26.1 9.8 24.4Z" fill="#18181b"/>
</svg>`;

export const BUCKET_CURSOR_CSS = `url("data:image/svg+xml,${encodeURIComponent(
  BUCKET_SVG.replace(/\n/g, ""),
)}") ${BUCKET_CURSOR_HOTSPOT.x} ${BUCKET_CURSOR_HOTSPOT.y}, auto`;
