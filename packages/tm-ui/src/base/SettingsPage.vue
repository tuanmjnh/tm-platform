<script setup lang="ts">
import SectionNav from './SectionNav.vue'
import Page from './Page.vue'

defineProps<{
  id: string
  title: string
  description?: string
}>()

const items = defineModel<import('@nuxt/ui').NavigationMenuItem[]>('items', { default: () => [] })
</script>

<template>
  <Page :id="id" :title="title" :description="description">
    <template v-if="$slots.right" #right>
      <slot name="right" />
    </template>
    <template v-if="$slots.left" #left>
      <slot name="left" />
    </template>
    <template v-if="$slots.toolbar" #toolbar>
      <slot name="toolbar" />
    </template>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>

    <SectionNav :items="items">
      <div class="flex flex-col gap-4">
        <slot />
      </div>
    </SectionNav>
  </Page>
</template>
