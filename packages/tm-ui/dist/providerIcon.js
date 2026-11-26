const EXACT = {
  openai: "i-simple-icons-openai",
  anthropic: "i-simple-icons-anthropic",
  google_ai: "i-simple-icons-google",
  openrouter: "i-simple-icons-openrouter",
  nvidia: "i-simple-icons-nvidia",
  amd_radeon: "i-simple-icons-amd",
  deepseek: "i-simple-icons-deepseek",
  mistral: "i-simple-icons-mistralai",
  github_models: "i-simple-icons-github",
  huggingface: "i-lucide-boxes",
  zhipu: "i-lucide-sparkles",
  ollama: "i-simple-icons-ollama",
  freellmapi: "i-lucide-route",
  opencode: "i-lucide-terminal",
  custom_openai: "i-lucide-plug",
  custom: "i-lucide-bot"
};
function providerIconFor(provider) {
  const p = (provider || "").toLowerCase();
  if (EXACT[p]) return EXACT[p];
  if (p.includes("openai")) return "i-simple-icons-openai";
  if (p.includes("anthropic")) return "i-simple-icons-anthropic";
  if (p.includes("google")) return "i-simple-icons-google";
  if (p.includes("groq")) return "i-lucide-zap";
  if (p.includes("deepseek")) return "i-simple-icons-deepseek";
  if (p.includes("mistral")) return "i-simple-icons-mistralai";
  if (p.includes("ollama")) return "i-simple-icons-ollama";
  if (p.includes("router")) return "i-lucide-route";
  return "i-lucide-bot";
}
export {
  providerIconFor
};

