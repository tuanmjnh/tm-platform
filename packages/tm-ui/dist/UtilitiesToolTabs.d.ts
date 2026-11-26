import type { DefineComponent } from 'vue'
import type { UtilityTab } from '@nuxt/ui'

export interface UtilitiesToolTabsProps {
  active: string
  items: UtilityTab[]
}

declare const UtilitiesToolTabs: DefineComponent<UtilitiesToolTabsProps, {}, {}, {}, {}, {}, {}, Record<string, unknown[]>>
export default UtilitiesToolTabs
