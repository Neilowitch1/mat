# MAT

## Vision

En modern matplaneringsapp med fokus på snabbhet, enkelhet och mobil användning.

## Teknik

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Vercel

## Gemensamt hushåll

Appen har inga användarkonton eller inloggning. Alla enheter som använder samma publicerade webbadress arbetar mot samma gemensamma data i Supabase.

- Supabase Auth ska inte införas.
- Data ska inte avgränsas med `user_id` eller `household_id`.
- `products`, `shopping_list`, `inventory` och framtida `recipes` är globala för hushållet.
- Supabase är source of truth. `localStorage` ska inte användas för permanent appdata.
- React-state får användas för UI och optimistiska uppdateringar.
- Arkitekturen ska möjliggöra Supabase Realtime mellan flera öppna enheter.

## Design

- Mobile First
- Apple-inspirerad design
- Mycket whitespace
- Mjuka hörn
- Få färger
- Gröna accenter
- Minimalism

## Funktioner

### Handla

- Shoppinglista
- Smarta produktförslag
- Autoslutförande
- Skapa produkt om den saknas

### Skafferi

- Status:
  - Full
  - Halvfull
  - Lite kvar
  - Slut

När status blir "Slut" ska produkten automatiskt kunna föreslås till handlingslistan.

### Recept

- Egna recept
- Visa saknade ingredienser
- Lägg till saknade ingredienser med ett klick

## Kodstandard

- TypeScript
- Små komponenter
- Återanvändbara komponenter
- shadcn/ui när möjligt
- Ren och lättläst kod
- Inga onödiga kommentarer

## Mål

Bygg en app som känns som en riktig iOS/Android-app, trots att den är byggd med Next.js.
