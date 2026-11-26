import type { DefineComponent } from 'vue'

export interface PasswordInputProps {
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  ariaLabel?: string
  autocomplete?: string
  showLabel?: string
  hideLabel?: string
}
export interface PasswordInputModel {
  modelValue: string
}

declare const PasswordInput: DefineComponent<PasswordInputProps, {}, {}, {}, {}, {}, {}, {}>
export default PasswordInput
