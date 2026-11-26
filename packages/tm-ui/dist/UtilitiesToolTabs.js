import { defineComponent as _defineComponent } from "vue";
import { resolveComponent as _resolveComponent, createVNode as _createVNode, renderSlot as _renderSlot, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue";
const _hoisted_1 = { class: "space-y-4" };
import { computed } from "vue";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "UtilitiesToolTabs",
  props: {
    active: { type: String, required: true },
    items: { type: Array, required: true }
  },
  emits: ["select"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const tabs = computed(() => props.items.map((item) => ({
      label: item.label,
      value: item.value,
      icon: item.icon
    })));
    function onSelect(value) {
      if (value) emit("select", String(value));
    }
    return (_ctx, _cache) => {
      const _component_UTabs = _resolveComponent("UTabs");
      return _openBlock(), _createElementBlock("div", _hoisted_1, [
        _createVNode(_component_UTabs, {
          "model-value": __props.active,
          items: tabs.value,
          class: "w-full",
          content: false,
          ui: {
            list: "px-4 sm:px-6 flex-nowrap overflow-x-auto scrollbar-hide shrink-0",
            trigger: "flex-shrink-0",
            content: "flex-1 min-h-0 overflow-y-auto custom-scrollbar py-4 sm:py-6 px-4 sm:px-6 pb-24"
          },
          "onUpdate:modelValue": onSelect
        }, null, 8, ["model-value", "items"]),
        _renderSlot(_ctx.$slots, "default")
      ]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

