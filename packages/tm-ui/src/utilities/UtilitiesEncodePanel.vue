<script setup lang="ts">
import {
  encodeBase64, decodeBase64, encodeUrl, decodeUrl, escapeHtml, unescapeHtml,
  encodeHex, decodeHex, encodeBinary, decodeBinary, rot13, reverseText,
  md5, sha1, sha256, sha384, sha512, runHash, decodeJwt, encodeJwt, generateHexKey
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


type EncodeOp
  = | 'base64Encode' | 'base64Decode'
    | 'urlEncode' | 'urlDecode'
    | 'htmlEscape' | 'htmlUnescape'
    | 'hexEncode' | 'hexDecode'
    | 'binaryEncode' | 'binaryDecode'
    | 'rot13'

const encodeOps: { id: EncodeOp, icon: string }[] = [
  { id: 'base64Encode', icon: 'i-lucide-lock' },
  { id: 'base64Decode', icon: 'i-lucide-lock-open' },
  { id: 'urlEncode', icon: 'i-lucide-link' },
  { id: 'urlDecode', icon: 'i-lucide-unlink' },
  { id: 'htmlEscape', icon: 'i-lucide-code-xml' },
  { id: 'htmlUnescape', icon: 'i-lucide-code' },
  { id: 'hexEncode', icon: 'i-lucide-hash' },
  { id: 'hexDecode', icon: 'i-lucide-unplug' },
  { id: 'binaryEncode', icon: 'i-lucide-binary' },
  { id: 'binaryDecode', icon: 'i-lucide-list-ordered' },
  { id: 'rot13', icon: 'i-lucide-refresh-cw' }
]

// ── Encode/Decode ──────────────────────────────────
const encodeOp = ref<EncodeOp>('base64Encode')
const encodeInput = ref('')
const encodeError = ref('')

const encodeOutput = ref('')

watch([encodeInput, encodeOp], () => {
  const input = encodeInput.value
  if (!input) {
    encodeOutput.value = ''
    encodeError.value = ''
    return
  }
  try {
    encodeError.value = ''
    switch (encodeOp.value) {
      case 'base64Encode':
        encodeOutput.value = encodeBase64(input)
        break
      case 'base64Decode':
        encodeOutput.value = decodeBase64(input)
        break
      case 'urlEncode':
        encodeOutput.value = encodeUrl(input)
        break
      case 'urlDecode':
        encodeOutput.value = decodeUrl(input)
        break
      case 'htmlEscape':
        encodeOutput.value = escapeHtml(input)
        break
      case 'htmlUnescape':
        encodeOutput.value = unescapeHtml(input)
        break
      case 'hexEncode':
        encodeOutput.value = encodeHex(input)
        break
      case 'hexDecode':
        encodeOutput.value = decodeHex(input)
        break
      case 'binaryEncode':
        encodeOutput.value = encodeBinary(input)
        break
      case 'binaryDecode':
        encodeOutput.value = decodeBinary(input)
        break
      case 'rot13':
        encodeOutput.value = rot13(input)
        break
      default:
        encodeOutput.value = ''
    }
  } catch (e) {
    encodeOutput.value = ''
    encodeError.value = e instanceof Error ? e.message : String(e)
  }
}, { immediate: true })

// ── Hash ───────────────────────────────────────────
const hashInput = ref('')
const hashAlgo = ref<'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'>('SHA-256')
const hashAlgorithms = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']
const hashResult = ref('')
const hashLoading = ref(false)

async function runHash() {
  if (!hashInput.value.trim()) return
  hashLoading.value = true
  try {
    hashResult.value = await hashText(hashAlgo.value, hashInput.value)
  } finally {
    hashLoading.value = false
  }
}

// ── JWT ────────────────────────────────────────────
const jwtMode = ref<'encode' | 'decode'>('encode')
const jwtInput = ref('')
const jwtResult = ref<ReturnType<typeof decodeJwt> | null>(null)

// encode state
const jwtPayloadJson = ref('{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}')
const jwtHeaderJson = ref('')
const jwtSecret = ref('')
const jwtAlgo = ref<'HS256' | 'none'>('HS256')
const jwtEncoded = ref('')
const jwtEncoding = ref(false)
const jwtPayloadError = ref('')
const jwtHeaderError = ref('')

function parseJwtJson(raw: string, isPayload: boolean): Record<string, unknown> | null {
  if (!raw.trim()) {
    if (isPayload) jwtPayloadError.value = ''
    else jwtHeaderError.value = ''
    return null
  }
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      const err = t('utilities.crypto.jwt.jsonMustBeObject')
      if (isPayload) jwtPayloadError.value = err
      else jwtHeaderError.value = err
      return null
    }
    if (isPayload) jwtPayloadError.value = ''
    else jwtHeaderError.value = ''
    return parsed as Record<string, unknown>
  } catch (error) {
    const err = t('utilities.crypto.jwt.jsonInvalid')
    if (isPayload) jwtPayloadError.value = err
    else jwtHeaderError.value = err
    return null
  }
}

watch(jwtPayloadJson, v => parseJwtJson(v, true))
watch(jwtHeaderJson, v => parseJwtJson(v, false))

async function doEncodeJwt() {
  const payload = parseJwtJson(jwtPayloadJson.value, true)
  if (!payload) return
  const header = parseJwtJson(jwtHeaderJson.value, false)
  if (jwtHeaderJson.value.trim() && !header) return
  jwtEncoding.value = true
  try {
    jwtEncoded.value = await encodeJwt(payload, {
      algorithm: jwtAlgo.value,
      secret: jwtAlgo.value === 'HS256' ? jwtSecret.value : undefined,
      header: header ?? undefined
    })
  } catch (e) {
    jwtEncoded.value = ''
    reportError(e)
  } finally {
    jwtEncoding.value = false
  }
}

const expHint = computed(() => {
  const exp = jwtResult.value?.payload?.exp
  if (typeof exp !== 'number') return ''
  const d = new Date(exp * 1000)
  const expired = d.getTime() < Date.now()
  const label = expired ? t('utilities.crypto.jwt.expired') : t('utilities.crypto.jwt.validUntil')
  return `${label}: ${d.toLocaleString()}`
})

function doDecodeJwt() {
  jwtResult.value = decodeJwt(jwtInput.value)
}

// ── Key Generator ──────────────────────────────────
const keyLength = ref<number>(64)
const generatedKey = ref('')

function doGenerateKey() {
  generatedKey.value = generateHexKey(keyLength.value)
}

watch(keyLength, () => {
  doGenerateKey()
})

onMounted(() => {
  doGenerateKey()
})

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    reportCopied(outputText.value)
  } catch (error) {
    reportError(error)
  }
}
</script>
