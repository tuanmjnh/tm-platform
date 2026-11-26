import { defineComponent as _defineComponent } from "vue";
import { toDisplayString as _toDisplayString, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, resolveComponent as _resolveComponent, createVNode as _createVNode, createElementVNode as _createElementVNode, renderList as _renderList, Fragment as _Fragment, createBlock as _createBlock, renderSlot as _renderSlot } from "vue";
const _hoisted_1 = {
  key: 0,
  class: "p-8 text-center text-muted"
};
const _hoisted_2 = {
  key: 1,
  class: "flex flex-col items-center justify-center p-8 sm:p-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-elevated/20 text-center space-y-4"
};
const _hoisted_3 = { class: "p-3.5 rounded-full bg-primary/10 text-primary" };
const _hoisted_4 = { class: "space-y-1 max-w-md" };
const _hoisted_5 = { class: "font-semibold text-base text-highlighted" };
const _hoisted_6 = {
  key: 0,
  class: "text-xs text-neutral-500 leading-relaxed"
};
const _hoisted_7 = {
  key: 0,
  class: "flex flex-wrap items-center justify-center gap-2 pt-2"
};
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "EmptyState",
  props: {
    title: { type: String, required: true },
    description: { type: String, required: false, default: "" },
    icon: { type: String, required: false, default: "" },
    actions: { type: Array, required: false, default: () => [] }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      const _component_UIcon = _resolveComponent("UIcon");
      const _component_UButton = _resolveComponent("UButton");
      return !__props.description && !__props.actions.length && !__props.icon ? (_openBlock(), _createElementBlock(
        "div",
        _hoisted_1,
        _toDisplayString(__props.title),
        1
        /* TEXT */
      )) : (_openBlock(), _createElementBlock("div", _hoisted_2, [
        _createElementVNode("div", _hoisted_3, [
          _createVNode(_component_UIcon, {
            name: __props.icon || "i-lucide-inbox",
            class: "w-8 h-8"
          }, null, 8, ["name"])
        ]),
        _createElementVNode("div", _hoisted_4, [
          _createElementVNode(
            "h3",
            _hoisted_5,
            _toDisplayString(__props.title),
            1
            /* TEXT */
          ),
          __props.description ? (_openBlock(), _createElementBlock(
            "p",
            _hoisted_6,
            _toDisplayString(__props.description),
            1
            /* TEXT */
          )) : _createCommentVNode("v-if", true)
        ]),
        __props.actions.length ? (_openBlock(), _createElementBlock("div", _hoisted_7, [
          (_openBlock(true), _createElementBlock(
            _Fragment,
            null,
            _renderList(__props.actions, (action, i) => {
              return _openBlock(), _createBlock(_component_UButton, {
                key: i,
                label: action.label,
                icon: action.icon,
                color: action.color || "primary",
                variant: action.variant || "solid",
                size: "md",
                onClick: ($event) => action.onClick?.()
              }, null, 8, ["label", "icon", "color", "variant", "onClick"]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : _createCommentVNode("v-if", true),
        _renderSlot(_ctx.$slots, "default")
      ]));
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

