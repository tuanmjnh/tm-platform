import { defineComponent as _defineComponent } from "vue";
import { createCommentVNode as _createCommentVNode, renderSlot as _renderSlot, normalizeClass as _normalizeClass, createElementVNode as _createElementVNode, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "BentoGrid",
  props: {
    gap: { type: String, required: false, default: "gap-3" }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      return _openBlock(), _createElementBlock(
        _Fragment,
        null,
        [
          _createCommentVNode(" 1 col \u2192 6 cols \u2192 12 cols. BentoCard spans use the 12-col grid at xl. "),
          _createElementVNode(
            "div",
            {
              class: _normalizeClass(["grid grid-cols-1 sm:grid-cols-6 xl:grid-cols-12", __props.gap])
            },
            [
              _renderSlot(_ctx.$slots, "default")
            ],
            2
            /* CLASS */
          )
        ],
        2112
        /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
      );
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

