# Kökshyllan

Kökshyllan hjälper hushåll att hålla koll på maten hemma, planera inköp och samla recept. Appen är byggd med Next.js, TypeScript och Supabase och har `https://kökshyllan.se` som permanent publik adress.

Tillfälliga logotyp- och appikonsfiler samt instruktioner för slutliga tillgångar finns i `public/brand/README.md`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Production configuration

- Vercel: add `kökshyllan.se` as the primary domain, redirect `www.kökshyllan.se` to it, and set `NEXT_PUBLIC_APP_URL=https://kökshyllan.se` for production.
- Supabase: set **Site URL** to `https://kökshyllan.se` and allow `https://kökshyllan.se/auth/callback`. Keep `http://localhost:3000/auth/callback` for local development.
- Resend: verify `kökshyllan.se` (or a dedicated sending subdomain), add the DNS records Resend provides, and set `RESEND_FROM_EMAIL=Kökshyllan <inbjudan@kökshyllan.se>` after verification.
- App Store / Google Play: publish the product name as **Kökshyllan** and use `https://kökshyllan.se` for the website, support, privacy, and universal/app-link domain fields. Add platform association files only when native app identifiers are finalized.
