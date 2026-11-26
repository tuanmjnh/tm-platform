import { defineComponent as _defineComponent } from "vue";
import { createCommentVNode as _createCommentVNode, renderSlot as _renderSlot, createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, createVNode as _createVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, Fragment as _Fragment } from "vue";
const _hoisted_1 = { class: "flex min-h-8 items-center justify-between gap-3 w-full" };
const _hoisted_2 = { class: "flex items-center gap-2 min-w-0" };
const _hoisted_3 = { class: "flex items-center gap-3 shrink-0" };
const _hoisted_4 = { class: "flex items-center gap-2 text-[11px] sm:text-xs text-muted font-medium" };
const _hoisted_5 = { class: "flex items-center gap-1.5 text-[11px] sm:text-xs text-muted font-medium shrink-0 whitespace-nowrap" };
const _hoisted_6 = { class: "text-highlighted font-semibold" };
const _hoisted_7 = {
  key: 0,
  class: "flex items-center gap-1.5 text-primary"
};
const _hoisted_8 = { class: "hidden sm:inline text-xs" };
const _hoisted_9 = {
  key: 1,
  class: "hidden sm:flex items-center gap-1.5 text-dimmed italic"
};
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "ListFooter",
  props: {
    count: { type: Number, required: false, default: 0 },
    hasMore: { type: Boolean, required: false, default: false },
    loading: { type: Boolean, required: false, default: false },
    showNoMore: { type: Boolean, required: false, default: false },
    recordsLabel: { type: String, required: false, default: "Record(s)" },
    loadingLabel: { type: String, required: false, default: "Loading..." },
    noMoreLabel: { type: String, required: false, default: "No more data" }
  },
  setup(__props) {
    const props = __props;
    return (_ctx, _cache) => {
      const _component_UIcon = _resolveComponent("UIcon");
      return _openBlock(), _createElementBlock(
        _Fragment,
        null,
        [
          _createCommentVNode(" min-h-8: matches the sidebar UserMenu footer row height (49px with wrapper py-2 + border) "),
          _createElementVNode("div", _hoisted_1, [
            _createElementVNode("div", _hoisted_2, [
              _renderSlot(_ctx.$slots, "left")
            ]),
            _createElementVNode("div", _hoisted_3, [
              _renderSlot(_ctx.$slots, "right"),
              _createElementVNode("div", _hoisted_4, [
                _createElementVNode("span", _hoisted_5, [
                  _createElementVNode(
                    "strong",
                    _hoisted_6,
                    _toDisplayString(props.hasMore ? `${props.count}+` : props.count),
                    1
                    /* TEXT */
                  ),
                  _createTextVNode(
                    " " + _toDisplayString(props.recordsLabel),
                    1
                    /* TEXT */
                  )
                ]),
                props.loading ? (_openBlock(), _createElementBlock("div", _hoisted_7, [
                  _createVNode(_component_UIcon, {
                    name: "i-lucide-loader-2",
                    class: "size-3.5 animate-spin"
                  }),
                  _createElementVNode(
                    "span",
                    _hoisted_8,
                    _toDisplayString(props.loadingLabel),
                    1
                    /* TEXT */
                  )
                ])) : props.showNoMore && !props.hasMore && props.count > 0 ? (_openBlock(), _createElementBlock("div", _hoisted_9, [
                  _createVNode(_component_UIcon, {
                    name: "i-lucide-check-circle-2",
                    class: "size-3.5"
                  }),
                  _createTextVNode(
                    " " + _toDisplayString(props.noMoreLabel),
                    1
                    /* TEXT */
                  )
                ])) : _createCommentVNode("v-if", true)
              ])
            ])
          ])
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

