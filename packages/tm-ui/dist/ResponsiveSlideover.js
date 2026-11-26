import { defineComponent as _defineComponent } from "vue";
import { normalizeProps as _normalizeProps, guardReactiveProps as _guardReactiveProps, renderSlot as _renderSlot, resolveComponent as _resolveComponent, createVNode as _createVNode, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, mergeProps as _mergeProps, withCtx as _withCtx, createSlots as _createSlots } from "vue";
const _hoisted_1 = { class: "flex items-center gap-2 min-w-0" };
const _hoisted_2 = { class: "truncate" };
import { computed } from "vue";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  ...{ inheritAttrs: false },
  __name: "ResponsiveSlideover",
  props: {
    modelValue: { type: Boolean, required: false, default: void 0 },
    open: { type: Boolean, required: false, default: void 0 },
    title: { type: String, required: false, default: "" },
    description: { type: String, required: false, default: void 0 },
    loading: { type: Boolean, required: false, default: false },
    disabled: { type: Boolean, required: false, default: false },
    dismissible: { type: Boolean, required: false, default: true },
    close: { type: Boolean, required: false, default: true },
    side: { type: String, required: false, default: "right" },
    icon: { type: String, required: false, default: void 0 },
    backLabel: { type: String, required: false, default: "Back" },
    ui: { type: Object, required: false, default: () => ({}) }
  },
  emits: ["update:modelValue", "update:open", "close"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const isOpen = computed({
      get: () => props.modelValue ?? props.open ?? false,
      set: (val) => {
        emit("update:modelValue", val);
        emit("update:open", val);
        if (!val) emit("close");
      }
    });
    const isLoading = computed(() => props.loading);
    const isDisabled = computed(() => props.disabled);
    const sideTransitions = {
      right: "data-[state=open]:animate-[slide-in-right_0.3s_cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:animate-[slide-out-right_0.2s_ease-in]",
      left: "data-[state=open]:animate-[slide-in-left_0.3s_cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:animate-[slide-out-left_0.2s_ease-in]",
      top: "data-[state=open]:animate-[slide-in-top_0.3s_cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:animate-[slide-out-top_0.2s_ease-in]",
      bottom: "data-[state=open]:animate-[slide-in-bottom_0.3s_cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:animate-[slide-out-bottom_0.2s_ease-in]"
    };
    const defaultUi = {
      header: "flex items-center gap-2 justify-between w-full border-b border-default/70 px-4 py-3",
      wrapper: "min-w-0 flex-1",
      close: "relative top-auto end-auto shrink-0 max-sm:hidden",
      body: "flex-1 overflow-y-auto p-4 sm:p-6",
      content: "w-screen max-w-xl flex flex-col",
      footer: "flex items-center justify-end gap-2 px-4 py-3 border-t border-default/70 bg-elevated/40"
    };
    const uiConfig = computed(() => {
      const ui = { ...defaultUi };
      if (props.ui) {
        for (const key in props.ui) {
          const propVal = props.ui[key];
          const currentVal = ui[key];
          if (typeof propVal === "object" && propVal !== null && typeof currentVal === "object" && currentVal !== null) {
            ui[key] = { ...currentVal, ...propVal };
          } else {
            ui[key] = propVal;
          }
        }
      }
      const sideAnim = sideTransitions[props.side || "right"] || sideTransitions.right;
      if (ui.content && typeof ui.content === "string") {
        ui.content = `${ui.content} ${sideAnim}`;
      } else {
        ui.content = sideAnim;
      }
      return ui;
    });
    return (_ctx, _cache) => {
      const _component_UButton = _resolveComponent("UButton");
      const _component_UIcon = _resolveComponent("UIcon");
      const _component_USlideover = _resolveComponent("USlideover");
      return _openBlock(), _createBlock(_component_USlideover, _mergeProps({
        open: isOpen.value,
        "onUpdate:open": _cache[1] || (_cache[1] = ($event) => isOpen.value = $event),
        title: __props.title,
        description: __props.description,
        ui: uiConfig.value,
        dismissible: isDisabled.value || isLoading.value ? false : __props.dismissible,
        side: __props.side,
        close: __props.close
      }, _ctx.$attrs), _createSlots({
        _: 2
        /* DYNAMIC */
      }, [
        _ctx.$slots.header ? {
          name: "header",
          fn: _withCtx((slotProps) => [
            _renderSlot(_ctx.$slots, "header", _normalizeProps(_guardReactiveProps(slotProps)))
          ]),
          key: "0"
        } : void 0,
        _ctx.$slots["header-left"] || _ctx.$slots.icon || __props.icon ? {
          name: "title",
          fn: _withCtx(() => [
            _createElementVNode("div", _hoisted_1, [
              _createVNode(_component_UButton, {
                color: "neutral",
                variant: "ghost",
                icon: "i-lucide-arrow-left",
                "aria-label": __props.backLabel,
                class: "inline-flex sm:hidden",
                disabled: isDisabled.value,
                loading: isLoading.value,
                onClick: _cache[0] || (_cache[0] = ($event) => isOpen.value = false)
              }, null, 8, ["aria-label", "disabled", "loading"]),
              _renderSlot(_ctx.$slots, "icon", {}, () => [
                __props.icon ? (_openBlock(), _createBlock(_component_UIcon, {
                  key: 0,
                  name: __props.icon,
                  class: "size-5 text-primary shrink-0"
                }, null, 8, ["name"])) : _createCommentVNode("v-if", true)
              ]),
              _createElementVNode(
                "span",
                _hoisted_2,
                _toDisplayString(__props.title),
                1
                /* TEXT */
              ),
              _renderSlot(_ctx.$slots, "header-left")
            ])
          ]),
          key: "1"
        } : void 0,
        _ctx.$slots["header-right"] ? {
          name: "actions",
          fn: _withCtx(() => [
            _renderSlot(_ctx.$slots, "header-right")
          ]),
          key: "2"
        } : void 0,
        _ctx.$slots.content ? {
          name: "content",
          fn: _withCtx(() => [
            _renderSlot(_ctx.$slots, "content")
          ]),
          key: "3"
        } : _ctx.$slots.body ? {
          name: "body",
          fn: _withCtx(() => [
            _renderSlot(_ctx.$slots, "body")
          ]),
          key: "4"
        } : void 0,
        _ctx.$slots.footer ? {
          name: "footer",
          fn: _withCtx(() => [
            _renderSlot(_ctx.$slots, "footer")
          ]),
          key: "5"
        } : void 0
      ]), 1040, ["open", "title", "description", "ui", "dismissible", "side", "close"]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

