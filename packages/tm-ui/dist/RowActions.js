import { defineComponent as _defineComponent } from "vue";
import { resolveComponent as _resolveComponent, withModifiers as _withModifiers, createVNode as _createVNode, withCtx as _withCtx, openBlock as _openBlock, createBlock as _createBlock } from "vue";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "RowActions",
  props: {
    items: { type: Array, required: true },
    align: { type: String, required: false, default: "end" },
    label: { type: String, required: false, default: "Actions" }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      const _component_UButton = _resolveComponent("UButton");
      const _component_UDropdownMenu = _resolveComponent("UDropdownMenu");
      return _openBlock(), _createBlock(_component_UDropdownMenu, {
        items: __props.items,
        content: { align: __props.align }
      }, {
        default: _withCtx(() => [
          _createVNode(_component_UButton, {
            icon: "i-lucide-ellipsis-vertical",
            color: "neutral",
            variant: "ghost",
            size: "xs",
            "aria-label": __props.label,
            onClick: _cache[0] || (_cache[0] = _withModifiers(() => {
            }, ["stop"]))
          }, null, 8, ["aria-label"])
        ]),
        _: 1
        /* STABLE */
      }, 8, ["items", "content"]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

