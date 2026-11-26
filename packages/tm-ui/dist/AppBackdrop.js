import { defineComponent as _defineComponent } from "vue";
import { createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode } from "vue";
const _hoisted_1 = {
  class: "tm-backdrop",
  "aria-hidden": "true"
};
const _hoisted_2 = {
  key: 0,
  class: "tm-iso-grid"
};
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "AppBackdrop",
  props: {
    grid: { type: Boolean, required: false, default: false }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      return _openBlock(), _createElementBlock("div", _hoisted_1, [
        _cache[0] || (_cache[0] = _createElementVNode(
          "div",
          { class: "tm-aurora" },
          null,
          -1
          /* CACHED */
        )),
        _cache[1] || (_cache[1] = _createElementVNode(
          "div",
          { class: "tm-beam" },
          null,
          -1
          /* CACHED */
        )),
        _cache[2] || (_cache[2] = _createElementVNode(
          "div",
          { class: "tm-orb tm-orb-1" },
          null,
          -1
          /* CACHED */
        )),
        _cache[3] || (_cache[3] = _createElementVNode(
          "div",
          { class: "tm-orb tm-orb-2" },
          null,
          -1
          /* CACHED */
        )),
        __props.grid ? (_openBlock(), _createElementBlock("div", _hoisted_2)) : _createCommentVNode("v-if", true)
      ]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

