import { defineComponent as _defineComponent } from "vue";
import { createCommentVNode as _createCommentVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, resolveComponent as _resolveComponent, createVNode as _createVNode, renderList as _renderList, Fragment as _Fragment, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, createTextVNode as _createTextVNode, withModifiers as _withModifiers, withKeys as _withKeys, createBlock as _createBlock, renderSlot as _renderSlot, withCtx as _withCtx, createElementVNode as _createElementVNode, createSlots as _createSlots, normalizeStyle as _normalizeStyle, Teleport as _Teleport } from "vue";
const _hoisted_1 = { class: "flex flex-col h-full min-h-0 bg-transparent" };
const _hoisted_2 = {
  key: 0,
  class: "hidden lg:flex items-center pl-0.75 pr-3.25 py-3 mb-1 text-xs font-bold uppercase tracking-wider text-muted border-b border-default bg-transparent"
};
const _hoisted_3 = {
  key: 0,
  class: "w-8 shrink-0"
};
const _hoisted_4 = {
  key: 1,
  class: "w-8 shrink-0 flex items-center justify-center mr-2"
};
const _hoisted_5 = ["onClick", "onKeydown"];
const _hoisted_6 = { key: 1 };
const _hoisted_7 = { key: 0 };
const _hoisted_8 = {
  key: 1,
  class: "flex flex-col items-center justify-center py-20 text-muted"
};
const _hoisted_9 = { class: "w-full h-full" };
const _hoisted_10 = {
  key: 0,
  class: "absolute top-2 right-2"
};
const _hoisted_11 = {
  key: 1,
  class: "hidden lg:flex items-center py-3 h-full w-full overflow-hidden"
};
const _hoisted_12 = { class: "truncate text-xs text-toned" };
const _hoisted_13 = {
  key: 1,
  class: "truncate text-sm text-toned"
};
const _hoisted_14 = { class: "flex h-full" };
import { computed, onMounted, onUnmounted, ref, useSlots, watch } from "vue";
import { useInfiniteScroll } from "@vueuse/core";
import Sortable from "sortablejs";
import { useAdminGridView } from "./gridView.js";
import SwipeCard from "./SwipeCard.js";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "GridList",
  props: {
    items: { type: Array, required: true },
    columns: { type: Array, required: true },
    loading: { type: Boolean, required: false, default: false },
    selected: { type: Array, required: false, default: () => [] },
    itemKey: { type: String, required: false, default: void 0 },
    selectable: { type: Boolean, required: false, default: false },
    actionOptions: { type: Function, required: false, default: void 0 },
    swipeLeftActions: { type: Function, required: false, default: void 0 },
    swipeRightActions: { type: Function, required: false, default: void 0 },
    mobileActionMode: { type: String, required: false, default: "context" },
    viewMode: { type: String, required: false, default: "list" },
    gridCols: { type: String, required: false, default: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" },
    skeletonCount: { type: Number, required: false, default: 20 },
    draggable: { type: Boolean, required: false, default: false },
    storageKey: { type: String, required: false, default: void 0 },
    hideHeader: { type: Boolean, required: false, default: false },
    uiScrollArea: { type: Object, required: false, default: void 0 },
    actionsButtonVisibility: { type: String, required: false, default: "always" },
    canLoadMore: { type: Boolean, required: false, default: true },
    labels: { type: null, required: false, default: () => ({}) }
  },
  emits: ["update:selected", "update:viewMode", "sort", "click", "refresh", "load-more", "update:items"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const selectedItems = computed({
      get: () => props.selected ?? [],
      set: (val) => emit("update:selected", val)
    });
    const currentViewMode = computed({
      get: () => props.viewMode ?? "list",
      set: (val) => emit("update:viewMode", val)
    });
    const { viewMode: storedView } = useAdminGridView(props.storageKey || "default", props.viewMode ?? "list");
    if (props.storageKey && props.viewMode === void 0) {
      currentViewMode.value = storedView.value;
    }
    watch(currentViewMode, (val) => {
      if (props.storageKey) storedView.value = val;
    });
    watch(storedView, (val) => {
      if (props.storageKey && val) currentViewMode.value = val;
    });
    const mergedUi = computed(() => {
      const defaults = {
        root: "flex-1",
        viewport: "h-full w-full rounded-[inherit] outline-none"
      };
      if (!props.uiScrollArea) return defaults;
      return {
        ...defaults,
        ...props.uiScrollArea,
        root: [defaults.root, props.uiScrollArea.root].filter(Boolean).join(" "),
        viewport: [defaults.viewport, props.uiScrollArea.viewport].filter(Boolean).join(" ")
      };
    });
    const scrollEl = ref(null);
    const scrollTarget = computed(() => {
      const root = scrollEl.value?.$el;
      return root?.querySelector("[data-radix-scroll-area-viewport]") || root;
    });
    useInfiniteScroll(scrollTarget, () => {
      if (!props.loading && props.canLoadMore) emit("load-more");
    }, { distance: 10 });
    const openCardId = ref(null);
    const isAllSelected = computed(() => props.items.length > 0 && selectedItems.value.length === props.items.length);
    const isIndeterminate = computed(() => selectedItems.value.length > 0 && selectedItems.value.length < props.items.length);
    const toggleAll = (val) => {
      selectedItems.value = val === true ? [...props.items] : [];
    };
    const fieldValue = (item, key) => item[key];
    const itemId = (item) => fieldValue(item, props.itemKey || "_id");
    const toggleSelect = (item, val) => {
      const key = props.itemKey || "_id";
      const id = fieldValue(item, key);
      if (val === true) {
        if (!selectedItems.value.find((i) => fieldValue(i, key) === id)) {
          selectedItems.value = [...selectedItems.value, item];
        }
      } else {
        selectedItems.value = selectedItems.value.filter((i) => fieldValue(i, key) !== id);
      }
    };
    const isSelected = (item) => {
      const key = props.itemKey || "_id";
      return !!selectedItems.value.find((i) => fieldValue(i, key) === fieldValue(item, key));
    };
    const dragEl = ref(null);
    const isDraggable = computed(() => props.draggable);
    const sortableInstance = ref(null);
    const initSortable = () => {
      if (sortableInstance.value) return;
      if (!isDraggable.value || !dragEl.value) return;
      sortableInstance.value = new Sortable(dragEl.value, {
        handle: ".drag-handle",
        animation: 150,
        ghostClass: "sortable-ghost",
        fallbackClass: "sortable-fallback",
        forceFallback: true,
        swapThreshold: 0.65,
        onUpdate: (evt) => {
          const from = evt.oldIndex ?? -1;
          const to = evt.newIndex ?? -1;
          if (from < 0 || to < 0) return;
          const newItems = [...props.items];
          const [moved] = newItems.splice(from, 1);
          if (!moved) return;
          newItems.splice(to, 0, moved);
          emit("update:items", newItems);
        }
      });
    };
    const destroySortable = () => {
      sortableInstance.value?.destroy();
      sortableInstance.value = null;
    };
    onMounted(initSortable);
    onUnmounted(destroySortable);
    watch(() => [props.items.length, isDraggable.value, dragEl.value], () => {
      if (isDraggable.value && props.items.length > 0 && dragEl.value) initSortable();
      else if (!isDraggable.value) destroySortable();
    }, { flush: "post" });
    const contextMenu = ref({
      isOpen: false,
      x: 0,
      y: 0,
      items: []
    });
    const handleContextMenu = (item, event) => {
      if (!props.actionOptions) return;
      contextMenu.value = { isOpen: true, x: event.clientX, y: event.clientY, items: props.actionOptions(item) };
    };
    const handleLongPress = (payload) => {
      if (!props.actionOptions) return;
      contextMenu.value = { isOpen: true, x: payload.clientX, y: payload.clientY, items: props.actionOptions(payload.item) };
    };
    const slots = useSlots();
    const showActions = computed(() => {
      if (props.actionsButtonVisibility === "never") return false;
      if (props.actionsButtonVisibility === "list") return currentViewMode.value === "list";
      if (props.actionsButtonVisibility === "grid") return currentViewMode.value === "grid";
      return true;
    });
    const isActionCol = (key) => key === "actions" || key === "action";
    const actionsCol = computed(() => props.columns.find((c) => isActionCol(c.key)));
    const displayColumns = computed(() => props.columns.filter((c) => !isActionCol(c.key)));
    const hasActions = computed(
      () => showActions.value && (!!props.actionOptions || !!slots.actions || !!slots.action || !!actionsCol.value)
    );
    const actionsClass = computed(() => {
      if (actionsCol.value?.class?.split(" ").some((c) => c.startsWith("w-") || c.startsWith("min-w-"))) {
        return actionsCol.value.class.includes("shrink-0") ? actionsCol.value.class : `${actionsCol.value.class} shrink-0`;
      }
      if (slots.actions || slots.action) return "w-24 shrink-0";
      return "w-14 shrink-0";
    });
    const mo = computed(() => props.labels.more ?? "More");
    const emptyTitle = computed(() => props.labels.emptyTitle ?? "No data");
    const emptyDescription = computed(() => props.labels.emptyDescription ?? "");
    const refreshLabel = computed(() => props.labels.refresh ?? "Refresh");
    return (_ctx, _cache) => {
      const _component_UCheckbox = _resolveComponent("UCheckbox");
      const _component_UIcon = _resolveComponent("UIcon");
      const _component_USkeleton = _resolveComponent("USkeleton");
      const _component_UEmpty = _resolveComponent("UEmpty");
      const _component_UButton = _resolveComponent("UButton");
      const _component_UDropdownMenu = _resolveComponent("UDropdownMenu");
      const _component_UScrollArea = _resolveComponent("UScrollArea");
      return _openBlock(), _createElementBlock("div", _hoisted_1, [
        _createCommentVNode(" Header: desktop list mode only "),
        currentViewMode.value === "list" && !__props.hideHeader ? (_openBlock(), _createElementBlock("div", _hoisted_2, [
          isDraggable.value ? (_openBlock(), _createElementBlock("div", _hoisted_3)) : _createCommentVNode("v-if", true),
          __props.selectable ? (_openBlock(), _createElementBlock("div", _hoisted_4, [
            _createVNode(_component_UCheckbox, {
              "model-value": isAllSelected.value,
              indeterminate: isIndeterminate.value,
              "aria-label": __props.labels.selectAll ?? "Select all",
              "onUpdate:modelValue": toggleAll
            }, null, 8, ["model-value", "indeterminate", "aria-label"])
          ])) : _createCommentVNode("v-if", true),
          (_openBlock(true), _createElementBlock(
            _Fragment,
            null,
            _renderList(displayColumns.value, (col) => {
              return _openBlock(), _createElementBlock(
                "div",
                {
                  key: col.key,
                  class: _normalizeClass(["flex items-center min-w-0 px-2", [
                    !col.class || !col.class.split(" ").some((c) => c.startsWith("w-") || c.startsWith("flex-")) ? "flex-1" : "",
                    col.class || "",
                    col.headerClass || ""
                  ]])
                },
                [
                  col.sortable ? (_openBlock(), _createElementBlock("div", {
                    key: 0,
                    class: "cursor-pointer select-none flex items-center hover:text-primary-500 transition-colors",
                    role: "button",
                    tabindex: "0",
                    onClick: ($event) => emit("sort", col),
                    onKeydown: [
                      _withKeys(_withModifiers(($event) => emit("sort", col), ["prevent"]), ["enter"]),
                      _withKeys(_withModifiers(($event) => emit("sort", col), ["prevent"]), ["space"])
                    ]
                  }, [
                    _createTextVNode(
                      _toDisplayString(col.label) + " ",
                      1
                      /* TEXT */
                    ),
                    _createVNode(_component_UIcon, {
                      name: col.sort === "asc" || col.sort === 1 ? "i-lucide-arrow-up-narrow-wide" : col.sort === "desc" || col.sort === -1 ? "i-lucide-arrow-down-wide-narrow" : "i-lucide-arrow-up-down",
                      class: _normalizeClass(["w-4 h-4 ml-1", col.sort ? "text-primary-500" : "text-dimmed"])
                    }, null, 8, ["name", "class"])
                  ], 40, _hoisted_5)) : (_openBlock(), _createElementBlock(
                    "span",
                    _hoisted_6,
                    _toDisplayString(col.label),
                    1
                    /* TEXT */
                  ))
                ],
                2
                /* CLASS */
              );
            }),
            128
            /* KEYED_FRAGMENT */
          )),
          hasActions.value ? (_openBlock(), _createElementBlock(
            "div",
            {
              key: 2,
              class: _normalizeClass(["shrink-0 flex items-center justify-end px-2", [actionsClass.value, actionsCol.value?.headerClass || ""]])
            },
            [
              actionsCol.value?.label ? (_openBlock(), _createElementBlock(
                "span",
                _hoisted_7,
                _toDisplayString(actionsCol.value.label),
                1
                /* TEXT */
              )) : _createCommentVNode("v-if", true)
            ],
            2
            /* CLASS */
          )) : _createCommentVNode("v-if", true)
        ])) : _createCommentVNode("v-if", true),
        _createVNode(_component_UScrollArea, {
          ref_key: "scrollEl",
          ref: scrollEl,
          ui: mergedUi.value
        }, {
          default: _withCtx(() => [
            _createCommentVNode(" Loading: skeletons keep the row height so the shell does not jump "),
            __props.loading && __props.items.length === 0 ? (_openBlock(), _createElementBlock(
              "div",
              {
                key: 0,
                class: _normalizeClass([currentViewMode.value === "list" ? "space-y-3 pr-3 pl-0.5" : `grid ${__props.gridCols} gap-4 pb-4 pr-3 pl-0.5`, "w-full h-full"])
              },
              [
                (_openBlock(true), _createElementBlock(
                  _Fragment,
                  null,
                  _renderList(__props.skeletonCount, (i) => {
                    return _openBlock(), _createBlock(_component_USkeleton, {
                      key: i,
                      class: _normalizeClass([currentViewMode.value === "list" ? "h-20" : "h-48", "w-full rounded-xl bg-muted/60"])
                    }, null, 8, ["class"]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ],
              2
              /* CLASS */
            )) : __props.items.length === 0 ? (_openBlock(), _createElementBlock("div", _hoisted_8, [
              _renderSlot(_ctx.$slots, "empty", {}, () => [
                _createVNode(_component_UEmpty, {
                  size: "xl",
                  icon: "i-lucide-package-open",
                  title: emptyTitle.value,
                  description: emptyDescription.value,
                  actions: [{ label: refreshLabel.value, onClick: () => emit("refresh"), variant: "soft" }]
                }, null, 8, ["title", "description", "actions"])
              ])
            ])) : (_openBlock(), _createElementBlock(
              "div",
              {
                key: 2,
                ref_key: "dragEl",
                ref: dragEl,
                class: _normalizeClass(currentViewMode.value === "list" ? "space-y-2 pb-4 pr-3 pl-0.5" : `grid ${__props.gridCols} gap-4 pb-4 pr-3 pl-0.5`)
              },
              [
                _renderSlot(_ctx.$slots, "first-item"),
                (_openBlock(true), _createElementBlock(
                  _Fragment,
                  null,
                  _renderList(__props.items, (item) => {
                    return _openBlock(), _createElementBlock("div", {
                      key: itemId(item)
                    }, [
                      _createVNode(SwipeCard, {
                        id: itemId(item),
                        item,
                        "open-id": openCardId.value,
                        disabled: false,
                        "mobile-mode": __props.mobileActionMode,
                        draggable: isDraggable.value,
                        class: _normalizeClass(["h-full transition-all duration-200", { "bg-blue-50/50! dark:bg-sky-300/20! border-sky-500/50 dark:border-sky-800/50": isSelected(item) }]),
                        "onUpdate:openId": _cache[2] || (_cache[2] = ($event) => openCardId.value = $event),
                        onClick: ($event) => emit("click", item),
                        onLongPress: handleLongPress,
                        onContextmenu: _withModifiers((e) => handleContextMenu(item, e), ["prevent"])
                      }, _createSlots({
                        default: _withCtx(() => [
                          _createElementVNode("div", _hoisted_9, [
                            _ctx.$slots["mobile-content"] ? (_openBlock(), _createElementBlock(
                              "div",
                              {
                                key: 0,
                                class: _normalizeClass([currentViewMode.value === "grid" ? "block" : "block lg:hidden", "p-4 relative group/mobile"])
                              },
                              [
                                _renderSlot(_ctx.$slots, "mobile-content", { item }),
                                showActions.value && __props.mobileActionMode === "dropdown" && __props.actionOptions ? (_openBlock(), _createElementBlock("div", _hoisted_10, [
                                  _createVNode(_component_UDropdownMenu, {
                                    items: __props.actionOptions(item),
                                    popper: { placement: "bottom-end" }
                                  }, {
                                    default: _withCtx(() => [
                                      _createVNode(_component_UButton, {
                                        color: "neutral",
                                        variant: "ghost",
                                        icon: "i-lucide-ellipsis-vertical",
                                        size: "sm",
                                        "aria-label": mo.value
                                      }, null, 8, ["aria-label"])
                                    ]),
                                    _: 1
                                    /* STABLE */
                                  }, 8, ["items"])
                                ])) : _createCommentVNode("v-if", true)
                              ],
                              2
                              /* CLASS */
                            )) : _createCommentVNode("v-if", true),
                            currentViewMode.value === "list" ? (_openBlock(), _createElementBlock("div", _hoisted_11, [
                              __props.selectable ? (_openBlock(), _createElementBlock("div", {
                                key: 0,
                                class: "w-8 shrink-0 flex items-center justify-center mr-2",
                                onClick: _cache[0] || (_cache[0] = _withModifiers(() => {
                                }, ["stop"]))
                              }, [
                                _createVNode(_component_UCheckbox, {
                                  "model-value": isSelected(item),
                                  "aria-label": __props.labels.selectRow ?? "Select row",
                                  "onUpdate:modelValue": (val) => toggleSelect(item, val)
                                }, null, 8, ["model-value", "aria-label", "onUpdate:modelValue"])
                              ])) : _createCommentVNode("v-if", true),
                              (_openBlock(true), _createElementBlock(
                                _Fragment,
                                null,
                                _renderList(displayColumns.value, (col) => {
                                  return _openBlock(), _createElementBlock(
                                    "div",
                                    {
                                      key: col.key,
                                      class: _normalizeClass(["min-w-0 flex items-center px-2", [
                                        !col.class || !col.class.split(" ").some((c) => c.startsWith("w-") || c.startsWith("flex-")) ? "flex-1" : "",
                                        col.class || "",
                                        col.rowClass || ""
                                      ]])
                                    },
                                    [
                                      col.slot || _ctx.$slots[col.key] ? _renderSlot(_ctx.$slots, col.slot || col.key, { item }, () => [
                                        _createElementVNode(
                                          "div",
                                          _hoisted_12,
                                          _toDisplayString(fieldValue(item, col.key)),
                                          1
                                          /* TEXT */
                                        )
                                      ], void 0, 0) : (_openBlock(), _createElementBlock(
                                        "div",
                                        _hoisted_13,
                                        _toDisplayString(fieldValue(item, col.key)),
                                        1
                                        /* TEXT */
                                      ))
                                    ],
                                    2
                                    /* CLASS */
                                  );
                                }),
                                128
                                /* KEYED_FRAGMENT */
                              ))
                            ])) : _createCommentVNode("v-if", true)
                          ])
                        ]),
                        right: _withCtx(() => [
                          hasActions.value ? (_openBlock(), _createElementBlock(
                            "div",
                            {
                              key: 0,
                              class: _normalizeClass(["hidden lg:flex items-center justify-end px-2 h-full shrink-0", [actionsClass.value, actionsCol.value?.rowClass || ""]]),
                              onClick: _cache[1] || (_cache[1] = _withModifiers(() => {
                              }, ["stop"]))
                            },
                            [
                              _renderSlot(_ctx.$slots, "actions", { item }, () => [
                                _renderSlot(_ctx.$slots, "action", { item }, () => [
                                  __props.actionOptions ? (_openBlock(), _createBlock(_component_UDropdownMenu, {
                                    key: 0,
                                    items: __props.actionOptions(item),
                                    popper: { placement: "bottom-end" }
                                  }, {
                                    default: _withCtx(() => [
                                      _createVNode(_component_UButton, {
                                        icon: "i-lucide-ellipsis-vertical",
                                        color: "neutral",
                                        variant: "ghost",
                                        size: "xs",
                                        "aria-label": mo.value
                                      }, null, 8, ["aria-label"])
                                    ]),
                                    _: 1
                                    /* STABLE */
                                  }, 8, ["items"])) : _createCommentVNode("v-if", true)
                                ])
                              ])
                            ],
                            2
                            /* CLASS */
                          )) : _createCommentVNode("v-if", true)
                        ]),
                        actions: _withCtx(({ close }) => [
                          _createElementVNode("div", _hoisted_14, [
                            _renderSlot(_ctx.$slots, "swipe-actions", {
                              item,
                              close
                            }, () => [
                              __props.swipeRightActions ? (_openBlock(true), _createElementBlock(
                                _Fragment,
                                { key: 0 },
                                _renderList(__props.swipeRightActions(item), (action, idx) => {
                                  return _openBlock(), _createBlock(_component_UButton, {
                                    key: idx,
                                    color: action.color || "primary",
                                    icon: action.icon,
                                    "aria-label": action.label || mo.value,
                                    variant: "solid",
                                    square: "",
                                    class: "h-full rounded-none",
                                    onClick: () => {
                                      action.click?.(item);
                                      close();
                                    }
                                  }, null, 8, ["color", "icon", "aria-label", "onClick"]);
                                }),
                                128
                                /* KEYED_FRAGMENT */
                              )) : _createCommentVNode("v-if", true)
                            ])
                          ])
                        ]),
                        _: 2
                        /* DYNAMIC */
                      }, [
                        isDraggable.value ? {
                          name: "left",
                          fn: _withCtx(() => []),
                          key: "0"
                        } : void 0
                      ]), 1032, ["id", "item", "open-id", "mobile-mode", "draggable", "class", "onClick", "onContextmenu"])
                    ]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                )),
                _createElementVNode(
                  "div",
                  {
                    class: _normalizeClass({ "col-span-full": currentViewMode.value === "grid" })
                  },
                  [
                    _renderSlot(_ctx.$slots, "last-item", {}, () => [
                      _cache[4] || (_cache[4] = _createElementVNode(
                        "div",
                        { class: "pb-16 md:pb-16" },
                        null,
                        -1
                        /* CACHED */
                      ))
                    ])
                  ],
                  2
                  /* CLASS */
                )
              ],
              2
              /* CLASS */
            )),
            (_openBlock(), _createBlock(_Teleport, { to: "body" }, [
              contextMenu.value.isOpen ? (_openBlock(), _createElementBlock(
                "div",
                {
                  key: 0,
                  class: "fixed w-1 h-1 z-9999 pointer-events-none",
                  style: _normalizeStyle({ top: `${contextMenu.value.y}px`, left: `${contextMenu.value.x}px` })
                },
                [
                  _createVNode(_component_UDropdownMenu, {
                    items: contextMenu.value.items,
                    open: true,
                    popper: { placement: "bottom-start" },
                    class: "pointer-events-auto",
                    "onUpdate:open": _cache[3] || (_cache[3] = (val) => !val && (contextMenu.value.isOpen = false))
                  }, {
                    default: _withCtx(() => [..._cache[5] || (_cache[5] = [
                      _createElementVNode(
                        "div",
                        null,
                        null,
                        -1
                        /* CACHED */
                      )
                    ])]),
                    _: 1
                    /* STABLE */
                  }, 8, ["items"])
                ],
                4
                /* STYLE */
              )) : _createCommentVNode("v-if", true)
            ]))
          ]),
          _: 3
          /* FORWARDED */
        }, 8, ["ui"])
      ]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

