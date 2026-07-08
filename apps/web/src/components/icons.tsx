// 统一线性图标集 —— 替换全站 emoji（2026 改造：不用 emoji）
// 全部 24×24 viewBox、currentColor 描边，可配 size / strokeWidth / style / className。
import type { CSSProperties } from 'react'

interface IconProps {
  size?: number
  strokeWidth?: number
  className?: string
  style?: CSSProperties
}

function svg(children: React.ReactNode) {
  return ({ size = 20, strokeWidth = 1.8, className, style }: IconProps) => (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden
    >
      {children}
    </svg>
  )
}

// 品牌/概念
export const IconSpark   = svg(<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.2"/></>)
export const IconBulb    = svg(<><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.3 1 2.5h6c0-1.2.4-1.9 1-2.5A6 6 0 0 0 12 3Z"/></>)
export const IconWand    = svg(<><path d="M15 4V2M15 10V8M11 6H9M21 6h-2M18.7 3.3l-1.4 1.4M18.7 8.7l-1.4-1.4M4 20l9-9M13.5 6.5l1 1"/></>)
export const IconTv      = svg(<><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 21h8M12 6V3"/></>)
export const IconChat    = svg(<><path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z"/></>)

// 五阶段
export const IconSearch  = svg(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>)   // discovery
export const IconScope   = svg(<><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/></>) // scope
export const IconGear    = svg(<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></>) // approach
export const IconRoute   = svg(<><circle cx="6" cy="19" r="2.4"/><circle cx="18" cy="5" r="2.4"/><path d="M8.4 19H14a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h5.6"/></>) // plan
export const IconPackage = svg(<><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M3 8l9 5 9-5M12 13v8"/></>) // deliver

// 画板/工具
export const IconRuler   = svg(<><path d="M3 15 15 3l6 6L9 21Z"/><path d="M7 11l2 2M11 7l2 2M9 13l1 1"/></>)
export const IconMap     = svg(<><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></>)
export const IconInbox   = svg(<><path d="M3 12h4l2 3h6l2-3h4"/><path d="M5 5h14l2 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l2-7Z"/></>)
export const IconLayers  = svg(<><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/></>)

// 操作
export const IconPlus    = svg(<><path d="M12 5v14M5 12h14"/></>)
export const IconCheck   = svg(<><path d="M20 6 9 17l-5-5"/></>)
export const IconArrow   = svg(<><path d="M5 12h14M13 6l6 6-6 6"/></>)
export const IconChevron = svg(<><path d="m6 9 6 6 6-6"/></>)
export const IconClose   = svg(<><path d="M18 6 6 18M6 6l12 12"/></>)
export const IconEdit    = svg(<><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></>)
export const IconTrash   = svg(<><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></>)
export const IconLock    = svg(<><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>)
export const IconCopy    = svg(<><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>)
export const IconRefresh = svg(<><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></>)
export const IconShield  = svg(<><path d="M12 3 5 6v5c0 4.5 3 7.6 7 9 4-1.4 7-4.5 7-9V6l-7-3Z"/></>)
export const IconUser    = svg(<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></>)
export const IconSliders = svg(<><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></>)
export const IconClipboardCheck = svg(<><path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z"/><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="m9 14 2 2 4-4"/></>)

// 五阶段 → 图标映射
import type { FC } from 'react'
export const STAGE_ICON: Record<string, FC<IconProps>> = {
  discovery: IconSearch,
  scope:     IconScope,
  approach:  IconGear,
  plan:      IconRoute,
  deliver:   IconPackage,
}
