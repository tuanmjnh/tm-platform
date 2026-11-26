import { defineComponent as _defineComponent } from "vue";
import { renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, resolveComponent as _resolveComponent, createVNode as _createVNode, createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, createCommentVNode as _createCommentVNode, createBlock as _createBlock, unref as _unref } from "vue";
const _hoisted_1 = { class: "space-y-4" };
const _hoisted_2 = { class: "flex flex-wrap gap-2" };
const _hoisted_3 = {
  key: 0,
  class: "space-y-3 rounded-xl border border-default p-4"
};
const _hoisted_4 = { class: "flex items-center gap-3" };
const _hoisted_5 = { class: "w-24 text-sm text-muted" };
const _hoisted_6 = { class: "w-8 text-right font-mono text-sm" };
const _hoisted_7 = { class: "flex flex-wrap gap-4" };
const _hoisted_8 = { class: "flex items-center gap-3" };
const _hoisted_9 = { class: "w-24 text-sm text-muted" };
const _hoisted_10 = {
  key: 1,
  class: "space-y-3 rounded-xl border border-default p-4"
};
const _hoisted_11 = { class: "flex flex-wrap gap-2" };
const _hoisted_12 = { class: "flex items-center gap-3" };
const _hoisted_13 = { class: "w-24 text-sm text-muted" };
const _hoisted_14 = {
  key: 2,
  class: "space-y-3 rounded-xl border border-default p-4"
};
const _hoisted_15 = { class: "flex items-center gap-2" };
const _hoisted_16 = { class: "flex items-center gap-3" };
const _hoisted_17 = { class: "w-24 text-sm text-muted" };
const _hoisted_18 = { class: "w-16 text-right font-mono text-sm" };
const _hoisted_19 = { class: "flex items-center gap-3" };
const _hoisted_20 = { class: "w-24 text-sm text-muted" };
const _hoisted_21 = { class: "flex gap-2" };
const _hoisted_22 = {
  key: 3,
  class: "space-y-2"
};
const _hoisted_23 = { class: "flex-1 font-mono text-sm break-all" };
import { reactive, ref } from "vue";
import {
  generatePasswordBatch,
  generatePin,
  generateUuid,
  generateToken,
  generateApiKey,
  generateRandomKeyBatch,
  generateUsernameBatch
} from "@tuanmjnh/tm-core";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "UtilitiesRandomPanel",
  props: {
    t: { type: Function, required: true }
  },
  emits: ["copied", "copy-error"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const randomGens = [
      { id: "password", icon: "i-lucide-key-round" },
      { id: "username", icon: "i-lucide-user" },
      { id: "pin", icon: "i-lucide-lock" },
      { id: "uuid", icon: "i-lucide-fingerprint" },
      { id: "token", icon: "i-lucide-shield" },
      { id: "apiKey", icon: "i-lucide-badge" },
      { id: "key", icon: "i-lucide-key" }
    ];
    const randomType = ref("password");
    const genCount = ref(5);
    const genResults = ref([]);
    const hexKeyLength = ref(64);
    const pwOptions = reactive({
      length: 16,
      upper: true,
      lower: true,
      digits: true,
      symbols: true,
      excludeAmbiguous: false
    });
    const usernameStyle = ref("handle");
    const usernameSuffix = ref(true);
    const usernameStyles = [
      { id: "word" },
      { id: "name" },
      { id: "handle" },
      { id: "email-like" }
    ];
    function generate() {
      const count = Math.min(Math.max(genCount.value || 1, 1), 20);
      switch (randomType.value) {
        case "password":
          genResults.value = generatePasswordBatch(count, pwOptions);
          break;
        case "username":
          genResults.value = generateUsernameBatch(count, {
            style: usernameStyle.value,
            suffix: usernameSuffix.value
          });
          break;
        case "pin":
          genResults.value = Array.from({ length: count }, () => generatePin(6));
          break;
        case "uuid":
          genResults.value = Array.from({ length: count }, () => generateUuid());
          break;
        case "token":
          genResults.value = Array.from({ length: count }, () => generateToken(32));
          break;
        case "apiKey":
          genResults.value = Array.from({ length: count }, () => generateApiKey("tm"));
          break;
        case "key":
          genResults.value = generateRandomKeyBatch(count, hexKeyLength.value);
          break;
      }
    }
    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        emit("copied", text);
      } catch (error) {
        emit("copy-error", error);
      }
    }
    const copyOne = copyText;
    const copyAll = () => copyText(genResults.value.join("\n"));
    return (_ctx, _cache) => {
      const _component_UButton = _resolveComponent("UButton");
      const _component_USlider = _resolveComponent("USlider");
      const _component_UCheckbox = _resolveComponent("UCheckbox");
      const _component_UInput = _resolveComponent("UInput");
      return _openBlock(), _createElementBlock("div", _hoisted_1, [
        _createElementVNode("div", _hoisted_2, [
          (_openBlock(), _createElementBlock(
            _Fragment,
            null,
            _renderList(randomGens, (gen) => {
              return _createVNode(_component_UButton, {
                key: gen.id,
                label: props.t(`utilities.random.types.${gen.id}`),
                icon: gen.icon,
                size: "sm",
                color: randomType.value === gen.id ? "primary" : "neutral",
                variant: randomType.value === gen.id ? "solid" : "soft",
                onClick: ($event) => randomType.value = gen.id
              }, null, 8, ["label", "icon", "color", "variant", "onClick"]);
            }),
            64
            /* STABLE_FRAGMENT */
          ))
        ]),
        randomType.value === "password" ? (_openBlock(), _createElementBlock("div", _hoisted_3, [
          _createElementVNode("div", _hoisted_4, [
            _createElementVNode(
              "label",
              _hoisted_5,
              _toDisplayString(props.t("utilities.random.length")),
              1
              /* TEXT */
            ),
            _createVNode(_component_USlider, {
              modelValue: pwOptions.length,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => pwOptions.length = $event),
              min: 4,
              max: 64,
              class: "flex-1"
            }, null, 8, ["modelValue"]),
            _createElementVNode(
              "span",
              _hoisted_6,
              _toDisplayString(pwOptions.length),
              1
              /* TEXT */
            )
          ]),
          _createElementVNode("div", _hoisted_7, [
            _createVNode(_component_UCheckbox, {
              modelValue: pwOptions.upper,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => pwOptions.upper = $event),
              label: props.t("utilities.random.upper")
            }, null, 8, ["modelValue", "label"]),
            _createVNode(_component_UCheckbox, {
              modelValue: pwOptions.lower,
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => pwOptions.lower = $event),
              label: props.t("utilities.random.lower")
            }, null, 8, ["modelValue", "label"]),
            _createVNode(_component_UCheckbox, {
              modelValue: pwOptions.digits,
              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => pwOptions.digits = $event),
              label: props.t("utilities.random.digits")
            }, null, 8, ["modelValue", "label"]),
            _createVNode(_component_UCheckbox, {
              modelValue: pwOptions.symbols,
              "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => pwOptions.symbols = $event),
              label: props.t("utilities.random.symbols")
            }, null, 8, ["modelValue", "label"]),
            _createVNode(_component_UCheckbox, {
              modelValue: pwOptions.excludeAmbiguous,
              "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => pwOptions.excludeAmbiguous = $event),
              label: props.t("utilities.random.excludeAmbiguous")
            }, null, 8, ["modelValue", "label"])
          ]),
          _createElementVNode("div", _hoisted_8, [
            _createElementVNode(
              "label",
              _hoisted_9,
              _toDisplayString(props.t("utilities.random.count")),
              1
              /* TEXT */
            ),
            _createVNode(_component_UInput, {
              modelValue: genCount.value,
              "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => genCount.value = $event),
              modelModifiers: { number: true },
              type: "number",
              min: 1,
              max: 20,
              size: "xs",
              class: "w-20"
            }, null, 8, ["modelValue"])
          ])
        ])) : _createCommentVNode("v-if", true),
        randomType.value === "username" ? (_openBlock(), _createElementBlock("div", _hoisted_10, [
          _createElementVNode("div", _hoisted_11, [
            (_openBlock(), _createElementBlock(
              _Fragment,
              null,
              _renderList(usernameStyles, (style) => {
                return _createVNode(_component_UButton, {
                  key: style.id,
                  label: props.t(`utilities.random.styles.${style.id}`),
                  size: "xs",
                  color: usernameStyle.value === style.id ? "primary" : "neutral",
                  variant: usernameStyle.value === style.id ? "solid" : "soft",
                  onClick: ($event) => usernameStyle.value = style.id
                }, null, 8, ["label", "color", "variant", "onClick"]);
              }),
              64
              /* STABLE_FRAGMENT */
            ))
          ]),
          _createVNode(_component_UCheckbox, {
            modelValue: usernameSuffix.value,
            "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => usernameSuffix.value = $event),
            label: props.t("utilities.random.suffix")
          }, null, 8, ["modelValue", "label"]),
          _createElementVNode("div", _hoisted_12, [
            _createElementVNode(
              "label",
              _hoisted_13,
              _toDisplayString(props.t("utilities.random.count")),
              1
              /* TEXT */
            ),
            _createVNode(_component_UInput, {
              modelValue: genCount.value,
              "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => genCount.value = $event),
              modelModifiers: { number: true },
              type: "number",
              min: 1,
              max: 20,
              size: "xs",
              class: "w-20"
            }, null, 8, ["modelValue"])
          ])
        ])) : _createCommentVNode("v-if", true),
        randomType.value === "key" ? (_openBlock(), _createElementBlock("div", _hoisted_14, [
          _createElementVNode("div", _hoisted_15, [
            _createVNode(_component_UButton, {
              label: "32 chars",
              size: "xs",
              color: hexKeyLength.value === 32 ? "primary" : "neutral",
              variant: hexKeyLength.value === 32 ? "solid" : "soft",
              onClick: _cache[9] || (_cache[9] = ($event) => hexKeyLength.value = 32)
            }, null, 8, ["color", "variant"]),
            _createVNode(_component_UButton, {
              label: "64 chars",
              size: "xs",
              color: hexKeyLength.value === 64 ? "primary" : "neutral",
              variant: hexKeyLength.value === 64 ? "solid" : "soft",
              onClick: _cache[10] || (_cache[10] = ($event) => hexKeyLength.value = 64)
            }, null, 8, ["color", "variant"])
          ]),
          _createElementVNode("div", _hoisted_16, [
            _createElementVNode(
              "label",
              _hoisted_17,
              _toDisplayString(props.t("utilities.random.length")),
              1
              /* TEXT */
            ),
            _createVNode(_component_USlider, {
              modelValue: hexKeyLength.value,
              "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => hexKeyLength.value = $event),
              min: 16,
              max: 128,
              step: 16,
              class: "flex-1"
            }, null, 8, ["modelValue"]),
            _createElementVNode(
              "span",
              _hoisted_18,
              _toDisplayString(hexKeyLength.value),
              1
              /* TEXT */
            )
          ]),
          _createElementVNode("div", _hoisted_19, [
            _createElementVNode(
              "label",
              _hoisted_20,
              _toDisplayString(props.t("utilities.random.count")),
              1
              /* TEXT */
            ),
            _createVNode(_component_UInput, {
              modelValue: genCount.value,
              "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => genCount.value = $event),
              modelModifiers: { number: true },
              type: "number",
              min: 1,
              max: 20,
              size: "xs",
              class: "w-20"
            }, null, 8, ["modelValue"])
          ])
        ])) : _createCommentVNode("v-if", true),
        _createElementVNode("div", _hoisted_21, [
          _createVNode(_component_UButton, {
            label: props.t("utilities.random.generate"),
            icon: "i-lucide-dices",
            color: "neutral",
            variant: "soft",
            onClick: generate
          }, null, 8, ["label"]),
          genResults.value.length ? (_openBlock(), _createBlock(_component_UButton, {
            key: 0,
            label: props.t("utilities.random.copyAll"),
            icon: "i-lucide-copy",
            color: "neutral",
            variant: "soft",
            onClick: copyAll
          }, null, 8, ["label"])) : _createCommentVNode("v-if", true)
        ]),
        genResults.value.length ? (_openBlock(), _createElementBlock("div", _hoisted_22, [
          (_openBlock(true), _createElementBlock(
            _Fragment,
            null,
            _renderList(genResults.value, (item, idx) => {
              return _openBlock(), _createElementBlock("div", {
                key: idx,
                class: "flex items-center gap-2 rounded-lg bg-default/50 px-3 py-2"
              }, [
                _createElementVNode(
                  "code",
                  _hoisted_23,
                  _toDisplayString(item),
                  1
                  /* TEXT */
                ),
                _createVNode(_component_UButton, {
                  icon: "i-lucide-copy",
                  size: "xs",
                  color: "neutral",
                  variant: "ghost",
                  onClick: ($event) => _unref(copyOne)(item)
                }, null, 8, ["onClick"])
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : _createCommentVNode("v-if", true)
      ]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

