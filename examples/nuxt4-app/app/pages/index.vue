<template>
  <main style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem">
    <h1>tm-platform example</h1>
    <p>This page renders from a Nuxt app that depends on the published packages.</p>

    <button :disabled="pending" @click="run">
      {{ pending ? 'Calling…' : 'Call the stub provider' }}
    </button>

    <p v-if="error" style="color: #b91c1c">{{ error }}</p>
    <p v-else-if="answer">{{ answer }}</p>
  </main>
</template>

<script setup lang="ts">
const answer = ref('')
const error = ref('')
const pending = ref(false)

async function run() {
  pending.value = true
  error.value = ''
  answer.value = ''
  try {
    const res = await $fetch('/api/chat', { method: 'POST' })
    if (res.success && res.data) answer.value = res.data.content
    else error.value = res.error?.message || 'The call failed'
  } catch (err) {
    error.value = String((err as Error)?.message || err)
  } finally {
    pending.value = false
  }
}
</script>
