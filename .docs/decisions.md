# Architecture Decisions

## ADR-001: Ett globalt hushåll utan användarkonton

### Status

Beslutad.

### Beslut

MAT byggs för ett enda gemensamt hushåll. Appen har ingen login och alla enheter som använder samma publicerade webbadress läser och skriver samma data i Supabase.

- Implementera inte Supabase Auth.
- Lägg inte till `user_id` eller `household_id` för att separera data.
- `products`, `shopping_list`, `inventory` och framtida `recipes` är globala gemensamma tabeller.
- Supabase är source of truth för permanent data.
- Använd inte `localStorage` för permanent appdata.
- React-state är tillåtet för UI och optimistiska uppdateringar.
- Datatjänster och klientstate ska utformas så att Supabase Realtime kan införas senare för synkning mellan flera öppna enheter.

### Konsekvenser

Alla mutationer blir omedelbart relevanta för hela hushållet. Framtida Realtime-prenumerationer ska därför kunna sammanfoga serverhändelser med optimistiskt klientstate utan användar- eller hushållsfilter.
