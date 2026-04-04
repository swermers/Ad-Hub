export type AspectRatio = "1:1" | "4:5" | "9:16";

export const ASPECT_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
};

export interface AdTemplateProps {
  headline: string;
  body: string;
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  logoUrl?: string;
  screenshotUrl?: string;
  /** AI-generated image URL to composite into the template as background/hero */
  imageUrl?: string;
  /** URL to encode as a QR code in templates that support it */
  qrUrl?: string;
  aspectRatio?: AspectRatio;
  scale?: number;
  /** Target platform for platform-native rendering adjustments */
  platform?: "instagram" | "linkedin" | "tiktok" | "meta" | "general";
}

export function getDimensions(aspectRatio: AspectRatio = "1:1", scale: number = 1) {
  const dims = ASPECT_DIMENSIONS[aspectRatio];
  return { width: dims.width * scale, height: dims.height * scale };
}
