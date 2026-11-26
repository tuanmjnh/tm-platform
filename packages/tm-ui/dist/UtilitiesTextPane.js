import { defineComponent as _defineComponent } from "vue";
import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, renderSlot as _renderSlot, normalizeClass as _normalizeClass, createElementBlock as _createElementBlock } from "vue";
const _hoisted_1 = { class: "flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden" };
const _hoisted_2 = { class: "flex items-center justify-between px-4 py-2.5 bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 shrink-0 gap-2" };
const _hoisted_3 = { class: "flex items-center gap-2 min-w-0" };
const _hoisted_4 = { class: "text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider truncate" };
const _hoisted_5 = { class: "flex items-center gap-1 shrink-0" };
const _hoisted_6 = ["value", "placeholder", "readonly", "rows"];
const _hoisted_7 = {
  key: 0,
  class: "px-4 py-2 bg-gray-50/50 dark:bg-gray-950/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500 font-mono shrink-0"
};
const _hoisted_8 = { class: "flex items-center gap-3" };
import { computed } from "vue";
import { countStats } from "@tuanmjnh/tm-core";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "UtilitiesTextPane",
  props: {
    t: { type: Function, required: true },
    label: { type: String, required: true },
    modelValue: { type: String, required: true },
    placeholder: { type: String, required: false, default: "" },
    rows: { type: Number, required: false, default: 8 },
    readonly: { type: Boolean, required: false, default: false },
    allowDownload: { type: Boolean, required: false, default: false },
    allowCopy: { type: Boolean, required: false, default: true },
    allowPaste: { type: Boolean, required: false, default: true },
    allowClear: { type: Boolean, required: false, default: true },
    showBadge: { type: Boolean, required: false, default: true },
    showStats: { type: Boolean, required: false, default: false }
  },
  emits: ["update:modelValue", "copied", "copy-error"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const stats = computed(() => countStats(props.modelValue || ""));
    async function copy() {
      try {
        await navigator.clipboard.writeText(props.modelValue);
        emit("copied", props.modelValue);
      } catch (error) {
        emit("copy-error", error);
      }
    }
    async function paste() {
      try {
        const text = await navigator.clipboard.readText();
        emit("update:modelValue", text);
      } catch (error) {
        emit("copy-error", error);
      }
    }
    function download() {
      const blob = new Blob([props.modelValue], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `text-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
    return (_ctx, _cache) => {
      const _component_UBadge = _resolveComponent("UBadge");
      const _component_UButton = _resolveComponent("UButton");
      return _openBlock(), _createElementBlock("div", _hoisted_1, [
        _createElementVNode("div", _hoisted_2, [
          _createElementVNode("div", _hoisted_3, [
            _createElementVNode(
              "span",
              _hoisted_4,
              _toDisplayString(__props.label),
              1
              /* TEXT */
            ),
            __props.showBadge ? (_openBlock(), _createBlock(_component_UBadge, {
              key: 0,
              color: __props.readonly ? "primary" : "neutral",
              variant: "subtle",
              size: "xs",
              class: "shrink-0"
            }, {
              default: _withCtx(() => [
                _createTextVNode(
                  _toDisplayString(stats.value.chars) + " " + _toDisplayString(__props.t("utilities.text.stats.chars")),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            }, 8, ["color"])) : _createCommentVNode("v-if", true)
          ]),
          _createElementVNode("div", _hoisted_5, [
            _renderSlot(_ctx.$slots, "header-extra"),
            !__props.readonly && __props.allowPaste ? (_openBlock(), _createBlock(_component_UButton, {
              key: 0,
              size: "xs",
              color: "neutral",
              variant: "ghost",
              icon: "i-lucide-clipboard-paste",
              title: __props.t("utilities.text.paste"),
              onClick: paste
            }, null, 8, ["title"])) : _createCommentVNode("v-if", true),
            __props.modelValue && __props.allowCopy ? (_openBlock(), _createBlock(_component_UButton, {
              key: 1,
              size: "xs",
              color: "neutral",
              variant: "ghost",
              icon: "i-lucide-copy",
              title: __props.t("utilities.text.copy"),
              onClick: copy
            }, null, 8, ["title"])) : _createCommentVNode("v-if", true),
            !__props.readonly && __props.modelValue && __props.allowClear ? (_openBlock(), _createBlock(_component_UButton, {
              key: 2,
              size: "xs",
              color: "neutral",
              variant: "ghost",
              icon: "i-lucide-x",
              title: __props.t("utilities.text.clear"),
              onClick: _cache[0] || (_cache[0] = ($event) => emit("update:modelValue", ""))
            }, null, 8, ["title"])) : _createCommentVNode("v-if", true),
            __props.modelValue && __props.allowDownload ? (_openBlock(), _createBlock(_component_UButton, {
              key: 3,
              size: "xs",
              color: "neutral",
              variant: "ghost",
              icon: "i-lucide-download",
              title: __props.t("utilities.text.download"),
              onClick: download
            }, null, 8, ["title"])) : _createCommentVNode("v-if", true),
            _renderSlot(_ctx.$slots, "header-actions")
          ])
        ]),
        _createElementVNode(
          "div",
          {
            class: _normalizeClass(["flex-1 p-3 flex flex-col min-h-0", __props.readonly ? "bg-gray-50/20 dark:bg-gray-950/20" : ""])
          },
          [
            _createElementVNode("textarea", {
              value: __props.modelValue,
              placeholder: __props.placeholder,
              readonly: __props.readonly,
              rows: __props.rows,
              class: "w-full flex-1 min-h-50 resize-none font-mono text-sm bg-transparent border-0 focus:ring-0 focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 leading-relaxed overflow-y-auto",
              onInput: _cache[1] || (_cache[1] = ($event) => emit("update:modelValue", $event.target.value))
            }, null, 40, _hoisted_6)
          ],
          2
          /* CLASS */
        ),
        _ctx.$slots.footer || __props.showStats ? (_openBlock(), _createElementBlock("div", _hoisted_7, [
          _renderSlot(_ctx.$slots, "footer", {}, () => [
            _createElementVNode("div", _hoisted_8, [
              _createElementVNode(
                "span",
                null,
                _toDisplayString(stats.value.words) + " " + _toDisplayString(__props.t("utilities.text.stats.words")),
                1
                /* TEXT */
              ),
              _createElementVNode(
                "span",
                null,
                _toDisplayString(stats.value.lines) + " " + _toDisplayString(__props.t("utilities.text.stats.lines")),
                1
                /* TEXT */
              ),
              _createElementVNode(
                "span",
                null,
                _toDisplayString(stats.value.paragraphs) + " " + _toDisplayString(__props.t("utilities.text.stats.paragraphs")),
                1
                /* TEXT */
              )
            ]),
            _createElementVNode(
              "span",
              null,
              "~" + _toDisplayString(stats.value.readingTimeMinutes) + "m " + _toDisplayString(__props.t("utilities.text.stats.readingTime")),
              1
              /* TEXT */
            )
          ])
        ])) : _createCommentVNode("v-if", true)
      ]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

