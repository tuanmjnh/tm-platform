import type { DefineComponent } from 'vue'
import type { Accessible } from '@nuxt/ui'

export interface FilterPopoverProps {
  popover?: boolean
  /** Accessible label for the filter trigger. */
  label?: string
}

declare const FilterPopover: DefineComponent<FilterPopoverProps, {}, {}, {}, {}, {}, {}, {}>
export default FilterPopover
