import { useModel as _useModel, mergeModels as _mergeModels, defineComponent as _defineComponent } from "vue";
import { renderSlot as _renderSlot, resolveComponent as _resolveComponent, createVNode as _createVNode, normalizeClass as _normalizeClass, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, withCtx as _withCtx, createBlock as _createBlock } from "vue";
const _hoisted_1 = {
  key: 0,
  class: "flex items-center gap-3"
};
const _hoisted_2 = { class: "pt-1.5 text-sm leading-relaxed text-muted" };
import { computed } from "vue";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "ConfirmModal",
  props: /* @__PURE__ */ _mergeModels({
    title: { type: String, required: false, default: "" },
    description: { type: String, required: false, default: "" },
    icon: { type: String, required: false, default: "i-lucide-alert-triangle" },
    color: { type: String, required: false, default: "error" },
    confirmLabel: { type: String, required: false, default: "Confirm" },
    cancelLabel: { type: String, required: false, default: "Cancel" },
    confirmIcon: { type: String, required: false, default: "" },
    loading: { type: Boolean, required: false, default: false }
  }, {
    "open": { type: Boolean, ...{ default: false } },
    "openModifiers": {}
  }),
  emits: /* @__PURE__ */ _mergeModels(["confirm", "cancel"], ["update:open"]),
  setup(__props, { emit: __emit }) {
    const props = __props;
    const open = _useModel(__props, "open");
    const emit = __emit;
    const toneClass = computed(() => {
      const map = {
        primary: "bg-primary/10 text-primary ring-primary/20",
        neutral: "bg-elevated text-toned ring-default/70",
        error: "bg-error/10 text-error ring-error/20",
        warning: "bg-warning/10 text-warning ring-warning/20",
        success: "bg-success/10 text-success ring-success/20"
      };
      return map[props.color];
    });
    function onCancel() {
      open.value = false;
      emit("cancel");
    }
    return (_ctx, _cache) => {
      const _component_UIcon = _resolveComponent("UIcon");
      const _component_UButton = _resolveComponent("UButton");
      const _component_UModal = _resolveComponent("UModal");
      return _openBlock(), _createBlock(_component_UModal, {
        open: open.value,
        "onUpdate:open": _cache[1] || (_cache[1] = ($event) => open.value = $event),
        title: __props.title,
        ui: { footer: "justify-end gap-2" }
      }, {
        body: _withCtx(() => [
          __props.description ? (_openBlock(), _createElementBlock("div", _hoisted_1, [
            __props.icon ? (_openBlock(), _createElementBlock(
              "span",
              {
                key: 0,
                class: _normalizeClass(["grid size-9 shrink-0 place-items-center rounded-[4px] ring-1 ring-inset", toneClass.value])
              },
              [
                _createVNode(_component_UIcon, {
                  name: __props.icon,
                  class: "size-4"
                }, null, 8, ["name"])
              ],
              2
              /* CLASS */
            )) : _createCommentVNode("v-if", true),
            _createElementVNode(
              "p",
              _hoisted_2,
              _toDisplayString(__props.description),
              1
              /* TEXT */
            )
          ])) : _renderSlot(_ctx.$slots, "body", {}, void 0, void 0, 1)
        ]),
        footer: _withCtx(() => [
          _createVNode(_component_UButton, {
            label: __props.cancelLabel,
            color: "neutral",
            variant: "ghost",
            disabled: __props.loading,
            onClick: onCancel
          }, null, 8, ["label", "disabled"]),
          _createVNode(_component_UButton, {
            label: __props.confirmLabel,
            variant: "soft",
            icon: __props.confirmIcon,
            color: __props.color,
            loading: __props.loading,
            onClick: _cache[0] || (_cache[0] = ($event) => emit("confirm"))
          }, null, 8, ["label", "icon", "color", "loading"])
        ]),
        default: _withCtx(() => [
          _renderSlot(_ctx.$slots, "default")
        ]),
        _: 3
        /* FORWARDED */
      }, 8, ["open", "title"]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

