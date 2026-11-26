import { defineComponent as _defineComponent } from "vue";
import { resolveComponent as _resolveComponent, createVNode as _createVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, vModelText as _vModelText, withDirectives as _withDirectives, createTextVNode as _createTextVNode, normalizeStyle as _normalizeStyle, withModifiers as _withModifiers, normalizeClass as _normalizeClass } from "vue";
const _hoisted_1 = { class: "flex flex-col gap-4 flex-1 min-h-0" };
const _hoisted_2 = { class: "flex flex-col gap-3 sm:flex-row sm:items-center" };
const _hoisted_3 = { class: "flex flex-wrap gap-1.5" };
const _hoisted_4 = { class: "flex flex-wrap items-center gap-4 text-xs text-muted" };
const _hoisted_5 = { class: "flex items-center gap-2" };
const _hoisted_6 = { class: "w-8 font-mono" };
const _hoisted_7 = { class: "flex items-center gap-2" };
const _hoisted_8 = { key: 0 };
const _hoisted_9 = { class: "text-highlighted" };
const _hoisted_10 = { key: 1 };
const _hoisted_11 = { class: "text-highlighted" };
const _hoisted_12 = { class: "grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10" };
const _hoisted_13 = ["title", "onClick", "onDblclick"];
const _hoisted_14 = { class: "w-full truncate text-[9px] leading-tight text-muted group-hover:text-highlighted" };
const _hoisted_15 = {
  key: 0,
  class: "col-span-full flex justify-center py-6"
};
const _hoisted_16 = {
  key: 1,
  class: "col-span-full py-12 text-center text-sm text-muted"
};
const _hoisted_17 = { class: "mt-1 text-xs" };
const _hoisted_18 = {
  key: 2,
  class: "col-span-full py-3 text-center text-xs text-dimmed"
};
const _hoisted_19 = {
  key: 0,
  class: "space-y-3 rounded-xl border border-default p-4"
};
const _hoisted_20 = { class: "flex flex-wrap items-center justify-between gap-2" };
const _hoisted_21 = { class: "flex items-center gap-3" };
const _hoisted_22 = { class: "font-mono text-sm font-semibold text-highlighted" };
const _hoisted_23 = { class: "text-xs text-muted" };
const _hoisted_24 = { class: "space-y-2" };
const _hoisted_25 = { class: "text-xs font-semibold text-muted" };
const _hoisted_26 = { class: "grid gap-2 lg:grid-cols-3" };
const _hoisted_27 = { class: "flex items-center justify-between" };
const _hoisted_28 = { class: "text-xs text-muted" };
const _hoisted_29 = { class: "overflow-auto rounded-lg bg-default/50 p-2 font-mono text-[11px]" };
const _hoisted_30 = { class: "flex flex-wrap gap-2" };
import { computed, onMounted, ref, watch } from "vue";
import { useDebounceFn, useInfiniteScroll } from "@vueuse/core";
const __sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "UtilitiesIconsPanel",
  props: {
    t: { type: Function, required: true },
    fetchIcons: { type: Function, required: true },
    favorites: { type: Array, required: true },
    collections: { type: Array, required: false, default: () => [
      { label: "Lucide", value: "lucide" },
      { label: "Simple Icons", value: "simple-icons" }
    ] },
    pageSize: { type: Number, required: false, default: 100 }
  },
  emits: ["update:favorites", "copied", "copy-error"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const search = ref("");
    const collection = ref(props.collections[0]?.value ?? "lucide");
    const showFavorites = ref(false);
    const selected = ref("");
    const previewSize = ref(24);
    const previewColor = ref("#64748b");
    const icons = ref([]);
    const isFetching = ref(false);
    const hasMore = ref(false);
    const cursor = ref("");
    const scrollParent = ref(null);
    const isFavorite = (icon) => props.favorites.includes(icon);
    function toggleFavorite(icon) {
      const next = isFavorite(icon) ? props.favorites.filter((f) => f !== icon) : [...props.favorites, icon];
      emit("update:favorites", next);
    }
    const displayedIcons = computed(() => showFavorites.value ? props.favorites : icons.value);
    const shortName = (icon) => icon.replace(/^i-[a-z-]+-/, "");
    async function load(isLoadMore = false) {
      if (isFetching.value) return;
      isFetching.value = true;
      try {
        if (!isLoadMore) cursor.value = "";
        const page = await props.fetchIcons({
          search: search.value,
          collection: collection.value,
          cursor: cursor.value,
          limit: props.pageSize
        });
        if (isLoadMore) icons.value.push(...page.icons || []);
        else icons.value = page.icons || [];
        cursor.value = page.nextCursor || "";
        hasMore.value = page.hasMore;
      } catch {
      } finally {
        isFetching.value = false;
      }
    }
    const debouncedLoad = useDebounceFn(() => load(false), 500);
    useInfiniteScroll(
      scrollParent,
      () => {
        if (hasMore.value && !isFetching.value && !showFavorites.value) load(true);
      },
      { distance: 80 }
    );
    watch(collection, () => {
      search.value = "";
      load(false);
    });
    watch(search, () => {
      if (!showFavorites.value) debouncedLoad();
    });
    onMounted(() => load(false));
    const snippets = computed(() => {
      const name = selected.value;
      if (!name) return [];
      return [
        { label: props.t("utilities.icons.copyName"), code: name },
        { label: props.t("utilities.icons.copyVue"), code: `<UIcon name="${name}" />` },
        { label: props.t("utilities.icons.copyButton"), code: `<UButton icon="${name}" label="..." />` },
        { label: props.t("utilities.icons.copyClass"), code: `class="${name}"` },
        { label: props.t("utilities.icons.copyClass"), code: `icon="${name}"` }
      ];
    });
    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        emit("copied", text);
      } catch (error) {
        emit("copy-error", error);
      }
    }
    const copyName = (icon) => copyText(icon);
    return (_ctx, _cache) => {
      const _component_UInput = _resolveComponent("UInput");
      const _component_UButton = _resolveComponent("UButton");
      const _component_USlider = _resolveComponent("USlider");
      const _component_UIcon = _resolveComponent("UIcon");
      return _openBlock(), _createElementBlock("div", _hoisted_1, [
        _createElementVNode("div", _hoisted_2, [
          _createVNode(_component_UInput, {
            modelValue: search.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => search.value = $event),
            placeholder: __props.t("utilities.icons.searchPlaceholder"),
            icon: "i-lucide-search",
            class: "flex-1",
            loading: isFetching.value
          }, null, 8, ["modelValue", "placeholder", "loading"]),
          _createElementVNode("div", _hoisted_3, [
            (_openBlock(true), _createElementBlock(
              _Fragment,
              null,
              _renderList(__props.collections, (c) => {
                return _openBlock(), _createBlock(_component_UButton, {
                  key: c.value,
                  label: c.label,
                  size: "xs",
                  color: collection.value === c.value ? "primary" : "neutral",
                  variant: "soft",
                  onClick: ($event) => collection.value = c.value
                }, null, 8, ["label", "color", "onClick"]);
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            showFavorites.value ? (_openBlock(), _createBlock(_component_UButton, {
              key: 0,
              label: __props.t("utilities.icons.favorites"),
              icon: "i-lucide-star",
              size: "xs",
              color: "warning",
              variant: "soft",
              onClick: _cache[1] || (_cache[1] = ($event) => showFavorites.value = false)
            }, null, 8, ["label"])) : (_openBlock(), _createBlock(_component_UButton, {
              key: 1,
              label: `${__props.t("utilities.icons.favorites")} (${__props.favorites.length})`,
              icon: "i-lucide-star",
              size: "xs",
              color: "neutral",
              variant: "soft",
              onClick: _cache[2] || (_cache[2] = ($event) => showFavorites.value = true)
            }, null, 8, ["label"]))
          ])
        ]),
        _createElementVNode("div", _hoisted_4, [
          _createElementVNode("div", _hoisted_5, [
            _createElementVNode(
              "span",
              null,
              _toDisplayString(__props.t("utilities.icons.size")),
              1
              /* TEXT */
            ),
            _createVNode(_component_USlider, {
              modelValue: previewSize.value,
              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => previewSize.value = $event),
              min: 16,
              max: 48,
              class: "w-28"
            }, null, 8, ["modelValue"]),
            _createElementVNode(
              "span",
              _hoisted_6,
              _toDisplayString(previewSize.value),
              1
              /* TEXT */
            )
          ]),
          _createElementVNode("div", _hoisted_7, [
            _createElementVNode(
              "span",
              null,
              _toDisplayString(__props.t("utilities.icons.color")),
              1
              /* TEXT */
            ),
            _withDirectives(_createElementVNode(
              "input",
              {
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => previewColor.value = $event),
                type: "color",
                class: "h-6 w-8 cursor-pointer rounded border border-default bg-transparent"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [_vModelText, previewColor.value]
            ])
          ]),
          !showFavorites.value ? (_openBlock(), _createElementBlock("span", _hoisted_8, [
            _createElementVNode(
              "b",
              _hoisted_9,
              _toDisplayString(icons.value.length),
              1
              /* TEXT */
            ),
            _createTextVNode(
              " " + _toDisplayString(__props.t("utilities.icons.iconCount")),
              1
              /* TEXT */
            )
          ])) : (_openBlock(), _createElementBlock("span", _hoisted_10, [
            _createElementVNode(
              "b",
              _hoisted_11,
              _toDisplayString(__props.favorites.length),
              1
              /* TEXT */
            ),
            _createTextVNode(
              " " + _toDisplayString(__props.t("utilities.icons.iconCount")),
              1
              /* TEXT */
            )
          ]))
        ]),
        _createElementVNode(
          "div",
          {
            ref_key: "scrollParent",
            ref: scrollParent,
            class: "flex-1 min-h-0 overflow-y-auto rounded-xl border border-default p-3"
          },
          [
            _createElementVNode("div", _hoisted_12, [
              (_openBlock(true), _createElementBlock(
                _Fragment,
                null,
                _renderList(displayedIcons.value, (icon) => {
                  return _openBlock(), _createElementBlock("button", {
                    key: icon,
                    type: "button",
                    class: _normalizeClass(["group relative flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-transparent p-2 transition-all hover:border-primary/40 hover:bg-elevated", { "border-primary bg-primary/10": selected.value === icon }]),
                    title: icon,
                    onClick: ($event) => selected.value = icon,
                    onDblclick: ($event) => copyName(icon)
                  }, [
                    _createVNode(_component_UIcon, {
                      name: icon,
                      style: _normalizeStyle({ width: previewSize.value + "px", height: previewSize.value + "px", color: previewColor.value })
                    }, null, 8, ["name", "style"]),
                    _createElementVNode(
                      "span",
                      _hoisted_14,
                      _toDisplayString(shortName(icon)),
                      1
                      /* TEXT */
                    ),
                    _createVNode(_component_UButton, {
                      icon: isFavorite(icon) ? "i-lucide-star" : "i-lucide-star-off",
                      size: "xs",
                      color: "warning",
                      variant: "ghost",
                      class: "absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100",
                      "aria-label": isFavorite(icon) ? __props.t("utilities.icons.removeFromFavorites") : __props.t("utilities.icons.addToFavorites"),
                      onClick: _withModifiers(($event) => toggleFavorite(icon), ["stop"])
                    }, null, 8, ["icon", "aria-label", "onClick"])
                  ], 42, _hoisted_13);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            isFetching.value ? (_openBlock(), _createElementBlock("div", _hoisted_15, [
              _createVNode(_component_UIcon, {
                name: "i-lucide-loader-2",
                class: "h-6 w-6 animate-spin text-primary"
              })
            ])) : !displayedIcons.value.length ? (_openBlock(), _createElementBlock("div", _hoisted_16, [
              showFavorites.value ? (_openBlock(), _createElementBlock(
                _Fragment,
                { key: 0 },
                [
                  _createTextVNode(
                    _toDisplayString(__props.t("utilities.icons.noIconsFound")),
                    1
                    /* TEXT */
                  )
                ],
                64
                /* STABLE_FRAGMENT */
              )) : (_openBlock(), _createElementBlock(
                _Fragment,
                { key: 1 },
                [
                  _createElementVNode(
                    "p",
                    null,
                    _toDisplayString(__props.t("utilities.icons.noIconsFound")),
                    1
                    /* TEXT */
                  ),
                  _createElementVNode(
                    "p",
                    _hoisted_17,
                    _toDisplayString(__props.t("utilities.icons.tryAnotherQuery")),
                    1
                    /* TEXT */
                  )
                ],
                64
                /* STABLE_FRAGMENT */
              ))
            ])) : !hasMore.value && !showFavorites.value ? (_openBlock(), _createElementBlock(
              "div",
              _hoisted_18,
              _toDisplayString(__props.t("utilities.icons.loading")),
              1
              /* TEXT */
            )) : _createCommentVNode("v-if", true)
          ],
          512
          /* NEED_PATCH */
        ),
        selected.value ? (_openBlock(), _createElementBlock("div", _hoisted_19, [
          _createElementVNode("div", _hoisted_20, [
            _createElementVNode("div", _hoisted_21, [
              _createVNode(_component_UIcon, {
                name: selected.value,
                style: _normalizeStyle({ width: "32px", height: "32px", color: previewColor.value })
              }, null, 8, ["name", "style"]),
              _createElementVNode("div", null, [
                _createElementVNode(
                  "div",
                  _hoisted_22,
                  _toDisplayString(selected.value),
                  1
                  /* TEXT */
                ),
                _createElementVNode(
                  "div",
                  _hoisted_23,
                  _toDisplayString(__props.t("utilities.icons.previewDetails")),
                  1
                  /* TEXT */
                )
              ])
            ]),
            _createVNode(_component_UButton, {
              label: __props.t("utilities.icons.addToFavorites"),
              icon: "i-lucide-star",
              size: "xs",
              color: "warning",
              variant: "soft",
              onClick: _cache[5] || (_cache[5] = ($event) => toggleFavorite(selected.value))
            }, null, 8, ["label"])
          ]),
          _createElementVNode("div", _hoisted_24, [
            _createElementVNode(
              "div",
              _hoisted_25,
              _toDisplayString(__props.t("utilities.icons.snippets")),
              1
              /* TEXT */
            ),
            _createElementVNode("div", _hoisted_26, [
              (_openBlock(true), _createElementBlock(
                _Fragment,
                null,
                _renderList(snippets.value, (snip) => {
                  return _openBlock(), _createElementBlock("div", {
                    key: snip.code,
                    class: "space-y-1"
                  }, [
                    _createElementVNode("div", _hoisted_27, [
                      _createElementVNode(
                        "span",
                        _hoisted_28,
                        _toDisplayString(snip.label),
                        1
                        /* TEXT */
                      ),
                      _createVNode(_component_UButton, {
                        icon: "i-lucide-copy",
                        size: "xs",
                        color: "neutral",
                        variant: "ghost",
                        onClick: ($event) => copyText(snip.code)
                      }, null, 8, ["onClick"])
                    ]),
                    _createElementVNode(
                      "pre",
                      _hoisted_29,
                      _toDisplayString(snip.code),
                      1
                      /* TEXT */
                    )
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ]),
          _createElementVNode("div", _hoisted_30, [
            _createVNode(_component_UButton, {
              label: __props.t("utilities.icons.copyName"),
              icon: "i-lucide-tag",
              size: "xs",
              color: "neutral",
              variant: "soft",
              onClick: _cache[6] || (_cache[6] = ($event) => copyName(selected.value))
            }, null, 8, ["label"])
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

