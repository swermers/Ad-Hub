import { toPng } from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { AspectRatio } from "@/components/ad-templates/types";
import { ASPECT_DIMENSIONS } from "@/components/ad-templates/types";

export async function renderAdToPng(
  element: HTMLElement,
  aspectRatio: AspectRatio = "1:1",
): Promise<Blob> {
  const dims = ASPECT_DIMENSIONS[aspectRatio];
  const dataUrl = await toPng(element, {
    width: dims.width,
    height: dims.height,
    pixelRatio: 1,
  });

  const response = await fetch(dataUrl);
  return response.blob();
}

export async function exportAdsAsZip(
  elements: { id: string; element: HTMLElement; name: string; aspectRatio?: AspectRatio }[],
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const zip = new JSZip();

  for (let i = 0; i < elements.length; i++) {
    const { element, name, aspectRatio } = elements[i];
    onProgress?.(i + 1, elements.length);

    const blob = await renderAdToPng(element, aspectRatio || "1:1");
    zip.file(`${name}.png`, blob);
  }

  const content = await zip.generateAsync({ type: "blob" });
  const timestamp = new Date().toISOString().slice(0, 10);
  saveAs(content, `ad_variations_${timestamp}.zip`);
}
