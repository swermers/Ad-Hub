import React from "react";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeBlockProps {
  /** URL or text to encode */
  value: string;
  /** Size in pixels */
  size?: number;
  /** Foreground color */
  fgColor?: string;
  /** Background color */
  bgColor?: string;
  /** Optional label below the QR code */
  label?: string;
  /** Label font size */
  labelSize?: number;
}

/**
 * QR Code block for embedding in ad templates.
 * Wraps qrcode.react with styling consistent with the template system.
 */
export function QRCodeBlock({
  value,
  size = 64,
  fgColor = "#000000",
  bgColor = "transparent",
  label,
  labelSize = 10,
}: QRCodeBlockProps) {
  if (!value) return null;

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <QRCodeSVG
        value={value}
        size={size}
        fgColor={fgColor}
        bgColor={bgColor}
        level="M"
        includeMargin={false}
      />
      {label && (
        <span
          style={{
            fontSize: labelSize,
            fontWeight: 500,
            color: fgColor,
            opacity: 0.6,
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
