import { defineComponent as _defineComponent } from "vue";
import { normalizeProps as _normalizeProps, guardReactiveProps as _guardReactiveProps, renderSlot as _renderSlot, resolveComponent as _resolveComponent, mergeProps as _mergeProps, withCtx as _withCtx, renderList as _renderList, createSlots as _createSlots, createVNode as _createVNode, createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode } from "vue";
const _hoisted_1 = { class: "space-y-4 flex flex-col flex-1 min-h-0" };
const _hoisted_2 = { class: "overflow-x-auto" };
const _hoisted_3 = {
  key: 0,
  class: "flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
};
const _hoisted_4 = { class: "text-sm text-muted" };
import { computed } from "vue";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "Table",
  props: {
    data: { type: Array, required: true },
    columns: { type: Array, required: true },
    loading: { type: Boolean, required: false, default: false },
    total: { type: Number, required: false, default: void 0 },
    pageSize: { type: Number, required: false, default: 10 },
    page: { type: Number, required: false, default: 1 },
    styled: { type: Boolean, required: false, default: true },
    showingTemplate: { type: String, required: false, default: "Showing {count} of {total}" },
    ui: { type: Object, required: false, default: () => ({}) }
  },
  emits: ["update:page"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const currentPage = computed({
      get: () => props.page,
      set: (val) => emit("update:page", val)
    });
    const footerText = computed(
      () => props.showingTemplate.replace("{count}", String(props.data.length)).replace("{total}", String(props.total ?? 0))
    );
    const tableUi = computed(() => {
      if (!props.styled) return props.ui;
      return {
        base: "table-fixed border-separate border-spacing-0",
        thead: "[&>tr]:bg-elevated/50 [&>tr]:after:content-none",
        tbody: "[&>tr]:last:[&>td]:border-b-0",
        th: "py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r",
        td: "border-b border-default",
        separator: "h-0",
        ...props.ui
      };
    });
    return (_ctx, _cache) => {
      const _component_UTable = _resolveComponent("UTable");
      const _component_UPagination = _resolveComponent("UPagination");
      return _openBlock(), _createElementBlock("div", _hoisted_1, [
        _createElementVNode("div", _hoisted_2, [
          _createVNode(_component_UTable, _mergeProps(_ctx.$attrs, {
            data: __props.data,
            columns: __props.columns,
            loading: __props.loading,
            ui: tableUi.value
          }), _createSlots({
            _: 2
            /* DYNAMIC */
          }, [
            _renderList(_ctx.$slots, (_, name) => {
              return {
                name,
                fn: _withCtx((slotData) => [
                  _renderSlot(_ctx.$slots, name, _normalizeProps(_guardReactiveProps(slotData)))
                ])
              };
            })
          ]), 1040, ["data", "columns", "loading", "ui"])
        ]),
        __props.total !== void 0 && __props.total > 0 ? (_openBlock(), _createElementBlock("div", _hoisted_3, [
          _renderSlot(_ctx.$slots, "footer-left", {}, () => [
            _createElementVNode("div", _hoisted_4, [
              _renderSlot(_ctx.$slots, "footer-text", {}, () => [
                _createTextVNode(
                  _toDisplayString(footerText.value),
                  1
                  /* TEXT */
                )
              ])
            ])
          ]),
          _renderSlot(_ctx.$slots, "footer-right", {}, () => [
            _createVNode(_component_UPagination, {
              page: currentPage.value,
              "onUpdate:page": _cache[0] || (_cache[0] = ($event) => currentPage.value = $event),
              "items-per-page": __props.pageSize,
              total: __props.total
            }, null, 8, ["page", "items-per-page", "total"])
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

