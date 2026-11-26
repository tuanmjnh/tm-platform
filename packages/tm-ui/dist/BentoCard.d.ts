import type { DefineComponent } from 'vue'
import type { Column, Opaque, Real, Refracted, Remove } from '@nuxt/ui'

export interface BentoCardProps {
  /** Column span on the 12-col xl grid. */
  span?: number
  /** Column span on the 6-col sm grid (defaults to full width). */
  spanSm?: number
  title?: string
  icon?: string
  /** Opaque surface for dense data (grids, tables). */
  solid?: boolean
  /** Refracted edge light — hero/bento only, never on list rows. */
  refract?: boolean
  /** Real backdrop blur — at most a couple per viewport. */
  blur?: boolean
  /** Remove the default body padding (component manages its own). */
  flush?: boolean
  bodyClass?: string
}

declare const BentoCard: DefineComponent<BentoCardProps, {}, {}, {}, {}, {}, {}, {}>
export default BentoCard
