<script setup lang="ts">
import { reactive, ref } from 'vue'
import {
  generatePasswordBatch,
  generatePin,
  generateUuid,
  generateToken,
  generateApiKey,
  generateRandomKeyBatch,
  generateUsernameBatch
} from '@tuanmjnh/tm-core'

/**
 * Random-value generator: passwords, usernames, PINs, UUIDs, tokens, API keys
 * and hex keys.
 *
 * `t` and the clipboard acknowledgement are the host's, as in UtilitiesTextPane:
 * the package owns the generator and the form, not the wording or the toast.
 */
const props = defineProps<{
  /** i18n lookup supplied by the host. */
  t: (key: string, params?: Record<string, unknown>) => string
}>()

const emit = defineEmits<{
  copied: [text: string]
  'copy-error': [error: unknown]
}>()

type RandomType = 'password' | 'username' | 'pin' | 'uuid' | 'token' | 'apiKey' | 'key'

const randomGens: { id: RandomType, icon: string }[] = [
  { id: 'password', icon: 'i-lucide-key-round' },
  { id: 'username', icon: 'i-lucide-user' },
  { id: 'pin', icon: 'i-lucide-lock' },
  { id: 'uuid', icon: 'i-lucide-fingerprint' },
  { id: 'token', icon: 'i-lucide-shield' },
  { id: 'apiKey', icon: 'i-lucide-badge' },
  { id: 'key', icon: 'i-lucide-key' }
]

const randomType = ref<RandomType>('password')
const genCount = ref(5)
const genResults = ref<string[]>([])
const hexKeyLength = ref(64)

const pwOptions = reactive({
  length: 16,
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false
})

const usernameStyle = ref<'word' | 'name' | 'handle' | 'email-like'>('handle')
const usernameSuffix = ref(true)
const usernameStyles = [
  { id: 'word' as const },
  { id: 'name' as const },
  { id: 'handle' as const },
  { id: 'email-like' as const }
]

function generate() {
  const count = Math.min(Math.max(genCount.value || 1, 1), 20)
  switch (randomType.value) {
    case 'password':
      genResults.value = generatePasswordBatch(count, pwOptions)
      break
    case 'username':
      genResults.value = generateUsernameBatch(count, {
        style: usernameStyle.value,
        suffix: usernameSuffix.value
      })
      break
    case 'pin':
      genResults.value = Array.from({ length: count }, () => generatePin(6))
      break
    case 'uuid':
      genResults.value = Array.from({ length: count }, () => generateUuid())
      break
    case 'token':
      genResults.value = Array.from({ length: count }, () => generateToken(32))
      break
    case 'apiKey':
      genResults.value = Array.from({ length: count }, () => generateApiKey('tm'))
      break
    case 'key':
      genResults.value = generateRandomKeyBatch(count, hexKeyLength.value)
      break
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    emit('copied', text)
  } catch (error) {
    emit('copy-error', error)
  }
}

