<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  toUpperCase, toLowerCase, toCapitalize, toSentenceCase, toCamelCase, toPascalCase,
  toKebabCase, toSnakeCase, toConstantCase, toAlternatingCase, toInverseCase,
  removeVietnameseAccents, slugify, cleanSpaces, removeEmptyLines, removeDuplicateLines,
  sortLinesAsc, sortLinesDesc, reverseLines, reverseCharacters, numberLines,
  encodeBase64Safe, decodeBase64Safe, encodeUrlSafe, decodeUrlSafe,
  escapeHtmlSafe, unescapeHtmlSafe, countStats
} from '@tuanmjnh/tm-core'

const props = defineProps<{
  /** i18n lookup supplied by the host. */
  t: (key: string, params?: Record<string, unknown>) => string
}>()

// The template calls t(...) directly; props.t is the same function.
const t = (key: string, params?: Record<string, unknown>) => props.t(key, params)
const emit = defineEmits<{
  copied: [text: string]
  'copy-error': [error: unknown]
}>()

function reportCopied(text: string) {
  emit('copied', text)
}

function reportError(error: unknown) {
  emit('copy-error', error)
}


const inputText = ref('')
const outputText = ref('')

// History stack for Undo/Redo
const history = ref<string[]>([])
const historyIndex = ref(-1)

function recordState(text: string) {
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }
  history.value.push(text)
  historyIndex.value = history.value.length - 1
}

function applyTransform(fn: (input: string) => string) {
  const result = fn(inputText.value)
  outputText.value = result
  recordState(result)
}

function handleUndo() {
  if (historyIndex.value > 0) {
    historyIndex.value--
    const prev = history.value[historyIndex.value]
    if (prev !== undefined) outputText.value = prev
  }
}

function handleRedo() {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    const next = history.value[historyIndex.value]
    if (next !== undefined) outputText.value = next
  }
}

function swapInputOutput() {
  const temp = inputText.value
  inputText.value = outputText.value
  outputText.value = temp
  recordState(outputText.value)
}

function copyOutput() {
  if (!outputText.value) return
  navigator.clipboard.writeText(outputText.value)
  reportCopied(outputText.value)
}

function copyInput() {
  if (!inputText.value) return
  navigator.clipboard.writeText(inputText.value)
  reportCopied(inputText.value)
}

async function pasteToInput() {
  try {
    const text = await navigator.clipboard.readText()
    inputText.value = text
  } catch (error) {
    reportError(error)
  }
}

function clearAll() {
  inputText.value = ''
  outputText.value = ''
  history.value = []
  historyIndex.value = -1
}

