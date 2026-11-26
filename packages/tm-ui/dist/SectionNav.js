import { defineComponent as _defineComponent } from "vue";
import { resolveComponent as _resolveComponent, createVNode as _createVNode, createElementVNode as _createElementVNode, renderSlot as _renderSlot, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue";
const _hoisted_1 = { class: "flex flex-col md:flex-row gap-4 md:gap-0 w-full" };
const _hoisted_2 = ["aria-label"];
const _hoisted_3 = { class: "flex-1 min-w-0 w-full md:ps-5" };
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "SectionNav",
  props: {
    items: { type: Array, required: true },
    ariaLabel: { type: String, required: false, default: "Navigation" }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      const _component_UNavigationMenu = _resolveComponent("UNavigationMenu");
      return _openBlock(), _createElementBlock("div", _hoisted_1, [
        _createElementVNode("nav", {
          class: "w-full md:w-52 shrink-0 border-b md:border-b-0 md:border-e border-default md:pe-5 pb-3 md:pb-0 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden",
          "aria-label": __props.ariaLabel
        }, [
          _createVNode(_component_UNavigationMenu, {
            items: __props.items,
            orientation: "horizontal",
            class: "md:hidden w-full",
            ui: {
              list: "flex-nowrap gap-1",
              item: "shrink-0",
              link: "shrink-0 whitespace-nowrap",
              linkLabel: "truncate-none whitespace-nowrap"
            }
          }, null, 8, ["items"]),
          _createVNode(_component_UNavigationMenu, {
            items: __props.items,
            orientation: "vertical",
            class: "hidden md:flex w-full"
          }, null, 8, ["items"])
        ], 8, _hoisted_2),
        _createElementVNode("div", _hoisted_3, [
          _renderSlot(_ctx.$slots, "default")
        ])
      ]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

