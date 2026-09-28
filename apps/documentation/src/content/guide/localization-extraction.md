---
title: Extracting messages
summary: Pull messages.json out of a Metro bundle with localize-extract, then translate a copy of it.
---

# Extracting messages

After marking templates with `i18n` and TypeScript with `$localize` as in
[Localisation](/guide/localisation), run `localize-extract` on Metro's unminified JavaScript bundle,
not Hermes bytecode. It extracts every message from compiled JavaScript:

```sh
npx expo export --platform ios --no-bytecode --no-minify --output-dir i18n-build
npx localize-extract -s 'i18n-build/**/*.js' -f json -o locale/messages.json
rm -rf i18n-build
```

The output for the snippets in [Localisation](/guide/localisation), trimmed:

```json
{
  "locale": "en",
  "translations": {
    "home.title": "Your basket",
    "home.greeting": "Hello, {$INTERPOLATION}!",
    "home.hint": "Tap {$STARTTAGTEXT}the basket{$CLOSETAGTEXT} to check out",
    "editor.save": "Save",
    "basket.other": "# items"
  }
}
```

Extraction includes template messages and `$localize` strings from app code only. `-f` also accepts
`xlf`, `xlf2`, `xmb` and `arb` for translation services. JSON works directly with
`loadTranslations()`, without a parser. Copy `messages.json` to `messages.fr.json`, set
`"locale": "fr"`, and translate the values, preserving every `{$...}` placeholder:

```json
{
  "locale": "fr",
  "translations": {
    "home.title": "Votre panier",
    "home.greeting": "Bonjour, {$INTERPOLATION} !",
    "home.hint": "Touchez {$STARTTAGTEXT}le panier{$CLOSETAGTEXT} pour payer",
    "editor.save": "Enregistrer",
    "basket.other": "# articles"
  }
}
```

`ng extract-i18n` requires a browser build, which fails for the template app with 164 errors across
native properties (`Can't bind to 'zoomScale' since it isn't a known property of
'scroll-view'`), DOM/native event types and React Native's Flow syntax.

Next: [Loading a language](/guide/localisation-loading) puts `messages.fr.json` into the app.
