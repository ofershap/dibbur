// QA-only entry point (harness.html): renders real app screens with seeded
// stores and no Tauri backend, so screenshots can be taken in a plain browser.
// Not part of the shipped app.
//   ?view=onboarding (default) &state=... &lang=... — first-run model flow
//   ?view=settings   &section=general|models|...   — settings window
//   ?view=overlay    &ostate=recording|transcribing — recording overlay pill
//   &theme=light|dark (default dark)
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
import {
  Sidebar,
  SECTIONS_CONFIG,
  type SidebarSection,
} from "./components/Sidebar";
import RecordingOverlay from "./overlay/RecordingOverlay";
import { useSettingsStore } from "./stores/settingsStore";

const qaEmit = (
  window as unknown as { __qaEmit: (event: string, payload: unknown) => void }
).__qaEmit;

const qaParams = new URLSearchParams(location.search);
const qaTheme = qaParams.get("theme") === "light" ? "light" : "dark";
applyTheme(qaTheme);

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
const view = params.get("view") || "onboarding";

if (view === "settings") {
  // Seed the settings store so the real settings sections render their
  // populated state (toggles on, selectors filled).
  useSettingsStore.setState({
    settings: {
      always_on_microphone: true,
      audio_feedback: true,
      mute_while_recording: true,
      selected_language: "auto",
      translate_to_english: false,
      overlay_position: "bottom",
      selected_microphone: "Default",
      selected_output_device: "Default",
      theme: qaTheme,
      app_language: lang,
    } as never,
    isLoading: false,
  } as never);

  const SettingsPreview: React.FC = () => {
    const initial = (params.get("section") || "general") as SidebarSection;
    const [section, setSection] = React.useState<SidebarSection>(
      SECTIONS_CONFIG[initial] ? initial : "general",
    );
    const ActiveComponent =
      SECTIONS_CONFIG[section]?.component || SECTIONS_CONFIG.general.component;
    return (
      <div
        dir={getLanguageDirection(lang)}
        className="h-screen flex flex-col select-none cursor-default"
      >
        <div className="flex-1 flex overflow-hidden">
          <Sidebar activeSection={section} onSectionChange={setSection} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col items-center p-4 gap-4">
                <ActiveComponent />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <SettingsPreview />
    </React.StrictMode>,
  );
} else if (view === "overlay") {
  // Drive the real overlay through its Tauri events: show it, mark the mic
  // ready, then feed waveform levels so the accent-colored bars render.
  document.body.style.background = "#6b6b6b";
  const ostate = params.get("ostate") || "recording";
  setTimeout(() => {
    qaEmit(
      "show-overlay",
      ostate === "transcribing" ? "transcribing" : "recording",
    );
    qaEmit("recording-ready", null);
    if (ostate !== "transcribing") {
      let t = 0;
      setInterval(() => {
        t += 0.35;
        qaEmit(
          "mic-level",
          Array.from({ length: 16 }, (_, i) =>
            Math.min(1, 0.25 + 0.6 * Math.abs(Math.sin(t + i * 0.7))),
          ),
        );
      }, 120);
    }
  }, 400);

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <RecordingOverlay />
    </React.StrictMode>,
  );
} else {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Onboarding
        onModelSelected={() => {
          (window as unknown as { qaCalls: string[] }).qaCalls.push("ready");
        }}
      />
    </React.StrictMode>,
  );
}
