import { defineComponent as _defineComponent } from "vue";
import { renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, resolveComponent as _resolveComponent, createVNode as _createVNode, normalizeStyle as _normalizeStyle, createElementVNode as _createElementVNode, createCommentVNode as _createCommentVNode, withModifiers as _withModifiers, normalizeClass as _normalizeClass, renderSlot as _renderSlot, createBlock as _createBlock, toDisplayString as _toDisplayString, withKeys as _withKeys, unref as _unref, withCtx as _withCtx, vShow as _vShow, withDirectives as _withDirectives } from "vue";
const _hoisted_1 = { class: "tree-menu" };
const _hoisted_2 = {
  key: 0,
  class: "space-y-2 py-2"
};
const _hoisted_3 = ["tabindex", "onClick", "onKeydown", "onContextmenu"];
const _hoisted_4 = { class: "flex items-center gap-2" };
const _hoisted_5 = ["tabindex", "onClick", "onKeydown"];
const _hoisted_6 = { class: "flex flex-col" };
const _hoisted_7 = { class: "text-sm font-medium text-gray-700 dark:text-gray-200 truncate block" };
const _hoisted_8 = { class: "flex items-center gap-1" };
const _hoisted_9 = ["onClick"];
const _hoisted_10 = {
  key: 0,
  class: "block lg:hidden px-3 pb-3 -mt-1 ml-10 sm:ml-12 border-t border-gray-100 dark:border-gray-800/10 pt-2"
};
import { computed, ref, watch, nextTick } from "vue";
import { Draggable } from "@he-tree/vue";
const dragTriggerClass = "tree-drag-handle";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "HeTreeMenu",
  props: {
    modelValue: { type: Array, required: false, default: () => [] },
    fieldNames: { type: Object, required: false, default: () => ({ id: "id", label: "label", children: "children" }) },
    selectedKeys: { type: [Set, Array], required: false, default: () => [] },
    classNode: { type: String, required: false, default: "" },
    defaultIcon: { type: String, required: false, default: void 0 },
    hideIcon: { type: Boolean, required: false, default: false },
    defaultExpandAll: { type: Boolean, required: false, default: false },
    expandedIds: { type: Array, required: false, default: () => [] },
    draggable: { type: Boolean, required: false, default: true },
    cardClickable: { type: Boolean, required: false, default: false },
    hideCheckbox: { type: Boolean, required: false, default: false },
    hideCardKeyboard: { type: Boolean, required: false, default: false },
    actionOptions: { type: Function, required: false, default: void 0 }
  },
  emits: ["update:modelValue", "node:click", "node:toggle", "node:select", "node:drop", "node:after-drop", "update:expandedIds"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const treeRef = ref(null);
    const isLoading = ref(false);
    let expansionTimerId = null;
    function clearExpansionTimers() {
      if (expansionTimerId) {
        clearTimeout(expansionTimerId);
        expansionTimerId = null;
      }
    }
    function treeApi() {
      return treeRef.value ?? null;
    }
    function normalizeId(id) {
      if (!id) return "";
      if (typeof id === "object") {
        const record = id;
        if (record.$oid) return String(record.$oid);
        const fallback = record._id ?? record.id;
        if (typeof fallback === "string" || typeof fallback === "number") return fallback;
        return JSON.stringify(id);
      }
      if (typeof id === "number") return id;
      return String(id);
    }
    const openNodeIds = ref(new Set((props.expandedIds || []).map((id) => normalizeId(id))));
    const isAllExpanded = ref(props.defaultExpandAll);
    const treeData = computed({
      get: () => props.modelValue,
      set: (val) => emit("update:modelValue", val)
    });
    const nodeId = (node) => normalizeId(node[props.fieldNames.id]);
    const getNodeKey = (stat) => nodeId(stat.data);
    function isSelected(node) {
      const id = nodeId(node);
      const keys = props.selectedKeys;
      if (keys instanceof Set) return keys.has(id);
      return keys.some((key) => normalizeId(key) === id);
    }
    const getLabel = (node) => node[props.fieldNames.label];
    function hasChildren(node) {
      if (node.hasChildren === true) return true;
      const children = node[props.fieldNames.children];
      return Array.isArray(children) && children.length > 0;
    }
    const getIconName = (node) => {
      const icon = node.icon;
      return typeof icon === "string" ? icon : props.defaultIcon;
    };
    const contextMenu = ref({
      isOpen: false,
      x: 0,
      y: 0,
      items: []
    });
    function handleContextMenu(node, event) {
      if (!props.actionOptions) return;
      contextMenu.value = {
        isOpen: true,
        x: event.clientX,
        y: event.clientY,
        items: props.actionOptions(node)
      };
    }
    function syncStatsToOpenIds() {
      const stats = treeApi()?.stats;
      if (!stats) return;
      const newSet = /* @__PURE__ */ new Set();
      for (const stat of Object.values(stats)) {
        if (!stat?.open) continue;
        const id = nodeId(stat.data);
        if (id !== "") newSet.add(id);
      }
      openNodeIds.value = newSet;
      emit("update:expandedIds", Array.from(newSet));
    }
    function toggleNode(node, stat) {
      if (!stat) return;
      stat.open = !stat.open;
      syncStatsToOpenIds();
      emit("node:toggle", { node, isOpen: stat.open });
    }
    function onSelect(node, selected) {
      emit("node:select", { node, isSelected: selected });
    }
    function onNodeClick(node) {
      emit("node:click", node);
    }
    function onDrop(store) {
      emit("node:drop", store);
    }
    function onAfterDrop(store) {
      emit("node:after-drop", store);
    }
    function applyOpenStates(stats) {
      let changed = false;
      for (const stat of Object.values(stats)) {
        if (!stat) continue;
        const id = nodeId(stat.data);
        const shouldBeOpen = props.defaultExpandAll || id !== "" && openNodeIds.value.has(id);
        if (shouldBeOpen && !stat.open) {
          stat.open = true;
          changed = true;
        }
      }
      return changed;
    }
    function restoreOpenStates() {
      const stats = treeApi()?.stats;
      if (!stats) return;
      applyOpenStates(stats);
      clearExpansionTimers();
      const nextPass = (depth = 0) => {
        if (depth > 12) return;
        expansionTimerId = setTimeout(() => {
          const current = treeApi()?.stats;
          const changed = current ? applyOpenStates(current) : false;
          const shouldContinue = changed || props.defaultExpandAll && depth < 8;
          if (shouldContinue) {
            nextPass(depth + 1);
          } else if (props.defaultExpandAll) {
            isAllExpanded.value = true;
            syncStatsToOpenIds();
          }
        }, 80);
      };
      nextPass();
    }
    watch(() => props.modelValue, async (newVal) => {
      if (!newVal) {
        isLoading.value = true;
        return;
      }
      isLoading.value = false;
      await nextTick();
      clearExpansionTimers();
      expansionTimerId = setTimeout(() => {
        restoreOpenStates();
      }, 100);
    }, { immediate: true, deep: false });
    watch(() => props.defaultExpandAll, (newVal) => {
      if (newVal) restoreOpenStates();
    });
    watch(() => props.expandedIds, (newVal) => {
      if (props.defaultExpandAll) return;
      const normalizedNew = new Set((newVal || []).map((id) => normalizeId(id)));
      const sameSize = normalizedNew.size === openNodeIds.value.size;
      const identical = sameSize && [...normalizedNew].every((id) => openNodeIds.value.has(id));
      if (!identical) {
        openNodeIds.value = normalizedNew;
        restoreOpenStates();
      }
    }, { deep: true });
    function setAllOpen(open) {
      const stats = treeApi()?.stats;
      if (!stats) return;
      for (const stat of Object.values(stats)) {
        if (stat) stat.open = open;
      }
      isAllExpanded.value = open;
      syncStatsToOpenIds();
    }
    const expandAll = () => setAllOpen(true);
    const collapseAll = () => setAllOpen(false);
    const toggleAll = () => {
      setAllOpen(!isAllExpanded.value);
    };
    function openNode(key) {
      const stat = treeApi()?.stats?.[String(key)];
      if (stat) stat.open = true;
    }
    __expose({
      expandAll,
      collapseAll,
      toggleAll,
      isAllExpanded,
      openNode
    });
    return (_ctx, _cache) => {
      const _component_USkeleton = _resolveComponent("USkeleton");
      const _component_UIcon = _resolveComponent("UIcon");
      const _component_UCheckbox = _resolveComponent("UCheckbox");
      const _component_UDropdownMenu = _resolveComponent("UDropdownMenu");
      return _openBlock(), _createElementBlock("div", _hoisted_1, [
        isLoading.value ? (_openBlock(), _createElementBlock("div", _hoisted_2, [
          (_openBlock(), _createElementBlock(
            _Fragment,
            null,
            _renderList(5, (i) => {
              return _createElementVNode("div", {
                key: i,
                class: "flex items-center gap-2 px-3"
              }, [
                _createVNode(_component_USkeleton, { class: "h-4 w-4 rounded-full" }),
                _createVNode(_component_USkeleton, { class: "h-4 w-4 rounded" }),
                _createVNode(_component_USkeleton, {
                  class: "h-4 rounded",
                  style: _normalizeStyle({ width: Math.floor(Math.random() * 40 + 30) + "%" })
                }, null, 8, ["style"])
              ]);
            }),
            64
            /* STABLE_FRAGMENT */
          ))
        ])) : _createCommentVNode("v-if", true),
        _withDirectives(_createElementVNode(
          "div",
          null,
          [
            _createVNode(_unref(Draggable), {
              ref_key: "treeRef",
              ref: treeRef,
              modelValue: treeData.value,
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => treeData.value = $event),
              "children-key": __props.fieldNames.children,
              "node-key": getNodeKey,
              "default-open": __props.defaultExpandAll,
              class: "he-tree-root",
              "trigger-class": dragTriggerClass,
              "tree-line": "",
              onDrop,
              onAfterDrop
            }, {
              default: _withCtx(({ node, stat }) => [
                _createElementVNode("div", {
                  class: _normalizeClass(["group flex flex-col mb-2 py-2 px-3 rounded-lg border border-gray-300/50 dark:border-gray-700/50 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm shadow-xs transition-all hover:bg-white/60 dark:hover:bg-gray-800/60 hover:shadow-md hover:border-primary-500/50", [__props.classNode, { "bg-blue-50/50! dark:bg-sky-300/20! border-sky-500/50 dark:border-sky-800/50": isSelected(node), "cursor-pointer": __props.cardClickable }]]),
                  tabindex: __props.cardClickable && !__props.hideCardKeyboard ? 0 : void 0,
                  onClick: ($event) => __props.cardClickable && onNodeClick(node),
                  onKeydown: [
                    _withKeys(_withModifiers(($event) => __props.cardClickable && onNodeClick(node), ["self", "prevent"]), ["enter"]),
                    _withKeys(_withModifiers(($event) => __props.cardClickable && onNodeClick(node), ["self", "prevent"]), ["space"])
                  ],
                  onContextmenu: _withModifiers(($event) => handleContextMenu(node, $event), ["prevent"])
                }, [
                  _createElementVNode("div", _hoisted_4, [
                    __props.draggable ? (_openBlock(), _createElementBlock("div", {
                      key: 0,
                      class: _normalizeClass([dragTriggerClass, "flex cursor-move p-1 text-gray-400 opacity-50 group-hover:opacity-100"]),
                      onClick: _cache[0] || (_cache[0] = _withModifiers(() => {
                      }, ["stop"]))
                    }, [
                      _createVNode(_component_UIcon, {
                        name: "i-lucide-grip-vertical",
                        class: "w-4 h-4"
                      })
                    ])) : _createCommentVNode("v-if", true),
                    !__props.hideCheckbox ? (_openBlock(), _createElementBlock("div", {
                      key: 1,
                      class: "flex items-center p-1",
                      onClick: _cache[1] || (_cache[1] = _withModifiers(() => {
                      }, ["stop"]))
                    }, [
                      _createVNode(_component_UCheckbox, {
                        "model-value": isSelected(node),
                        "onUpdate:modelValue": (val) => onSelect(node, val === true)
                      }, null, 8, ["model-value", "onUpdate:modelValue"])
                    ])) : _createCommentVNode("v-if", true),
                    !__props.hideIcon ? _renderSlot(_ctx.$slots, "icon", {
                      node,
                      stat
                    }, () => [
                      getIconName(node) ? (_openBlock(), _createBlock(_component_UIcon, {
                        key: 0,
                        name: getIconName(node) ?? "",
                        class: "w-4 h-4 text-gray-500 dark:text-gray-400"
                      }, null, 8, ["name"])) : _createCommentVNode("v-if", true)
                    ], void 0, 2) : _createCommentVNode("v-if", true),
                    _createElementVNode("div", {
                      class: _normalizeClass(["flex-1 min-w-0 select-none", { "cursor-pointer": !__props.cardClickable }]),
                      tabindex: !__props.cardClickable && !__props.hideCardKeyboard ? 0 : void 0,
                      onClick: ($event) => !__props.cardClickable && onNodeClick(node),
                      onKeydown: [
                        _withKeys(_withModifiers(($event) => !__props.cardClickable && onNodeClick(node), ["self", "prevent"]), ["enter"]),
                        _withKeys(_withModifiers(($event) => !__props.cardClickable && onNodeClick(node), ["self", "prevent"]), ["space"])
                      ]
                    }, [
                      _createElementVNode("div", _hoisted_6, [
                        _renderSlot(_ctx.$slots, "title", {
                          node,
                          stat
                        }, () => [
                          _createElementVNode(
                            "span",
                            _hoisted_7,
                            _toDisplayString(getLabel(node)),
                            1
                            /* TEXT */
                          )
                        ]),
                        _renderSlot(_ctx.$slots, "description", {
                          node,
                          stat
                        })
                      ])
                    ], 42, _hoisted_5),
                    _createElementVNode("div", _hoisted_8, [
                      _renderSlot(_ctx.$slots, "right-text", {
                        node,
                        stat
                      }),
                      _createElementVNode("button", {
                        type: "button",
                        class: _normalizeClass(["flex items-center justify-center w-5 h-5 mr-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none", { "invisible pointer-events-none": !hasChildren(node) }]),
                        onClick: _withModifiers(($event) => toggleNode(node, stat), ["stop"])
                      }, [
                        _createVNode(_component_UIcon, {
                          name: "i-lucide-chevron-right",
                          class: _normalizeClass(["text-gray-500 transition-transform duration-200", { "rotate-90": stat.open }])
                        }, null, 8, ["class"])
                      ], 10, _hoisted_9),
                      _renderSlot(_ctx.$slots, "actions", {
                        node,
                        stat
                      })
                    ])
                  ]),
                  _createCommentVNode(" Mobile Extra Slot (Visible only on mobile) "),
                  _ctx.$slots["mobile-extra"] ? (_openBlock(), _createElementBlock("div", _hoisted_10, [
                    _renderSlot(_ctx.$slots, "mobile-extra", {
                      node,
                      stat
                    })
                  ])) : _createCommentVNode("v-if", true)
                ], 42, _hoisted_3)
              ]),
              _: 3
              /* FORWARDED */
            }, 8, ["modelValue", "children-key", "default-open"]),
            _renderSlot(_ctx.$slots, "last-item", {}, () => [
              _cache[4] || (_cache[4] = _createElementVNode(
                "div",
                { class: "pb-20 md:pb-16" },
                null,
                -1
                /* CACHED */
              ))
            ])
          ],
          512
          /* NEED_PATCH */
        ), [
          [_vShow, !isLoading.value]
        ]),
        _createCommentVNode(" Global Context Menu (Virtual) "),
        contextMenu.value.isOpen ? (_openBlock(), _createElementBlock(
          "div",
          {
            key: 1,
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
      ]);
    };
  }
});
var stdin_default = __sfc_main;
export {
  stdin_default as default
};

