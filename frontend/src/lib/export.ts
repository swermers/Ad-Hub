import { toPng } from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export async function renderAdToPng(element: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(element, {
    width: 1080,
    height: 1080,
    pixelRatio: 1,
  });

  const response = await fetch(dataUrl);
  return response.blob();
}

export async function exportAdsAsZip(
  elements: { id: string; element: HTMLElement; name: string }[],
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const zip = new JSZip();

  for (let i = 0; i < elements.length; i++) {
    const { element, name } = elements[i];
    onProgress?.(i + 1, elements.length);

    const blob = await renderAdToPng(element);
    zip.file(`${name}.png`, blob);
  }

  const content = await zip.generateAsync({ type: "blob" });
  const timestamp = new Date().toISOString().slice(0, 10);
  saveAs(content, `ad_variations_${timestamp}.zip`);
}
