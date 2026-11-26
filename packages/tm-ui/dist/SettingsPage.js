import { useModel as _useModel, mergeModels as _mergeModels, defineComponent as _defineComponent } from "vue";
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, withCtx as _withCtx, createVNode as _createVNode, createSlots as _createSlots, openBlock as _openBlock, createBlock as _createBlock } from "vue";
const _hoisted_1 = { class: "flex flex-col gap-4" };
import SectionNav from "./SectionNav.js";
import Page from "./Page.js";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "SettingsPage",
  props: /* @__PURE__ */ _mergeModels({
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: false }
  }, {
    "items": { type: Array, ...{ default: () => [] } },
    "itemsModifiers": {}
  }),
  emits: ["update:items"],
  setup(__props) {
    const items = _useModel(__props, "items");
    return (_ctx, _cache) => {
      return _openBlock(), _createBlock(Page, {
        id: __props.id,
        title: __props.title,
        description: __props.description
      }, _createSlots({
        default: _withCtx(() => [
          _createVNode(SectionNav, { items: items.value }, {
            default: _withCtx(() => [
              _createElementVNode("div", _hoisted_1, [
                _renderSlot(_ctx.$slots, "default")
              ])
            ]),
            _: 3
            /* FORWARDED */
          }, 8, ["items"])
        ]),
        _: 2
        /* DYNAMIC */
      }, [
        _ctx.$slots.right ? {
          name: "right",
          fn: _withCtx(() => [
            _renderSlot(_ctx.$slots, "right")
          ]),
          key: "0"
        } : void 0,
        _ctx.$slots.left ? {
          name: "left",
          fn: _withCtx(() => [
            _renderSlot(_ctx.$slots, "left")
          ]),
          key: "1"
        } : void 0,
        _ctx.$slots.toolbar ? {
          name: "toolbar",
          fn: _withCtx(() => [
            _renderSlot(_ctx.$slots, "toolbar")
          ]),
          key: "2"
        } : void 0,
        _ctx.$slots.footer ? {
          name: "footer",
          fn: _withCtx(() => [
            _renderSlot(_ctx.$slots, "footer")
          ]),
          key: "3"
        } : void 0
      ]), 1032, ["id", "title", "description"]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

