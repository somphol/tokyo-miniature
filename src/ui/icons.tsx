type IconProps = { size?: number; strokeWidth?: number }

const base = (size = 16, strokeWidth = 1.6) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const Sun = ({ size, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
export const Moon = ({ size, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </svg>
)
export const RotateCw = ({ size, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M20 5v5h-5" />
    <path d="M19 10a7 7 0 1 0 1 4" />
  </svg>
)
export const RotateCcw = ({ size, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M4 5v5h5" />
    <path d="M5 10a7 7 0 1 1-1 4" />
  </svg>
)
export const Plus = ({ size, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const Minus = ({ size, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M5 12h14" />
  </svg>
)
export const Camera = ({ size, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M4 7h3l1.5-2h7L17 7h3v12H4Z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
)
export const Maximize = ({ size, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
)
export const Compass = ({ size, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2.2 5.3-5.3 2.2 2.2-5.3Z" />
  </svg>
)
export const MapPin = ({ size, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M12 21s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12Z" />
    <circle cx="12" cy="9" r="2.4" />
  </svg>
)
export const X = ({ size, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)
export const ArrowUpRight = ({ size, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
)
export const MoveUpRight = ({ size, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M6 18 18 6M9 6h9v9" />
  </svg>
)
export const MousePointer2 = ({ size, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth)}>
    <path d="m5 3 14 8-6 2-2 6Z" />
  </svg>
)
