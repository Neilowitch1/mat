# AGENTS.md

# MAT

Detta är ett produktionsprojekt.

All kod ska hålla hög kvalitet, vara lätt att underhålla och följa moderna rekommendationer.

---

# Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Vercel

---

# Design Principles

Bygg alltid mobile-first.

Appen ska kännas som en native iOS/Android-app.

Prioritera:

- enkelhet
- snabbhet
- få tryck
- mycket whitespace
- mjuka hörn
- konsekvent design

Använd befintliga komponenter före nya.

---

# Coding Rules

## TypeScript

- använd aldrig `any`
- använd stark typning
- återanvänd typer
- duplicera inte typer

## React

- små komponenter
- ett tydligt ansvar per komponent
- minimera state
- inga onödiga re-renders

## Next.js

- använd Server Components där det är möjligt
- använd Client Components endast när det behövs
- använd Server Actions för mutationer när det passar
- använd App Router-konventioner

## Supabase

- all databaslogik ska ligga utanför UI
- använd services eller server actions
- ingen SQL i komponenter

---

# UI Rules

Använd shadcn/ui där det är möjligt.

Bygg inte egna versioner av:

- Dialog
- Sheet
- Button
- Input
- Select
- Popover

om shadcn redan erbjuder dem.

---

# File Changes

Ändra endast filer som behövs.

Skapa inte nya filer om befintliga kan återanvändas.

Ta inte bort fungerande kod utan anledning.

---

# Performance

Undvik:

- onödiga renders
- duplicerad state
- duplicerade requests

Debounce sökningar.

Cache där det är rimligt.

---

# Before finishing

Kontrollera alltid:

- inga TypeScript-fel
- inga ESLint-fel
- inga duplicerade imports
- inga duplicerade variabler
- inga oanvända imports
- inga oanvända states
- inga trasiga JSX-taggar

Om något av ovanstående finns:

ÅTGÄRDA DET INNAN DU PRESENTERAR ÄNDRINGARNA.

---

# When responding

Efter ändringarna ska du alltid skriva:

## Summary

- vilka filer ändrades
- varför

## Validation

Bekräfta att:

- projektet kompilerar
- TypeScript passerar
- ESLint passerar

Om du INTE har verifierat detta ska du säga det tydligt.

## Server Components

Om en sida endast läser data:

- använd async Server Components
- använd inte useEffect
- använd inte useState
- hämta data direkt från servern