import type { DefineComponent } from 'vue'
import type { Accessible, DropdownMenuItem } from '@nuxt/ui'

export interface RowActionsProps {
  items: DropdownMenuItem[][]
  align?: 'start' | 'center' | 'end'
  /** Accessible label for the trigger. */
  label?: string
}

declare const RowActions: DefineComponent<RowActionsProps, {}, {}, {}, {}, {}, {}, {}>
export default RowActions
