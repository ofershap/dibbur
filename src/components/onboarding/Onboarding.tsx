import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Plus } from "lucide-react";
import { Button } from "../ui/Button";
import DibburLogo from "../icons/DibburLogo";
import { useModelStore } from "../../stores/modelStore";

// Dibbur ships for Hebrew (and Arabic) speakers, so the first run does not
// ask anyone to compare speech models: it downloads the Hebrew model by
// itself, and Arabic is one optional tap.
const HEBREW_MODEL_ID = "ivrit-turbo";
const ARABIC_MODEL_ID = "lahjat-turbo";

interface OnboardingProps {
  onModelSelected: () => void;
  // Shown when the picker was opened from another step (the model update).
  onBack?: () => void;
  preview?: boolean;
}

const Onboarding: React.FC<OnboardingProps> = ({
  onModelSelected,
  onBack,
  preview = false,
}) => {
  const { t } = useTranslation();
  const {
    models,
    downloadModel,
    selectModel,
    downloadingModels,
    verifyingModels,
    downloadProgress,
    error,
    loadModels,
  } = useModelStore();
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [arabicRequested, setArabicRequested] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [selectionFailed, setSelectionFailed] = useState(false);
  const [arabicFailed, setArabicFailed] = useState(false);
  const autoStarted = useRef(false);
  const hasStartedSelection = useRef(false);

  const hebrew = models.find((m) => m.id === HEBREW_MODEL_ID);
  const arabic = models.find((m) => m.id === ARABIC_MODEL_ID);

  const startHebrewDownload = async () => {
    if (hebrew?.is_downloaded) {
      setSelectionFailed(false);
      hasStartedSelection.current = false;
      setSelectedModelId(HEBREW_MODEL_ID);
      return;
    }
    setDownloadFailed(false);
    setSelectionFailed(false);
    hasStartedSelection.current = false;
    setSelectedModelId(HEBREW_MODEL_ID);
    const ok = await downloadModel(HEBREW_MODEL_ID);
    if (!ok) {
      setSelectedModelId(null);
      setDownloadFailed(true);
    }
  };

  // Kick off the Hebrew model as soon as the catalog arrives. When it is
  // already on disk (upgrade path) the effect below selects it directly.
  useEffect(() => {
    if (preview || autoStarted.current || models.length === 0) return;
    autoStarted.current = true;
    if (hebrew?.is_downloaded) {
      setSelectedModelId(HEBREW_MODEL_ID);
    } else if (hebrew) {
      if (HEBREW_MODEL_ID in downloadingModels) {
        setSelectedModelId(HEBREW_MODEL_ID);
      } else {
        startHebrewDownload();
      }
    } else {
      setDownloadFailed(true);
    }
  }, [models.length, preview]);

  // Once the Hebrew model is on disk, select it and move on.
  useEffect(() => {
    if (preview || selectedModelId !== HEBREW_MODEL_ID) return;
    const stillDownloading = HEBREW_MODEL_ID in downloadingModels;
    const stillVerifying = HEBREW_MODEL_ID in verifyingModels;
    if (
      hebrew?.is_downloaded &&
      !stillDownloading &&
      !stillVerifying &&
      !hasStartedSelection.current
    ) {
      hasStartedSelection.current = true;
      selectModel(HEBREW_MODEL_ID).then((success) => {
        if (success) {
          onModelSelected();
        } else {
          toast.error(t("onboarding.errors.selectModel"));
          hasStartedSelection.current = false;
          setSelectedModelId(null);
          setSelectionFailed(true);
        }
      });
    }
  }, [
    selectedModelId,
    hebrew,
    downloadingModels,
    verifyingModels,
    selectModel,
    onModelSelected,
    preview,
    t,
  ]);

  const handleAddArabic = async () => {
    if (preview || arabicRequested) return;
    setArabicRequested(true);
    setArabicFailed(false);
    const ok = await downloadModel(ARABIC_MODEL_ID);
    if (!ok) {
      setArabicRequested(false);
      setArabicFailed(true);
    }
  };

  const hebrewVerifying = HEBREW_MODEL_ID in verifyingModels;
  const hebrewPct = hebrewVerifying
    ? 100
    : Math.min(
        100,
        Math.max(0, downloadProgress[HEBREW_MODEL_ID]?.percentage ?? 0),
      );
  const arabicPct = Math.min(
    100,
    Math.max(0, downloadProgress[ARABIC_MODEL_ID]?.percentage ?? 0),
  );
  const hebrewBusy = HEBREW_MODEL_ID in downloadingModels || hebrewVerifying;
  const arabicBusy = ARABIC_MODEL_ID in downloadingModels;

  return (
    <div className="h-screen w-full overflow-y-auto flex flex-col p-6 gap-4">
      {onBack && (
        <Button
          variant="ghost"
          size="md"
          onClick={onBack}
          className="fixed top-4 start-4 flex items-center gap-1 text-text/70 hover:text-text"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          {t("common.back")}
        </Button>
      )}
      <div className="flex flex-col items-center gap-3 shrink-0 mt-8">
        <DibburLogo size={96} />
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <h1 dir="ltr" className="text-2xl font-bold text-text">
          Dibbur (דיבור)
        </h1>
        <p className="text-text/70 max-w-md font-medium text-center">
          {t("onboarding.subtitle")}
        </p>
      </div>

      <div
        aria-live="polite"
        className="max-w-md w-full mx-auto mt-6 space-y-4"
      >
        <div className="rounded-xl border border-mid-gray/20 bg-mid-gray/5 p-4 space-y-3">
          <div className="flex items-center justify-between text-sm font-medium text-text">
            <span>{t("onboarding.hebrewModel")}</span>
            {hebrewBusy && (
              <span className="flex items-center gap-1.5 text-text/60">
                <Loader2 className="w-4 h-4 animate-spin" />
                {Math.floor(hebrewPct)}%
              </span>
            )}
          </div>
          {downloadFailed || selectionFailed || (error && !hebrew) ? (
            <div className="space-y-2">
              <p className="text-sm text-red-400">
                {t(
                  selectionFailed
                    ? "onboarding.errors.selectModel"
                    : "onboarding.downloadFailed",
                )}
              </p>
              <Button
                size="sm"
                onClick={() => {
                  if (!hebrew) {
                    autoStarted.current = false;
                    setDownloadFailed(false);
                    void loadModels();
                  } else {
                    void startHebrewDownload();
                  }
                }}
              >
                {t("onboarding.retry")}
              </Button>
            </div>
          ) : (
            <>
              <div
                role="progressbar"
                aria-label={t("onboarding.hebrewModel")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={hebrewPct}
                className="h-2 rounded-full bg-mid-gray/20 overflow-hidden"
              >
                <div
                  className="h-full bg-logo-primary transition-all duration-300"
                  style={{ width: `${Math.max(2, hebrewPct)}%` }}
                />
              </div>
              <p className="text-xs text-text/60">
                {hebrewVerifying
                  ? t("onboarding.verifyingDownload")
                  : t("onboarding.downloadingHebrew")}
              </p>
            </>
          )}
        </div>

        {arabicFailed && (
          <p role="alert" className="text-sm text-red-400">
            {t("onboarding.downloadFailed")}
          </p>
        )}
        {!arabic?.is_downloaded &&
          (arabicRequested ? (
            <div className="rounded-xl border border-mid-gray/20 bg-mid-gray/5 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm font-medium text-text">
                <span>{t("onboarding.downloadingArabic")}</span>
                {arabicBusy && (
                  <span className="flex items-center gap-1.5 text-text/60">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {Math.floor(arabicPct)}%
                  </span>
                )}
              </div>
              <div className="h-2 rounded-full bg-mid-gray/20 overflow-hidden">
                <div
                  className="h-full bg-logo-primary transition-all duration-300"
                  style={{ width: `${Math.max(2, arabicPct)}%` }}
                />
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={handleAddArabic}
              className="w-full flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-logo-primary"
            >
              <Plus className="w-4 h-4 me-1" />
              {t("onboarding.addArabic")}
            </Button>
          ))}
      </div>
    </div>
  );
};

export default Onboarding;