const copyOne = copyText
const copyAll = () => copyText(genResults.value.join('\n'))
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="gen in randomGens"
        :key="gen.id"
        :label="props.t(`utilities.random.types.${gen.id}`)"
        :icon="gen.icon"
        size="sm"
        :color="randomType === gen.id ? 'primary' : 'neutral'"
        :variant="randomType === gen.id ? 'solid' : 'soft'"
        @click="randomType = gen.id"
      />
    </div>

    <div v-if="randomType === 'password'" class="space-y-3 rounded-xl border border-default p-4">
      <div class="flex items-center gap-3">
        <label class="w-24 text-sm text-muted">{{ props.t('utilities.random.length') }}</label>
        <USlider
          v-model="pwOptions.length"
          :min="4"
          :max="64"
          class="flex-1"
        />
        <span class="w-8 text-right font-mono text-sm">{{ pwOptions.length }}</span>
      </div>
      <div class="flex flex-wrap gap-4">
        <UCheckbox v-model="pwOptions.upper" :label="props.t('utilities.random.upper')" />
        <UCheckbox v-model="pwOptions.lower" :label="props.t('utilities.random.lower')" />
        <UCheckbox v-model="pwOptions.digits" :label="props.t('utilities.random.digits')" />
        <UCheckbox v-model="pwOptions.symbols" :label="props.t('utilities.random.symbols')" />
        <UCheckbox v-model="pwOptions.excludeAmbiguous" :label="props.t('utilities.random.excludeAmbiguous')" />
      </div>
      <div class="flex items-center gap-3">
        <label class="w-24 text-sm text-muted">{{ props.t('utilities.random.count') }}</label>
        <UInput
          v-model.number="genCount"
          type="number"
          :min="1"
          :max="20"
          size="xs"
          class="w-20"
        />
      </div>
    </div>

    <div v-if="randomType === 'username'" class="space-y-3 rounded-xl border border-default p-4">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="style in usernameStyles"
          :key="style.id"
          :label="props.t(`utilities.random.styles.${style.id}`)"
          size="xs"
          :color="usernameStyle === style.id ? 'primary' : 'neutral'"
          :variant="usernameStyle === style.id ? 'solid' : 'soft'"
          @click="usernameStyle = style.id"
        />
      </div>
      <UCheckbox v-model="usernameSuffix" :label="props.t('utilities.random.suffix')" />
      <div class="flex items-center gap-3">
        <label class="w-24 text-sm text-muted">{{ props.t('utilities.random.count') }}</label>
        <UInput
          v-model.number="genCount"
          type="number"
          :min="1"
          :max="20"
          size="xs"
          class="w-20"
        />
      </div>
    </div>

    <div v-if="randomType === 'key'" class="space-y-3 rounded-xl border border-default p-4">
      <div class="flex items-center gap-2">
        <UButton
          label="32 chars"
          size="xs"
          :color="hexKeyLength === 32 ? 'primary' : 'neutral'"
          :variant="hexKeyLength === 32 ? 'solid' : 'soft'"
          @click="hexKeyLength = 32"
        />
        <UButton
          label="64 chars"
          size="xs"
          :color="hexKeyLength === 64 ? 'primary' : 'neutral'"
          :variant="hexKeyLength === 64 ? 'solid' : 'soft'"
          @click="hexKeyLength = 64"
        />
      </div>
      <div class="flex items-center gap-3">
        <label class="w-24 text-sm text-muted">{{ props.t('utilities.random.length') }}</label>
        <USlider
          v-model="hexKeyLength"
          :min="16"
          :max="128"
          :step="16"
          class="flex-1"
        />
        <span class="w-16 text-right font-mono text-sm">{{ hexKeyLength }}</span>
      </div>
      <div class="flex items-center gap-3">
        <label class="w-24 text-sm text-muted">{{ props.t('utilities.random.count') }}</label>
        <UInput
          v-model.number="genCount"
          type="number"
          :min="1"
          :max="20"
          size="xs"
          class="w-20"
        />
      </div>
    </div>

    <div class="flex gap-2">
      <UButton
        :label="props.t('utilities.random.generate')"
        icon="i-lucide-dices"
        color="neutral"
        variant="soft"
        @click="generate"
      />
      <UButton
        v-if="genResults.length"
        :label="props.t('utilities.random.copyAll')"
        icon="i-lucide-copy"
        color="neutral"
        variant="soft"
        @click="copyAll"
      />
    </div>

    <div v-if="genResults.length" class="space-y-2">
      <div
        v-for="(item, idx) in genResults"
        :key="idx"
        class="flex items-center gap-2 rounded-lg bg-default/50 px-3 py-2"
      >
        <code class="flex-1 font-mono text-sm break-all">{{ item }}</code>
        <UButton
          icon="i-lucide-copy"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="copyOne(item)"
        />
      </div>
    </div>
  </div>
</template>