function downloadOutput() {
  if (!outputText.value) return
  const blob = new Blob([outputText.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transformed-text-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// Compute statistics on input and output
const inputStats = computed(() => countStats(inputText.value))
const outputStats = computed(() => countStats(outputText.value))

function loadSample() {
  inputText.value = t('utilities.text.sampleContent')
  applyTransform(text => text)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Top Action Toolbars: Categories Grid -->
    <div
      class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-4"
    >
      <!-- 1. Case Conversions -->
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <div
            class="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
          >
            <UIcon name="i-lucide-case-sensitive" class="size-4 text-primary-500" />
            <span>{{ t('utilities.text.categories.case') }}</span>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-lucide-file-text"
              :label="t('utilities.text.sampleText')"
              @click="loadSample"
            />
            <UButton
              size="xs"
              color="error"
              variant="soft"
              icon="i-lucide-trash-2"
              :label="t('utilities.text.clear')"
              @click="clearAll"
            />
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            @click="applyTransform(toUpperCase)"
          >
            {{ t('utilities.text.actions.upper') }}
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            @click="applyTransform(toLowerCase)"
          >
            {{ t('utilities.text.actions.lower') }}
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            @click="applyTransform(toCapitalize)"
          >
            {{ t('utilities.text.actions.capitalize') }}
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            @click="applyTransform(toSentenceCase)"
          >
            {{ t('utilities.text.actions.sentence') }}
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            class="font-mono"
            @click="applyTransform(toCamelCase)"
          >
            {{ t('utilities.text.actions.camel') }}
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            class="font-mono"
            @click="applyTransform(toPascalCase)"
          >
            {{ t('utilities.text.actions.pascal') }}
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            class="font-mono"
            @click="applyTransform(toKebabCase)"
          >
            {{ t('utilities.text.actions.kebab') }}
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            class="font-mono"
            @click="applyTransform(toSnakeCase)"
          >
            {{ t('utilities.text.actions.snake') }}
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            class="font-mono"
            @click="applyTransform(toConstantCase)"
          >
            {{ t('utilities.text.actions.constant') }}
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            @click="applyTransform(toAlternatingCase)"
          >
            {{ t('utilities.text.actions.alternating') }}
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            @click="applyTransform(toInverseCase)"
          >
            {{ t('utilities.text.actions.inverse') }}
          </UButton>
        </div>
      </div>

      <!-- 2. Vietnamese & SEO / Lines / Encodings Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
        <!-- Vietnamese & SEO -->
        <div class="space-y-2">
          <div
            class="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
          >
            <UIcon name="i-lucide-globe" class="size-4 text-emerald-500" />
            <span>{{ t('utilities.text.categories.vietnamese') }}</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <UButton
              size="xs"
              color="primary"
              variant="soft"
              @click="applyTransform(removeVietnameseAccents)"
            >
              {{ t('utilities.text.actions.removeAccents') }}
            </UButton>
            <UButton
              size="xs"
              color="primary"
              variant="soft"
              @click="applyTransform(slugify)"
            >
              {{ t('utilities.text.actions.slug') }}
            </UButton>
          </div>
        </div>

        <!-- Lines & Whitespace -->
        <div class="space-y-2">
          <div
            class="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
          >
            <UIcon name="i-lucide-align-left" class="size-4 text-blue-500" />
            <span>{{ t('utilities.text.categories.lines') }}</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              @click="applyTransform(cleanSpaces)"
            >
              {{ t('utilities.text.actions.cleanSpaces') }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              @click="applyTransform(removeEmptyLines)"
            >
              {{ t('utilities.text.actions.removeEmptyLines') }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              @click="applyTransform(removeDuplicateLines)"
            >
              {{ t('utilities.text.actions.removeDuplicates') }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-lucide-arrow-down-a-z"
              @click="applyTransform(sortLinesAsc)"
            >
              {{ t('utilities.text.actions.sortAsc') }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-lucide-arrow-down-z-a"
              @click="applyTransform(sortLinesDesc)"
            >
              {{ t('utilities.text.actions.sortDesc') }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              @click="applyTransform(reverseLines)"
            >
              {{ t('utilities.text.actions.reverseLines') }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              @click="applyTransform(reverseCharacters)"
            >
              {{ t('utilities.text.actions.reverseCharacters') }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              @click="applyTransform(numberLines)"
            >
              {{ t('utilities.text.actions.numberLines') }}
            </UButton>
          </div>
        </div>

        <!-- Encodings -->
        <div class="space-y-2">
          <div
            class="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
          >
            <UIcon name="i-lucide-binary" class="size-4 text-purple-500" />
            <span>{{ t('utilities.text.categories.encode') }}</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              @click="applyTransform(encodeBase64Safe)"
            >
              {{ t('utilities.text.actions.base64Encode') }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              @click="applyTransform(decodeBase64Safe)"
            >
              {{ t('utilities.text.actions.base64Decode') }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              @click="applyTransform(encodeUrlSafe)"
            >
              {{ t('utilities.text.actions.urlEncode') }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              @click="applyTransform(decodeUrlSafe)"
            >
              {{ t('utilities.text.actions.urlDecode') }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              @click="applyTransform(escapeHtmlSafe)"
            >
              {{ t('utilities.text.actions.htmlEscape') }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              @click="applyTransform(unescapeHtmlSafe)"
            >
              {{ t('utilities.text.actions.htmlUnescape') }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Editor Panes: Input vs Output (50/50 Dual Column) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-90">
      <!-- Left Pane: Input -->
      <div
        class="flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
      >
        <div
          class="flex items-center justify-between px-4 py-2.5 bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 shrink-0 gap-2"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider truncate">
              {{ t('utilities.text.inputLabel') }}
            </span>
            <UBadge
              color="neutral"
              variant="subtle"
              size="xs"
              class="shrink-0"
            >
              {{ inputStats.chars }} {{ t('utilities.text.stats.chars') }}
            </UBadge>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-clipboard-paste"
              :title="t('utilities.text.paste')"
              @click="pasteToInput"
            />
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-copy"
              :title="t('utilities.text.copy')"
              @click="copyInput"
            />
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              :title="t('utilities.text.clear')"
              @click="inputText = ''"
            />
          </div>
        </div>

        <div class="flex-1 p-3 flex flex-col min-h-0">
          <textarea
            v-model="inputText"
            class="w-full flex-1 min-h-50 resize-none font-mono text-sm bg-transparent border-0 focus:ring-0 focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 leading-relaxed overflow-y-auto"
            :placeholder="t('utilities.text.inputPlaceholder')"
          />
        </div>

        <!-- Input Stats Footer -->
        <div
          class="px-4 py-2 bg-gray-50/50 dark:bg-gray-950/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500 font-mono shrink-0"
        >
          <div class="flex items-center gap-3">
            <span>{{ inputStats.words }} {{ t('utilities.text.stats.words') }}</span>
            <span>{{ inputStats.lines }} {{ t('utilities.text.stats.lines') }}</span>
            <span>{{ inputStats.paragraphs }} {{ t('utilities.text.stats.paragraphs') }}</span>
          </div>
          <span>~{{ inputStats.readingTimeMinutes }}m {{ t('utilities.text.stats.readingTime') }}</span>
        </div>
      </div>

      <!-- Right Pane: Output -->
      <div
        class="flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
      >
        <div
          class="flex items-center justify-between px-4 py-2.5 bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 shrink-0 gap-2"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider truncate">
              {{ t('utilities.text.outputLabel') }}
            </span>
            <UBadge
              color="primary"
              variant="subtle"
              size="xs"
              class="shrink-0"
            >
              {{ outputStats.chars }} {{ t('utilities.text.stats.chars') }}
            </UBadge>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-arrow-left-right"
              :title="t('utilities.text.swap')"
              @click="swapInputOutput"
            />
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-undo-2"
              :disabled="historyIndex <= 0"
              :title="t('utilities.text.undo')"
              @click="handleUndo"
            />
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-redo-2"
              :disabled="historyIndex >= history.length - 1"
              :title="t('utilities.text.redo')"
              @click="handleRedo"
            />
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-download"
              :title="t('utilities.text.download')"
              @click="downloadOutput"
            />
            <UButton
              size="xs"
              color="primary"
              variant="soft"
              icon="i-lucide-copy"
              :label="t('utilities.text.copy')"
              :title="t('utilities.text.copy')"
              @click="copyOutput"
            />
          </div>
        </div>

        <div class="flex-1 p-3 flex flex-col min-h-0 bg-gray-50/20 dark:bg-gray-950/20">
          <textarea
            v-model="outputText"
            class="w-full flex-1 min-h-50 resize-none font-mono text-sm bg-transparent border-0 focus:ring-0 focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 leading-relaxed overflow-y-auto"
            :placeholder="t('utilities.text.outputPlaceholder')"
          />
        </div>

        <!-- Output Stats Footer -->
        <div
          class="px-4 py-2 bg-gray-50/50 dark:bg-gray-950/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500 font-mono shrink-0"
        >
          <div class="flex items-center gap-3">
            <span>{{ outputStats.words }} {{ t('utilities.text.stats.words') }}</span>
            <span>{{ outputStats.lines }} {{ t('utilities.text.stats.lines') }}</span>
            <span>{{ outputStats.paragraphs }} {{ t('utilities.text.stats.paragraphs') }}</span>
          </div>
          <span>~{{ outputStats.readingTimeMinutes }}m {{ t('utilities.text.stats.readingTime') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
