import { onScopeDispose, ref } from "vue";
function cannotInline(action) {
  return action.overflow === true || Boolean(action.children?.length);
}
function mobileActionLayout(actions, maxInline = 3) {
  const inline = [];
  const overflow = [];
  for (const action of actions.filter((a) => a.visible !== false)) {
    if (action.primary === true && !cannotInline(action) && inline.length < maxInline) inline.push(action);
    else overflow.push(action);
  }
  return { inline, overflow };
}
const store = { version: ref(0), actions: null, info: null };
function useMobileBar() {
  function registerActions(source) {
    store.actions = source;
    store.version.value++;
    onScopeDispose(() => {
      if (store.actions === source) {
        store.actions = null;
        store.version.value++;
      }
    });
  }
  function registerInfo(source) {
    store.info = source;
    store.version.value++;
    onScopeDispose(() => {
      if (store.info === source) {
        store.info = null;
        store.version.value++;
      }
    });
  }
  return { store, registerActions, registerInfo };
}
function headerActionsToMobile(actions) {
  return actions.filter((a) => a.visible !== false).map((a) => ({
    icon: a.icon,
    label: a.label,
    color: a.color,
    disabled: a.disabled,
    primary: a.primary,
    overflow: a.overflow,
    onSelect: a.onSelect,
    children: a.children?.length ? a.children.map((c) => ({ icon: c.icon, label: c.label, disabled: c.disabled, onSelect: c.onSelect })) : void 0
  }));
}
export {
  headerActionsToMobile,
  mobileActionLayout,
  useMobileBar
};

