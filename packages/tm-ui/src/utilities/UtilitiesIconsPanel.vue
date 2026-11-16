<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useDebounceFn, useInfiniteScroll } from '@vueuse/core'
import type { IconSearchPage, IconSearchQuery } from '../types/Utilities'

/**
 * Icon browser: search, collection switch, favourites, size/colour preview and
 * copyable snippets.
 *
 * Nothing here knows where icons come from or where favourites live. The host
 * passes `fetchIcons` (its own endpoint) and `favorites` (its own storage), so
 * the package carries no `$fetch`, no `localStorage` and no i18n — a consumer
 * with a different backend can use it unchanged.
 */

const props = withDefaults(defineProps<{
  /** i18n lookup supplied by the host. */
  t: (key: string, params?: Record<string, unknown>) => string
  /** One page of icons. The host owns the transport and the route. */
  fetchIcons: (query: IconSearchQuery) => Promise<IconSearchPage>
  /** Favourite icon names, owned by the host so it can persist them. */
  favorites: string[]
  collections?: { label: string, value: string }[]
  pageSize?: number
}>(), {
  collections: () => [
    { label: 'Lucide', value: 'lucide' },
    { label: 'Simple Icons', value: 'simple-icons' }
  ],
  pageSize: 100
})

const emit = defineEmits<{
  'update:favorites': [favorites: string[]]
  copied: [text: string]
  'copy-error': [error: unknown]
}>()

const search = ref('')
const collection = ref(props.collections[0]?.value ?? 'lucide')
const showFavorites = ref(false)
const selected = ref('')
const previewSize = ref(24)
const previewColor = ref('#64748b')

const icons = ref<string[]>([])
const isFetching = ref(false)
const hasMore = ref(false)
const cursor = ref('')
const scrollParent = ref<HTMLElement | null>(null)

const isFavorite = (icon: string) => props.favorites.includes(icon)

function toggleFavorite(icon: string) {
  const next = isFavorite(icon)
    ? props.favorites.filter(f => f !== icon)
    : [...props.favorites, icon]
  emit('update:favorites', next)
}

const displayedIcons = computed(() => showFavorites.value ? props.favorites : icons.value)

const shortName = (icon: string) => icon.replace(/^i-[a-z-]+-/, '')

async function load(isLoadMore = false) {
  if (isFetching.value) return
  isFetching.value = true
  try {
    if (!isLoadMore) cursor.value = ''
    const page = await props.fetchIcons({
      search: search.value,
      collection: collection.value,
      cursor: cursor.value,
      limit: props.pageSize
    })
    if (isLoadMore) icons.value.push(...(page.icons || []))
    else icons.value = page.icons || []
    cursor.value = page.nextCursor || ''
    hasMore.value = page.hasMore
  } catch {
    // The host owns error reporting; showing an empty grid is the honest result.
  } finally {
    isFetching.value = false
  }
}

const debouncedLoad = useDebounceFn(() => load(false), 500)

useInfiniteScroll(
  scrollParent,
  () => {
    if (hasMore.value && !isFetching.value && !showFavorites.value) load(true)
  },
  { distance: 80 }
)

watch(collection, () => {
  search.value = ''
  load(false)
})
watch(search, () => {
  if (!showFavorites.value) debouncedLoad()
})

onMounted(() => load(false))

const snippets = computed(() => {
  const name = selected.value
  if (!name) return []
  return [
    { label: props.t('utilities.icons.copyName'), code: name },
    { label: props.t('utilities.icons.copyVue'), code: `<UIcon name="${name}" />` },
    { label: props.t('utilities.icons.copyButton'), code: `<UButton icon="${name}" label="..." />` },
    { label: props.t('utilities.icons.copyClass'), code: `class="${name}"` },
    { label: props.t('utilities.icons.copyClass'), code: `icon="${name}"` }
  ]
})

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    emit('copied', text)
  } catch (error) {
    emit('copy-error', error)
  }
}

const copyName = (icon: string) => copyText(icon)
</script>

