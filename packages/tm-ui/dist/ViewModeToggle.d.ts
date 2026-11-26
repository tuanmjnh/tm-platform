import type { DefineComponent } from 'vue'

export interface ViewModeToggleProps {
  modelValue?: 'list' | 'grid'
  listLabel?: string
  gridLabel?: string
}

declare const ViewModeToggle: DefineComponent<ViewModeToggleProps, {}, {}, {}, {}, {}, {}, Record<string, unknown[]>>
export default ViewModeToggle
