<script setup lang="ts">
import { computed } from 'vue'
import { providerIconFor } from './providerIcon.js'
import type { AIConnectionRow, AIConnectionsEditorLabels, AIProviderOption } from '../types/AIConnectionsEditor'

/**
 * Rows editor for app-local AI connections. Rows mutate in place; the host
 * owns validation, persistence, keys and notifications, so this component
 * never talks to a transport or a keychain.
 */
const props = withDefaults(defineProps<{
  rows: AIConnectionRow[]
  providers: AIProviderOption[]
  labels: AIConnectionsEditorLabels
  disabled?: boolean
  saving?: boolean
  testingId?: string
  tests?: Record<string, { ok: boolean, message: string }>
  providerIcon?: (provider: string) => string
}>(), {
  disabled: false,
  saving: false,
  testingId: '',
  tests: () => ({})
})

const emit = defineEmits<{
  add: []
  remove: [row: AIConnectionRow]
  test: [row: AIConnectionRow]
  save: []
}>()

const iconFor = (provider: string): string => (props.providerIcon || providerIconFor)(provider)

const providerOptions = computed(() => props.providers.map(provider => ({
  label: provider.name,
  value: provider.key,
  icon: iconFor(provider.key),
  description: provider.keyless ? props.labels.keyless : undefined
})))

function providerOf(row: AIConnectionRow): AIProviderOption | undefined {
  return props.providers.find(provider => provider.key === row.providerKey)
}

function defaultBaseUrl(key: string): string {
  return props.providers.find(provider => provider.key === key)?.defaultBaseUrl || ''
}

function onProviderChange(row: AIConnectionRow, value: unknown) {
  if (typeof value !== 'string' || !value || value === row.providerKey) return
  const previousDefault = defaultBaseUrl(row.providerKey)
  row.providerKey = value
  if (!row.baseUrl.trim() || row.baseUrl.trim() === previousDefault) {
    row.baseUrl = defaultBaseUrl(value)
  }
}

function testResult(row: AIConnectionRow) {
  return props.tests[row.connectionId.trim()] || null
}

function canTest(row: AIConnectionRow): boolean {
  return Boolean(row.connectionId.trim() && row.models.trim())
}
</script>

<template>
  <div class="space-y-3">
    <p v-if="!rows.length" class="text-sm text-muted">
      {{ labels.empty }}
    </p>

    <div
      v-for="(row, index) in rows"
      :key="index"
      class="rounded-lg border border-default p-4"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField :label="labels.connectionId" :description="labels.connectionIdDesc">
          <UInput v-model="row.connectionId" class="w-full" :disabled="disabled" placeholder="free-local" />
        </UFormField>
        <UFormField :label="labels.provider" :description="labels.providerDesc">
          <USelectMenu
            :model-value="row.providerKey"
            :items="providerOptions"
            value-key="value"
            class="w-full"
            :disabled="disabled"
            @update:model-value="onProviderChange(row, $event)"
          />
        </UFormField>
        <UFormField :label="labels.baseUrl" :description="labels.baseUrlDesc">
          <UInput
            v-model="row.baseUrl"
            class="w-full"
            :disabled="disabled"
            :placeholder="providerOf(row)?.defaultBaseUrl || 'http://127.0.0.1:11434/v1'"
          />
        </UFormField>
        <UFormField :label="labels.models" :description="labels.modelsDesc">
          <UInput v-model="row.models" class="w-full" :disabled="disabled" placeholder="llama3.2, qwen2.5" />
        </UFormField>
        <UFormField :label="labels.keySlot" :description="labels.keySlotDesc">
          <UInput v-model="row.apiKeyEnv" class="w-full" :disabled="disabled" placeholder="AI_API_KEY_FREELLM" />
        </UFormField>
        <UFormField
          :label="labels.keyValue"
          :description="row.hasKey ? labels.keyValueSaved : labels.keyValueHint"
        >
          <UInput v-model="row.apiKey" type="password" class="w-full" :disabled="disabled" autocomplete="off" />
        </UFormField>
      </div>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-activity"
            :loading="testingId === row.connectionId.trim()"
            :label="labels.test"
            :disabled="disabled || !canTest(row)"
            @click="emit('test', row)"
          />
          <span
            v-if="testResult(row)"
            class="truncate text-xs"
            :class="testResult(row)?.ok ? 'text-success' : 'text-error'"
          >
            {{ testResult(row)?.message }}
          </span>
        </div>
        <UButton
          v-if="!disabled"
          color="error"
          variant="ghost"
          size="sm"
          icon="i-lucide-trash-2"
          :label="labels.remove"
          @click="emit('remove', row)"
        />
      </div>
    </div>

    <div v-if="!disabled" class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-3">
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-lucide-plus"
          :label="labels.add"
          @click="emit('add')"
        />
        <span class="text-xs text-muted">{{ labels.unsavedHint }}</span>
      </div>
      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-save"
        :label="labels.save"
        :loading="saving"
        @click="emit('save')"
      />
    </div>
  </div>
</template>
