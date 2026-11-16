<script setup lang="ts">
import { computed } from 'vue'

/**
 * Tab strip for the utilities pages.
 *
 * The items carry their own translated titles, so the host builds the list and
 * the package never calls `useI18n()` — the same contract the rest of tm-ui
 * follows.
 */
interface UtilityTab {
  label: string
  value: string
  icon?: string
}

const props = defineProps<{
  active: string
  items: UtilityTab[]
}>()

const emit = defineEmits<{ select: [value: string] }>()

const tabs = computed(() => props.items.map(item => ({
  label: item.label,
  value: item.value,
  icon: item.icon
})))

function onSelect(value: string | number | undefined) {
  if (value) emit('select', String(value))
}
</script>

<template>
  <div class="space-y-4">
    <UTabs
      :model-value="active"
      :items="tabs"
      class="w-full"
      :content="false"
      :ui="{
        list: 'px-4 sm:px-6 flex-nowrap overflow-x-auto scrollbar-hide shrink-0',
        trigger: 'flex-shrink-0',
        content: 'flex-1 min-h-0 overflow-y-auto custom-scrollbar py-4 sm:py-6 px-4 sm:px-6 pb-24'
      }"
      @update:model-value="onSelect"
    />
    <slot />
  </div>
</template>
