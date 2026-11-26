import type { DefineComponent } from 'vue'
import type { Gap } from '@nuxt/ui'

export interface BentoGridProps {
  /** Gap between bento cells. */
  gap?: string
}

declare const BentoGrid: DefineComponent<BentoGridProps, {}, {}, {}, {}, {}, {}, {}>
export default BentoGrid
