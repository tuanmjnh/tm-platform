<script setup lang="ts">
import { ref } from 'vue'

const model = defineModel<string>({ default: '' })

const show = ref(false)

withDefaults(defineProps<{
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  ariaLabel?: string
  autocomplete?: string
  showLabel?: string
  hideLabel?: string
}>(), {
  placeholder: '',
  size: 'md',
  ariaLabel: '',
  autocomplete: undefined,
  showLabel: 'Show password',
  hideLabel: 'Hide password'
})
</script>

<template>
  <UInput v-model="model" :placeholder="placeholder" :size="size" :type="show ? 'text' : 'password'"
    :autocomplete="autocomplete" :ui="{ trailing: 'pe-1' }">
    <template #trailing>
      <UButton color="neutral" variant="link" size="sm" :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        :aria-label="ariaLabel || (show ? hideLabel : showLabel)" :aria-pressed="show" @click="show = !show" />
    </template>
  </UInput>
</template>

<style scoped>
::-ms-reveal {
  display: none;
}
</style>
