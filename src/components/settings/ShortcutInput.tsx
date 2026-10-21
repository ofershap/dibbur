import React from "react";
import { useSettings } from "../../hooks/useSettings";
import { GlobalShortcutInput } from "./GlobalShortcutInput";
import { DibburKeysShortcutInput } from "./DibburKeysShortcutInput";

interface ShortcutInputProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  shortcutId: string;
  disabled?: boolean;
}

/**
 * Wrapper component that selects the appropriate shortcut input implementation
 * based on the keyboard_implementation setting.
 *
 * - "tauri" (default): Uses GlobalShortcutInput with JS keyboard events
 * - "dibbur_keys": Uses DibburKeysShortcutInput with backend key events
 */
export const ShortcutInput: React.FC<ShortcutInputProps> = (props) => {
  const { getSetting } = useSettings();
  const keyboardImplementation = getSetting("keyboard_implementation");

  // Default to Tauri implementation if not set
  if (keyboardImplementation === "dibbur_keys") {
    return <DibburKeysShortcutInput {...props} />;
  }

  return <GlobalShortcutInput {...props} />;
};
