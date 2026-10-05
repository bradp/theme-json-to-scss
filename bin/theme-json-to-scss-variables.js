#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const args = process.argv.slice(2);

function printHelp() {
  console.log(`Usage: theme-json-to-scss [theme.json] [output.scss]

Converts WordPress theme.json settings into SCSS variables.

Arguments:
  theme.json    Input file. Defaults to ./theme.json.
  output.scss   Output file. Defaults to stdout unless --output is provided.

Options:
  -o, --output <file>  Write SCSS to a file.
  --base-font-size <size>
                      Set the $font-base value. Defaults to 16px.
  --stdout            Print SCSS to stdout.
  -h, --help          Show this help text.

Examples:
  npx theme-json-to-scss theme.json src/scss/_theme-vars.scss
  npx theme-json-to-scss theme.json --base-font-size 18px
  npx theme-json-to-scss theme.json --output src/scss/_theme-vars.scss
`);
}

function parseArgs(rawArgs) {
  const parsed = {
    input: null,
    output: null,
    stdout: false,
    baseFontSize: "16px",
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "-h" || arg === "--help") {
      parsed.help = true;
      continue;
    }

    if (arg === "--stdout") {
      parsed.stdout = true;
      continue;
    }

    if (arg === "-o" || arg === "--output") {
      const output = rawArgs[index + 1];
      if (!output) {
        throw new Error(`${arg} requires a file path.`);
      }
      parsed.output = output;
      index += 1;
      continue;
    }

    if (arg === "--base-font-size") {
      const baseFontSize = rawArgs[index + 1];
      if (!baseFontSize) {
        throw new Error(`${arg} requires a font size.`);
      }
      parsed.baseFontSize = baseFontSize;
      index += 1;
      continue;
    }

    if (!parsed.input) {
      parsed.input = arg;
      continue;
    }

    if (!parsed.output) {
      parsed.output = arg;
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}`);
  }

  parsed.input = parsed.input || "theme.json";
  return parsed;
}

function toScssVariableName(value) {
  return String(value)
    .trim()
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Known WordPress preset collections, keyed by their path under `settings`.
// Any other array of `{ slug, ... }` objects is still converted, using names
// derived from its key.
const KNOWN_PRESETS = {
  "color.palette": { title: "Color Palette", prefix: "color", cssName: "color", valueKey: "color" },
  "color.gradients": { title: "Gradients", prefix: "gradient", cssName: "gradient", valueKey: "gradient" },
  "color.duotone": { title: "Duotone", prefix: "duotone", cssName: "duotone", valueKey: "colors" },
  "typography.fontFamilies": { title: "Font Families", prefix: "font", cssName: "font-family", valueKey: "fontFamily" },
  "typography.fontSizes": { title: "Font Sizes", prefix: "font-size", cssName: "font-size", valueKey: "size" },
  "spacing.spacingSizes": { title: "Spacing Sizes", prefix: "spacing", cssName: "spacing", valueKey: "size" },
  "shadow.presets": { title: "Shadows", prefix: "shadow", cssName: "shadow", valueKey: "shadow" },
  "dimensions.aspectRatios": { title: "Aspect Ratios", prefix: "aspect-ratio", cssName: "aspect-ratio", valueKey: "ratio" },
  "border.radiusSizes": { title: "Border Radius Sizes", prefix: "radius", cssName: "border-radius", valueKey: "size" },
};

// Top-level settings that are handled separately or are not global presets.
const SKIPPED_SETTINGS = new Set(["blocks", "custom", "layout"]);

const PRESET_META_KEYS = new Set(["slug", "name"]);

function isPrimitive(value) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function formatScssValue(value) {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value) && value.every(isPrimitive)) {
    return `(${value.map(formatScssValue).join(", ")})`;
  }

  if (typeof value !== "string") {
    return JSON.stringify(value);
  }

  return value;
}

function toCustomVariableName(value) {
  return toScssVariableName(value).replace(/^breakpoint-/, "break-");
}

function isPresetList(value) {
  return Array.isArray(value) && value.some((item) => item && typeof item === "object" && item.slug);
}

function collectPresetLists(node, pathParts = [], presetLists = []) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return presetLists;
  }

  for (const [key, value] of Object.entries(node)) {
    if (pathParts.length === 0 && SKIPPED_SETTINGS.has(key)) {
      continue;
    }

    const keyPath = [...pathParts, key];

    if (isPresetList(value)) {
      presetLists.push({ path: keyPath, items: value });
    } else {
      collectPresetLists(value, keyPath, presetLists);
    }
  }

  return presetLists;
}

function describePresetList(keyPath) {
  const known = KNOWN_PRESETS[keyPath.join(".")];
  if (known) {
    return known;
  }

  const key = keyPath[keyPath.length - 1] === "presets" && keyPath.length > 1
    ? keyPath[keyPath.length - 2]
    : keyPath[keyPath.length - 1];
  const prefix = toScssVariableName(key);
  const title = prefix
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return { title, prefix, source: `settings.${keyPath.join(".")}`, valueKey: null };
}

function getPresetValue(item, valueKey) {
  if (valueKey && item[valueKey] !== undefined) {
    return item[valueKey];
  }

  const entry = Object.entries(item).find(
    ([key, value]) => !PRESET_META_KEYS.has(key) && (isPrimitive(value) || (Array.isArray(value) && value.every(isPrimitive)))
  );

  return entry ? entry[1] : undefined;
}

function addPresetSection(lines, keyPath, items) {
  const { title, prefix, cssName, source, valueKey } = describePresetList(keyPath);
  const variables = [];

  for (const item of items) {
    if (!item || !item.slug) {
      continue;
    }

    const value = getPresetValue(item, valueKey);
    if (value === undefined) {
      continue;
    }

    variables.push(`$${prefix}-${toScssVariableName(item.slug)}: ${formatScssValue(value)};`);
  }

  if (variables.length === 0) {
    return;
  }

  const note = cssName ? `// Available as var(--wp--preset--${cssName}--<slug>)` : `// From ${source}`;
  lines.push("", `// ${title}`, note, ...variables);
}

