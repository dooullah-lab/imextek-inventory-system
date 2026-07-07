// src/hooks/useBarcodeScanner.js
// Barcode scanners act like a keyboard — they type characters very fast
// (within milliseconds of each other) and press Enter when done.
// This hook detects that pattern and calls onScan(barcode) with the result.
// Human typing is too slow to trigger it, so regular keyboard use is safe.

import { useEffect, useRef } from "react";

const SCAN_SPEED_MS = 50;  // scanners type each character within 50ms
const MIN_LENGTH = 3;      // minimum barcode length to consider valid

export default function useBarcodeScanner(onScan, enabled = true) {
  const buffer = useRef("");
  const lastKeyTime = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const now = Date.now();
      const timeSinceLast = now - lastKeyTime.current;
      lastKeyTime.current = now;

      // If Enter is pressed and buffer has content, treat it as a scan
      if (e.key === "Enter") {
        const scanned = buffer.current.trim();
        if (scanned.length >= MIN_LENGTH) {
          onScan(scanned);
        }
        buffer.current = "";
        return;
      }

      // If the gap between keystrokes is too large, reset — human is typing
      if (timeSinceLast > 300 && buffer.current.length > 0) {
        buffer.current = "";
      }

      // Only collect printable characters
      if (e.key.length === 1) {
        buffer.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan, enabled]);
}
