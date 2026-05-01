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

The CLI currently converts:

- `settings.color.palette` to `$color-<slug>`
- `settings.typography.fontFamilies` to `$font-<slug>`
- `settings.typography.fontSizes` to `$font-size-<slug>`
- `settings.layout.contentSize` to `$content-narrow`
- `settings.layout.wideSize` to `$content-wide`
- `settings.custom` to `$<setting>`

It also adds `$font-base: 16px;` for REM helper mixins, or the value passed with `--base-font-size`.
