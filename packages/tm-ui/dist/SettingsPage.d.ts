import type { DefineComponent } from 'vue'

export interface SettingsPageProps {
  id: string
  title: string
  description?: string
}
export interface SettingsPageModel {
  modelValue: import('@nuxt/ui').NavigationMenuItem[]
}

declare const SettingsPage: DefineComponent<SettingsPageProps, {}, {}, {}, {}, {}, {}, {}>
export default SettingsPage
