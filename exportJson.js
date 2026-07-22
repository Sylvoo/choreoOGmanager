/**
 * Local JSON backup export and import helpers.
 */

import { validateDataStructure } from "./validation.js";

function pad(n) {
  return String(n).padStart(2, "0");
}

function todayStamp(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Download current working data as dance-class-backup-YYYY-MM-DD.json */
export function exportBackup(data) {
  const filename = `dance-class-backup-${todayStamp()}.json`;
  const text = `${JSON.stringify(data, null, 2)}\n`;
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return filename;
}

/**
 * Read and validate a backup file from an input[type=file] change event or File.
 * Does not apply data — caller confirms and loads into the store.
 */
export function readBackupFile(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve({ ok: false, message: "No file selected." });
      return;
    }
    if (!file.name.toLowerCase().endsWith(".json")) {
      resolve({ ok: false, message: "Please choose a .json backup file." });
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      resolve({ ok: false, message: "Could not read the backup file." });
    };
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch {
        resolve({ ok: false, message: "The backup file is not valid JSON." });
        return;
      }

      const validation = validateDataStructure(parsed);
      if (!validation.valid) {
        resolve({
          ok: false,
          message: `Invalid backup structure: ${validation.error}`,
        });
        return;
      }

      resolve({
        ok: true,
        data: validation.data,
        count: validation.data.enrollments.length,
      });
    };
    reader.readAsText(file, "UTF-8");
  });
}
