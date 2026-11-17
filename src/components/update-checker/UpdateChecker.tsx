import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { invoke } from "@tauri-apps/api/core";
import { BackgroundUpdater, type UpdateState } from "./backgroundUpdater";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { arch, platform } from "@tauri-apps/plugin-os";
import { ProgressBar } from "../shared";
import { useSettings } from "../../hooks/useSettings";
import { commands } from "../../bindings";
import {
  resolvePortableInstallerUrl,
  PORTABLE_RELEASES_URL,
} from "./portableInstaller";

interface UpdateCheckerProps {
  className?: string;
}

const UpdateChecker: React.FC<UpdateCheckerProps> = ({ className = "" }) => {
  const { t } = useTranslation();
  const [state, setState] = useState<UpdateState>({
    phase: "idle",
    progress: 0,
  });
  const [showPortableUpdateDialog, setShowPortableUpdateDialog] =
    useState(false);
  const { settings, isLoading, updateChecksLocked } = useSettings();
  const settingsLoaded =
    !isLoading && settings !== null && updateChecksLocked !== null;
  const updateChecksEnabled =
    (settings?.update_checks_enabled ?? false) && updateChecksLocked === false;
  const updaterRef = useRef<BackgroundUpdater>();
  if (!updaterRef.current) {
    updaterRef.current = new BackgroundUpdater(
      {
        check: () => check({ timeout: 30000 }),
        isPortable: commands.isPortable,
        beginInstall: () => invoke<boolean>("begin_app_update"),
        endInstall: () => invoke<void>("end_app_update"),
        relaunch,
      },
      setState,
    );
  }
  useEffect(() => {
    const updater = updaterRef.current!;
    if (!settingsLoaded || !updateChecksEnabled) {
      updater.stop();
      return;
    }
    updater.start();
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    listen("check-for-updates", () => {
      void updater.check();
    })
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      })
      .catch(console.error);
    return () => {
      cancelled = true;
      unlisten?.();
      updater.stop();
    };
  }, [settingsLoaded, updateChecksEnabled]);

  const isInstalling =
    state.phase === "downloading" || state.phase === "installing";
  const downloadProgress = state.progress;
  const portableInstallerUrl = resolvePortableInstallerUrl(
    state.rawJson,
    platform(),
    arch(),
  );
  const isUpdateDisabled =
    !settingsLoaded ||
    !updateChecksEnabled ||
    state.phase === "checking" ||
    isInstalling;
  const isUpdateClickable = !isUpdateDisabled;
  const updateAvailable = ["ready", "busy", "portable"].includes(state.phase);
  const getUpdateStatusText = () => {
    if (!updateChecksEnabled) return t("footer.updateCheckingDisabled");
    switch (state.phase) {
      case "checking":
        return t("footer.checkingUpdates");
      case "downloading":
        return downloadProgress > 0
          ? t("footer.downloading", { progress: downloadProgress })
          : t("footer.preparing");
      case "installing":
        return t("footer.installing");
      case "ready":
        return t("footer.restartToUpdate");
      case "busy":
        return t("footer.finishDictationToUpdate");
      case "portable":
        return t("footer.updateAvailableShort");
      case "error":
        return t("footer.retryUpdate");
      default:
        return t("footer.checkForUpdates");
    }
  };
  const getUpdateStatusAction = () => {
    if (isUpdateDisabled) return undefined;
    if (state.phase === "portable")
      return () => setShowPortableUpdateDialog(true);
    if (state.phase === "ready" || state.phase === "busy")
      return () => {
        void updaterRef.current!.install();
      };
    return () => {
      void updaterRef.current!.check();
    };
  };

  // When no installer could be resolved for this target the button falls back to
  // the releases index, so the dialog has to say "browse" rather than "download".
  const hasDirectInstaller = portableInstallerUrl !== PORTABLE_RELEASES_URL;

  return (
    <>
      {showPortableUpdateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-mid-gray/20 rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h2 className="text-base font-semibold">
              {t("footer.portableUpdateTitle")}
            </h2>
            <p className="text-sm text-text/70">
              {hasDirectInstaller
                ? t("footer.portableUpdateMessage")
                : t("footer.portableUpdateBrowseMessage")}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-3 py-1.5 text-sm rounded border border-mid-gray/20 hover:bg-mid-gray/10 transition-colors"
                onClick={() => setShowPortableUpdateDialog(false)}
              >
                {t("common.close")}
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded bg-logo-primary text-white hover:bg-logo-primary/80 transition-colors"
                onClick={() => {
                  openUrl(portableInstallerUrl);
                  setShowPortableUpdateDialog(false);
                }}
              >
                {hasDirectInstaller
                  ? t("footer.portableUpdateButton")
                  : t("footer.portableUpdateBrowseButton")}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={`flex items-center gap-3 ${className}`}>
        {isUpdateClickable ? (
          <button
            onClick={getUpdateStatusAction()}
            disabled={isUpdateDisabled}
            className={`transition-colors disabled:opacity-50 tabular-nums ${
              updateAvailable
                ? "text-logo-primary hover:text-logo-primary/80 font-medium"
                : "text-text/60 hover:text-text/80"
            }`}
          >
            {getUpdateStatusText()}
          </button>
        ) : (
          <span className="text-text/60 tabular-nums">
            {getUpdateStatusText()}
          </span>
        )}

        {isInstalling && downloadProgress > 0 && downloadProgress < 100 && (
          <ProgressBar
            progress={[
              {
                id: "update",
                percentage: downloadProgress,
              },
            ]}
            size="large"
          />
        )}
      </div>
    </>
  );
};

export default UpdateChecker;
