<script setup lang="ts">
withDefaults(defineProps<{
  popover?: boolean
  /** Accessible label for the filter trigger. */
  label?: string
}>(), {
  popover: false,
  label: 'Filter'
})
</script>

<template>
  <!-- Desktop / tablet: inline filters -->
  <div v-if="!popover" class="hidden md:flex items-center gap-2 min-w-0">
    <slot />
  </div>

  <!-- Responsive mobile popover, or always popover when requested -->
  <UPopover :class="popover ? 'shrink-0' : 'md:hidden shrink-0'">
    <UButton
      icon="i-lucide-filter"
      color="neutral"
      variant="soft"
      size="sm"
      square
      :aria-label="label"
    />
    <template #content>
      <div class="p-4 min-w-[280px] max-w-[min(90vw,360px)] space-y-3 flex flex-col">
        <slot />
      </div>
    </template>
  </UPopover>
</template>
