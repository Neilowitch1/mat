# Kökshyllan brand assets

Den här mappen innehåller endast de varumärkesbilder som appen använder vid runtime.
Godkända masterfiler finns i `Brand/Logo/` och ska inte ändras eller skrivas över.

## Logotyper

- `logo/logo-no-tagline-transparent.png` används av auth-varianten i `BrandMark`, bland annat via `AuthShell`.
  Runtime-filen är en oförändrad kopia av `Brand/Logo/logo-no-tagline-transparent.png`.
- `logo/logo-mark.png` används av standardvarianten i `BrandMark`.
  Runtime-filen är en oförändrad kopia av `Brand/Logo/logo-mark.png`.

## Favicon och PWA

- `favicon-32.png` används som 32 × 32-webbläsarikon i Next.js-metadata och är en oförändrad kopia av `Brand/Logo/favicon-32.png`.
- `icon-192.png` används i både Next.js-metadata och PWA-manifestet och är en oförändrad kopia av `Brand/Logo/icon-192.png`.
- `icon-512.png` används i PWA-manifestet och är en oförändrad kopia av `Brand/Logo/icon-512.png`.
- `icon-maskable-512.png` används som maskbar ikon i PWA-manifestet och är en oförändrad kopia av `Brand/Logo/icon-maskable-512.png`.

Appens övriga konventionsbaserade ikoner ligger utanför den här mappen: `src/app/favicon.ico` och `public/apple-touch-icon.png`.

## Open Graph och Twitter

- `open-graph.png` används av Next.js-metadata för både Open Graph och Twitter-kort.
  Det är den aktiva, publicerade runtime-versionen. Den skiljer sig från `Brand/Logo/open-graph.png` efter en separat avsiktlig runtime-uppdatering och ska därför inte ersättas automatiskt från masterfilen.
