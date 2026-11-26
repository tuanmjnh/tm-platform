import { defineComponent as _defineComponent } from "vue";
import { unref as _unref, resolveComponent as _resolveComponent, createVNode as _createVNode, createCommentVNode as _createCommentVNode, toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, createTextVNode as _createTextVNode, withCtx as _withCtx, createBlock as _createBlock, Fragment as _Fragment, normalizeClass as _normalizeClass } from "vue";
const _hoisted_1 = { class: "p-3 w-80 max-w-sm space-y-2 text-xs" };
const _hoisted_2 = { class: "flex items-start gap-2" };
const _hoisted_3 = { class: "min-w-0 flex-1" };
const _hoisted_4 = { class: "font-semibold text-highlighted text-xs leading-snug" };
const _hoisted_5 = {
  key: 0,
  class: "mt-1 text-muted text-xs leading-relaxed"
};
const _hoisted_6 = {
  key: 1,
  class: "mt-2 space-y-1"
};
const _hoisted_7 = { class: "text-[10px] font-medium text-dimmed uppercase tracking-wider" };
const _hoisted_8 = { class: "rounded bg-muted/20 p-2 font-mono text-[11px] text-muted select-all break-all max-h-28 overflow-y-auto border border-default/40" };
const _hoisted_9 = { class: "pt-2 flex items-center justify-between border-t border-default/50 text-[11px] text-muted" };
import { computed, nextTick, onBeforeUnmount, ref, watch, useTemplateRef } from "vue";
import { providerIconFor } from "./providerIcon.js";
import { classifyFailure, classifyThrown, createLabelResolver } from "./modelCheck.js";
const INITIAL_LIMIT = 30;
const PAGE_SIZE = 20;
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "ModelSelect",
  props: {
    modelValue: { type: String, required: true },
    models: { type: Array, required: true },
    loading: { type: Boolean, required: false, default: false },
    disabled: { type: Boolean, required: false, default: false },
    widthClass: { type: String, required: false, default: "w-56 sm:w-72" },
    showCheck: { type: Boolean, required: false, default: true },
    labels: { type: null, required: false },
    checkModel: { type: Function, required: false },
    checkTimeoutMs: { type: Number, required: false, default: 1e4 },
    providerIcon: { type: Function, required: false }
  },
  emits: ["update:modelValue", "check:success", "check:error"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const label = createLabelResolver(props.labels);
    const iconFor = (provider) => (props.providerIcon || providerIconFor)(provider);
    const checkStatus = ref("idle");
    const lastLatency = ref(null);
    const lastErrorTitle = ref("");
    const lastErrorDesc = ref("");
    const lastRawError = ref("");
    let abortController = null;
    const searchTerm = ref("");
    const displayLimit = ref(INITIAL_LIMIT);
    const modelSelectMenuRef = useTemplateRef("modelSelectMenuRef");
    const canCheck = computed(() => props.showCheck && typeof props.checkModel === "function");
    const visibleModels = computed(() => props.models.filter((model) => !model.shadowed));
    const providerUsage = computed(() => {
      const usage = /* @__PURE__ */ new Map();
      for (const model of visibleModels.value) {
        const entry = usage.get(model.provider) ?? { connections: /* @__PURE__ */ new Set(), sources: /* @__PURE__ */ new Set() };
        usage.set(model.provider, entry);
        entry.connections.add(model.connectionId);
        if (model.source) entry.sources.add(model.source);
      }
      return usage;
    });
    const filteredModels = computed(() => {
      const query = searchTerm.value.trim().toLowerCase();
      if (!query) return visibleModels.value;
      return visibleModels.value.filter(
        (m) => m.displayName.toLowerCase().includes(query) || m.modelId.toLowerCase().includes(query) || m.provider.toLowerCase().includes(query) || (m.providerName || "").toLowerCase().includes(query) || (m.connectionName || "").toLowerCase().includes(query)
      );
    });
    function toOption(model) {
      const usage = providerUsage.value.get(model.provider);
      const meta = (usage?.connections.size ?? 0) > 1 ? [model.providerName || model.provider, model.connectionName || model.connectionId].filter(Boolean).join(" \xB7 ") : "";
      const crossSource = (usage?.sources.size ?? 0) > 1;
      return {
        label: model.displayName,
        value: `${model.connectionId}:${model.modelId}`,
        icon: iconFor(model.provider),
        description: meta || void 0,
        chip: crossSource && model.source ? {
          text: model.source === "app" ? label("sourceApp") : label("sourceHub"),
          color: model.source === "app" ? "primary" : "neutral",
          size: "sm",
          standalone: true
        } : void 0
      };
    }
    const modelOptions = computed(() => {
      const options = filteredModels.value.slice(0, displayLimit.value).map(toOption);
      if (props.modelValue && !options.some((option) => option.value === props.modelValue)) {
        const selected = visibleModels.value.find((m) => `${m.connectionId}:${m.modelId}` === props.modelValue);
        if (selected) options.unshift(toOption(selected));
      }
      return options;
    });
    watch(searchTerm, () => {
      displayLimit.value = INITIAL_LIMIT;
    });
    watch(() => props.modelValue, () => {
      checkStatus.value = "idle";
      lastLatency.value = null;
      lastErrorTitle.value = "";
      lastErrorDesc.value = "";
      lastRawError.value = "";
    });
    const checking = computed(() => checkStatus.value === "checking");
    const checkButtonIcon = computed(() => {
      if (checkStatus.value === "success") return "i-lucide-check-circle-2";
      if (checkStatus.value === "error") return "i-lucide-alert-circle";
      return "i-lucide-activity";
    });
    const checkButtonColor = computed(() => {
      if (checkStatus.value === "success") return "success";
      if (checkStatus.value === "error") return "error";
      return "neutral";
    });
    const checkTooltipText = computed(() => {
      if (checking.value) return label("checking");
      if (checkStatus.value === "success" && lastLatency.value !== null) {
        return label("available", { ms: lastLatency.value });
      }
      if (checkStatus.value === "error") {
        return lastErrorTitle.value || label("unavailable", { status: 500 });
      }
      return label("tooltip");
    });
    async function checkModel() {
      if (!props.modelValue || checking.value || !props.checkModel) return;
      checkStatus.value = "checking";
      lastLatency.value = null;
      lastErrorTitle.value = "";
      lastErrorDesc.value = "";
      lastRawError.value = "";
      abortController?.abort();
      abortController = new AbortController();
      const controller = abortController;
      const timeoutId = setTimeout(() => {
        controller.abort(new Error("TIMEOUT"));
      }, props.checkTimeoutMs);
      const modelKey = props.modelValue;
      const displayName = props.models.find((m) => `${m.connectionId}:${m.modelId}` === modelKey)?.displayName || modelKey;
      try {
        const result = await props.checkModel(modelKey, { signal: controller.signal });
        if (result?.ok) {
          checkStatus.value = "success";
          lastLatency.value = result.latencyMs ?? 0;
          emit("check:success", { modelKey, displayName, latencyMs: lastLatency.value });
          return;
        }
        const { title, desc, raw } = classifyFailure(result, label);
        checkStatus.value = "error";
        lastLatency.value = result?.latencyMs ?? null;
        lastErrorTitle.value = title;
        lastErrorDesc.value = desc;
        lastRawError.value = raw;
        emit("check:error", { modelKey, title, description: desc, rawError: lastRawError.value });
      } catch (err) {
        const { title, desc, raw } = classifyThrown(err, label);
        checkStatus.value = "error";
        lastErrorTitle.value = title;
        lastErrorDesc.value = desc;
        lastRawError.value = raw;
        emit("check:error", { modelKey, title, description: desc, rawError: raw });
      } finally {
        clearTimeout(timeoutId);
      }
    }
    function handleUpdate(value) {
      if (typeof value === "string") emit("update:modelValue", value);
    }
    let scrollEl = null;
    function onViewportScroll() {
      const el = scrollEl;
      if (!el) return;
      if (el.scrollTop + el.clientHeight < el.scrollHeight - 30) return;
      if (displayLimit.value < filteredModels.value.length) {
        displayLimit.value += PAGE_SIZE;
      }
    }
    function detachScroll() {
      if (!scrollEl) return;
      scrollEl.removeEventListener("scroll", onViewportScroll);
      scrollEl = null;
    }
    function attachScroll() {
      detachScroll();
      const el = modelSelectMenuRef.value?.viewportRef;
      if (!el || el === scrollEl) return;
      scrollEl = el;
      el.addEventListener("scroll", onViewportScroll, { passive: true });
    }
    function onOpenChange(open) {
      if (open) nextTick(attachScroll);
      else detachScroll();
    }
    onBeforeUnmount(() => {
      detachScroll();
      abortController?.abort();
    });
    return (_ctx, _cache) => {
      const _component_USelectMenu = _resolveComponent("USelectMenu");
      const _component_UButton = _resolveComponent("UButton");
      const _component_UIcon = _resolveComponent("UIcon");
      const _component_UPopover = _resolveComponent("UPopover");
      const _component_UTooltip = _resolveComponent("UTooltip");
      return _openBlock(), _createElementBlock(
        "div",
        {
          class: _normalizeClass(["flex items-center gap-1.5", __props.widthClass])
        },
        [
          _createVNode(_component_USelectMenu, {
            ref_key: "modelSelectMenuRef",
            ref: modelSelectMenuRef,
            "search-term": searchTerm.value,
            "onUpdate:searchTerm": _cache[0] || (_cache[0] = ($event) => searchTerm.value = $event),
            "model-value": __props.modelValue,
            items: modelOptions.value,
            loading: __props.loading,
            "value-key": "value",
            "label-key": "label",
            virtualize: "",
            "ignore-filter": "",
            "search-input": { placeholder: _unref(label)("placeholder") },
            placeholder: _unref(label)("placeholder"),
            size: "sm",
            class: "flex-1 min-w-0",
            disabled: __props.disabled || __props.loading || __props.models.length === 0,
            "onUpdate:open": onOpenChange,
            "onUpdate:modelValue": handleUpdate
          }, null, 8, ["search-term", "model-value", "items", "loading", "search-input", "placeholder", "disabled"]),
          canCheck.value ? (_openBlock(), _createElementBlock(
            _Fragment,
            { key: 0 },
            [
              _createCommentVNode(" Hover popover while the last check failed "),
              checkStatus.value === "error" ? (_openBlock(), _createBlock(_component_UPopover, {
                key: 0,
                mode: "hover",
                content: { side: "bottom", align: "end", sideOffset: 6 }
              }, {
                content: _withCtx(() => [
                  _createElementVNode("div", _hoisted_1, [
                    _createElementVNode("div", _hoisted_2, [
                      _createVNode(_component_UIcon, {
                        name: "i-lucide-alert-circle",
                        class: "size-4 shrink-0 text-error mt-0.5"
                      }),
                      _createElementVNode("div", _hoisted_3, [
                        _createElementVNode(
                          "p",
                          _hoisted_4,
                          _toDisplayString(lastErrorTitle.value),
                          1
                          /* TEXT */
                        ),
                        lastErrorDesc.value ? (_openBlock(), _createElementBlock(
                          "p",
                          _hoisted_5,
                          _toDisplayString(lastErrorDesc.value),
                          1
                          /* TEXT */
                        )) : _createCommentVNode("v-if", true),
                        lastRawError.value ? (_openBlock(), _createElementBlock("div", _hoisted_6, [
                          _createElementVNode(
                            "span",
                            _hoisted_7,
                            _toDisplayString(_unref(label)("rawError")),
                            1
                            /* TEXT */
                          ),
                          _createElementVNode(
                            "div",
                            _hoisted_8,
                            _toDisplayString(lastRawError.value),
                            1
                            /* TEXT */
                          )
                        ])) : _createCommentVNode("v-if", true)
                      ])
                    ]),
                    _createElementVNode("div", _hoisted_9, [
                      _createElementVNode(
                        "span",
                        null,
                        _toDisplayString(lastLatency.value !== null ? `${lastLatency.value}ms` : ""),
                        1
                        /* TEXT */
                      ),
                      _createElementVNode("button", {
                        type: "button",
                        class: "inline-flex items-center gap-1 text-primary hover:underline font-medium cursor-pointer",
                        onClick: checkModel
                      }, [
                        _createVNode(_component_UIcon, {
                          name: "i-lucide-rotate-cw",
                          class: "size-3"
                        }),
                        _createTextVNode(
                          " " + _toDisplayString(_unref(label)("retry")),
                          1
                          /* TEXT */
                        )
                      ])
                    ])
                  ])
                ]),
                default: _withCtx(() => [
                  _createVNode(_component_UButton, {
                    icon: checkButtonIcon.value,
                    color: checkButtonColor.value,
                    variant: "ghost",
                    size: "sm",
                    loading: checking.value,
                    disabled: __props.disabled || __props.loading || !__props.modelValue,
                    "aria-label": _unref(label)("checkAriaLabel"),
                    class: "shrink-0",
                    onClick: checkModel
                  }, null, 8, ["icon", "color", "loading", "disabled", "aria-label"])
                ]),
                _: 1
                /* STABLE */
              })) : (_openBlock(), _createElementBlock(
                _Fragment,
                { key: 1 },
                [
                  _createCommentVNode(" Tooltip while idle / checking / healthy "),
                  _createVNode(_component_UTooltip, { text: checkTooltipText.value }, {
                    default: _withCtx(() => [
                      _createVNode(_component_UButton, {
                        icon: checkButtonIcon.value,
                        color: checkButtonColor.value,
                        variant: "ghost",
                        size: "sm",
                        loading: checking.value,
                        disabled: __props.disabled || __props.loading || !__props.modelValue,
                        "aria-label": _unref(label)("checkAriaLabel"),
                        class: "shrink-0",
                        onClick: checkModel
                      }, null, 8, ["icon", "color", "loading", "disabled", "aria-label"])
                    ]),
                    _: 1
                    /* STABLE */
                  }, 8, ["text"])
                ],
                2112
                /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
              ))
            ],
            64
            /* STABLE_FRAGMENT */
          )) : _createCommentVNode("v-if", true)
        ],
        2
        /* CLASS */
      );
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

