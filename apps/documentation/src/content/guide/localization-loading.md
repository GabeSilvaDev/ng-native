---
title: Loading a language
summary: Decide LOCALE_ID and load its translations before the app's first frame.
---

# Loading a language

With `messages.fr.json` from [Extracting messages](/guide/localization-extraction), define a
provider in a separate file to choose and load the language:

```ts
// localisation.ts
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {
  LOCALE_ID,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { loadTranslations } from '@angular/localize';
import { Locale } from '@ng-native/expo/locale';
import { getItem } from 'expo-secure-store';
import fr from './locale/messages.fr.json';

/** The language the source text is written in. There is nothing to load for it. */
const SOURCE = 'en';

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: fr.translations,
};

registerLocaleData(localeFr);

/** The first language in the list that this app has, or the source language. */
export function chooseLanguage(preferred: readonly (string | null)[]): string {
  return (
    preferred.find((code) => code === SOURCE || (code != null && code in TRANSLATIONS)) ?? SOURCE
  );
}

export function provideLocalisation(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: LOCALE_ID,
      useFactory: () =>
        chooseLanguage([
          getItem('language'),
          ...inject(Locale)
            .locales()
            .map((locale) => locale.languageCode),
        ]),
    },
    provideAppInitializer(() => {
      const messages = TRANSLATIONS[inject(LOCALE_ID)];
      if (messages) loadTranslations(messages);
    }),
  ]);
}
```

Pass it to `mount`:

```ts
// src/main.ts
const app = mount(Number(rootTag), App, getFabricUIManager(), {
  // ...processColor, conditions, tokens, resolveAssetSource as before
  providers: [provideLocalisation()],
});
```

`LOCALE_ID` controls both translation loading and Angular pipe formatting. It selects the in-app
choice first (see [Switching language](/guide/localization-switching)), then device languages in
preference order. Use `Locale.locales()`, not `Locale.locale()`: if the user prefers German then
French, an app without German should choose French rather than English.

`mount` runs initializers before creating the root component, so translations must load
synchronously. It starts promise-returning initializers without awaiting them; network-fetched
translations would arrive after the first frame and template evaluation. Import translations so
Metro bundles them.

Missing translations fall back to source text and log `No translation found`, so an incomplete
file ships a partly English screen rather than a broken one. Unsupported device languages fall
back to `SOURCE`.

Next: [Switching language](/guide/localization-switching) covers changing `LOCALE_ID` after
startup.