function addLayoutSection(lines, layout) {
  if (!layout || typeof layout !== "object") {
    return;
  }

  const entries = [
    ["content-narrow", "contentSize", "content-size"],
    ["content-wide", "wideSize", "wide-size"],
  ].filter((entry) => layout[entry[1]] !== undefined);

  if (entries.length === 0) {
    return;
  }

  lines.push("", "// Layout Sizes", "// Available as var(--wp--style--global--layout--<slug>)");

  for (const [variableName, key, comment] of entries) {
    lines.push(`$${variableName}: ${formatScssValue(layout[key])}; // ${comment}`);
  }
}

function flattenCustomSettings(value, pathParts = [], entries = []) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flattenCustomSettings(child, [...pathParts, key], entries);
    }
  } else if (value !== undefined && value !== null && pathParts.length > 0) {
    entries.push([pathParts, value]);
  }

  return entries;
}

function addCustomSection(lines, custom) {
  if (!custom || typeof custom !== "object" || Array.isArray(custom)) {
    return;
  }

  const entries = flattenCustomSettings(custom);
  if (entries.length === 0) {
    return;
  }

  lines.push("", "// Custom Settings", "// Available as var(--wp--custom--<setting>)");

  for (const [keyPath, value] of entries) {
    const name = keyPath.map(toScssVariableName).join("-");
    lines.push(`$${toCustomVariableName(name)}: ${formatScssValue(value)};`);
  }
}

function convertThemeJsonToScss(themeJson, options = {}) {
  const baseFontSize = options.baseFontSize || "16px";
  const settings = themeJson.settings || {};
  const lines = ["// This file is auto-generated from theme.json - do not edit directly."];

  for (const { path: keyPath, items } of collectPresetLists(settings)) {
    addPresetSection(lines, keyPath, items);
  }

  addLayoutSection(lines, settings.layout);

  lines.push("", "// Base font size for site. Used in REM mixin calculations", `$font-base: ${formatScssValue(baseFontSize)};`);

  addCustomSection(lines, settings.custom);

  return `${lines.join("\n")}\n`;
}

function main() {
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    return;
  }

  const inputPath = path.resolve(process.cwd(), options.input);
  const outputPath = options.output ? path.resolve(process.cwd(), options.output) : null;
  const themeJson = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const scss = convertThemeJsonToScss(themeJson, {
    baseFontSize: options.baseFontSize,
  });

  if (outputPath && !options.stdout) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, scss);
    return;
  }

  process.stdout.write(scss);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  convertThemeJsonToScss,
  parseArgs,
  toCustomVariableName,
  toScssVariableName,
};
