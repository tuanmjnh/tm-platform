import { useModel as _useModel, mergeModels as _mergeModels, defineComponent as _defineComponent } from "vue";
import { resolveComponent as _resolveComponent, createVNode as _createVNode, withCtx as _withCtx, openBlock as _openBlock, createBlock as _createBlock } from "vue";
import { ref } from "vue";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "PasswordInput",
  props: /* @__PURE__ */ _mergeModels({
    placeholder: { type: String, required: false, default: "" },
    size: { type: String, required: false, default: "md" },
    ariaLabel: { type: String, required: false, default: "" },
    autocomplete: { type: String, required: false, default: void 0 },
    showLabel: { type: String, required: false, default: "Show password" },
    hideLabel: { type: String, required: false, default: "Hide password" }
  }, {
    "modelValue": { type: String, ...{ default: "" } },
    "modelModifiers": {}
  }),
  emits: ["update:modelValue"],
  setup(__props) {
    const model = _useModel(__props, "modelValue");
    const show = ref(false);
    return (_ctx, _cache) => {
      const _component_UButton = _resolveComponent("UButton");
      const _component_UInput = _resolveComponent("UInput");
      return _openBlock(), _createBlock(_component_UInput, {
        modelValue: model.value,
        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => model.value = $event),
        placeholder: __props.placeholder,
        size: __props.size,
        type: show.value ? "text" : "password",
        autocomplete: __props.autocomplete,
        ui: { trailing: "pe-1" }
      }, {
        trailing: _withCtx(() => [
          _createVNode(_component_UButton, {
            color: "neutral",
            variant: "link",
            size: "sm",
            icon: show.value ? "i-lucide-eye-off" : "i-lucide-eye",
            "aria-label": __props.ariaLabel || (show.value ? __props.hideLabel : __props.showLabel),
            "aria-pressed": show.value,
            onClick: _cache[0] || (_cache[0] = ($event) => show.value = !show.value)
          }, null, 8, ["icon", "aria-label", "aria-pressed"])
        ]),
        _: 1
        /* STABLE */
      }, 8, ["modelValue", "placeholder", "size", "type", "autocomplete"]);
    };
  }
});
var stdin_default = __sfc_main;
__sfc_main.__scopeId = "data-v-tmui-passwordinput";
export {
  stdin_default as default
};

