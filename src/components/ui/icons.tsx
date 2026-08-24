/**
 * Line icons lifted from the design boards (24px grid, 1.9 stroke, currentColor).
 * All are decorative — every icon is paired with a visible text label, so they
 * are hidden from assistive tech.
 */
type IconProps = { className?: string };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

/**
 * The app mark: three water lines with the middle one lime — the same reading
 * the home hero is built on, that the water level is the thing that moves and
 * the one line you care about is where it is right now. Decorative; the
 * wordmark beside it carries the name.
 */
export function IconMark() {
  return (
    <svg viewBox="0 0 34 34" fill="none" strokeLinecap="round" strokeWidth="2.3" aria-hidden="true" focusable="false">
      <path d="M5 10.5 C 11 7, 16 12.5, 22 9.5 C 26 7.6, 29 8.8, 30 10" stroke="#8fbaf7" opacity=".75" />
      <path d="M5 17 C 11 13.5, 16 19, 22 16 C 26 14.1, 29 15.3, 30 16.5" stroke="#8dff00" />
      <path d="M5 23.5 C 11 20, 16 25.5, 22 22.5 C 26 20.6, 29 21.8, 30 23" stroke="#c2dbfb" opacity=".55" />
    </svg>
  );
}

export function IconHome({ className = 'ic' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 11 L12 4 L20 11" />
      <path d="M6 11 V20 H18 V11" />
    </svg>
  );
}

export function IconSpots({ className = 'ic' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21 C 12 21 5 14.5 5 10 a7 7 0 0 1 14 0 c0 4.5 -7 11 -7 11 Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

export function IconWater({ className = 'ic' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 9 q 4.5 -4 9 0 t 9 0" />
      <path d="M3 15 q 4.5 -4 9 0 t 9 0" />
    </svg>
  );
}

export function IconFish({ className = 'ic' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 12 q 6 -7 13 0 q -7 7 -13 0 Z" />
      <path d="M16 12 l5 -4 v8 Z" />
    </svg>
  );
}

export function IconCare({ className = 'ic' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 4 L21 19 H3 Z" />
      <path d="M12 10 v4" />
      <circle cx="12" cy="16.6" r=".6" fill="currentColor" />
    </svg>
  );
}

export function IconWind({ className = 'ic2-svg' }: IconProps) {
  return (
    <svg {...base} className={className} width="18" height="18">
      <path d="M3 8h11a3 3 0 1 0-3-3" />
      <path d="M3 12h15a3 3 0 1 1-3 3" />
      <path d="M3 16h8" />
    </svg>
  );
}

export function IconMoon({ className = 'ic2-svg' }: IconProps) {
  return (
    <svg {...base} className={className} width="18" height="18">
      <path d="M20 13.5A8 8 0 0 1 10.5 4 7.5 7.5 0 1 0 20 13.5Z" />
    </svg>
  );
}

export function IconTemp({ className = 'ic2-svg' }: IconProps) {
  return (
    <svg {...base} className={className} width="18" height="18">
      <path d="M12 14V5a2 2 0 0 0-4 0v9a4 4 0 1 0 4 0Z" />
    </svg>
  );
}

export function IconClarity({ className = 'ic2-svg' }: IconProps) {
  return (
    <svg {...base} className={className} width="18" height="18">
      <path d="M12 3s6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 6-10 6-10Z" />
    </svg>
  );
}

/**
 * Camera with a fish in the frame. The whole explanation of the photo
 * identifier, so the tile it sits in needs one line rather than a paragraph.
 */
export function IconCameraFish({ className = 'ic' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false">
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5Z" />
      <path d="M8.5 13c1.6-2 3.8-2.6 5.4-1.6 1 .6 1.4 1.6 1.4 1.6s-.4 1-1.4 1.6c-1.6 1-3.8.4-5.4-1.6Z" />
      <path d="m15.3 13 1.9-1.5v3Z" />
      <circle cx="10.4" cy="12.4" r=".55" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Hazard triangle. Handle With Care is the one section that exists because
 * something can injure you, and a label alone does not carry that at a glance.
 */
export function IconDanger({ className = 'ic' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false">
      <path d="M12 3.6 21.2 19.2a1.2 1.2 0 0 1-1 1.8H3.8a1.2 1.2 0 0 1-1-1.8Z" />
      <path d="M12 9.6v4.2" />
      <circle cx="12" cy="17.1" r=".95" fill="currentColor" stroke="none" />
    </svg>
  );
}
