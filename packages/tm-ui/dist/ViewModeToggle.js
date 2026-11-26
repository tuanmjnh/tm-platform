import { defineComponent as _defineComponent } from "vue";
import { resolveComponent as _resolveComponent, createVNode as _createVNode, withCtx as _withCtx, openBlock as _openBlock, createBlock as _createBlock } from "vue";
import { computed } from "vue";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "ViewModeToggle",
  props: {
    modelValue: { type: String, required: false },
    listLabel: { type: String, required: false },
    gridLabel: { type: String, required: false }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const mode = computed({
      get: () => props.modelValue || "list",
      set: (v) => emit("update:modelValue", v)
    });
    return (_ctx, _cache) => {
      const _component_UButton = _resolveComponent("UButton");
      const _component_UFieldGroup = _resolveComponent("UFieldGroup");
      return _openBlock(), _createBlock(_component_UFieldGroup, { class: "hidden lg:flex shrink-0" }, {
        default: _withCtx(() => [
          _createVNode(_component_UButton, {
            icon: "i-lucide-list",
            color: mode.value === "list" ? "primary" : "neutral",
            variant: "soft",
            size: "sm",
            "aria-label": __props.listLabel ?? "List",
            "aria-pressed": mode.value === "list",
            onClick: _cache[0] || (_cache[0] = ($event) => mode.value = "list")
          }, null, 8, ["color", "aria-label", "aria-pressed"]),
          _createVNode(_component_UButton, {
            icon: "i-lucide-layout-grid",
            color: mode.value === "grid" ? "primary" : "neutral",
            variant: "soft",
            size: "sm",
            "aria-label": __props.gridLabel ?? "Grid",
            "aria-pressed": mode.value === "grid",
            onClick: _cache[1] || (_cache[1] = ($event) => mode.value = "grid")
          }, null, 8, ["color", "aria-label", "aria-pressed"])
        ]),
        _: 1
        /* STABLE */
      });
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

