<script setup lang="ts">
import { usePointerSwipe, useVibrate, useResizeObserver, onClickOutside, onLongPress } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  id: string | number
  openId?: string | number | null
  disabled?: boolean
  item?: Record<string, unknown>
  contextItems?: Record<string, unknown>[]
  mobileMode?: 'swipe' | 'dropdown' | 'context'
  draggable?: boolean
}>(), {
  openId: null,
  disabled: false,
  item: undefined,
  contextItems: undefined,
  mobileMode: undefined,
  draggable: false
})

type Item = Record<string, unknown>

const emits = defineEmits<{
  (e: 'update:openId', id: string | number | null): void
  (e: 'click', item: Item): void
  (e: 'long-press', payload: { item: Item, clientX: number, clientY: number }): void
}>()

const container = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const swipeTarget = ref<HTMLElement | null>(null)
const actionRef = ref<HTMLElement | null>(null)
const actionWidth = ref(0)
const isOpened = ref(false)

useResizeObserver(actionRef, (entries) => {
  const entry = entries[0]
  if (entry) actionWidth.value = entry.contentRect.width
})

const { vibrate, isSupported } = useVibrate({ pattern: [10] })
const triggerHaptic = () => {
  if (isSupported.value) vibrate()
}

onLongPress(swipeTarget, (e) => {
  triggerHaptic()
  const clientX = (e as unknown as TouchEvent).touches?.[0]?.clientX || (e as MouseEvent).clientX
  const clientY = (e as unknown as TouchEvent).touches?.[0]?.clientY || (e as MouseEvent).clientY
  if (props.item !== undefined) emits('long-press', { item: props.item, clientX, clientY })
}, { delay: 500 })

const { distanceX, isSwiping } = usePointerSwipe(swipeTarget, {
  disableTextSelect: true,
  onSwipeEnd: () => {
    if (props.mobileMode !== 'swipe' && props.mobileMode !== undefined) return
    const triggerThreshold = actionWidth.value * 0.4
    if (distanceX.value > triggerThreshold) open()
    else close()
  }
})

const offset = computed(() => {
  if (props.disabled) return 0
  if (actionWidth.value === 0) return 0
  if (props.mobileMode !== 'swipe' && props.mobileMode !== undefined) return 0

  if (isSwiping.value) {
    // distanceX > 0 means swiping LEFT (revealing right actions).
    if (distanceX.value > 0) return -Math.min(distanceX.value, actionWidth.value + 30)
    return 0
  }
  return isOpened.value ? -actionWidth.value : 0
})

const open = () => {
  if (isOpened.value) return
  isOpened.value = true
  triggerHaptic()
  emits('update:openId', props.id)
}

const close = () => {
  isOpened.value = false
}

watch(() => props.openId, (newId) => {
  if (newId !== props.id && isOpened.value) close()
})

onClickOutside(container, () => {
  if (isOpened.value) close()
})

const handleContentClick = () => {
  if (props.item === undefined) return
  // Allow click when movement is small enough to be accidental jitter.
  if (!isSwiping.value || Math.abs(distanceX.value) < 5) emits('click', props.item)
}
</script>

<template>
  <div ref="container" class="relative overflow-hidden rounded-lg border border-default bg-elevated/40 backdrop-blur-sm shadow-xs transition-colors duration-150 hover:bg-elevated/60 hover:border-primary/40 touch-pan-y select-none group">
    <!-- Action layer (behind the content) -->
    <div
      v-show="(mobileMode === 'swipe' || mobileMode === undefined) && (Math.abs(offset) > 1 || isSwiping)"
      ref="actionRef"
      class="swipe-actions absolute inset-y-0 right-0 flex items-center justify-end h-full z-0 pl-16"
    >
      <slot name="actions" :item="item" :close="close" />
    </div>

    <!-- Content layer -->
    <div
      ref="content"
      class="relative bg-transparent z-10 w-full h-full transition-transform duration-300 ease-[cubic-bezier(0.18,0.89,0.32,1.28)]"
      :class="{ 'cursor-grab': (!mobileMode || mobileMode === 'swipe') && !isSwiping, 'cursor-grabbing': (!mobileMode || mobileMode === 'swipe') && isSwiping }"
      :style="{ transform: `translate3d(${offset}px, 0, 0)` }"
    >
      <div class="flex items-center w-full h-full">
        <!-- Left slot (drag handle) stays outside the swipe listener -->
        <div v-if="$slots.left || draggable" class="shrink-0 h-full flex items-center pl-2">
          <div
            v-if="draggable"
            style="touch-action: none"
            class="drag-handle w-6 flex cursor-move p-1 text-dimmed opacity-50 group-hover:opacity-100 touch-none"
            @contextmenu.stop
          >
            <UIcon name="i-lucide-grip-vertical" class="w-4 h-4" />
          </div>
          <slot name="left" :item="item" :is-opened="isOpened" />
        </div>

        <!-- Center and right (swipe target) -->
        <div
          ref="swipeTarget"
          class="active-scale flex-1 min-w-0 h-full flex items-center transition-all duration-200 active:bg-muted rounded-lg"
          tabindex="0"
          @click="handleContentClick"
          @keydown.enter.self.prevent="handleContentClick"
          @keydown.space.self.prevent="handleContentClick"
        >
          <div class="flex-1 min-w-0 h-full flex items-center">
            <slot name="default" :item="item" :is-opened="isOpened" />
          </div>

          <div v-if="$slots.right" class="shrink-0 h-full flex items-center">
            <slot name="right" :item="item" :is-opened="isOpened" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
  Scale only the content area, and never while an interactive child is pressed:
  inputs, buttons, labels and role=button (dropdown triggers) opt out.
*/
.active-scale:active:not(:has(input:active)):not(:has(button:active)):not(:has(label:active)):not(:has([role=button]:active)) {
  transform: scale(0.99);
}
</style>
