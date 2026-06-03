import type { ReactNode, SVGProps } from 'react'

/* Line icon set — SF-Symbols-ish, 1.7 stroke, round caps, currentColor.
   Ported from design-reference/icons.jsx. */

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  size?: number
  sw?: number
}

function Svg({ size = 24, sw = 1.7, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function Cart(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 4h2l1.6 10.2a1.6 1.6 0 0 0 1.58 1.35h7.9a1.6 1.6 0 0 0 1.57-1.28L20 7H6" />
      <circle cx="9" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </Svg>
  )
}

export function Calendar(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </Svg>
  )
}

export function Book(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 4.5h9a3 3 0 0 1 3 3V20a2.4 2.4 0 0 0-2.4-2.4H5z" />
      <path d="M5 4.5v15.1" />
      <path d="M9 9h5M9 12h5" />
    </Svg>
  )
}

export function Store(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 10.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8.5" />
      <path d="M3.4 10.2 5 4.6A1 1 0 0 1 6 4h12a1 1 0 0 1 .98.7l1.6 5.5a2.2 2.2 0 0 1-4.27.9 2.2 2.2 0 0 1-4.27 0 2.2 2.2 0 0 1-4.27 0 2.2 2.2 0 0 1-4.27-.9Z" />
      <path d="M10 20v-4.5h4V20" />
    </Svg>
  )
}

export function More({ sw = 0, ...p }: IconProps) {
  return (
    <Svg sw={sw} {...p}>
      <circle cx="5" cy="12" r="1.7" fill="currentColor" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" />
      <circle cx="19" cy="12" r="1.7" fill="currentColor" />
    </Svg>
  )
}

export function Plus(p: IconProps) {
  return <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
}

export function Minus(p: IconProps) {
  return <Svg {...p}><path d="M5 12h14" /></Svg>
}

export function Check({ sw = 2.2, ...p }: IconProps) {
  return <Svg sw={sw} {...p}><path d="M5 12.5l4.2 4.3L19 7" /></Svg>
}

export function ChevronRight(p: IconProps) {
  return <Svg {...p}><path d="M9 5l7 7-7 7" /></Svg>
}

export function ChevronLeft(p: IconProps) {
  return <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>
}

export function ChevronDown(p: IconProps) {
  return <Svg {...p}><path d="M5 9l7 7 7-7" /></Svg>
}

export function Search(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </Svg>
  )
}

export function Clock(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.6V12l3 2" />
    </Svg>
  )
}

export function Camera(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8.5A2 2 0 0 1 5 6.5h1.7a1 1 0 0 0 .9-.55l.6-1.2a1 1 0 0 1 .9-.55h4a1 1 0 0 1 .9.55l.6 1.2a1 1 0 0 0 .9.55H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="13" r="3.4" />
    </Svg>
  )
}

export function Heart(p: IconProps) {
  return <Svg {...p}><path d="M12 20s-7-4.4-9-9.2C1.6 7.3 3.3 4.5 6.2 4.5c1.9 0 3.1 1.1 3.8 2.2.7-1.1 1.9-2.2 3.8-2.2 2.9 0 4.6 2.8 3.2 6.3C19 15.6 12 20 12 20Z" /></Svg>
}

export function HeartFill({ sw = 0, ...p }: IconProps) {
  return <Svg sw={sw} {...p}><path d="M12 20s-7-4.4-9-9.2C1.6 7.3 3.3 4.5 6.2 4.5c1.9 0 3.1 1.1 3.8 2.2.7-1.1 1.9-2.2 3.8-2.2 2.9 0 4.6 2.8 3.2 6.3C19 15.6 12 20 12 20Z" fill="currentColor" /></Svg>
}

export function Trash(p: IconProps) {
  return <Svg {...p}><path d="M5 7h14M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M7 7l.8 11.2A2 2 0 0 0 9.8 20h4.4a2 2 0 0 0 2-1.8L17 7" /></Svg>
}

export function Sliders(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2.3" />
      <circle cx="8" cy="17" r="2.3" />
    </Svg>
  )
}

export function Tag(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 11.5V5.5a1.5 1.5 0 0 1 1.5-1.5h6l8 8a1.6 1.6 0 0 1 0 2.3l-5.2 5.2a1.6 1.6 0 0 1-2.3 0Z" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function Leaf(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 19c0-8 5.5-12 14-12 0 8.5-5 13-14 12Z" />
      <path d="M5 19c3-5 6-7.5 10-9" />
    </Svg>
  )
}

export function Spark(p: IconProps) {
  return <Svg {...p}><path d="M12 4l1.6 4.6L18 10l-4.4 1.4L12 16l-1.6-4.6L6 10l4.4-1.4Z" /></Svg>
}

export function X(p: IconProps) {
  return <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
}

export function Flame(p: IconProps) {
  return <Svg {...p}><path d="M12 3.5c2.4 3 1 5-.2 6.2-1 1-1.8 2-.3 3.6 1.2-.2 2-1 2.3-2.2 1.6 1.4 2.4 3 2.4 4.6A6.2 6.2 0 1 1 6 13.5c0-1 .3-1.8.8-2.4.4 1 1.2 1.6 2 1.8C7.5 9.5 9.8 6.7 12 3.5Z" /></Svg>
}

export function Users(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c.4-3 2.8-4.6 5.5-4.6S14.1 16 14.5 19" />
      <path d="M16 6.2a3 3 0 0 1 0 5.6M17 14.7c2.1.5 3.6 2 3.9 4.3" />
    </Svg>
  )
}

export function Gear(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" />
    </Svg>
  )
}

export function Link(p: IconProps) {
  return <Svg {...p}><path d="M9 15l6-6M10.5 7.5l1-1a3.5 3.5 0 0 1 5 5l-1 1M13.5 16.5l-1 1a3.5 3.5 0 0 1-5-5l1-1" /></Svg>
}

export function ArrowRight(p: IconProps) {
  return <Svg {...p}><path d="M4 12h15M13 6l6 6-6 6" /></Svg>
}

export function Refresh(p: IconProps) {
  return <Svg {...p}><path d="M20 11a8 8 0 0 0-14-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14 4.5L20 16M20 20v-4h-4" /></Svg>
}
