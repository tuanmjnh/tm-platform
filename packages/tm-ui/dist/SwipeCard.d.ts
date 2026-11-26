import type { DefineComponent } from 'vue'

export interface SwipeCardProps {
  id: string | number
  openId?: string | number | null
  disabled?: boolean
  item?: Record<string, unknown>
  contextItems?: Record<string, unknown>[]
  mobileMode?: 'swipe' | 'dropdown' | 'context'
  draggable?: boolean
}

declare const SwipeCard: DefineComponent<SwipeCardProps, {}, {}, {}, {}, {}, {}, {}>
export default SwipeCard
