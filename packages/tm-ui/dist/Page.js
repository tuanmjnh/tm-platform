import { defineComponent as _defineComponent } from "vue";
import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, renderSlot as _renderSlot, resolveComponent as _resolveComponent, createVNode as _createVNode, createCommentVNode as _createCommentVNode, openBlock as _openBlock, createBlock as _createBlock, withCtx as _withCtx, createSlots as _createSlots, createElementBlock as _createElementBlock } from "vue";
const _hoisted_1 = { class: "shrink-0 tm-chrome-glass" };
const _hoisted_2 = { class: "truncate" };
const _hoisted_3 = { class: "truncate text-xs font-normal text-muted" };
const _hoisted_4 = { class: "hidden lg:flex items-center gap-2" };
const _hoisted_5 = { class: "flex items-center gap-2 w-full min-w-0 sm:w-auto" };
const _hoisted_6 = { class: "flex-1 min-h-0 flex flex-col" };
const _hoisted_7 = {
  key: 0,
  class: "hidden sm:block shrink-0 border-t border-default/70 tm-chrome-overlay px-4 sm:px-6 py-1 z-10 empty:hidden"
};
import { computed, useSlots } from "vue";
import { useMobileBar, headerActionsToMobile } from "./mobileBar.js";
import HeaderActions from "./HeaderActions.js";
import ListFooter from "./ListFooter.js";
import ViewModeToggle from "./ViewModeToggle.js";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "Page",
  props: {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: false },
    navbarUi: { type: Object, required: false },
    flush: { type: Boolean, required: false },
    compact: { type: Boolean, required: false },
    actions: { type: Array, required: false, default: void 0 },
    search: { type: String, required: false, default: void 0 },
    searchPlaceholder: { type: String, required: false, default: void 0 },
    viewMode: { type: String, required: false, default: void 0 },
    count: { type: Number, required: false, default: void 0 },
    hasMore: { type: Boolean, required: false, default: false },
    loading: { type: Boolean, required: false, default: false },
    refresh: { type: Function, required: false, default: void 0 },
    labels: { type: Object, required: false, default: () => ({}) }
  },
  emits: ["update:search", "update:viewMode"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const slots = useSlots();
    const mobileBar = useMobileBar();
    const panelUi = computed(() => {
      const ui = { root: "min-h-full" };
      if (props.flush) ui.body = "p-0 sm:p-0 gap-0 sm:gap-0";
      else if (props.compact) ui.body = "p-2 sm:p-3";
      return ui;
    });
    const mobileActions = computed(() => {
      const list = props.actions ? headerActionsToMobile(props.actions) : [];
      if (props.refresh) {
        list.push({
          icon: "i-lucide-refresh-cw",
          label: props.labels.refresh ?? "Refresh",
          disabled: props.loading,
          onSelect: () => props.refresh?.()
        });
      }
      return list;
    });
    if (props.actions || props.refresh) {
      mobileBar.registerActions(mobileActions);
    }
    if (props.count !== void 0) {
      mobileBar.registerInfo(computed(() => ({
        count: props.count,
        hasMore: props.hasMore,
        loading: props.loading
      })));
    }
    const hasToolbar = computed(
      () => props.search !== void 0 || props.viewMode !== void 0 || !!slots.filters || !!slots["toolbar-left"] || !!slots["toolbar-right"]
    );
    const hasFooter = computed(
      () => props.count !== void 0 || !!slots.footer || !!slots["footer-left"] || !!slots["footer-right"]
    );
    return (_ctx, _cache) => {
      const _component_UDashboardSidebarCollapse = _resolveComponent("UDashboardSidebarCollapse");
      const _component_UDashboardNavbar = _resolveComponent("UDashboardNavbar");
      const _component_UInput = _resolveComponent("UInput");
      const _component_UDashboardToolbar = _resolveComponent("UDashboardToolbar");
      const _component_UDashboardPanel = _resolveComponent("UDashboardPanel");
      return _openBlock(), _createBlock(_component_UDashboardPanel, {
        id: __props.id,
        ui: panelUi.value
      }, {
        header: _withCtx(() => [
          _createElementVNode("div", _hoisted_1, [
            _createVNode(_component_UDashboardNavbar, {
              title: __props.title,
              toggle: false,
              class: "border-b border-default/70",
              ui: { title: __props.description ? "flex flex-col items-start justify-center gap-px h-full truncate" : void 0, ...__props.navbarUi }
            }, _createSlots({
              leading: _withCtx(() => [
                _renderSlot(_ctx.$slots, "leading", {}, () => [
                  _createVNode(_component_UDashboardSidebarCollapse, { class: "hidden lg:inline-flex" })
                ])
              ]),
              right: _withCtx(() => [
                _createElementVNode("div", _hoisted_4, [
                  _createCommentVNode(" Pages without their own #right get the unified registered actions. "),
                  _renderSlot(_ctx.$slots, "right", {}, () => [
                    __props.actions?.length ? (_openBlock(), _createBlock(HeaderActions, {
                      key: 0,
                      actions: __props.actions,
                      "more-label": __props.labels.actions
                    }, null, 8, ["actions", "more-label"])) : _createCommentVNode("v-if", true)
                  ]),
                  _createCommentVNode(" App chrome (bell, settings) is injected here so the package owns no auth state. "),
                  _renderSlot(_ctx.$slots, "chrome")
                ])
              ]),
              _: 2
              /* DYNAMIC */
            }, [
              __props.description ? {
                name: "title",
                fn: _withCtx(() => [
                  _createElementVNode(
                    "span",
                    _hoisted_2,
                    _toDisplayString(__props.title),
                    1
                    /* TEXT */
                  ),
                  _createElementVNode(
                    "span",
                    _hoisted_3,
                    _toDisplayString(__props.description),
                    1
                    /* TEXT */
                  )
                ]),
                key: "0"
              } : void 0,
              _ctx.$slots.left ? {
                name: "left",
                fn: _withCtx(() => [
                  _renderSlot(_ctx.$slots, "left")
                ]),
                key: "1"
              } : void 0
            ]), 1032, ["title", "ui"]),
            _renderSlot(_ctx.$slots, "toolbar", {}, () => [
              hasToolbar.value ? (_openBlock(), _createBlock(_component_UDashboardToolbar, { key: 0 }, {
                left: _withCtx(() => [
                  _createElementVNode("div", _hoisted_5, [
                    __props.search !== void 0 ? (_openBlock(), _createBlock(_component_UInput, {
                      key: 0,
                      "model-value": __props.search,
                      icon: "i-lucide-search",
                      placeholder: __props.searchPlaceholder || __props.labels.search || "Search",
                      size: "sm",
                      class: "flex-1 min-w-0 sm:flex-none sm:w-64",
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("update:search", $event))
                    }, null, 8, ["model-value", "placeholder"])) : _createCommentVNode("v-if", true),
                    _renderSlot(_ctx.$slots, "filters"),
                    _renderSlot(_ctx.$slots, "toolbar-left")
                  ])
                ]),
                right: _withCtx(() => [
                  __props.viewMode !== void 0 ? (_openBlock(), _createBlock(ViewModeToggle, {
                    key: 0,
                    "model-value": __props.viewMode,
                    "list-label": __props.labels.list,
                    "grid-label": __props.labels.grid,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => emit("update:viewMode", $event))
                  }, null, 8, ["model-value", "list-label", "grid-label"])) : _createCommentVNode("v-if", true),
                  _renderSlot(_ctx.$slots, "toolbar-right")
                ]),
                _: 3
                /* FORWARDED */
              })) : _createCommentVNode("v-if", true)
            ])
          ])
        ]),
        body: _withCtx(() => [
          _createElementVNode("div", _hoisted_6, [
            _renderSlot(_ctx.$slots, "default")
          ])
        ]),
        footer: _withCtx(() => [
          hasFooter.value ? (_openBlock(), _createElementBlock("div", _hoisted_7, [
            _renderSlot(_ctx.$slots, "footer", {}, () => [
              _createVNode(ListFooter, {
                count: __props.count,
                "has-more": __props.hasMore,
                loading: __props.loading,
                "records-label": __props.labels.records,
                "loading-label": __props.labels.loading,
                "no-more-label": __props.labels.noMore
              }, {
                left: _withCtx(() => [
                  _renderSlot(_ctx.$slots, "footer-left")
                ]),
                right: _withCtx(() => [
                  _renderSlot(_ctx.$slots, "footer-right")
                ]),
                _: 3
                /* FORWARDED */
              }, 8, ["count", "has-more", "loading", "records-label", "loading-label", "no-more-label"])
            ])
          ])) : _createCommentVNode("v-if", true)
        ]),
        _: 3
        /* FORWARDED */
      }, 8, ["id", "ui"]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

