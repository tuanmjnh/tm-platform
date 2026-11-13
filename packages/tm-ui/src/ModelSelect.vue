<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, useTemplateRef } from 'vue'
import { providerIconFor } from './providerIcon.js'
import { classifyFailure, classifyThrown, createLabelResolver } from './modelCheck.js'
import type { ModelCheckResult, ModelOption, ModelSelectLabels } from './types/ModelSelect'

/**
 * Dependency-free model picker: no i18n, no `$fetch`, no toast composable and no
 * `@vueuse/core`. Labels arrive as props, the check transport is a callback and
 * outcomes are emitted, so the same component works in every app.
 */
const props = withDefaults(defineProps<{
  modelValue: string
  models: ModelOption[]
  loading?: boolean
  disabled?: boolean
  /** Width utilities, so toolbars keep a fixed width while forms go full width. */
  widthClass?: string
  showCheck?: boolean
  labels?: ModelSelectLabels
  checkModel?: (modelKey: string, ctx: { signal: AbortSignal }) => Promise<ModelCheckResult>
  checkTimeoutMs?: number
  providerIcon?: (provider: string) => string
}>(), {
  loading: false,
  disabled: false,
  widthClass: 'w-56 sm:w-72',
  showCheck: true,
  checkTimeoutMs: 10_000
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'check:success', payload: { modelKey: string, displayName: string, latencyMs: number }): void
  (e: 'check:error', payload: { modelKey: string, title: string, description: string, rawError: string }): void
}>()

const label = createLabelResolver(props.labels)

const iconFor = (provider: string): string =>
  (props.providerIcon || providerIconFor)(provider)

type CheckStatus = 'idle' | 'checking' | 'success' | 'error'
const checkStatus = ref<CheckStatus>('idle')
const lastLatency = ref<number | null>(null)
const lastErrorTitle = ref<string>('')
const lastErrorDesc = ref<string>('')
const lastRawError = ref<string>('')

let abortController: AbortController | null = null

const INITIAL_LIMIT = 30
const PAGE_SIZE = 20

const searchTerm = ref('')
const displayLimit = ref(INITIAL_LIMIT)
const modelSelectMenuRef = useTemplateRef<{ viewportRef?: HTMLElement | null }>('modelSelectMenuRef')

const canCheck = computed(() => props.showCheck && typeof props.checkModel === 'function')

const filteredModels = computed(() => {
  const query = searchTerm.value.trim().toLowerCase()
  if (!query) return props.models
  return props.models.filter(m =>
    m.displayName.toLowerCase().includes(query)
    || m.modelId.toLowerCase().includes(query)
    || m.provider.toLowerCase().includes(query)
  )
})

function toOption(model: ModelOption) {
  return {
    label: model.displayName,
    value: `${model.connectionId}:${model.modelId}`,
    icon: iconFor(model.provider)
  }
}

const modelOptions = computed(() => {
  const options = filteredModels.value.slice(0, displayLimit.value).map(toOption)
  if (props.modelValue && !options.some(option => option.value === props.modelValue)) {
    const selected = props.models.find(m => `${m.connectionId}:${m.modelId}` === props.modelValue)
    if (selected) options.unshift(toOption(selected))
  }
  return options
})

watch(searchTerm, () => {
  displayLimit.value = INITIAL_LIMIT
})

watch(() => props.modelValue, () => {
  checkStatus.value = 'idle'
  lastLatency.value = null
  lastErrorTitle.value = ''
  lastErrorDesc.value = ''
  lastRawError.value = ''
})

const checking = computed(() => checkStatus.value === 'checking')

const checkButtonIcon = computed(() => {
  if (checkStatus.value === 'success') return 'i-lucide-check-circle-2'
  if (checkStatus.value === 'error') return 'i-lucide-alert-circle'
  return 'i-lucide-activity'
})

const checkButtonColor = computed<'neutral' | 'success' | 'error'>(() => {
  if (checkStatus.value === 'success') return 'success'
  if (checkStatus.value === 'error') return 'error'
  return 'neutral'
})

const checkTooltipText = computed(() => {
  if (checking.value) return label('checking')
  if (checkStatus.value === 'success' && lastLatency.value !== null) {
    return label('available', { ms: lastLatency.value })
  }
  if (checkStatus.value === 'error') {
    return lastErrorTitle.value || label('unavailable', { status: 500 })
  }
  return label('tooltip')
})

