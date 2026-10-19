import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { commands } from "@/bindings";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { SettingContainer } from "../ui/SettingContainer";
import { Button } from "../ui/Button";
import { useSettings } from "../../hooks/useSettings";

interface TranscriptArchiveProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const TranscriptArchive: React.FC<TranscriptArchiveProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();
    const enabled = getSetting("transcript_archive_enabled") ?? false;
    const chosenDir = getSetting("transcript_archive_dir");
    const [effectiveDir, setEffectiveDir] = useState<string>("");

    const refreshDir = useCallback(() => {
      commands.getTranscriptArchiveDir().then((result) => {
        if (result.status === "ok") {
          setEffectiveDir(result.data);
        }
      });
    }, []);

    useEffect(() => {
      if (enabled) {
        refreshDir();
      }
    }, [enabled, chosenDir, refreshDir]);

    const chooseDir = async () => {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: effectiveDir || undefined,
      });
      if (typeof selected === "string") {
        await updateSetting("transcript_archive_dir", selected);
        refreshDir();
      }
    };

    return (
      <>
        <ToggleSwitch
          checked={enabled}
          onChange={(nextEnabled) =>
            updateSetting("transcript_archive_enabled", nextEnabled)
          }
          isUpdating={isUpdating("transcript_archive_enabled")}
          label={t("settings.advanced.transcriptArchive.title")}
          description={t("settings.advanced.transcriptArchive.description")}
          descriptionMode={descriptionMode}
          grouped={grouped}
        />
        {enabled && (
          <SettingContainer
            title={t("settings.advanced.transcriptArchive.folder")}
            description={
              effectiveDir ||
              t("settings.advanced.transcriptArchive.folderDescription")
            }
            descriptionMode="inline"
            grouped={grouped}
          >
            <Button onClick={chooseDir} variant="secondary" size="sm">
              {t("settings.advanced.transcriptArchive.chooseFolder")}
            </Button>
          </SettingContainer>
        )}
      </>
    );
  },
);
