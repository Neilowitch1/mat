export const brand = {
  name: "Kökshyllan",
  shortName: "Kökshyllan",
  url: "https://kökshyllan.se",
  description: "Håll koll på maten hemma, tillsammans.",
  themeColor: "#58755e",
  backgroundColor: "#f7f6f3",
} as const;

export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? brand.url;
