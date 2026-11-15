<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

withDefaults(defineProps<{
  items: DropdownMenuItem[][]
  align?: 'start' | 'center' | 'end'
  /** Accessible label for the trigger. */
  label?: string
}>(), {
  align: 'end',
  label: 'Actions'
})
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align }">
    <UButton
      icon="i-lucide-ellipsis-vertical"
      color="neutral"
      variant="ghost"
      size="xs"
      :aria-label="label"
      @click.stop
    />
  </UDropdownMenu>
</template>
