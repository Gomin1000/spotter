"use client";
// Ctrl+V / drag-and-drop screenshot input. Text pastes are left alone.
import { useEffect, useRef } from "react";
import { resizeToJpegBase64 } from "./image";

export type ImageSource = "paste" | "drop";

function firstImageFromItems(items: DataTransferItemList | undefined): File | null {
  if (!items) return null;
  for (const item of Array.from(items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) return item.getAsFile();
  }
  return null;
}

function hasFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes("Files");
}

/**
 * Calls onImage(base64 JPEG, max 768 px wide) when the user pastes an image
 * (e.g. Win+Shift+S then Ctrl+V) or drops an image file anywhere on the page.
 * onError gets a friendly message if the image can't be read.
 */
export function usePasteImage(
  onImage: (image_base64: string, source: ImageSource) => void,
  onError?: (message: string) => void,
): void {
  const onImageRef = useRef(onImage);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onImageRef.current = onImage;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    async function handle(file: File, source: ImageSource) {
      try {
        onImageRef.current(await resizeToJpegBase64(file), source);
      } catch {
        onErrorRef.current?.("Couldn't read that image. Try another screenshot.");
      }
    }

    function onPaste(e: ClipboardEvent) {
      const file = firstImageFromItems(e.clipboardData?.items);
      if (!file) return; // text only: let the normal paste happen
      e.preventDefault();
      void handle(file, "paste");
    }

    function onDragOver(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault(); // required so the drop event fires
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    }

    function onDrop(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault(); // stop the browser from opening the file
      const file = Array.from(e.dataTransfer?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (file) void handle(file, "drop");
      else onErrorRef.current?.("That's not an image. Drop a screenshot (PNG or JPEG).");
    }

    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);
}
