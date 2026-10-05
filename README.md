# theme-json-to-scss

Convert WordPress `theme.json` settings into SCSS variables.

## Usage

```sh
npx theme-json-to-scss theme.json src/scss/_theme-vars.scss
```

You can also print to stdout:

```sh
npx theme-json-to-scss theme.json --stdout
```

Set a custom base font size for generated REM helper variables:

```sh
npx theme-json-to-scss theme.json --base-font-size 18px
```

Programmatic usage accepts the same option:

```js
const { convertThemeJsonToScss } = require("theme-json-to-scss");

const scss = convertThemeJsonToScss(themeJson, {
  baseFontSize: "18px",
});
```

## Generated Variables

Every preset collection under `settings` (any array of objects with a `slug`) is converted to SCSS variables. WordPress core presets use these names:

| theme.json setting | SCSS variable |
| --- | --- |
| `settings.color.palette` | `$color-<slug>` |
| `settings.color.gradients` | `$gradient-<slug>` |
| `settings.color.duotone` | `$duotone-<slug>` (a SCSS list of colors) |
| `settings.typography.fontFamilies` | `$font-<slug>` |
| `settings.typography.fontSizes` | `$font-size-<slug>` |
| `settings.spacing.spacingSizes` | `$spacing-<slug>` |
| `settings.shadow.presets` | `$shadow-<slug>` |
| `settings.dimensions.aspectRatios` | `$aspect-ratio-<slug>` |
| `settings.border.radiusSizes` | `$radius-<slug>` |

Other preset collections are named after their key, e.g. `settings.myPlugin.zIndexes` becomes `$z-indexes-<slug>`.

It also converts:

- `settings.layout.contentSize` to `$content-narrow`
- `settings.layout.wideSize` to `$content-wide`
- `settings.custom` to `$<setting>`, with nested objects flattened (`custom.spacing.gutter` becomes `$spacing-gutter`)

Block-level settings under `settings.blocks` are skipped.

It also adds `$font-base: 16px;` for REM helper mixins, or the value passed with `--base-font-size`.
