import type { DefineComponent } from 'vue'
import type { Accessible } from '@nuxt/ui'

export interface ResponsiveModalProps {
  modelValue?: boolean
  open?: boolean
  title?: string
  description?: string
  modal?: boolean
  fullscreen?: boolean
  loading?: boolean
  disabled?: boolean
  dismissible?: boolean
  close?: boolean
  icon?: string
  /** Accessible label for the mobile back button. */
  backLabel?: string
  ui?: {
    title?: string
    description?: string
    [key: string]: unknown
  }
}

declare const ResponsiveModal: DefineComponent<ResponsiveModalProps, {}, {}, {}, {}, {}, {}, {}>
export default ResponsiveModal
