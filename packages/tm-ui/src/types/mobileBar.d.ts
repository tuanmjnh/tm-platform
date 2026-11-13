import type { ComputedRef, Ref } from 'vue'
import type { HeaderAction } from './HeaderActions'

export interface MobileActionChild {
  icon?: string
  label: string
  disabled?: boolean
  onSelect?: () => unknown
}

export interface MobileAction {
  icon: string
  label: string
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  disabled?: boolean
  visible?: boolean
  iconClass?: string
  primary?: boolean
  overflow?: boolean
  badge?: number
  children?: MobileActionChild[]
  onSelect?: () => unknown
}

export interface MobileActionLayout {
  inline: MobileAction[]
  overflow: MobileAction[]
}

export interface MobileInfo {
  count?: number
  hasMore?: boolean
  loading?: boolean
  text?: string
}

export interface MobileBarStore {
  version: Ref<number>
  actions: ComputedRef<MobileAction[]> | null
  info: ComputedRef<MobileInfo | null> | null
}

export declare function mobileActionLayout(actions: MobileAction[], maxInline?: number): MobileActionLayout

export declare function useMobileBar(): {
  store: MobileBarStore
  registerActions: (source: ComputedRef<MobileAction[]>) => void
  registerInfo: (source: ComputedRef<MobileInfo | null>) => void
}

export declare function headerActionsToMobile(actions: HeaderAction[]): MobileAction[]
