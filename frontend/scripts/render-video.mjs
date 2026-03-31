#!/usr/bin/env node
/**
 * Server-side video renderer using @remotion/bundler + @remotion/renderer.
 *
 * Usage:
 *   node scripts/render-video.mjs '{"compositionId":"swiss-bold","props":{...},"outputPath":"out.mp4"}'
 *
 * Or pipe JSON via stdin:
 *   echo '{"compositionId":"swiss-bold",...}' | node scripts/render-video.mjs
 *
 * Input JSON:
 *   {
 *     "compositionId": "swiss-bold",       // one of the 15 VideoStyle ids
 *     "props": {                            // composition input props
 *       "headline": "...",
 *       "body": "...",
 *       "cta": "...",
 *       "backgroundColor": "#0f0f0e",
 *       "textColor": "#fafaf8",
 *       "accentColor": "#FF9500",
 *       "aspectRatio": "1:1",
 *       "screenshotUrl": "https://..."
 *     },
 *     "outputPath": "/absolute/path/to/output.mp4",
 *     "codec": "h264",                     // "h264" (mp4) or "vp8" (webm)
 *     "width": 1080,                       // optional override
 *     "height": 1080                       // optional override
 *   }
 *
 * Output (JSON to stdout):
 *   { "success": true, "outputPath": "/absolute/path/to/output.mp4", "durationMs": 12345 }
 *   { "success": false, "error": "..." }
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Singleton: cache the bundle path across renders in the same process
let _bundlePath = null;

async function getBundle() {
  if (_bundlePath && fs.existsSync(_bundlePath)) return _bundlePath;

  const entryPoint = path.resolve(
    __dirname,
    "../src/components/ad-templates/remotion/Root.tsx"
  );

  if (!fs.existsSync(entryPoint)) {
    throw new Error(`Entry point not found: ${entryPoint}`);
  }

  _bundlePath = await bundle({
    entryPoint,
    // Use the project's existing webpack config
    webpackOverride: (config) => config,
  });

  return _bundlePath;
}

async function render(input) {
  const startTime = Date.now();

  const {
    compositionId = "default",
    props = {},
    outputPath,
    codec = "h264",
    width,
    height,
  } = input;

  if (!outputPath) {
    throw new Error("outputPath is required");
  }

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Bundle the Remotion project
  const bundlePath = await getBundle();

  // Select the composition
  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: compositionId,
    inputProps: props,
  });

  // Allow dimension overrides (for different aspect ratios)
  if (width) composition.width = width;
  if (height) composition.height = height;

  // Render to file
  await renderMedia({
    composition,
    serveUrl: bundlePath,
    codec,
    outputLocation: outputPath,
    inputProps: props,
    // Chrome flags for headless rendering
    chromiumOptions: {
      disableWebSecurity: true,
    },
  });

  const durationMs = Date.now() - startTime;
  return { success: true, outputPath, durationMs };
}

// --- Main ---

async function main() {
  let inputJson;

  // Accept JSON as CLI arg or stdin
  if (process.argv[2]) {
    inputJson = process.argv[2];
  } else {
    // Read from stdin
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    inputJson = Buffer.concat(chunks).toString("utf-8");
  }

  if (!inputJson.trim()) {
    console.error("No input provided. Pass JSON as argument or via stdin.");
    process.exit(1);
  }

  let input;
  try {
    input = JSON.parse(inputJson);
  } catch {
    console.error("Invalid JSON input");
    process.exit(1);
  }

  try {
    const result = await render(input);
    // Output result as JSON to stdout
    process.stdout.write(JSON.stringify(result) + "\n");
  } catch (err) {
    process.stdout.write(
      JSON.stringify({ success: false, error: err.message }) + "\n"
    );
    process.exit(1);
  }
}

main();
