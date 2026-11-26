import { defineComponent as _defineComponent } from "vue";
import { resolveComponent as _resolveComponent, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, renderSlot as _renderSlot, createElementBlock as _createElementBlock, normalizeClass as _normalizeClass } from "vue";
const _hoisted_1 = {
  key: 0,
  class: "flex shrink-0 items-center justify-between gap-2 px-3.5 pt-3 pb-2"
};
const _hoisted_2 = { class: "flex min-w-0 items-center gap-2" };
const _hoisted_3 = { class: "truncate text-[13px] font-semibold tracking-tight text-highlighted" };
const _hoisted_4 = { class: "flex shrink-0 items-center gap-1.5" };
import { computed } from "vue";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "BentoCard",
  props: {
    span: { type: Number, required: false, default: 12 },
    spanSm: { type: Number, required: false, default: void 0 },
    title: { type: String, required: false, default: void 0 },
    icon: { type: String, required: false, default: void 0 },
    solid: { type: Boolean, required: false, default: false },
    refract: { type: Boolean, required: false, default: false },
    blur: { type: Boolean, required: false, default: false },
    flush: { type: Boolean, required: false, default: false },
    bodyClass: { type: String, required: false, default: "" }
  },
  setup(__props) {
    const props = __props;
    const SPAN_XL = {
      1: "xl:col-span-1",
      2: "xl:col-span-2",
      3: "xl:col-span-3",
      4: "xl:col-span-4",
      5: "xl:col-span-5",
      6: "xl:col-span-6",
      7: "xl:col-span-7",
      8: "xl:col-span-8",
      9: "xl:col-span-9",
      10: "xl:col-span-10",
      11: "xl:col-span-11",
      12: "xl:col-span-12"
    };
    const SPAN_SM = {
      1: "sm:col-span-1",
      2: "sm:col-span-2",
      3: "sm:col-span-3",
      4: "sm:col-span-4",
      5: "sm:col-span-5",
      6: "sm:col-span-6"
    };
    const classes = computed(() => [
      SPAN_XL[props.span] ?? SPAN_XL[12],
      props.spanSm ? SPAN_SM[props.spanSm] ?? "" : "",
      props.solid ? "surface-solid" : "",
      props.refract ? "refract" : "",
      props.blur ? "glass-blur" : ""
    ]);
    return (_ctx, _cache) => {
      const _component_UIcon = _resolveComponent("UIcon");
      return _openBlock(), _createElementBlock(
        "section",
        {
          class: _normalizeClass(["glass-panel glass-blur flex min-w-0 flex-col overflow-hidden", classes.value])
        },
        [
          __props.title || _ctx.$slots.header || _ctx.$slots.action ? (_openBlock(), _createElementBlock("header", _hoisted_1, [
            _createElementVNode("div", _hoisted_2, [
              __props.icon ? (_openBlock(), _createBlock(_component_UIcon, {
                key: 0,
                name: __props.icon,
                class: "size-3.5 shrink-0 text-primary"
              }, null, 8, ["name"])) : _createCommentVNode("v-if", true),
              _createElementVNode(
                "h2",
                _hoisted_3,
                _toDisplayString(__props.title),
                1
                /* TEXT */
              ),
              _renderSlot(_ctx.$slots, "header")
            ]),
            _createElementVNode("div", _hoisted_4, [
              _renderSlot(_ctx.$slots, "action")
            ])
          ])) : _createCommentVNode("v-if", true),
          _createElementVNode(
            "div",
            {
              class: _normalizeClass(["min-h-0 flex-1", __props.flush ? "" : __props.bodyClass || "px-3.5 pb-3.5"])
            },
            [
              _renderSlot(_ctx.$slots, "default")
            ],
            2
            /* CLASS */
          )
        ],
        2
        /* CLASS */
      );
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

