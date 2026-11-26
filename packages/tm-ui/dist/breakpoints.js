import { computed } from "vue";
import { useBreakpoints, breakpointsTailwind } from "@vueuse/core";
function useDeviceBreakpoints() {
  const breakpoints = useBreakpoints(breakpointsTailwind);
  const isMobile = computed(() => breakpoints.smaller("md").value);
  const isTablet = computed(() => breakpoints.between("md", "lg").value);
  const isDesktop = computed(() => breakpoints.greaterOrEqual("lg").value);
  const isTouchDevice = computed(() => isMobile.value || isTablet.value);
  const deviceType = computed(() => {
    if (isMobile.value) return "MOBILE";
    if (isTablet.value) return "TABLET";
    return "DESKTOP";
  });
  return { isMobile, isTablet, isDesktop, isTouchDevice, deviceType };
}
export {
  useDeviceBreakpoints
};

