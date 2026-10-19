// QA-only entry point (harness.html): renders the first-run screen with a
// seeded model store and no Tauri backend, so screenshots of the onboarding
// flow can be taken in a plain browser. Not part of the shipped app.
import React from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { applyTheme } from "./lib/utils/theme";
import { getLanguageDirection, updateDocumentDirection } from "./lib/utils/rtl";
import { useModelStore } from "./stores/modelStore";
import type { ModelInfo } from "./bindings";
import Onboarding from "./components/onboarding/Onboarding";

applyTheme("dark");

const localeModules = import.meta.glob<{
  default: Record<string, unknown>;
}>("./i18n/locales/*/translation.json", { eager: true });
const resources: Record<string, { translation: Record<string, unknown> }> = {};
for (const [path, module] of Object.entries(localeModules)) {
  const langCode = path.match(
    /\.\/i18n\/locales\/(.+)\/translation\.json/,
  )?.[1];
  if (langCode) resources[langCode] = { translation: module.default };
}

const params = new URLSearchParams(location.search);
const lang = params.get("lang") || "en";
const state = params.get("state") || "downloading";

i18n.use(initReactI18next).init({
  resources,
  lng: lang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});
updateDocumentDirection(getLanguageDirection(lang));

const base = (partial: Partial<ModelInfo>): ModelInfo => ({
  id: "",
  name: "",
  description: "",
  filename: "",
  source: { Url: { url: "", sha256: null } },
  size_mb: 0,
  is_downloaded: false,
  is_downloading: false,
  partial_size: 0,
  accuracy_score: 0,
  speed_score: 0,
  supports_translation: false,
  is_recommended: false,
  supported_languages: [],
  supports_language_selection: false,
  is_custom: false,
  supports_streaming: false,
  supports_language_detection: false,
  ...partial,
});

(window as unknown as { qaCalls: string[] }).qaCalls = [];
const ivrit = base({
  id: "ivrit-turbo",
  name: "Ivrit Turbo (Hebrew)",
  size_mb: 1549,
  is_recommended: true,
  is_downloaded: state === "installed" || state === "select-failed",
});
const lahjat = base({
  id: "lahjat-turbo",
  name: "Lahjat Turbo (Arabic)",
  size_mb: 574,
});

useModelStore.setState({
  models: state === "catalog-loading" ? [] : [ivrit, lahjat],
  loading: false,
  error: null,
  downloadModel: async (id: string) => {
    const w = window as unknown as { qaCalls: string[] };
    w.qaCalls.push(`download:${id}`);
    if (
      state === "failed" ||
      (state === "arabic-failed" && id === "lahjat-turbo")
    )
      return false;
    useModelStore.setState((s) => ({
      downloadingModels: { ...s.downloadingModels, [id]: true },
    }));
    return true;
  },
  selectModel: async (id: string) => {
    (window as unknown as { qaCalls: string[] }).qaCalls.push(`select:${id}`);
    return state !== "select-failed";
  },
  downloadProgress:
    state === "downloading"
      ? {
          "ivrit-turbo": {
            model_id: "ivrit-turbo",
            downloaded: 697_000_000,
            total: 1_549_000_000,
            percentage: 45,
          },
        }
      : {},
  downloadingModels: state === "downloading" ? { "ivrit-turbo": true } : {},
  verifyingModels: state === "verifying" ? { "ivrit-turbo": true } : {},
} as never);

(window as unknown as { qaFinish: () => void }).qaFinish = () => {
  useModelStore.setState({
    models: [{ ...ivrit, is_downloaded: true }, lahjat],
    downloadingModels: {},
    verifyingModels: {},
  });
};
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Onboarding
      onModelSelected={() => {
        (window as unknown as { qaCalls: string[] }).qaCalls.push("ready");
      }}
    />
  </React.StrictMode>,
);
