const assert = require("node:assert/strict");
const {
  convertThemeJsonToScss,
  parseArgs,
  toCustomVariableName,
  toScssVariableName,
} = require("../bin/theme-json-to-scss-variables");

assert.equal(toScssVariableName("breakpointXLarge"), "breakpoint-x-large");
assert.equal(toScssVariableName("raider-black-light"), "raider-black-light");
assert.equal(toScssVariableName("Myriad Pro"), "myriad-pro");
assert.equal(toCustomVariableName("breakpoint-large"), "break-large");
assert.equal(toCustomVariableName("breakpointXLarge"), "break-x-large");
assert.equal(parseArgs(["theme.json", "--base-font-size", "18px"]).baseFontSize, "18px");
assert.throws(() => parseArgs(["--base-font-size"]), /requires a font size/);

const scss = convertThemeJsonToScss({
  settings: {
    color: {
      palette: [
        { color: "#000000", name: "Raider Black", slug: "raider-black" },
        { color: "#daeec8", name: "Mint - Light 2", slug: "mint-light-2" },
      ],
      gradients: [
        {
          gradient: "linear-gradient(135deg, #000000 0%, #daeec8 100%)",
          name: "Black to Mint",
          slug: "black-to-mint",
        },
      ],
      duotone: [
        { colors: ["#000000", "#ffffff"], name: "Black and White", slug: "black-and-white" },
      ],
    },
    spacing: {
      spacingSizes: [
        { name: "Small", size: "1rem", slug: "20" },
      ],
    },
    shadow: {
      presets: [
        { name: "Natural", shadow: "6px 6px 9px rgba(0, 0, 0, 0.2)", slug: "natural" },
      ],
    },
    dimensions: {
      aspectRatios: [
        { name: "Wide", ratio: "16/9", slug: "16-9" },
      ],
    },
    myPlugin: {
      zIndexes: [
        { name: "Modal", value: 100, slug: "modal" },
      ],
    },
    blocks: {
      "core/button": {
        color: {
          palette: [{ color: "#ff0000", name: "Block Red", slug: "block-red" }],
        },
      },
    },
    typography: {
      fontFamilies: [
        { fontFamily: "'museo-slab', serif", name: "Primary", slug: "primary" },
        { fontFamily: "Onest, sans-serif", name: "Secondary", slug: "secondary" },
      ],
      fontSizes: [
        { name: "Body", size: "18px", slug: "body" },
      ],
    },
    layout: {
      contentSize: "890px",
      wideSize: "1600px",
    },
    custom: {
      "breakpoint-large": "1025px",
      pagePaddingSm: "20px",
      breakpoint: {
        small: "600px",
      },
      spacing: {
        gutter: {
          default: "1.5rem",
        },
      },
    },
  },
});

assert.match(scss, /\$color-raider-black: #000000;/);
assert.match(scss, /\$color-mint-light-2: #daeec8;/);
assert.match(scss, /\$gradient-black-to-mint: linear-gradient\(135deg, #000000 0%, #daeec8 100%\);/);
assert.match(scss, /\/\/ Available as var\(--wp--preset--gradient--<slug>\)/);
assert.match(scss, /\$duotone-black-and-white: \(#000000, #ffffff\);/);
assert.match(scss, /\$spacing-20: 1rem;/);
assert.match(scss, /\$shadow-natural: 6px 6px 9px rgba\(0, 0, 0, 0.2\);/);
assert.match(scss, /\$aspect-ratio-16-9: 16\/9;/);
assert.match(scss, /\/\/ Z Indexes\n\/\/ From settings\.myPlugin\.zIndexes/);
assert.match(scss, /\$z-indexes-modal: 100;/);
assert.doesNotMatch(scss, /block-red/);
assert.match(scss, /\$break-small: 600px;/);
assert.match(scss, /\$spacing-gutter-default: 1.5rem;/);
assert.match(scss, /\$font-primary: 'museo-slab', serif;/);
assert.match(scss, /\$font-size-body: 18px;/);
assert.match(scss, /\$content-narrow: 890px; \/\/ content-size/);
assert.match(scss, /\$content-wide: 1600px; \/\/ wide-size/);
assert.match(scss, /\$break-large: 1025px;/);
assert.doesNotMatch(scss, /\$breakpoint-large:/);
assert.match(scss, /\$page-padding-sm: 20px;/);
assert.match(scss, /\$font-base: 16px;/);

const scssWithBaseFontSize = convertThemeJsonToScss(
  {
    settings: {},
  },
  {
    baseFontSize: "18px",
  }
);

assert.match(scssWithBaseFontSize, /\$font-base: 18px;/);

console.log("All tests passed.");
