# Wallet

A small banking app built with Angular Native: the example to read when you want to see what a
real app looks like, rather than one feature at a time.

| Screen                                         | What it shows                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Home (`src/app/home/home.ts`)                  | Tailwind classes, a gradient, `computed()` values, a preference kept in the keychain with `SecureStorage`                            |
| Activity (`src/app/activity/activity.ts`)      | A tab with its own native stack, a large title, a search bar in the navigation bar, and a `<virtual-list>` of a few hundred payments |
| Payment (`src/app/payments/payment-detail.ts`) | A pushed screen whose route param arrives as an `input()`                                                                            |
| Send money (`src/app/send/send.ts`)            | A Signal Form over native text fields, presented as a modal, styled with component CSS, with haptics on success                      |
| Settings (`src/app/settings/settings.ts`)      | `ios:`, `android:` and `dark:` variants: one template, each platform's own look                                                      |

The tab bar (`src/app/tabs.ts`) is a real `UITabBarController` on iOS and a bottom navigation bar on
Android, and every screen is a real native screen with the platform's own transitions.

## Run it

From the repository root, after `pnpm install`:

```sh
cd examples/wallet
pnpm start     # press i or a, or scan the QR code with Expo Go
pnpm test      # Vitest in Node, no simulator
```

`src/app/app.test.ts` drives the whole app the way a person would: hides the balance, sends money,
searches the activity list. It runs in about a second, against a fake of the native side.
