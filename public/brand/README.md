# Kökshyllan brand assets

Filer med suffixet `-placeholder` är tillfälliga och ska bytas före publicering. Behåll filnamn och mått när grafiken ersätts så att metadata och manifest inte behöver ändras.

## Byt före lansering

- `mark-placeholder.svg`: logotypsymbol i inloggningsflöden. Behåll en kvadratisk `viewBox` och god läsbarhet vid 32 px.
- `app-icon-192-placeholder.svg`: PWA-ikon, 192 × 192.
- `app-icon-512-placeholder.svg`: PWA-ikon, 512 × 512. Lägg viktig grafik inom de mittersta 80 procenten för maskning.
- `src/app/favicon.ico`: ersätt med en ICO-version av den slutliga symbolen.

## Lägg till inför butikspublicering

- PNG-ikoner i 192 × 192 och 512 × 512 för bredast PWA-stöd.
- Maskable PWA-ikon i 512 × 512 och motsvarande post med `purpose: "maskable"` i `src/app/manifest.ts`.
- Apple touch icon i 180 × 180 och uppdaterad sökväg i `src/app/layout.tsx`.
- Splash screens per enhetsstorlek när appens distributionsmål är beslutade.

Namn, beskrivning och färger finns samlade i `src/config/brand.ts`.
