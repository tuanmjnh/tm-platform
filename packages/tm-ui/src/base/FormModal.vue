<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import ResponsiveModal from './ResponsiveModal.vue'

defineProps<{
  title: string
  description?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: any
  state: Record<string, unknown>
  loading?: boolean
  submitLabel?: string
  cancelLabel?: string
  ui?: Record<string, unknown>
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  submit: [event: FormSubmitEvent<Record<string, unknown>>]
  cancel: []
}>()

function onCancel() {
  open.value = false
  emit('cancel')
}
</script>

<template>
  <ResponsiveModal
    v-model:open="open"
    :title="title"
    :description="description"
    :ui="ui"
    :close="!loading"
    :dismissible="!loading"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="emit('submit', $event)"
      >
        <slot />

        <slot name="actions">
          <div class="flex justify-end gap-2 pt-2">
            <UButton
              :label="cancelLabel ?? 'Cancel'"
              color="neutral"
              variant="ghost"
              :disabled="loading"
              @click="onCancel"
            />
            <UButton
              type="submit"
              :label="submitLabel ?? 'Save'"
              :loading="loading"
            />
          </div>
        </slot>
      </UForm>
    </template>
  </ResponsiveModal>
</template>
