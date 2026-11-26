import { defineComponent as _defineComponent } from "vue";
import { createCommentVNode as _createCommentVNode, renderSlot as _renderSlot, openBlock as _openBlock, createElementBlock as _createElementBlock, resolveComponent as _resolveComponent, createVNode as _createVNode, createElementVNode as _createElementVNode, normalizeClass as _normalizeClass, withCtx as _withCtx, Fragment as _Fragment } from "vue";
const _hoisted_1 = {
  key: 0,
  class: "hidden md:flex items-center gap-2 min-w-0"
};
const _hoisted_2 = { class: "p-4 min-w-[280px] max-w-[min(90vw,360px)] space-y-3 flex flex-col" };
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "FilterPopover",
  props: {
    popover: { type: Boolean, required: false, default: false },
    label: { type: String, required: false, default: "Filter" }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      const _component_UButton = _resolveComponent("UButton");
      const _component_UPopover = _resolveComponent("UPopover");
      return _openBlock(), _createElementBlock(
        _Fragment,
        null,
        [
          _createCommentVNode(" Desktop / tablet: inline filters "),
          !__props.popover ? (_openBlock(), _createElementBlock("div", _hoisted_1, [
            _renderSlot(_ctx.$slots, "default")
          ])) : _createCommentVNode("v-if", true),
          _createCommentVNode(" Responsive mobile popover, or always popover when requested "),
          _createVNode(_component_UPopover, {
            class: _normalizeClass(__props.popover ? "shrink-0" : "md:hidden shrink-0")
          }, {
            content: _withCtx(() => [
              _createElementVNode("div", _hoisted_2, [
                _renderSlot(_ctx.$slots, "default")
              ])
            ]),
            default: _withCtx(() => [
              _createVNode(_component_UButton, {
                icon: "i-lucide-filter",
                color: "neutral",
                variant: "soft",
                size: "sm",
                square: "",
                "aria-label": __props.label
              }, null, 8, ["aria-label"])
            ]),
            _: 3
            /* FORWARDED */
          }, 8, ["class"])
        ],
        64
        /* STABLE_FRAGMENT */
      );
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

