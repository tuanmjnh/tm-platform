import { useModel as _useModel, mergeModels as _mergeModels, defineComponent as _defineComponent } from "vue";
import { renderSlot as _renderSlot, resolveComponent as _resolveComponent, createVNode as _createVNode, createElementVNode as _createElementVNode, withCtx as _withCtx, openBlock as _openBlock, createBlock as _createBlock } from "vue";
const _hoisted_1 = { class: "flex justify-end gap-2 pt-2" };
import ResponsiveModal from "./ResponsiveModal.js";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "FormModal",
  props: /* @__PURE__ */ _mergeModels({
    title: { type: String, required: true },
    description: { type: String, required: false },
    schema: { type: null, required: false },
    state: { type: Object, required: true },
    loading: { type: Boolean, required: false },
    submitLabel: { type: String, required: false },
    cancelLabel: { type: String, required: false },
    ui: { type: Object, required: false }
  }, {
    "open": { type: Boolean, ...{ default: false } },
    "openModifiers": {}
  }),
  emits: /* @__PURE__ */ _mergeModels(["submit", "cancel"], ["update:open"]),
  setup(__props, { emit: __emit }) {
    const open = _useModel(__props, "open");
    const emit = __emit;
    function onCancel() {
      open.value = false;
      emit("cancel");
    }
    return (_ctx, _cache) => {
      const _component_UButton = _resolveComponent("UButton");
      const _component_UForm = _resolveComponent("UForm");
      return _openBlock(), _createBlock(ResponsiveModal, {
        open: open.value,
        "onUpdate:open": _cache[1] || (_cache[1] = ($event) => open.value = $event),
        title: __props.title,
        description: __props.description,
        ui: __props.ui,
        close: !__props.loading,
        dismissible: !__props.loading
      }, {
        body: _withCtx(() => [
          _createVNode(_component_UForm, {
            schema: __props.schema,
            state: __props.state,
            class: "space-y-4",
            onSubmit: _cache[0] || (_cache[0] = ($event) => emit("submit", $event))
          }, {
            default: _withCtx(() => [
              _renderSlot(_ctx.$slots, "default"),
              _renderSlot(_ctx.$slots, "actions", {}, () => [
                _createElementVNode("div", _hoisted_1, [
                  _createVNode(_component_UButton, {
                    label: __props.cancelLabel ?? "Cancel",
                    color: "neutral",
                    variant: "ghost",
                    disabled: __props.loading,
                    onClick: onCancel
                  }, null, 8, ["label", "disabled"]),
                  _createVNode(_component_UButton, {
                    type: "submit",
                    label: __props.submitLabel ?? "Save",
                    loading: __props.loading
                  }, null, 8, ["label", "loading"])
                ])
              ])
            ]),
            _: 3
            /* FORWARDED */
          }, 8, ["schema", "state"])
        ]),
        _: 3
        /* FORWARDED */
      }, 8, ["open", "title", "description", "ui", "close", "dismissible"]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

