<script setup lang="ts">
/**
 * Presentational list footer. Labels come in as props rather than `useI18n()`
 * so this package stays free of an i18n dependency; the app wrapper supplies
 * its own translations.
 */
const props = withDefaults(defineProps<{
  count?: number
  hasMore?: boolean
  loading?: boolean
  showNoMore?: boolean
  recordsLabel?: string
  loadingLabel?: string
  noMoreLabel?: string
}>(), {
  count: 0,
  hasMore: false,
  loading: false,
  showNoMore: false,
  recordsLabel: 'Record(s)',
  loadingLabel: 'Loading...',
  noMoreLabel: 'No more data'
})
</script>

<template>
  <!-- min-h-8: matches the sidebar UserMenu footer row height (49px with wrapper py-2 + border) -->
  <div class="flex min-h-8 items-center justify-between gap-3 w-full">
    <div class="flex items-center gap-2 min-w-0">
      <slot name="left" />
    </div>

    <div class="flex items-center gap-3 shrink-0">
      <slot name="right" />

      <div class="flex items-center gap-2 text-[11px] sm:text-xs text-muted font-medium">
        <span class="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted font-medium shrink-0 whitespace-nowrap">
          <strong class="text-highlighted font-semibold">{{ props.hasMore ? `${props.count}+` : props.count }}</strong>
          {{ props.recordsLabel }}
        </span>

        <div v-if="props.loading" class="flex items-center gap-1.5 text-primary">
          <UIcon name="i-lucide-loader-2" class="size-3.5 animate-spin" />
          <span class="hidden sm:inline text-xs">{{ props.loadingLabel }}</span>
        </div>

        <div
          v-else-if="props.showNoMore && !props.hasMore && props.count > 0"
          class="hidden sm:flex items-center gap-1.5 text-dimmed italic"
        >
          <UIcon name="i-lucide-check-circle-2" class="size-3.5" />
          {{ props.noMoreLabel }}
        </div>
      </div>
    </div>
  </div>
</template>
