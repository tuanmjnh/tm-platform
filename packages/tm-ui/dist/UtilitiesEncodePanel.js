import { defineComponent as _defineComponent } from "vue";
import { createCommentVNode as _createCommentVNode, resolveComponent as _resolveComponent, createVNode as _createVNode, toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, withCtx as _withCtx, unref as _unref, createBlock as _createBlock } from "vue";
const _hoisted_1 = { class: "space-y-4" };
const _hoisted_2 = { class: "flex flex-wrap items-center justify-between gap-2" };
const _hoisted_3 = { class: "flex items-center gap-2" };
const _hoisted_4 = { class: "text-sm font-semibold text-highlighted" };
const _hoisted_5 = { class: "text-xs text-muted" };
const _hoisted_6 = { class: "flex flex-wrap gap-1.5" };
const _hoisted_7 = { class: "grid gap-4 lg:grid-cols-2" };
const _hoisted_8 = {
  key: 0,
  class: "text-xs text-error"
};
const _hoisted_9 = {
  key: 1,
  class: "text-xs text-dimmed"
};
const _hoisted_10 = { class: "flex flex-wrap items-center justify-between gap-2" };
const _hoisted_11 = { class: "flex items-center gap-2" };
const _hoisted_12 = { class: "text-sm font-semibold text-highlighted" };
const _hoisted_13 = { class: "text-xs text-muted" };
const _hoisted_14 = { class: "flex flex-wrap items-center gap-2" };
const _hoisted_15 = { class: "space-y-3" };
const _hoisted_16 = {
  key: 0,
  class: "space-y-1"
};
const _hoisted_17 = { class: "flex items-center justify-between" };
const _hoisted_18 = { class: "text-xs font-medium text-muted" };
const _hoisted_19 = { class: "rounded-lg bg-default/50 p-3 font-mono text-xs break-all" };
const _hoisted_20 = {
  key: 1,
  class: "text-xs text-dimmed"
};
const _hoisted_21 = { class: "flex flex-wrap items-center justify-between gap-2" };
const _hoisted_22 = { class: "flex items-center gap-2" };
const _hoisted_23 = { class: "text-xs text-muted" };
const _hoisted_24 = {
  key: 0,
  class: "space-y-3"
};
const _hoisted_25 = { class: "grid gap-3 lg:grid-cols-2" };
const _hoisted_26 = { class: "space-y-2" };
const _hoisted_27 = { class: "text-xs font-medium text-muted" };
const _hoisted_28 = {
  key: 0,
  class: "text-xs text-error"
};
const _hoisted_29 = { class: "space-y-2" };
const _hoisted_30 = { class: "text-xs font-medium text-muted" };
const _hoisted_31 = {
  key: 0,
  class: "text-xs text-error"
};
const _hoisted_32 = { class: "flex flex-wrap items-end gap-3" };
const _hoisted_33 = { class: "space-y-1" };
const _hoisted_34 = {
  key: 0,
  class: "flex-1 min-w-48 space-y-1"
};
const _hoisted_35 = { class: "text-xs font-medium text-muted" };
const _hoisted_36 = {
  key: 0,
  class: "space-y-1"
};
const _hoisted_37 = { class: "flex items-center justify-between" };
const _hoisted_38 = { class: "rounded-lg bg-default/50 p-3 font-mono text-xs break-all" };
const _hoisted_39 = {
  key: 1,
  class: "text-xs text-dimmed"
};
const _hoisted_40 = { class: "space-y-3" };
const _hoisted_41 = { class: "flex justify-end" };
const _hoisted_42 = {
  key: 1,
  class: "rounded-lg border border-default bg-default/30 p-3"
};
const _hoisted_43 = { class: "mb-1 flex items-center justify-between" };
const _hoisted_44 = { class: "overflow-auto font-mono text-xs" };
const _hoisted_45 = {
  key: 2,
  class: "rounded-lg border border-default bg-default/30 p-3"
};
const _hoisted_46 = { class: "mb-1 flex items-center justify-between" };
const _hoisted_47 = { class: "overflow-auto font-mono text-xs" };
const _hoisted_48 = {
  key: 0,
  class: "mt-2 text-xs text-muted"
};
const _hoisted_49 = {
  key: 3,
  class: "text-xs text-dimmed"
};
const _hoisted_50 = { class: "flex flex-wrap items-center justify-between gap-2" };
const _hoisted_51 = { class: "flex items-center gap-2" };
const _hoisted_52 = { class: "text-sm font-semibold text-highlighted" };
const _hoisted_53 = { class: "text-xs text-muted" };
const _hoisted_54 = { class: "flex flex-wrap items-center gap-1.5" };
const _hoisted_55 = { class: "space-y-3" };
const _hoisted_56 = { class: "flex items-center gap-3" };
const _hoisted_57 = { class: "text-xs font-medium text-muted w-24" };
const _hoisted_58 = { class: "flex items-center gap-3 flex-1" };
const _hoisted_59 = { class: "w-16 text-right font-mono text-xs font-semibold" };
const _hoisted_60 = {
  key: 0,
  class: "space-y-1.5"
};
const _hoisted_61 = { class: "flex items-center justify-between" };
const _hoisted_62 = { class: "text-xs font-medium text-muted" };
const _hoisted_63 = { class: "rounded-lg bg-default/50 p-3 font-mono text-xs break-all border border-default select-all" };
const _hoisted_64 = {
  key: 1,
  class: "text-xs text-dimmed"
};
import { computed, onMounted, ref, watch } from "vue";
import UtilitiesTextPane from "./UtilitiesTextPane.js";
import {
  encodeBase64,
  decodeBase64,
  encodeUrl,
  decodeUrl,
  escapeHtml,
  unescapeHtml,
  encodeHex,
  decodeHex,
  encodeBinary,
  decodeBinary,
  rot13,
  runHash,
  decodeJwt,
  encodeJwt,
  generateHexKey
} from "@tuanmjnh/tm-core";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "UtilitiesEncodePanel",
  props: {
    t: { type: Function, required: true }
  },
  emits: ["copied", "copy-error"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const t = (key, params) => props.t(key, params);
    const emit = __emit;
    function reportCopied(text) {
      emit("copied", text);
    }
    function reportError(error) {
      emit("copy-error", error);
    }
    const encodeOps = [
      { id: "base64Encode", icon: "i-lucide-lock" },
      { id: "base64Decode", icon: "i-lucide-lock-open" },
      { id: "urlEncode", icon: "i-lucide-link" },
      { id: "urlDecode", icon: "i-lucide-unlink" },
      { id: "htmlEscape", icon: "i-lucide-code-xml" },
      { id: "htmlUnescape", icon: "i-lucide-code" },
      { id: "hexEncode", icon: "i-lucide-hash" },
      { id: "hexDecode", icon: "i-lucide-unplug" },
      { id: "binaryEncode", icon: "i-lucide-binary" },
      { id: "binaryDecode", icon: "i-lucide-list-ordered" },
      { id: "rot13", icon: "i-lucide-refresh-cw" }
    ];
    const encodeOp = ref("base64Encode");
    const encodeInput = ref("");
    const encodeError = ref("");
    const encodeOutput = ref("");
    watch([encodeInput, encodeOp], () => {
      const input = encodeInput.value;
      if (!input) {
        encodeOutput.value = "";
        encodeError.value = "";
        return;
      }
      try {
        encodeError.value = "";
        switch (encodeOp.value) {
          case "base64Encode":
            encodeOutput.value = encodeBase64(input);
            break;
          case "base64Decode":
            encodeOutput.value = decodeBase64(input);
            break;
          case "urlEncode":
            encodeOutput.value = encodeUrl(input);
            break;
          case "urlDecode":
            encodeOutput.value = decodeUrl(input);
            break;
          case "htmlEscape":
            encodeOutput.value = escapeHtml(input);
            break;
          case "htmlUnescape":
            encodeOutput.value = unescapeHtml(input);
            break;
          case "hexEncode":
            encodeOutput.value = encodeHex(input);
            break;
          case "hexDecode":
            encodeOutput.value = decodeHex(input);
            break;
          case "binaryEncode":
            encodeOutput.value = encodeBinary(input);
            break;
          case "binaryDecode":
            encodeOutput.value = decodeBinary(input);
            break;
          case "rot13":
            encodeOutput.value = rot13(input);
            break;
          default:
            encodeOutput.value = "";
        }
      } catch (e) {
        encodeOutput.value = "";
        encodeError.value = e instanceof Error ? e.message : String(e);
      }
    }, { immediate: true });
    const hashInput = ref("");
    const hashAlgo = ref("SHA-256");
    const hashAlgorithms = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512"];
    const hashResult = ref("");
    const hashLoading = ref(false);
    async function computeHash() {
      if (!hashInput.value.trim()) return;
      hashLoading.value = true;
      try {
        hashResult.value = await runHash(hashAlgo.value, hashInput.value);
      } finally {
        hashLoading.value = false;
      }
    }
    const jwtMode = ref("encode");
    const jwtInput = ref("");
    const jwtResult = ref(null);
    const jwtPayloadJson = ref('{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}');
    const jwtHeaderJson = ref("");
    const jwtSecret = ref("");
    const jwtAlgo = ref("HS256");
    const jwtEncoded = ref("");
    const jwtEncoding = ref(false);
    const jwtPayloadError = ref("");
    const jwtHeaderError = ref("");
    function parseJwtJson(raw, isPayload) {
      if (!raw.trim()) {
        if (isPayload) jwtPayloadError.value = "";
        else jwtHeaderError.value = "";
        return null;
      }
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          const err = t("utilities.crypto.jwt.jsonMustBeObject");
          if (isPayload) jwtPayloadError.value = err;
          else jwtHeaderError.value = err;
          return null;
        }
        if (isPayload) jwtPayloadError.value = "";
        else jwtHeaderError.value = "";
        return parsed;
      } catch (error) {
        const err = t("utilities.crypto.jwt.jsonInvalid");
        if (isPayload) jwtPayloadError.value = err;
        else jwtHeaderError.value = err;
        return null;
      }
    }
    watch(jwtPayloadJson, (v) => parseJwtJson(v, true));
    watch(jwtHeaderJson, (v) => parseJwtJson(v, false));
    async function doEncodeJwt() {
      const payload = parseJwtJson(jwtPayloadJson.value, true);
      if (!payload) return;
      const header = parseJwtJson(jwtHeaderJson.value, false);
      if (jwtHeaderJson.value.trim() && !header) return;
      jwtEncoding.value = true;
      try {
        jwtEncoded.value = await encodeJwt(payload, {
          algorithm: jwtAlgo.value,
          secret: jwtAlgo.value === "HS256" ? jwtSecret.value : void 0,
          header: header ?? void 0
        });
      } catch (e) {
        jwtEncoded.value = "";
        reportError(e);
      } finally {
        jwtEncoding.value = false;
      }
    }
    const expHint = computed(() => {
      const exp = jwtResult.value?.payload?.exp;
      if (typeof exp !== "number") return "";
      const d = new Date(exp * 1e3);
      const expired = d.getTime() < Date.now();
      const label = expired ? t("utilities.crypto.jwt.expired") : t("utilities.crypto.jwt.validUntil");
      return `${label}: ${d.toLocaleString()}`;
    });
    function doDecodeJwt() {
      jwtResult.value = decodeJwt(jwtInput.value);
    }
    const keyLength = ref(64);
    const generatedKey = ref("");
    function doGenerateKey() {
      generatedKey.value = generateHexKey(keyLength.value);
    }
    watch(keyLength, () => {
      doGenerateKey();
    });
    onMounted(() => {
      doGenerateKey();
    });
    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        reportCopied(encodeOutput.value);
      } catch (error) {
        reportError(error);
      }
    }
    return (_ctx, _cache) => {
      const _component_UIcon = _resolveComponent("UIcon");
      const _component_UButton = _resolveComponent("UButton");
      const _component_UCard = _resolveComponent("UCard");
      const _component_USelect = _resolveComponent("USelect");
      const _component_UFieldGroup = _resolveComponent("UFieldGroup");
      const _component_UTextarea = _resolveComponent("UTextarea");
      const _component_UInput = _resolveComponent("UInput");
      const _component_UAlert = _resolveComponent("UAlert");
      const _component_USlider = _resolveComponent("USlider");
      return _openBlock(), _createElementBlock("div", _hoisted_1, [
        _createCommentVNode(" 1. Encode / Decode "),
        _createVNode(_component_UCard, null, {
          header: _withCtx(() => [
            _createElementVNode("div", _hoisted_2, [
              _createElementVNode("div", _hoisted_3, [
                _createVNode(_component_UIcon, {
                  name: "i-lucide-arrow-left-right",
                  class: "h-5 w-5 text-primary"
                }),
                _createElementVNode("div", null, [
                  _createElementVNode(
                    "h3",
                    _hoisted_4,
                    _toDisplayString(t("utilities.crypto.encodeTitle")),
                    1
                    /* TEXT */
                  ),
                  _createElementVNode(
                    "p",
                    _hoisted_5,
                    _toDisplayString(t("utilities.crypto.encodeDesc")),
                    1
                    /* TEXT */
                  )
                ])
              ]),
              _createElementVNode("div", _hoisted_6, [
                (_openBlock(), _createElementBlock(
                  _Fragment,
                  null,
                  _renderList(encodeOps, (op) => {
                    return _createVNode(_component_UButton, {
                      key: op.id,
                      label: t(`utilities.crypto.actions.${op.id}`),
                      icon: op.icon,
                      size: "xs",
                      color: encodeOp.value === op.id ? "primary" : "neutral",
                      variant: encodeOp.value === op.id ? "solid" : "soft",
                      onClick: ($event) => encodeOp.value = op.id
                    }, null, 8, ["label", "icon", "color", "variant", "onClick"]);
                  }),
                  64
                  /* STABLE_FRAGMENT */
                ))
              ])
            ])
          ]),
          default: _withCtx(() => [
            _createElementVNode("div", _hoisted_7, [
              _createVNode(UtilitiesTextPane, {
                t,
                modelValue: encodeInput.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => encodeInput.value = $event),
                label: t("utilities.crypto.input"),
                placeholder: t("utilities.crypto.inputPlaceholder"),
                rows: 6
              }, null, 8, ["modelValue", "label", "placeholder"]),
              _createVNode(UtilitiesTextPane, {
                t,
                "model-value": encodeOutput.value,
                label: t("utilities.crypto.output"),
                placeholder: t("utilities.crypto.outputPlaceholder"),
                rows: 6,
                readonly: "",
                "allow-download": ""
              }, {
                footer: _withCtx(() => [
                  encodeError.value ? (_openBlock(), _createElementBlock(
                    "p",
                    _hoisted_8,
                    _toDisplayString(encodeError.value),
                    1
                    /* TEXT */
                  )) : !encodeInput.value ? (_openBlock(), _createElementBlock(
                    "p",
                    _hoisted_9,
                    _toDisplayString(t("utilities.crypto.hintInput")),
                    1
                    /* TEXT */
                  )) : _createCommentVNode("v-if", true)
                ]),
                _: 1
                /* STABLE */
              }, 8, ["model-value", "label", "placeholder"])
            ])
          ]),
          _: 1
          /* STABLE */
        }),
        _createCommentVNode(" 2. Hash "),
        _createVNode(_component_UCard, null, {
          header: _withCtx(() => [
            _createElementVNode("div", _hoisted_10, [
              _createElementVNode("div", _hoisted_11, [
                _createVNode(_component_UIcon, {
                  name: "i-lucide-fingerprint",
                  class: "h-5 w-5 text-primary"
                }),
                _createElementVNode("div", null, [
                  _createElementVNode(
                    "h3",
                    _hoisted_12,
                    _toDisplayString(t("utilities.crypto.hash.title")),
                    1
                    /* TEXT */
                  ),
                  _createElementVNode(
                    "p",
                    _hoisted_13,
                    _toDisplayString(t("utilities.crypto.hash.desc")),
                    1
                    /* TEXT */
                  )
                ])
              ]),
              _createElementVNode("div", _hoisted_14, [
                _createVNode(_component_USelect, {
                  modelValue: hashAlgo.value,
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => hashAlgo.value = $event),
                  items: hashAlgorithms,
                  size: "xs",
                  class: "w-36"
                }, null, 8, ["modelValue"]),
                _createVNode(_component_UButton, {
                  label: t("utilities.crypto.hash.generate"),
                  icon: "i-lucide-hash",
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  loading: hashLoading.value,
                  disabled: !hashInput.value.trim(),
                  onClick: _unref(runHash)
                }, null, 8, ["label", "loading", "disabled", "onClick"])
              ])
            ])
          ]),
          default: _withCtx(() => [
            _createElementVNode("div", _hoisted_15, [
              _createVNode(UtilitiesTextPane, {
                t,
                modelValue: hashInput.value,
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => hashInput.value = $event),
                label: t("utilities.crypto.hash.inputLabel"),
                placeholder: t("utilities.crypto.hash.inputPlaceholder"),
                rows: 3
              }, null, 8, ["modelValue", "label", "placeholder"]),
              hashResult.value ? (_openBlock(), _createElementBlock("div", _hoisted_16, [
                _createElementVNode("div", _hoisted_17, [
                  _createElementVNode(
                    "span",
                    _hoisted_18,
                    _toDisplayString(hashAlgo.value),
                    1
                    /* TEXT */
                  ),
                  _createVNode(_component_UButton, {
                    icon: "i-lucide-copy",
                    size: "xs",
                    color: "neutral",
                    variant: "soft",
                    onClick: _cache[3] || (_cache[3] = ($event) => copyText(hashResult.value))
                  })
                ]),
                _createElementVNode(
                  "div",
                  _hoisted_19,
                  _toDisplayString(hashResult.value),
                  1
                  /* TEXT */
                )
              ])) : (_openBlock(), _createElementBlock(
                "p",
                _hoisted_20,
                _toDisplayString(t("utilities.crypto.hash.hint")),
                1
                /* TEXT */
              ))
            ])
          ]),
          _: 1
          /* STABLE */
        }),
        _createCommentVNode(" 3. JWT "),
        _createVNode(_component_UCard, null, {
          header: _withCtx(() => [
            _createElementVNode("div", _hoisted_21, [
              _createElementVNode("div", _hoisted_22, [
                _createVNode(_component_UIcon, {
                  name: "i-lucide-key-round",
                  class: "h-5 w-5 text-primary"
                }),
                _createElementVNode("div", null, [
                  _cache[18] || (_cache[18] = _createElementVNode(
                    "h3",
                    { class: "text-sm font-semibold text-highlighted" },
                    " JWT ",
                    -1
                    /* CACHED */
                  )),
                  _createElementVNode(
                    "p",
                    _hoisted_23,
                    _toDisplayString(t("utilities.crypto.jwt.desc")),
                    1
                    /* TEXT */
                  )
                ])
              ]),
              _createVNode(_component_UFieldGroup, null, {
                default: _withCtx(() => [
                  _createVNode(_component_UButton, {
                    label: t("utilities.crypto.jwt.modeEncode"),
                    icon: "i-lucide-lock",
                    size: "xs",
                    color: jwtMode.value === "encode" ? "primary" : "neutral",
                    variant: jwtMode.value === "encode" ? "solid" : "soft",
                    onClick: _cache[4] || (_cache[4] = ($event) => jwtMode.value = "encode")
                  }, null, 8, ["label", "color", "variant"]),
                  _createVNode(_component_UButton, {
                    label: t("utilities.crypto.jwt.modeDecode"),
                    icon: "i-lucide-lock-open",
                    size: "xs",
                    color: jwtMode.value === "decode" ? "primary" : "neutral",
                    variant: jwtMode.value === "decode" ? "solid" : "soft",
                    onClick: _cache[5] || (_cache[5] = ($event) => jwtMode.value = "decode")
                  }, null, 8, ["label", "color", "variant"])
                ]),
                _: 1
                /* STABLE */
              })
            ])
          ]),
          default: _withCtx(() => [
            jwtMode.value === "encode" ? (_openBlock(), _createElementBlock("div", _hoisted_24, [
              _createElementVNode("div", _hoisted_25, [
                _createElementVNode("div", _hoisted_26, [
                  _createElementVNode(
                    "label",
                    _hoisted_27,
                    _toDisplayString(t("utilities.crypto.jwt.payloadJson")),
                    1
                    /* TEXT */
                  ),
                  _createVNode(_component_UTextarea, {
                    modelValue: jwtPayloadJson.value,
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => jwtPayloadJson.value = $event),
                    placeholder: t("utilities.crypto.jwt.payloadPlaceholder"),
                    rows: 6,
                    class: "w-full font-mono text-xs"
                  }, null, 8, ["modelValue", "placeholder"]),
                  jwtPayloadError.value ? (_openBlock(), _createElementBlock(
                    "p",
                    _hoisted_28,
                    _toDisplayString(jwtPayloadError.value),
                    1
                    /* TEXT */
                  )) : _createCommentVNode("v-if", true)
                ]),
                _createElementVNode("div", _hoisted_29, [
                  _createElementVNode(
                    "label",
                    _hoisted_30,
                    _toDisplayString(t("utilities.crypto.jwt.headerJson")),
                    1
                    /* TEXT */
                  ),
                  _createVNode(_component_UTextarea, {
                    modelValue: jwtHeaderJson.value,
                    "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => jwtHeaderJson.value = $event),
                    placeholder: t("utilities.crypto.jwt.headerPlaceholder"),
                    rows: 6,
                    class: "w-full font-mono text-xs"
                  }, null, 8, ["modelValue", "placeholder"]),
                  jwtHeaderError.value ? (_openBlock(), _createElementBlock(
                    "p",
                    _hoisted_31,
                    _toDisplayString(jwtHeaderError.value),
                    1
                    /* TEXT */
                  )) : _createCommentVNode("v-if", true)
                ])
              ]),
              _createElementVNode("div", _hoisted_32, [
                _createElementVNode("div", _hoisted_33, [
                  _cache[19] || (_cache[19] = _createElementVNode(
                    "label",
                    { class: "text-xs font-medium text-muted" },
                    "Algorithm",
                    -1
                    /* CACHED */
                  )),
                  _createVNode(_component_USelect, {
                    modelValue: jwtAlgo.value,
                    "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => jwtAlgo.value = $event),
                    items: ["HS256", "none"],
                    size: "sm",
                    class: "w-32"
                  }, null, 8, ["modelValue"])
                ]),
                jwtAlgo.value === "HS256" ? (_openBlock(), _createElementBlock("div", _hoisted_34, [
                  _createElementVNode(
                    "label",
                    _hoisted_35,
                    _toDisplayString(t("utilities.crypto.jwt.secret")),
                    1
                    /* TEXT */
                  ),
                  _createVNode(_component_UInput, {
                    modelValue: jwtSecret.value,
                    "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => jwtSecret.value = $event),
                    placeholder: t("utilities.crypto.jwt.secretPlaceholder"),
                    type: "password",
                    size: "sm",
                    class: "w-full"
                  }, null, 8, ["modelValue", "placeholder"])
                ])) : _createCommentVNode("v-if", true),
                _createVNode(_component_UButton, {
                  label: t("utilities.crypto.jwt.encode"),
                  icon: "i-lucide-key",
                  color: "neutral",
                  variant: "soft",
                  disabled: !jwtPayloadJson.value.trim() || !!jwtPayloadError.value || jwtAlgo.value === "HS256" && !jwtSecret.value,
                  loading: jwtEncoding.value,
                  onClick: doEncodeJwt
                }, null, 8, ["label", "disabled", "loading"])
              ]),
              jwtEncoded.value ? (_openBlock(), _createElementBlock("div", _hoisted_36, [
                _createElementVNode("div", _hoisted_37, [
                  _cache[20] || (_cache[20] = _createElementVNode(
                    "span",
                    { class: "text-xs font-medium text-muted" },
                    "Token",
                    -1
                    /* CACHED */
                  )),
                  _createVNode(_component_UButton, {
                    icon: "i-lucide-copy",
                    size: "xs",
                    color: "neutral",
                    variant: "soft",
                    onClick: _cache[10] || (_cache[10] = ($event) => copyText(jwtEncoded.value))
                  })
                ]),
                _createElementVNode(
                  "div",
                  _hoisted_38,
                  _toDisplayString(jwtEncoded.value),
                  1
                  /* TEXT */
                )
              ])) : (_openBlock(), _createElementBlock(
                "p",
                _hoisted_39,
                _toDisplayString(t("utilities.crypto.jwt.encodeHint")),
                1
                /* TEXT */
              ))
            ])) : (_openBlock(), _createElementBlock(
              _Fragment,
              { key: 1 },
              [
                _createCommentVNode(" DECODE mode "),
                _createElementVNode("div", _hoisted_40, [
                  _createVNode(UtilitiesTextPane, {
                    t,
                    modelValue: jwtInput.value,
                    "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => jwtInput.value = $event),
                    label: t("utilities.crypto.jwt.inputLabel"),
                    placeholder: t("utilities.crypto.jwt.inputPlaceholder"),
                    rows: 3
                  }, null, 8, ["modelValue", "label", "placeholder"]),
                  _createElementVNode("div", _hoisted_41, [
                    _createVNode(_component_UButton, {
                      label: t("utilities.crypto.jwt.decode"),
                      icon: "i-lucide-play",
                      size: "xs",
                      color: "neutral",
                      variant: "soft",
                      disabled: !jwtInput.value.trim(),
                      onClick: doDecodeJwt
                    }, null, 8, ["label", "disabled"])
                  ]),
                  jwtResult.value && !jwtResult.value.valid ? (_openBlock(), _createBlock(_component_UAlert, {
                    key: 0,
                    color: "error",
                    variant: "subtle",
                    icon: "i-lucide-circle-alert",
                    title: t("utilities.crypto.jwt.invalid")
                  }, null, 8, ["title"])) : _createCommentVNode("v-if", true),
                  jwtResult.value?.header ? (_openBlock(), _createElementBlock("div", _hoisted_42, [
                    _createElementVNode("div", _hoisted_43, [
                      _cache[21] || (_cache[21] = _createElementVNode(
                        "span",
                        { class: "text-xs font-semibold text-muted" },
                        "Header",
                        -1
                        /* CACHED */
                      )),
                      _createVNode(_component_UButton, {
                        icon: "i-lucide-copy",
                        size: "xs",
                        color: "neutral",
                        variant: "soft",
                        onClick: _cache[12] || (_cache[12] = ($event) => copyText(JSON.stringify(jwtResult.value.header, null, 2)))
                      })
                    ]),
                    _createElementVNode(
                      "pre",
                      _hoisted_44,
                      _toDisplayString(JSON.stringify(jwtResult.value.header, null, 2)),
                      1
                      /* TEXT */
                    )
                  ])) : _createCommentVNode("v-if", true),
                  jwtResult.value?.payload ? (_openBlock(), _createElementBlock("div", _hoisted_45, [
                    _createElementVNode("div", _hoisted_46, [
                      _cache[22] || (_cache[22] = _createElementVNode(
                        "span",
                        { class: "text-xs font-semibold text-muted" },
                        "Payload",
                        -1
                        /* CACHED */
                      )),
                      _createVNode(_component_UButton, {
                        icon: "i-lucide-copy",
                        size: "xs",
                        color: "neutral",
                        variant: "soft",
                        onClick: _cache[13] || (_cache[13] = ($event) => copyText(JSON.stringify(jwtResult.value.payload, null, 2)))
                      })
                    ]),
                    _createElementVNode(
                      "pre",
                      _hoisted_47,
                      _toDisplayString(JSON.stringify(jwtResult.value.payload, null, 2)),
                      1
                      /* TEXT */
                    ),
                    expHint.value ? (_openBlock(), _createElementBlock(
                      "div",
                      _hoisted_48,
                      _toDisplayString(expHint.value),
                      1
                      /* TEXT */
                    )) : _createCommentVNode("v-if", true)
                  ])) : _createCommentVNode("v-if", true),
                  !jwtResult.value && !jwtInput.value ? (_openBlock(), _createElementBlock(
                    "p",
                    _hoisted_49,
                    _toDisplayString(t("utilities.crypto.jwt.hint")),
                    1
                    /* TEXT */
                  )) : _createCommentVNode("v-if", true)
                ])
              ],
              2112
              /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
            ))
          ]),
          _: 1
          /* STABLE */
        }),
        _createCommentVNode(" 4. Key Generator "),
        _createVNode(_component_UCard, null, {
          header: _withCtx(() => [
            _createElementVNode("div", _hoisted_50, [
              _createElementVNode("div", _hoisted_51, [
                _createVNode(_component_UIcon, {
                  name: "i-lucide-key",
                  class: "h-5 w-5 text-primary"
                }),
                _createElementVNode("div", null, [
                  _createElementVNode(
                    "h3",
                    _hoisted_52,
                    _toDisplayString(t("utilities.crypto.keyGen.title")),
                    1
                    /* TEXT */
                  ),
                  _createElementVNode(
                    "p",
                    _hoisted_53,
                    _toDisplayString(t("utilities.crypto.keyGen.desc")),
                    1
                    /* TEXT */
                  )
                ])
              ]),
              _createElementVNode("div", _hoisted_54, [
                _createVNode(_component_UButton, {
                  label: "32 " + t("utilities.crypto.keyGen.chars"),
                  size: "xs",
                  color: keyLength.value === 32 ? "primary" : "neutral",
                  variant: keyLength.value === 32 ? "solid" : "soft",
                  onClick: _cache[14] || (_cache[14] = ($event) => keyLength.value = 32)
                }, null, 8, ["label", "color", "variant"]),
                _createVNode(_component_UButton, {
                  label: "64 " + t("utilities.crypto.keyGen.chars"),
                  size: "xs",
                  color: keyLength.value === 64 ? "primary" : "neutral",
                  variant: keyLength.value === 64 ? "solid" : "soft",
                  onClick: _cache[15] || (_cache[15] = ($event) => keyLength.value = 64)
                }, null, 8, ["label", "color", "variant"]),
                _createVNode(_component_UButton, {
                  label: t("utilities.crypto.keyGen.generate"),
                  icon: "i-lucide-refresh-cw",
                  size: "xs",
                  color: "primary",
                  variant: "solid",
                  onClick: doGenerateKey
                }, null, 8, ["label"])
              ])
            ])
          ]),
          default: _withCtx(() => [
            _createElementVNode("div", _hoisted_55, [
              _createElementVNode("div", _hoisted_56, [
                _createElementVNode(
                  "label",
                  _hoisted_57,
                  _toDisplayString(t("utilities.crypto.keyGen.length")),
                  1
                  /* TEXT */
                ),
                _createElementVNode("div", _hoisted_58, [
                  _createVNode(_component_USlider, {
                    modelValue: keyLength.value,
                    "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => keyLength.value = $event),
                    min: 16,
                    max: 128,
                    step: 16,
                    class: "flex-1"
                  }, null, 8, ["modelValue"]),
                  _createElementVNode(
                    "span",
                    _hoisted_59,
                    _toDisplayString(keyLength.value) + " " + _toDisplayString(t("utilities.crypto.keyGen.chars")),
                    1
                    /* TEXT */
                  )
                ])
              ]),
              generatedKey.value ? (_openBlock(), _createElementBlock("div", _hoisted_60, [
                _createElementVNode("div", _hoisted_61, [
                  _createElementVNode(
                    "span",
                    _hoisted_62,
                    _toDisplayString(keyLength.value) + "-hex key (" + _toDisplayString(keyLength.value * 4) + " bits / " + _toDisplayString(keyLength.value / 2) + " bytes) ",
                    1
                    /* TEXT */
                  ),
                  _createVNode(_component_UButton, {
                    icon: "i-lucide-copy",
                    size: "xs",
                    color: "neutral",
                    variant: "soft",
                    onClick: _cache[17] || (_cache[17] = ($event) => copyText(generatedKey.value))
                  })
                ]),
                _createElementVNode(
                  "div",
                  _hoisted_63,
                  _toDisplayString(generatedKey.value),
                  1
                  /* TEXT */
                )
              ])) : (_openBlock(), _createElementBlock(
                "p",
                _hoisted_64,
                _toDisplayString(t("utilities.crypto.keyGen.hint")),
                1
                /* TEXT */
              ))
            ])
          ]),
          _: 1
          /* STABLE */
        })
      ]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

