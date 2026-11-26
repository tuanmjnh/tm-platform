import { computed } from "vue";
import { useStorage } from "@vueuse/core";
function useAdminGridView(componentKey, defaultMode = "list") {
  const store = useStorage("admin-view-modes-storage", {
    default: "list"
  });
  const viewMode = computed({
    get: () => store.value[componentKey] || store.value.default || defaultMode,
    set: (val) => {
      store.value = { ...store.value, [componentKey]: val };
    }
  });
  return {
    viewMode,
    toggleViewMode: () => {
      viewMode.value = viewMode.value === "list" ? "grid" : "list";
    },
    setViewMode: (mode) => {
      viewMode.value = mode;
    },
    setGlobalDefault: (mode) => {
      store.value = { ...store.value, default: mode };
    },
    isGrid: computed(() => viewMode.value === "grid"),
    isList: computed(() => viewMode.value === "list")
  };
}
export {
  useAdminGridView
};

