import { defineComponent as _defineComponent } from "vue";
import { createCommentVNode as _createCommentVNode, unref as _unref, renderSlot as _renderSlot, vShow as _vShow, createElementVNode as _createElementVNode, withDirectives as _withDirectives, resolveComponent as _resolveComponent, createVNode as _createVNode, withModifiers as _withModifiers, openBlock as _openBlock, createElementBlock as _createElementBlock, withKeys as _withKeys, normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle } from "vue";
const _hoisted_1 = { class: "flex items-center w-full h-full" };
const _hoisted_2 = {
  key: 0,
  class: "shrink-0 h-full flex items-center pl-2"
};
const _hoisted_3 = ["onKeydown"];
const _hoisted_4 = { class: "flex-1 min-w-0 h-full flex items-center" };
const _hoisted_5 = {
  key: 0,
  class: "shrink-0 h-full flex items-center"
};
import { usePointerSwipe, useVibrate, useResizeObserver, onClickOutside, onLongPress } from "@vueuse/core";
import { computed, ref, watch } from "vue";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "SwipeCard",
  props: {
    id: { type: [String, Number], required: true },
    openId: { type: [String, Number, null], required: false, default: null },
    disabled: { type: Boolean, required: false, default: false },
    item: { type: Object, required: false, default: void 0 },
    contextItems: { type: Array, required: false, default: void 0 },
    mobileMode: { type: String, required: false, default: void 0 },
    draggable: { type: Boolean, required: false, default: false }
  },
  emits: ["update:openId", "click", "long-press"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const container = ref(null);
    const content = ref(null);
    const swipeTarget = ref(null);
    const actionRef = ref(null);
    const actionWidth = ref(0);
    const isOpened = ref(false);
    useResizeObserver(actionRef, (entries) => {
      const entry = entries[0];
      if (entry) actionWidth.value = entry.contentRect.width;
    });
    const { vibrate, isSupported } = useVibrate({ pattern: [10] });
    const triggerHaptic = () => {
      if (isSupported.value) vibrate();
    };
    onLongPress(swipeTarget, (e) => {
      triggerHaptic();
      const clientX = e.touches?.[0]?.clientX || e.clientX;
      const clientY = e.touches?.[0]?.clientY || e.clientY;
      if (props.item !== void 0) emits("long-press", { item: props.item, clientX, clientY });
    }, { delay: 500 });
    const { distanceX, isSwiping } = usePointerSwipe(swipeTarget, {
      disableTextSelect: true,
      onSwipeEnd: () => {
        if (props.mobileMode !== "swipe" && props.mobileMode !== void 0) return;
        const triggerThreshold = actionWidth.value * 0.4;
        if (distanceX.value > triggerThreshold) open();
        else close();
      }
    });
    const offset = computed(() => {
      if (props.disabled) return 0;
      if (actionWidth.value === 0) return 0;
      if (props.mobileMode !== "swipe" && props.mobileMode !== void 0) return 0;
      if (isSwiping.value) {
        if (distanceX.value > 0) return -Math.min(distanceX.value, actionWidth.value + 30);
        return 0;
      }
      return isOpened.value ? -actionWidth.value : 0;
    });
    const open = () => {
      if (isOpened.value) return;
      isOpened.value = true;
      triggerHaptic();
      emits("update:openId", props.id);
    };
    const close = () => {
      isOpened.value = false;
    };
    watch(() => props.openId, (newId) => {
      if (newId !== props.id && isOpened.value) close();
    });
    onClickOutside(container, () => {
      if (isOpened.value) close();
    });
    const handleContentClick = () => {
      if (props.item === void 0) return;
      if (!isSwiping.value || Math.abs(distanceX.value) < 5) emits("click", props.item);
    };
    return (_ctx, _cache) => {
      const _component_UIcon = _resolveComponent("UIcon");
      return _openBlock(), _createElementBlock(
        "div",
        {
          ref_key: "container",
          ref: container,
          class: "relative overflow-hidden rounded-lg border border-default bg-elevated/40 backdrop-blur-sm shadow-xs transition-colors duration-150 hover:bg-elevated/60 hover:border-primary/40 touch-pan-y select-none group"
        },
        [
          _createCommentVNode(" Action layer (behind the content) "),
          _withDirectives(_createElementVNode(
            "div",
            {
              ref_key: "actionRef",
              ref: actionRef,
              class: "swipe-actions absolute inset-y-0 right-0 flex items-center justify-end h-full z-0 pl-16"
            },
            [
              _renderSlot(_ctx.$slots, "actions", {
                item: __props.item,
                close
              })
            ],
            512
            /* NEED_PATCH */
          ), [
            [_vShow, (__props.mobileMode === "swipe" || __props.mobileMode === void 0) && (Math.abs(offset.value) > 1 || _unref(isSwiping))]
          ]),
          _createCommentVNode(" Content layer "),
          _createElementVNode(
            "div",
            {
              ref_key: "content",
              ref: content,
              class: _normalizeClass(["relative bg-transparent z-10 w-full h-full transition-transform duration-300 ease-[cubic-bezier(0.18,0.89,0.32,1.28)]", { "cursor-grab": (!__props.mobileMode || __props.mobileMode === "swipe") && !_unref(isSwiping), "cursor-grabbing": (!__props.mobileMode || __props.mobileMode === "swipe") && _unref(isSwiping) }]),
              style: _normalizeStyle({ transform: `translate3d(${offset.value}px, 0, 0)` })
            },
            [
              _createElementVNode("div", _hoisted_1, [
                _createCommentVNode(" Left slot (drag handle) stays outside the swipe listener "),
                _ctx.$slots.left || __props.draggable ? (_openBlock(), _createElementBlock("div", _hoisted_2, [
                  __props.draggable ? (_openBlock(), _createElementBlock(
                    "div",
                    {
                      key: 0,
                      style: { "touch-action": "none" },
                      class: "drag-handle w-6 flex cursor-move p-1 text-dimmed opacity-50 group-hover:opacity-100 touch-none",
                      onContextmenu: _cache[0] || (_cache[0] = _withModifiers(() => {
                      }, ["stop"]))
                    },
                    [
                      _createVNode(_component_UIcon, {
                        name: "i-lucide-grip-vertical",
                        class: "w-4 h-4"
                      })
                    ],
                    32
                    /* NEED_HYDRATION */
                  )) : _createCommentVNode("v-if", true),
                  _renderSlot(_ctx.$slots, "left", {
                    item: __props.item,
                    isOpened: isOpened.value
                  })
                ])) : _createCommentVNode("v-if", true),
                _createCommentVNode(" Center and right (swipe target) "),
                _createElementVNode("div", {
                  ref_key: "swipeTarget",
                  ref: swipeTarget,
                  class: "active-scale flex-1 min-w-0 h-full flex items-center transition-all duration-200 active:bg-muted rounded-lg",
                  tabindex: "0",
                  onClick: handleContentClick,
                  onKeydown: [
                    _withKeys(_withModifiers(handleContentClick, ["self", "prevent"]), ["enter"]),
                    _withKeys(_withModifiers(handleContentClick, ["self", "prevent"]), ["space"])
                  ]
                }, [
                  _createElementVNode("div", _hoisted_4, [
                    _renderSlot(_ctx.$slots, "default", {
                      item: __props.item,
                      isOpened: isOpened.value
                    })
                  ]),
                  _ctx.$slots.right ? (_openBlock(), _createElementBlock("div", _hoisted_5, [
                    _renderSlot(_ctx.$slots, "right", {
                      item: __props.item,
                      isOpened: isOpened.value
                    })
                  ])) : _createCommentVNode("v-if", true)
                ], 40, _hoisted_3)
              ])
            ],
            6
            /* CLASS, STYLE */
          )
        ],
        512
        /* NEED_PATCH */
      );
    };
  }
});
var stdin_default = __sfc_main;
__sfc_main.__scopeId = "data-v-tmui-swipecard";
export {
  stdin_default as default
};

