import type { DefineComponent } from 'vue'
import type { Accessible, NavigationMenuItem } from '@nuxt/ui'

export interface SectionNavProps {
  items: NavigationMenuItem[]
  /** Accessible label for the navigation landmark. */
  ariaLabel?: string
}

declare const SectionNav: DefineComponent<SectionNavProps, {}, {}, {}, {}, {}, {}, {}>
export default SectionNav