<template>
  <div class="flex flex-col gap-4 flex-1 min-h-0">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <UInput v-model="search" :placeholder="t('utilities.icons.searchPlaceholder')" icon="i-lucide-search"
        class="flex-1" :loading="isFetching" />
      <div class="flex flex-wrap gap-1.5">
        <UButton v-for="c in collections" :key="c.value" :label="c.label" size="xs"
          :color="collection === c.value ? 'primary' : 'neutral'" variant="soft" @click="collection = c.value" />
        <UButton v-if="showFavorites" :label="t('utilities.icons.favorites')" icon="i-lucide-star" size="xs"
          color="warning" variant="soft" @click="showFavorites = false" />
        <UButton v-else :label="`${t('utilities.icons.favorites')} (${favorites.length})`" icon="i-lucide-star"
          size="xs" color="neutral" variant="soft" @click="showFavorites = true" />
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-4 text-xs text-muted">
      <div class="flex items-center gap-2">
        <span>{{ t('utilities.icons.size') }}</span>
        <USlider v-model="previewSize" :min="16" :max="48" class="w-28" />
        <span class="w-8 font-mono">{{ previewSize }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span>{{ t('utilities.icons.color') }}</span>
        <input v-model="previewColor" type="color"
          class="h-6 w-8 cursor-pointer rounded border border-default bg-transparent" >
      </div>
      <span v-if="!showFavorites">
        <b class="text-highlighted">{{ icons.length }}</b> {{ t('utilities.icons.iconCount') }}
      </span>
      <span v-else>
        <b class="text-highlighted">{{ favorites.length }}</b> {{ t('utilities.icons.iconCount') }}
      </span>
    </div>

    <div ref="scrollParent" class="flex-1 min-h-0 overflow-y-auto rounded-xl border border-default p-3">
      <div class="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        <button v-for="icon in displayedIcons" :key="icon" type="button"
          class="group relative flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-transparent p-2 transition-all hover:border-primary/40 hover:bg-elevated"
          :class="{ 'border-primary bg-primary/10': selected === icon }" :title="icon" @click="selected = icon"
          @dblclick="copyName(icon)">
          <UIcon :name="icon" :style="{ width: previewSize + 'px', height: previewSize + 'px', color: previewColor }" />
          <span class="w-full truncate text-[9px] leading-tight text-muted group-hover:text-highlighted">
            {{ shortName(icon) }}
          </span>
          <UButton :icon="isFavorite(icon) ? 'i-lucide-star' : 'i-lucide-star-off'" size="xs" color="warning"
            variant="ghost" class="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100"
            :aria-label="isFavorite(icon) ? t('utilities.icons.removeFromFavorites') : t('utilities.icons.addToFavorites')"
            @click.stop="toggleFavorite(icon)" />
        </button>
      </div>

      <div v-if="isFetching" class="col-span-full flex justify-center py-6">
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
      </div>
      <div v-else-if="!displayedIcons.length" class="col-span-full py-12 text-center text-sm text-muted">
        <template v-if="showFavorites">
          {{ t('utilities.icons.noIconsFound') }}
        </template>
        <template v-else>
          <p>{{ t('utilities.icons.noIconsFound') }}</p>
          <p class="mt-1 text-xs">{{ t('utilities.icons.tryAnotherQuery') }}</p>
        </template>
      </div>
      <div v-else-if="!hasMore && !showFavorites" class="col-span-full py-3 text-center text-xs text-dimmed">
        {{ t('utilities.icons.loading') }}
      </div>
    </div>

    <div v-if="selected" class="space-y-3 rounded-xl border border-default p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-3">
          <UIcon :name="selected" :style="{ width: '32px', height: '32px', color: previewColor }" />
          <div>
            <div class="font-mono text-sm font-semibold text-highlighted">{{ selected }}</div>
            <div class="text-xs text-muted">{{ t('utilities.icons.previewDetails') }}</div>
          </div>
        </div>
        <UButton :label="t('utilities.icons.addToFavorites')" icon="i-lucide-star" size="xs" color="warning"
          variant="soft" @click="toggleFavorite(selected)" />
      </div>

      <div class="space-y-2">
        <div class="text-xs font-semibold text-muted">{{ t('utilities.icons.snippets') }}</div>
        <div class="grid gap-2 lg:grid-cols-3">
          <div v-for="snip in snippets" :key="snip.code" class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">{{ snip.label }}</span>
              <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost"
                @click="copyText(snip.code)" />
            </div>
            <pre class="overflow-auto rounded-lg bg-default/50 p-2 font-mono text-[11px]">{{ snip.code }}</pre>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton :label="t('utilities.icons.copyName')" icon="i-lucide-tag" size="xs" color="neutral" variant="soft"
          @click="copyName(selected)" />
      </div>
    </div>
  </div>
</template>
