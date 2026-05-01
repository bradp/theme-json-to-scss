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

function formatScssValue(value) {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value !== "string") {
    return JSON.stringify(value);
  }

  return value;
}

function toCustomVariableName(value) {
  return toScssVariableName(value).replace(/^breakpoint-/, "break-");
}

function addPresetSection(lines, title, cssVariablePattern, items, variablePrefix, valueKey) {
  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  lines.push("", `// ${title}`, `// Available as ${cssVariablePattern}`);

  for (const item of items) {
    if (!item || !item.slug || item[valueKey] === undefined) {
      continue;
    }

    lines.push(`$${variablePrefix}-${toScssVariableName(item.slug)}: ${formatScssValue(item[valueKey])};`);
  }
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

function addCustomSection(lines, custom) {
  if (!custom || typeof custom !== "object" || Array.isArray(custom)) {
    return;
  }

  const entries = Object.entries(custom).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) {
    return;
  }

  lines.push("", "// Custom Settings", "// Available as var(--wp--custom--<setting>)");

  for (const [key, value] of entries) {
    lines.push(`$${toCustomVariableName(key)}: ${formatScssValue(value)};`);
  }
}

function convertThemeJsonToScss(themeJson, options = {}) {
  const baseFontSize = options.baseFontSize || "16px";
  const settings = themeJson.settings || {};
  const typography = settings.typography || {};
  const color = settings.color || {};
  const lines = ["// This file is auto-generated from theme.json - do not edit directly."];

  addPresetSection(
    lines,
    "Color Palette",
    "var(--wp--preset--color--<slug>)",
    color.palette,
    "color",
    "color"
  );

  addPresetSection(
    lines,
    "Font Families",
    "var(--wp--preset--font-family--<slug>)",
    typography.fontFamilies,
    "font",
    "fontFamily"
  );

  addPresetSection(
    lines,
    "Font Sizes",
    "var(--wp--preset--font-size--<slug>)",
    typography.fontSizes,
    "font-size",
    "size"
  );

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