async function checkModel() {
  if (!props.modelValue || checking.value || !props.checkModel) return

  checkStatus.value = 'checking'
  lastLatency.value = null
  lastErrorTitle.value = ''
  lastErrorDesc.value = ''
  lastRawError.value = ''

  abortController?.abort()
  abortController = new AbortController()
  const controller = abortController
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('TIMEOUT'))
  }, props.checkTimeoutMs)

  const modelKey = props.modelValue
  const displayName = props.models.find(m => `${m.connectionId}:${m.modelId}` === modelKey)?.displayName || modelKey

  try {
    const result = await props.checkModel(modelKey, { signal: controller.signal })

    if (result?.ok) {
      checkStatus.value = 'success'
      lastLatency.value = result.latencyMs ?? 0
      emit('check:success', { modelKey, displayName, latencyMs: lastLatency.value })
      return
    }

    const { title, desc, raw } = classifyFailure(result, label)
    checkStatus.value = 'error'
    lastLatency.value = result?.latencyMs ?? null
    lastErrorTitle.value = title
    lastErrorDesc.value = desc
    lastRawError.value = raw
    emit('check:error', { modelKey, title, description: desc, rawError: lastRawError.value })
  } catch (err) {
    const { title, desc, raw } = classifyThrown(err, label)
    checkStatus.value = 'error'
    lastErrorTitle.value = title
    lastErrorDesc.value = desc
    lastRawError.value = raw
    emit('check:error', { modelKey, title, description: desc, rawError: raw })
  } finally {
    clearTimeout(timeoutId)
  }
}

function handleUpdate(value: unknown) {
  if (typeof value === 'string') emit('update:modelValue', value)
}

// Infinite scroll without @vueuse/core: the package cannot resolve a VueUse
// dependency from a linked checkout, and the behaviour here is one listener.
let scrollEl: HTMLElement | null = null

function onViewportScroll() {
  const el = scrollEl
  if (!el) return
  if (el.scrollTop + el.clientHeight < el.scrollHeight - 30) return
  if (displayLimit.value < filteredModels.value.length) {
    displayLimit.value += PAGE_SIZE
  }
}

function detachScroll() {
  if (!scrollEl) return
  scrollEl.removeEventListener('scroll', onViewportScroll)
  scrollEl = null
}

function attachScroll() {
  detachScroll()
  const el = modelSelectMenuRef.value?.viewportRef
  if (!el || el === scrollEl) return
  scrollEl = el
  el.addEventListener('scroll', onViewportScroll, { passive: true })
}

function onOpenChange(open: boolean) {
  if (open) nextTick(attachScroll)
  else detachScroll()
}

onBeforeUnmount(() => {
  detachScroll()
  abortController?.abort()
})
</script>

<template>
  <div :class="['flex items-center gap-1.5', widthClass]">
    <USelectMenu
      ref="modelSelectMenuRef"
      v-model:search-term="searchTerm"
      :model-value="modelValue"
      :items="modelOptions"
      :loading="loading"
      value-key="value"
      label-key="label"
      virtualize
      ignore-filter
      :search-input="{ placeholder: label('placeholder') }"
      :placeholder="label('placeholder')"
      size="sm"
      class="flex-1 min-w-0"
      :disabled="disabled || loading || models.length === 0"
      @update:open="onOpenChange"
      @update:model-value="handleUpdate"
    />

    <template v-if="canCheck">
      <!-- Hover popover while the last check failed -->
      <UPopover
        v-if="checkStatus === 'error'"
        mode="hover"
        :content="{ side: 'bottom', align: 'end', sideOffset: 6 }"
      >
        <UButton
          :icon="checkButtonIcon"
          :color="checkButtonColor"
          variant="ghost"
          size="sm"
          :loading="checking"
          :disabled="disabled || loading || !modelValue"
          :aria-label="label('checkAriaLabel')"
          class="shrink-0"
          @click="checkModel"
        />

        <template #content>
          <div class="p-3 w-80 max-w-sm space-y-2 text-xs">
            <div class="flex items-start gap-2">
              <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0 text-error mt-0.5" />
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-foreground text-xs leading-snug">
                  {{ lastErrorTitle }}
                </p>
                <p v-if="lastErrorDesc" class="mt-1 text-muted text-xs leading-relaxed">
                  {{ lastErrorDesc }}
                </p>
                <div v-if="lastRawError" class="mt-2 space-y-1">
                  <span class="text-[10px] font-medium text-dimmed uppercase tracking-wider">
                    {{ label('rawError') }}
                  </span>
                  <div class="rounded bg-muted/20 p-2 font-mono text-[11px] text-muted select-all break-all max-h-28 overflow-y-auto border border-default/40">
                    {{ lastRawError }}
                  </div>
                </div>
              </div>
            </div>
            <div class="pt-2 flex items-center justify-between border-t border-default/50 text-[11px] text-muted">
              <span>{{ lastLatency !== null ? `${lastLatency}ms` : '' }}</span>
              <button
                type="button"
                class="inline-flex items-center gap-1 text-primary hover:underline font-medium cursor-pointer"
                @click="checkModel"
              >
                <UIcon name="i-lucide-rotate-cw" class="size-3" />
                {{ label('retry') }}
              </button>
            </div>
          </div>
        </template>
      </UPopover>

      <!-- Tooltip while idle / checking / healthy -->
      <UTooltip v-else :text="checkTooltipText">
        <UButton
          :icon="checkButtonIcon"
          :color="checkButtonColor"
          variant="ghost"
          size="sm"
          :loading="checking"
          :disabled="disabled || loading || !modelValue"
          :aria-label="label('checkAriaLabel')"
          class="shrink-0"
          @click="checkModel"
        />
      </UTooltip>
    </template>
  </div>
</template>
