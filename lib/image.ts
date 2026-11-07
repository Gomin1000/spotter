// Browser-only image helpers. Output: JPEG base64 without the data: prefix.

export const MAX_WIDTH = 768;
const JPEG_QUALITY = 0.8;

function canvasToBase64(source: CanvasImageSource, width: number, height: number): string {
  const scale = width > MAX_WIDTH ? MAX_WIDTH / width : 1;
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(source, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

/** Resize an image File/Blob to max 768 px wide and return JPEG base64. */
export async function resizeToJpegBase64(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    return canvasToBase64(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

/** Capture one frame from a <video> playing a stream, as 768 px JPEG base64. */
export function captureVideoFrame(video: HTMLVideoElement): string {
  return canvasToBase64(video, video.videoWidth, video.videoHeight);
}

/** Ask to share the screen, grab one frame (768 px JPEG base64), then stop sharing. */
export async function grabScreenOnce(): Promise<string> {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    // Wait for real dimensions and a painted frame.
    if (!video.videoWidth) {
      await new Promise<void>((resolve) =>
        video.addEventListener("loadedmetadata", () => resolve(), { once: true }),
      );
    }
    await new Promise((r) => setTimeout(r, 300));
    const b64 = captureVideoFrame(video);
    video.srcObject = null;
    return b64;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}
