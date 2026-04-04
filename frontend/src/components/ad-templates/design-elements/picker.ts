/**
 * Design element picker — selects appropriate SVG elements based on
 * slide role, brand color, and target platform.
 */

export type SlideRole = "hook" | "build" | "rehook" | "insight" | "takeaway" | "cta" | "problem" | "proof" | "feature";

export interface PickedElements {
  /** Background decorative element (behind content) */
  background: "blob" | "diagonal" | "rings" | "dots" | "flow" | "none";
  /** Accent element (near headline/CTA) */
  accent: "line" | "corner" | "quotes" | "divider" | "chevron" | "none";
  /** Character element (for storytelling) */
  character: "figure" | "walking" | "none";
  /** Texture recommendation */
  texture: "grain" | "noise" | "paper" | "halftone" | "vignette" | "mesh" | "none";
}

/**
 * Select design elements appropriate for a slide's role and platform.
 */
export function pickDesignElements(
  role: SlideRole,
  platform: string = "general",
): PickedElements {
  // Default conservative set
  const result: PickedElements = {
    background: "none",
    accent: "none",
    character: "none",
    texture: "grain",
  };

  switch (role) {
    case "hook":
      result.background = "diagonal";
      result.accent = "line";
      result.texture = "grain";
      break;

    case "build":
      result.background = "dots";
      result.accent = "line";
      result.texture = "grain";
      break;

    case "rehook":
      // Pattern interrupt — bold, different
      result.background = "blob";
      result.accent = "quotes";
      result.texture = "noise";
      break;

    case "insight":
      result.background = "rings";
      result.accent = "quotes";
      result.texture = "paper";
      break;

    case "takeaway":
      result.background = "flow";
      result.accent = "divider";
      result.character = "figure";
      result.texture = "vignette";
      break;

    case "cta":
      result.background = "none";
      result.accent = "chevron";
      result.texture = "grain";
      break;

    case "problem":
      result.background = "diagonal";
      result.accent = "line";
      result.texture = "noise";
      break;

    case "proof":
      result.background = "dots";
      result.accent = "corner";
      result.texture = "grain";
      break;

    case "feature":
      result.background = "rings";
      result.accent = "line";
      result.texture = "grain";
      break;
  }

  // Platform adjustments
  if (platform === "linkedin") {
    // LinkedIn = more professional, less decorative
    result.character = "none";
    if (result.background === "blob") result.background = "dots";
  }

  if (platform === "tiktok") {
    // TikTok = bolder, more dynamic
    if (result.texture === "grain") result.texture = "noise";
    if (result.background === "dots") result.background = "diagonal";
  }

  return result;
}
