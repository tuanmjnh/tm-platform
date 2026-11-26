import type { DefineComponent } from 'vue'
import type { Accessible } from '@nuxt/ui'

export interface ResponsiveSlideoverProps {
  modelValue?: boolean
  open?: boolean
  title?: string
  description?: string
  loading?: boolean
  disabled?: boolean
  dismissible?: boolean
  close?: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  icon?: string
  /** Accessible label for the mobile back button. */
  backLabel?: string
  ui?: {
    title?: string
    description?: string
    [key: string]: unknown
  }
}

declare const ResponsiveSlideover: DefineComponent<ResponsiveSlideoverProps, {}, {}, {}, {}, {}, {}, {}>
export default ResponsiveSlideover
