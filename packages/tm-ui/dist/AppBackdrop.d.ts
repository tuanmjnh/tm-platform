import type { DefineComponent } from 'vue'
import type { Render } from '@nuxt/ui'

export interface AppBackdropProps {
  /** Render the isometric floor grid (dashboard + login only). */
  grid?: boolean
}

declare const AppBackdrop: DefineComponent<AppBackdropProps, {}, {}, {}, {}, {}, {}, {}>
export default AppBackdrop
