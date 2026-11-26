import { defineComponent as _defineComponent } from "vue";
import { resolveComponent as _resolveComponent, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, withModifiers as _withModifiers, normalizeClass as _normalizeClass, createElementBlock as _createElementBlock } from "vue";
const _hoisted_1 = ["disabled"];
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "StatusBadge",
  props: {
    label: { type: String, required: true },
    color: { type: String, required: false, default: "neutral" },
    icon: { type: String, required: false, default: "" },
    size: { type: String, required: false, default: "xs" },
    clickable: { type: Boolean, required: false, default: false },
    loading: { type: Boolean, required: false, default: false },
    disabled: { type: Boolean, required: false, default: false }
  },
  emits: ["click"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const pillTone = {
      success: "bg-success/10 text-success",
      neutral: "bg-muted text-muted",
      warning: "bg-warning/10 text-warning",
      info: "bg-info/10 text-info",
      error: "bg-error/10 text-error",
      primary: "bg-primary/10 text-primary",
      secondary: "bg-secondary/10 text-secondary"
    };
    return (_ctx, _cache) => {
      const _component_UIcon = _resolveComponent("UIcon");
      const _component_UBadge = _resolveComponent("UBadge");
      return __props.clickable ? (_openBlock(), _createElementBlock("button", {
        key: 0,
        type: "button",
        class: _normalizeClass(["inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:opacity-80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60", pillTone[__props.color]]),
        disabled: __props.disabled || __props.loading,
        onClick: _cache[0] || (_cache[0] = _withModifiers(($event) => emit("click"), ["stop"]))
      }, [
        __props.loading ? (_openBlock(), _createBlock(_component_UIcon, {
          key: 0,
          name: "i-lucide-loader-2",
          class: "w-3.5 h-3.5 animate-spin"
        })) : __props.icon ? (_openBlock(), _createBlock(_component_UIcon, {
          key: 1,
          name: __props.icon,
          class: "w-3.5 h-3.5"
        }, null, 8, ["name"])) : _createCommentVNode("v-if", true),
        _createElementVNode(
          "span",
          null,
          _toDisplayString(__props.label),
          1
          /* TEXT */
        )
      ], 10, _hoisted_1)) : (_openBlock(), _createBlock(_component_UBadge, {
        key: 1,
        label: __props.label,
        color: __props.color,
        icon: __props.icon || void 0,
        variant: "subtle",
        size: __props.size
      }, null, 8, ["label", "color", "icon", "size"]));
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

