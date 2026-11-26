import { defineComponent as _defineComponent } from "vue";
import { createCommentVNode as _createCommentVNode, resolveComponent as _resolveComponent, createVNode as _createVNode, toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, unref as _unref, withCtx as _withCtx, vModelText as _vModelText, withDirectives as _withDirectives, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue";
const _hoisted_1 = { class: "space-y-4" };
const _hoisted_2 = { class: "p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-4" };
const _hoisted_3 = { class: "space-y-2" };
const _hoisted_4 = { class: "flex items-center justify-between gap-2" };
const _hoisted_5 = { class: "flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" };
const _hoisted_6 = { class: "flex items-center gap-2" };
const _hoisted_7 = { class: "flex flex-wrap gap-1.5" };
const _hoisted_8 = { class: "grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800" };
const _hoisted_9 = { class: "space-y-2" };
const _hoisted_10 = { class: "flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" };
const _hoisted_11 = { class: "flex flex-wrap gap-1.5" };
const _hoisted_12 = { class: "space-y-2" };
const _hoisted_13 = { class: "flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" };
const _hoisted_14 = { class: "flex flex-wrap gap-1.5" };
const _hoisted_15 = { class: "space-y-2" };
const _hoisted_16 = { class: "flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" };
const _hoisted_17 = { class: "flex flex-wrap gap-1.5" };
const _hoisted_18 = { class: "grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-90" };
const _hoisted_19 = { class: "flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden" };
const _hoisted_20 = { class: "flex items-center justify-between px-4 py-2.5 bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 shrink-0 gap-2" };
const _hoisted_21 = { class: "flex items-center gap-2 min-w-0" };
const _hoisted_22 = { class: "text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider truncate" };
const _hoisted_23 = { class: "flex items-center gap-1 shrink-0" };
const _hoisted_24 = { class: "flex-1 p-3 flex flex-col min-h-0" };
const _hoisted_25 = ["placeholder"];
const _hoisted_26 = { class: "px-4 py-2 bg-gray-50/50 dark:bg-gray-950/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500 font-mono shrink-0" };
const _hoisted_27 = { class: "flex items-center gap-3" };
const _hoisted_28 = { class: "flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden" };
const _hoisted_29 = { class: "flex items-center justify-between px-4 py-2.5 bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 shrink-0 gap-2" };
const _hoisted_30 = { class: "flex items-center gap-2 min-w-0" };
const _hoisted_31 = { class: "text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider truncate" };
const _hoisted_32 = { class: "flex items-center gap-1 shrink-0" };
const _hoisted_33 = { class: "flex-1 p-3 flex flex-col min-h-0 bg-gray-50/20 dark:bg-gray-950/20" };
const _hoisted_34 = ["placeholder"];
const _hoisted_35 = { class: "px-4 py-2 bg-gray-50/50 dark:bg-gray-950/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500 font-mono shrink-0" };
const _hoisted_36 = { class: "flex items-center gap-3" };
import { computed, ref } from "vue";
import {
  toUpperCase,
  toLowerCase,
  toCapitalize,
  toSentenceCase,
  toCamelCase,
  toPascalCase,
  toKebabCase,
  toSnakeCase,
  toConstantCase,
  toAlternatingCase,
  toInverseCase,
  removeVietnameseAccents,
  slugify,
  cleanSpaces,
  removeEmptyLines,
  removeDuplicateLines,
  sortLinesAsc,
  sortLinesDesc,
  reverseLines,
  reverseCharacters,
  numberLines,
  encodeBase64Safe,
  decodeBase64Safe,
  encodeUrlSafe,
  decodeUrlSafe,
  escapeHtmlSafe,
  unescapeHtmlSafe,
  countStats
} from "@tuanmjnh/tm-core";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "UtilitiesTextPanel",
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
    const inputText = ref("");
    const outputText = ref("");
    const history = ref([]);
    const historyIndex = ref(-1);
    function recordState(text) {
      if (historyIndex.value < history.value.length - 1) {
        history.value = history.value.slice(0, historyIndex.value + 1);
      }
      history.value.push(text);
      historyIndex.value = history.value.length - 1;
    }
    function applyTransform(fn) {
      const result = fn(inputText.value);
      outputText.value = result;
      recordState(result);
    }
    function handleUndo() {
      if (historyIndex.value > 0) {
        historyIndex.value--;
        const prev = history.value[historyIndex.value];
        if (prev !== void 0) outputText.value = prev;
      }
    }
    function handleRedo() {
      if (historyIndex.value < history.value.length - 1) {
        historyIndex.value++;
        const next = history.value[historyIndex.value];
        if (next !== void 0) outputText.value = next;
      }
    }
    function swapInputOutput() {
      const temp = inputText.value;
      inputText.value = outputText.value;
      outputText.value = temp;
      recordState(outputText.value);
    }
    function copyOutput() {
      if (!outputText.value) return;
      navigator.clipboard.writeText(outputText.value);
      reportCopied(outputText.value);
    }
    function copyInput() {
      if (!inputText.value) return;
      navigator.clipboard.writeText(inputText.value);
      reportCopied(inputText.value);
    }
    async function pasteToInput() {
      try {
        const text = await navigator.clipboard.readText();
        inputText.value = text;
      } catch (error) {
        reportError(error);
      }
    }
    function clearAll() {
      inputText.value = "";
      outputText.value = "";
      history.value = [];
      historyIndex.value = -1;
    }
    function downloadOutput() {
      if (!outputText.value) return;
      const blob = new Blob([outputText.value], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transformed-text-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
    const inputStats = computed(() => countStats(inputText.value));
    const outputStats = computed(() => countStats(outputText.value));
    function loadSample() {
      inputText.value = t("utilities.text.sampleContent");
      applyTransform((text) => text);
    }
    return (_ctx, _cache) => {
      const _component_UIcon = _resolveComponent("UIcon");
      const _component_UButton = _resolveComponent("UButton");
      const _component_UBadge = _resolveComponent("UBadge");
      return _openBlock(), _createElementBlock("div", _hoisted_1, [
        _createCommentVNode(" Top Action Toolbars: Categories Grid "),
        _createElementVNode("div", _hoisted_2, [
          _createCommentVNode(" 1. Case Conversions "),
          _createElementVNode("div", _hoisted_3, [
            _createElementVNode("div", _hoisted_4, [
              _createElementVNode("div", _hoisted_5, [
                _createVNode(_component_UIcon, {
                  name: "i-lucide-case-sensitive",
                  class: "size-4 text-primary-500"
                }),
                _createElementVNode(
                  "span",
                  null,
                  _toDisplayString(t("utilities.text.categories.case")),
                  1
                  /* TEXT */
                )
              ]),
              _createElementVNode("div", _hoisted_6, [
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  icon: "i-lucide-file-text",
                  label: t("utilities.text.sampleText"),
                  onClick: loadSample
                }, null, 8, ["label"]),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "error",
                  variant: "soft",
                  icon: "i-lucide-trash-2",
                  label: t("utilities.text.clear"),
                  onClick: clearAll
                }, null, 8, ["label"])
              ])
            ]),
            _createElementVNode("div", _hoisted_7, [
              _createVNode(_component_UButton, {
                size: "xs",
                color: "neutral",
                variant: "soft",
                onClick: _cache[0] || (_cache[0] = ($event) => applyTransform(_unref(toUpperCase)))
              }, {
                default: _withCtx(() => [
                  _createTextVNode(
                    _toDisplayString(t("utilities.text.actions.upper")),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_UButton, {
                size: "xs",
                color: "neutral",
                variant: "soft",
                onClick: _cache[1] || (_cache[1] = ($event) => applyTransform(_unref(toLowerCase)))
              }, {
                default: _withCtx(() => [
                  _createTextVNode(
                    _toDisplayString(t("utilities.text.actions.lower")),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_UButton, {
                size: "xs",
                color: "neutral",
                variant: "soft",
                onClick: _cache[2] || (_cache[2] = ($event) => applyTransform(_unref(toCapitalize)))
              }, {
                default: _withCtx(() => [
                  _createTextVNode(
                    _toDisplayString(t("utilities.text.actions.capitalize")),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_UButton, {
                size: "xs",
                color: "neutral",
                variant: "soft",
                onClick: _cache[3] || (_cache[3] = ($event) => applyTransform(_unref(toSentenceCase)))
              }, {
                default: _withCtx(() => [
                  _createTextVNode(
                    _toDisplayString(t("utilities.text.actions.sentence")),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_UButton, {
                size: "xs",
                color: "neutral",
                variant: "soft",
                class: "font-mono",
                onClick: _cache[4] || (_cache[4] = ($event) => applyTransform(_unref(toCamelCase)))
              }, {
                default: _withCtx(() => [
                  _createTextVNode(
                    _toDisplayString(t("utilities.text.actions.camel")),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_UButton, {
                size: "xs",
                color: "neutral",
                variant: "soft",
                class: "font-mono",
                onClick: _cache[5] || (_cache[5] = ($event) => applyTransform(_unref(toPascalCase)))
              }, {
                default: _withCtx(() => [
                  _createTextVNode(
                    _toDisplayString(t("utilities.text.actions.pascal")),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_UButton, {
                size: "xs",
                color: "neutral",
                variant: "soft",
                class: "font-mono",
                onClick: _cache[6] || (_cache[6] = ($event) => applyTransform(_unref(toKebabCase)))
              }, {
                default: _withCtx(() => [
                  _createTextVNode(
                    _toDisplayString(t("utilities.text.actions.kebab")),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_UButton, {
                size: "xs",
                color: "neutral",
                variant: "soft",
                class: "font-mono",
                onClick: _cache[7] || (_cache[7] = ($event) => applyTransform(_unref(toSnakeCase)))
              }, {
                default: _withCtx(() => [
                  _createTextVNode(
                    _toDisplayString(t("utilities.text.actions.snake")),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_UButton, {
                size: "xs",
                color: "neutral",
                variant: "soft",
                class: "font-mono",
                onClick: _cache[8] || (_cache[8] = ($event) => applyTransform(_unref(toConstantCase)))
              }, {
                default: _withCtx(() => [
                  _createTextVNode(
                    _toDisplayString(t("utilities.text.actions.constant")),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_UButton, {
                size: "xs",
                color: "neutral",
                variant: "soft",
                onClick: _cache[9] || (_cache[9] = ($event) => applyTransform(_unref(toAlternatingCase)))
              }, {
                default: _withCtx(() => [
                  _createTextVNode(
                    _toDisplayString(t("utilities.text.actions.alternating")),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_UButton, {
                size: "xs",
                color: "neutral",
                variant: "soft",
                onClick: _cache[10] || (_cache[10] = ($event) => applyTransform(_unref(toInverseCase)))
              }, {
                default: _withCtx(() => [
                  _createTextVNode(
                    _toDisplayString(t("utilities.text.actions.inverse")),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })
            ])
          ]),
          _createCommentVNode(" 2. Vietnamese & SEO / Lines / Encodings Grid "),
          _createElementVNode("div", _hoisted_8, [
            _createCommentVNode(" Vietnamese & SEO "),
            _createElementVNode("div", _hoisted_9, [
              _createElementVNode("div", _hoisted_10, [
                _createVNode(_component_UIcon, {
                  name: "i-lucide-globe",
                  class: "size-4 text-emerald-500"
                }),
                _createElementVNode(
                  "span",
                  null,
                  _toDisplayString(t("utilities.text.categories.vietnamese")),
                  1
                  /* TEXT */
                )
              ]),
              _createElementVNode("div", _hoisted_11, [
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "primary",
                  variant: "soft",
                  onClick: _cache[11] || (_cache[11] = ($event) => applyTransform(_unref(removeVietnameseAccents)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.removeAccents")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "primary",
                  variant: "soft",
                  onClick: _cache[12] || (_cache[12] = ($event) => applyTransform(_unref(slugify)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.slug")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                })
              ])
            ]),
            _createCommentVNode(" Lines & Whitespace "),
            _createElementVNode("div", _hoisted_12, [
              _createElementVNode("div", _hoisted_13, [
                _createVNode(_component_UIcon, {
                  name: "i-lucide-align-left",
                  class: "size-4 text-blue-500"
                }),
                _createElementVNode(
                  "span",
                  null,
                  _toDisplayString(t("utilities.text.categories.lines")),
                  1
                  /* TEXT */
                )
              ]),
              _createElementVNode("div", _hoisted_14, [
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  onClick: _cache[13] || (_cache[13] = ($event) => applyTransform(_unref(cleanSpaces)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.cleanSpaces")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  onClick: _cache[14] || (_cache[14] = ($event) => applyTransform(_unref(removeEmptyLines)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.removeEmptyLines")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  onClick: _cache[15] || (_cache[15] = ($event) => applyTransform(_unref(removeDuplicateLines)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.removeDuplicates")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  icon: "i-lucide-arrow-down-a-z",
                  onClick: _cache[16] || (_cache[16] = ($event) => applyTransform(_unref(sortLinesAsc)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.sortAsc")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  icon: "i-lucide-arrow-down-z-a",
                  onClick: _cache[17] || (_cache[17] = ($event) => applyTransform(_unref(sortLinesDesc)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.sortDesc")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  onClick: _cache[18] || (_cache[18] = ($event) => applyTransform(_unref(reverseLines)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.reverseLines")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  onClick: _cache[19] || (_cache[19] = ($event) => applyTransform(_unref(reverseCharacters)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.reverseCharacters")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  onClick: _cache[20] || (_cache[20] = ($event) => applyTransform(_unref(numberLines)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.numberLines")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                })
              ])
            ]),
            _createCommentVNode(" Encodings "),
            _createElementVNode("div", _hoisted_15, [
              _createElementVNode("div", _hoisted_16, [
                _createVNode(_component_UIcon, {
                  name: "i-lucide-binary",
                  class: "size-4 text-purple-500"
                }),
                _createElementVNode(
                  "span",
                  null,
                  _toDisplayString(t("utilities.text.categories.encode")),
                  1
                  /* TEXT */
                )
              ]),
              _createElementVNode("div", _hoisted_17, [
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  onClick: _cache[21] || (_cache[21] = ($event) => applyTransform(_unref(encodeBase64Safe)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.base64Encode")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  onClick: _cache[22] || (_cache[22] = ($event) => applyTransform(_unref(decodeBase64Safe)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.base64Decode")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  onClick: _cache[23] || (_cache[23] = ($event) => applyTransform(_unref(encodeUrlSafe)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.urlEncode")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  onClick: _cache[24] || (_cache[24] = ($event) => applyTransform(_unref(decodeUrlSafe)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.urlDecode")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  onClick: _cache[25] || (_cache[25] = ($event) => applyTransform(_unref(escapeHtmlSafe)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.htmlEscape")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "soft",
                  onClick: _cache[26] || (_cache[26] = ($event) => applyTransform(_unref(unescapeHtmlSafe)))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(t("utilities.text.actions.htmlUnescape")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                })
              ])
            ])
          ])
        ]),
        _createCommentVNode(" Editor Panes: Input vs Output (50/50 Dual Column) "),
        _createElementVNode("div", _hoisted_18, [
          _createCommentVNode(" Left Pane: Input "),
          _createElementVNode("div", _hoisted_19, [
            _createElementVNode("div", _hoisted_20, [
              _createElementVNode("div", _hoisted_21, [
                _createElementVNode(
                  "span",
                  _hoisted_22,
                  _toDisplayString(t("utilities.text.inputLabel")),
                  1
                  /* TEXT */
                ),
                _createVNode(_component_UBadge, {
                  color: "neutral",
                  variant: "subtle",
                  size: "xs",
                  class: "shrink-0"
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(inputStats.value.chars) + " " + _toDisplayString(t("utilities.text.stats.chars")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                })
              ]),
              _createElementVNode("div", _hoisted_23, [
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "ghost",
                  icon: "i-lucide-clipboard-paste",
                  title: t("utilities.text.paste"),
                  onClick: pasteToInput
                }, null, 8, ["title"]),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "ghost",
                  icon: "i-lucide-copy",
                  title: t("utilities.text.copy"),
                  onClick: copyInput
                }, null, 8, ["title"]),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "ghost",
                  icon: "i-lucide-x",
                  title: t("utilities.text.clear"),
                  onClick: _cache[27] || (_cache[27] = ($event) => inputText.value = "")
                }, null, 8, ["title"])
              ])
            ]),
            _createElementVNode("div", _hoisted_24, [
              _withDirectives(_createElementVNode("textarea", {
                "onUpdate:modelValue": _cache[28] || (_cache[28] = ($event) => inputText.value = $event),
                class: "w-full flex-1 min-h-50 resize-none font-mono text-sm bg-transparent border-0 focus:ring-0 focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 leading-relaxed overflow-y-auto",
                placeholder: t("utilities.text.inputPlaceholder")
              }, null, 8, _hoisted_25), [
                [_vModelText, inputText.value]
              ])
            ]),
            _createCommentVNode(" Input Stats Footer "),
            _createElementVNode("div", _hoisted_26, [
              _createElementVNode("div", _hoisted_27, [
                _createElementVNode(
                  "span",
                  null,
                  _toDisplayString(inputStats.value.words) + " " + _toDisplayString(t("utilities.text.stats.words")),
                  1
                  /* TEXT */
                ),
                _createElementVNode(
                  "span",
                  null,
                  _toDisplayString(inputStats.value.lines) + " " + _toDisplayString(t("utilities.text.stats.lines")),
                  1
                  /* TEXT */
                ),
                _createElementVNode(
                  "span",
                  null,
                  _toDisplayString(inputStats.value.paragraphs) + " " + _toDisplayString(t("utilities.text.stats.paragraphs")),
                  1
                  /* TEXT */
                )
              ]),
              _createElementVNode(
                "span",
                null,
                "~" + _toDisplayString(inputStats.value.readingTimeMinutes) + "m " + _toDisplayString(t("utilities.text.stats.readingTime")),
                1
                /* TEXT */
              )
            ])
          ]),
          _createCommentVNode(" Right Pane: Output "),
          _createElementVNode("div", _hoisted_28, [
            _createElementVNode("div", _hoisted_29, [
              _createElementVNode("div", _hoisted_30, [
                _createElementVNode(
                  "span",
                  _hoisted_31,
                  _toDisplayString(t("utilities.text.outputLabel")),
                  1
                  /* TEXT */
                ),
                _createVNode(_component_UBadge, {
                  color: "primary",
                  variant: "subtle",
                  size: "xs",
                  class: "shrink-0"
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString(outputStats.value.chars) + " " + _toDisplayString(t("utilities.text.stats.chars")),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                })
              ]),
              _createElementVNode("div", _hoisted_32, [
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "ghost",
                  icon: "i-lucide-arrow-left-right",
                  title: t("utilities.text.swap"),
                  onClick: swapInputOutput
                }, null, 8, ["title"]),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "ghost",
                  icon: "i-lucide-undo-2",
                  disabled: historyIndex.value <= 0,
                  title: t("utilities.text.undo"),
                  onClick: handleUndo
                }, null, 8, ["disabled", "title"]),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "ghost",
                  icon: "i-lucide-redo-2",
                  disabled: historyIndex.value >= history.value.length - 1,
                  title: t("utilities.text.redo"),
                  onClick: handleRedo
                }, null, 8, ["disabled", "title"]),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "neutral",
                  variant: "ghost",
                  icon: "i-lucide-download",
                  title: t("utilities.text.download"),
                  onClick: downloadOutput
                }, null, 8, ["title"]),
                _createVNode(_component_UButton, {
                  size: "xs",
                  color: "primary",
                  variant: "soft",
                  icon: "i-lucide-copy",
                  label: t("utilities.text.copy"),
                  title: t("utilities.text.copy"),
                  onClick: copyOutput
                }, null, 8, ["label", "title"])
              ])
            ]),
            _createElementVNode("div", _hoisted_33, [
              _withDirectives(_createElementVNode("textarea", {
                "onUpdate:modelValue": _cache[29] || (_cache[29] = ($event) => outputText.value = $event),
                class: "w-full flex-1 min-h-50 resize-none font-mono text-sm bg-transparent border-0 focus:ring-0 focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 leading-relaxed overflow-y-auto",
                placeholder: t("utilities.text.outputPlaceholder")
              }, null, 8, _hoisted_34), [
                [_vModelText, outputText.value]
              ])
            ]),
            _createCommentVNode(" Output Stats Footer "),
            _createElementVNode("div", _hoisted_35, [
              _createElementVNode("div", _hoisted_36, [
                _createElementVNode(
                  "span",
                  null,
                  _toDisplayString(outputStats.value.words) + " " + _toDisplayString(t("utilities.text.stats.words")),
                  1
                  /* TEXT */
                ),
                _createElementVNode(
                  "span",
                  null,
                  _toDisplayString(outputStats.value.lines) + " " + _toDisplayString(t("utilities.text.stats.lines")),
                  1
                  /* TEXT */
                ),
                _createElementVNode(
                  "span",
                  null,
                  _toDisplayString(outputStats.value.paragraphs) + " " + _toDisplayString(t("utilities.text.stats.paragraphs")),
                  1
                  /* TEXT */
                )
              ]),
              _createElementVNode(
                "span",
                null,
                "~" + _toDisplayString(outputStats.value.readingTimeMinutes) + "m " + _toDisplayString(t("utilities.text.stats.readingTime")),
                1
                /* TEXT */
              )
            ])
          ])
        ])
      ]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

