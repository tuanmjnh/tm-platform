import { defineComponent as _defineComponent } from "vue";
import { toDisplayString as _toDisplayString, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, renderList as _renderList, Fragment as _Fragment, resolveComponent as _resolveComponent, createVNode as _createVNode, withCtx as _withCtx, createElementVNode as _createElementVNode, normalizeClass as _normalizeClass, createBlock as _createBlock } from "vue";
const _hoisted_1 = { class: "space-y-3" };
const _hoisted_2 = {
  key: 0,
  class: "text-sm text-muted"
};
const _hoisted_3 = { class: "grid gap-4 sm:grid-cols-2" };
const _hoisted_4 = { class: "mt-3 flex flex-wrap items-center justify-between gap-2" };
const _hoisted_5 = { class: "flex min-w-0 flex-wrap items-center gap-2" };
const _hoisted_6 = {
  key: 1,
  class: "flex flex-wrap items-center justify-between gap-3 border-t border-default pt-3"
};
const _hoisted_7 = { class: "flex flex-wrap items-center gap-2" };
const _hoisted_8 = { class: "text-xs text-muted" };
import { computed } from "vue";
import { providerIconFor } from "./providerIcon.js";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "AIConnectionsEditor",
  props: {
    rows: { type: Array, required: true },
    providers: { type: Array, required: true },
    labels: { type: null, required: true },
    disabled: { type: Boolean, required: false, default: false },
    saving: { type: Boolean, required: false, default: false },
    testingId: { type: String, required: false, default: "" },
    tests: { type: Object, required: false, default: () => ({}) },
    providerIcon: { type: Function, required: false }
  },
  emits: ["add", "remove", "test", "save"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const iconFor = (provider) => (props.providerIcon || providerIconFor)(provider);
    const providerOptions = computed(() => props.providers.map((provider) => ({
      label: provider.name,
      value: provider.key,
      icon: iconFor(provider.key),
      description: provider.keyless ? props.labels.keyless : void 0
    })));
    function providerOf(row) {
      return props.providers.find((provider) => provider.key === row.providerKey);
    }
    function defaultBaseUrl(key) {
      return props.providers.find((provider) => provider.key === key)?.defaultBaseUrl || "";
    }
    function onProviderChange(row, value) {
      if (typeof value !== "string" || !value || value === row.providerKey) return;
      const previousDefault = defaultBaseUrl(row.providerKey);
      row.providerKey = value;
      if (!row.baseUrl.trim() || row.baseUrl.trim() === previousDefault) {
        row.baseUrl = defaultBaseUrl(value);
      }
    }
    function testResult(row) {
      return props.tests[row.connectionId.trim()] || null;
    }
    function canTest(row) {
      return Boolean(row.connectionId.trim() && row.models.trim());
    }
    return (_ctx, _cache) => {
      const _component_UInput = _resolveComponent("UInput");
      const _component_UFormField = _resolveComponent("UFormField");
      const _component_USelectMenu = _resolveComponent("USelectMenu");
      const _component_UButton = _resolveComponent("UButton");
      return _openBlock(), _createElementBlock("div", _hoisted_1, [
        !__props.rows.length ? (_openBlock(), _createElementBlock(
          "p",
          _hoisted_2,
          _toDisplayString(__props.labels.empty),
          1
          /* TEXT */
        )) : _createCommentVNode("v-if", true),
        (_openBlock(true), _createElementBlock(
          _Fragment,
          null,
          _renderList(__props.rows, (row, index) => {
            return _openBlock(), _createElementBlock("div", {
              key: index,
              class: "rounded-lg border border-default p-4"
            }, [
              _createElementVNode("div", _hoisted_3, [
                _createVNode(_component_UFormField, {
                  label: __props.labels.connectionId,
                  description: __props.labels.connectionIdDesc
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_UInput, {
                      modelValue: row.connectionId,
                      "onUpdate:modelValue": ($event) => row.connectionId = $event,
                      class: "w-full",
                      disabled: __props.disabled,
                      placeholder: "free-local"
                    }, null, 8, ["modelValue", "onUpdate:modelValue", "disabled"])
                  ]),
                  _: 2
                  /* DYNAMIC */
                }, 1032, ["label", "description"]),
                _createVNode(_component_UFormField, {
                  label: __props.labels.provider,
                  description: __props.labels.providerDesc
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_USelectMenu, {
                      "model-value": row.providerKey,
                      items: providerOptions.value,
                      "value-key": "value",
                      class: "w-full",
                      disabled: __props.disabled,
                      "onUpdate:modelValue": ($event) => onProviderChange(row, $event)
                    }, null, 8, ["model-value", "items", "disabled", "onUpdate:modelValue"])
                  ]),
                  _: 2
                  /* DYNAMIC */
                }, 1032, ["label", "description"]),
                _createVNode(_component_UFormField, {
                  label: __props.labels.baseUrl,
                  description: __props.labels.baseUrlDesc
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_UInput, {
                      modelValue: row.baseUrl,
                      "onUpdate:modelValue": ($event) => row.baseUrl = $event,
                      class: "w-full",
                      disabled: __props.disabled,
                      placeholder: providerOf(row)?.defaultBaseUrl || "http://127.0.0.1:11434/v1"
                    }, null, 8, ["modelValue", "onUpdate:modelValue", "disabled", "placeholder"])
                  ]),
                  _: 2
                  /* DYNAMIC */
                }, 1032, ["label", "description"]),
                _createVNode(_component_UFormField, {
                  label: __props.labels.models,
                  description: __props.labels.modelsDesc
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_UInput, {
                      modelValue: row.models,
                      "onUpdate:modelValue": ($event) => row.models = $event,
                      class: "w-full",
                      disabled: __props.disabled,
                      placeholder: "llama3.2, qwen2.5"
                    }, null, 8, ["modelValue", "onUpdate:modelValue", "disabled"])
                  ]),
                  _: 2
                  /* DYNAMIC */
                }, 1032, ["label", "description"]),
                _createVNode(_component_UFormField, {
                  label: __props.labels.keySlot,
                  description: __props.labels.keySlotDesc
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_UInput, {
                      modelValue: row.apiKeyEnv,
                      "onUpdate:modelValue": ($event) => row.apiKeyEnv = $event,
                      class: "w-full",
                      disabled: __props.disabled,
                      placeholder: "AI_API_KEY_FREELLM"
                    }, null, 8, ["modelValue", "onUpdate:modelValue", "disabled"])
                  ]),
                  _: 2
                  /* DYNAMIC */
                }, 1032, ["label", "description"]),
                _createVNode(_component_UFormField, {
                  label: __props.labels.keyValue,
                  description: row.hasKey ? __props.labels.keyValueSaved : __props.labels.keyValueHint
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_UInput, {
                      modelValue: row.apiKey,
                      "onUpdate:modelValue": ($event) => row.apiKey = $event,
                      type: "password",
                      class: "w-full",
                      disabled: __props.disabled,
                      autocomplete: "off"
                    }, null, 8, ["modelValue", "onUpdate:modelValue", "disabled"])
                  ]),
                  _: 2
                  /* DYNAMIC */
                }, 1032, ["label", "description"])
              ]),
              _createElementVNode("div", _hoisted_4, [
                _createElementVNode("div", _hoisted_5, [
                  _createVNode(_component_UButton, {
                    color: "neutral",
                    variant: "ghost",
                    size: "sm",
                    icon: "i-lucide-activity",
                    loading: __props.testingId === row.connectionId.trim(),
                    label: __props.labels.test,
                    disabled: __props.disabled || !canTest(row),
                    onClick: ($event) => emit("test", row)
                  }, null, 8, ["loading", "label", "disabled", "onClick"]),
                  testResult(row) ? (_openBlock(), _createElementBlock(
                    "span",
                    {
                      key: 0,
                      class: _normalizeClass(["truncate text-xs", testResult(row)?.ok ? "text-success" : "text-error"])
                    },
                    _toDisplayString(testResult(row)?.message),
                    3
                    /* TEXT, CLASS */
                  )) : _createCommentVNode("v-if", true)
                ]),
                !__props.disabled ? (_openBlock(), _createBlock(_component_UButton, {
                  key: 0,
                  color: "error",
                  variant: "ghost",
                  size: "sm",
                  icon: "i-lucide-trash-2",
                  label: __props.labels.remove,
                  onClick: ($event) => emit("remove", row)
                }, null, 8, ["label", "onClick"])) : _createCommentVNode("v-if", true)
              ])
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        )),
        !__props.disabled ? (_openBlock(), _createElementBlock("div", _hoisted_6, [
          _createElementVNode("div", _hoisted_7, [
            _createVNode(_component_UButton, {
              color: "neutral",
              variant: "soft",
              size: "sm",
              icon: "i-lucide-plus",
              label: __props.labels.add,
              onClick: _cache[0] || (_cache[0] = ($event) => emit("add"))
            }, null, 8, ["label"]),
            _createElementVNode(
              "span",
              _hoisted_8,
              _toDisplayString(__props.labels.unsavedHint),
              1
              /* TEXT */
            )
          ]),
          _createVNode(_component_UButton, {
            color: "primary",
            variant: "soft",
            icon: "i-lucide-save",
            label: __props.labels.save,
            loading: __props.saving,
            onClick: _cache[1] || (_cache[1] = ($event) => emit("save"))
          }, null, 8, ["label", "loading"])
        ])) : _createCommentVNode("v-if", true)
      ]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

