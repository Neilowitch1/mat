# ARCHITECTURE.md

# MAT – Architecture

## Vision

En modern matplaneringsapp med fokus på enkelhet, snabbhet och mobil användning.

Appen ska kännas som en native iOS/Android-app trots att den är byggd med Next.js.

---

# Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Vercel

---

# Data Ownership

MAT är en app för ett enda gemensamt hushåll utan användarkonton eller login.

Alla klienter som öppnar samma publicerade webbadress använder samma globala data i Supabase. Tabeller som `products`, `shopping_list`, `inventory` och framtida `recipes` ska därför inte innehålla `user_id` eller `household_id` för dataisolering.

- Supabase Auth ska inte användas.
- Supabase är permanent source of truth.
- `localStorage` ska inte användas för permanent appdata.
- React-state används endast för UI-state och optimistiska uppdateringar.
- Services ska hållas kompatibla med framtida Supabase Realtime-prenumerationer för synkning mellan öppna enheter.

---

# Folder Structure

src/

    app/

    components/

    features/

        shopping/

        inventory/

        recipes/

        settings/

    services/

    lib/

    hooks/

    types/

---

# Database

## products

Alla produkter finns endast en gång.

Exempel:

- Mjölk
- Grädde
- Pasta

---

## shopping_list

Refererar alltid till products.

---

## inventory

Refererar alltid till products.

Lagrar:

- status
- mängd
- utgångsdatum

---

## recipes

Lagrar recept.

---

## recipe_ingredients

Koppling mellan recept och produkter.

---

# User Flow

## Shopping

Sök produkt

↓

Produkter hämtas från products

↓

Välj produkt

↓

Lägg till i shopping_list

↓

Markera som köpt

↓

Flyttas till inventory

↓

Status = Full

---

## Inventory

Visa produkter.

Status:

- Full
- Halv
- Lite kvar
- Slut

När status blir "Slut"

↓

Föreslå:

"Lägg till på inköpslistan"

---

## Recipes

Visa recept.

Kontrollera inventory.

Visa:

- Har hemma
- Saknas

Knapp:

"Lägg till saknade"

---

# Design

Mobile First.

Fast Bottom Navigation.

Floating Action Button.

Apple-inspirerad design.

Minimalism.

Mycket whitespace.

---

# Performance

- Debounce sökningar.
- Minimera renderingar.
- Minimera databasanrop.
- Server Components när möjligt.
- Client Components endast när det behövs.

---

# Future

## AI

- Receptförslag.
- Smart inköpslista.
- Matsvinn.
- Måltidsplanering.

## Barcode

Skanna produkt.

↓

Lägg till i inventory.

## Realtime

Supabase Realtime för gemensam synkning av `shopping_list`, `inventory` och `recipes` mellan alla öppna enheter.
