import { defineComponent as _defineComponent } from "vue";
import { renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, resolveComponent as _resolveComponent, createBlock as _createBlock, createVNode as _createVNode, withCtx as _withCtx, createCommentVNode as _createCommentVNode } from "vue";
const _hoisted_1 = { class: "flex items-center gap-2" };
import { computed } from "vue";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "HeaderActions",
  props: {
    actions: { type: Array, required: true },
    maxInline: { type: Number, required: false, default: 3 },
    moreLabel: { type: String, required: false, default: "More" }
  },
  setup(__props) {
    const props = __props;
    const shown = computed(() => props.actions.filter((a) => a.visible !== false));
    const isOverflow = (action) => !!action.overflow || !!action.children?.length;
    const split = computed(() => {
      const primaryCount = shown.value.filter((a) => a.primary && !isOverflow(a)).length;
      const secondaryBudget = Math.max(0, props.maxInline - primaryCount);
      const inline2 = [];
      const overflow2 = [];
      let secondaryUsed = 0;
      for (const action of shown.value) {
        if (isOverflow(action)) {
          overflow2.push(action);
        } else if (action.primary) {
          inline2.push(action);
        } else if (secondaryUsed < secondaryBudget) {
          inline2.push(action);
          secondaryUsed++;
        } else {
          overflow2.push(action);
        }
      }
      return { inline: inline2, overflow: overflow2 };
    });
    const inline = computed(() => split.value.inline);
    const overflow = computed(() => split.value.overflow);
    const overflowItems = computed(() => overflow.value.map((action) => ({
      label: action.label,
      icon: action.icon,
      disabled: action.disabled,
      children: action.children?.length ? action.children.map((child) => ({
        label: child.label,
        icon: child.icon,
        disabled: child.disabled,
        onSelect: () => child.onSelect()
      })) : void 0,
      onSelect: action.children?.length ? void 0 : () => action.onSelect?.()
    })));
    return (_ctx, _cache) => {
      const _component_UButton = _resolveComponent("UButton");
      const _component_UDropdownMenu = _resolveComponent("UDropdownMenu");
      return _openBlock(), _createElementBlock("div", _hoisted_1, [
        (_openBlock(true), _createElementBlock(
          _Fragment,
          null,
          _renderList(inline.value, (action) => {
            return _openBlock(), _createBlock(_component_UButton, {
              key: action.key,
              icon: action.icon,
              label: action.label,
              color: action.color ?? "neutral",
              variant: action.variant ?? "soft",
              size: "sm",
              disabled: action.disabled,
              ui: { label: "hidden md:block" },
              onClick: ($event) => action.onSelect?.()
            }, null, 8, ["icon", "label", "color", "variant", "disabled", "onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        )),
        overflow.value.length ? (_openBlock(), _createBlock(_component_UDropdownMenu, {
          key: 0,
          items: overflowItems.value,
          content: { side: "bottom", align: "end" }
        }, {
          default: _withCtx(() => [
            _createVNode(_component_UButton, {
              icon: "i-lucide-ellipsis-vertical",
              color: "neutral",
              variant: "soft",
              size: "sm",
              "aria-label": __props.moreLabel
            }, null, 8, ["aria-label"])
          ]),
          _: 1
          /* STABLE */
        }, 8, ["items"])) : _createCommentVNode("v-if", true)
      ]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

