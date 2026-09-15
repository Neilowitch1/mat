import { ArrowDown, ArrowRight, Barcode, BookOpen, Check, House, Search, ShoppingCart, UserRound, UsersRound, X } from "lucide-react";
import type { ReactNode } from "react";
import AppCard from "@/components/AppCard";
import BrandMark from "@/components/BrandMark";
import { navigationItems } from "@/components/navigationItems";
import { inventoryLocationIcons, inventoryStatuses } from "@/features/inventory/components/inventoryFormOptions";
import styles from "./introduction.module.css";

function MiniCard({ children }: { children: ReactNode }) {
  return <AppCard className="w-full space-y-3 rounded-[20px] p-4 text-xs">{children}</AppCard>;
}

function MiniAction({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-center text-[11px] font-medium text-primary-foreground">{children}</div>;
}

function HomeForm({ scanning = false }: { scanning?: boolean }) {
  const Fridge = inventoryLocationIcons.fridge;
  return <MiniCard>
    <div className="flex items-center gap-2 font-semibold"><House size={16} className="text-primary" />Lägg till hemma</div>
    {scanning && <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-muted-foreground"><Search size={14} /><span className="flex-1">Sök vara eller skanna</span><span className={styles.scanner}><Barcode size={26} /></span></div>}
    <div className="font-semibold">Mjölk</div>
    <div className="grid grid-cols-2 gap-2">
      <div><span className="text-[10px] text-muted-foreground">Mängd</span><div className="mt-1 rounded-lg border border-border bg-background p-2">1 l</div></div>
      <div><span className="text-[10px] text-muted-foreground">Plats</span><div className="mt-1 flex items-center gap-1.5 rounded-lg bg-accent p-2 text-primary"><Fridge size={13} />Kyl<Check size={12} className="ml-auto" /></div></div>
    </div>
    <div className="flex items-center justify-between"><span className="text-muted-foreground">Status</span><span className="rounded-full bg-accent px-3 py-1 text-primary">Full</span></div>
    {scanning ? <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">Bäst före</span><span>25 september</span></div> : <p className="text-[10px] text-primary">Samma plats som förra gången</p>}
  </MiniCard>;
}

export default function IntroductionVisual({ step }: { step: number }) {
  if (step === 0) return <div className="flex w-full flex-col items-center gap-7 py-7">
    <BrandMark variant="auth" className="max-w-[190px] sm:max-w-[210px]" imageClassName="h-auto object-contain" />
    <div className="flex w-full items-center justify-center gap-2">{navigationItems.map(({ label, icon: Icon }, index) => <div key={label} className="contents">
      {index > 0 && <ArrowRight size={14} className={`shrink-0 text-primary ${styles.transfer}`} />}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-2xl border border-border bg-card px-1 py-4 shadow-sm"><Icon size={26} strokeWidth={1.6} className="text-primary" /><span className="text-[10px] font-semibold sm:text-xs">{label}</span></div>
    </div>)}</div>
  </div>;

  if (step === 1) return <HomeForm scanning />;

  if (step === 2) return <div className="w-full space-y-2">
    <MiniCard>
      <div className="flex items-center gap-2 text-primary"><House size={16} /><span className="font-semibold">Hemma</span></div>
      <div className="flex justify-between font-semibold"><span>Mjölk</span><span className="font-normal text-muted-foreground">1 l · Kyl</span></div>
      <div className="flex items-center justify-between gap-1">{inventoryStatuses.filter(({ value }) => ["full", "low", "empty"].includes(value)).map(({ label }, index) => <span key={label} className={`${styles.status} rounded-full bg-secondary px-3 py-1.5 text-[10px]`} style={{ animationDelay: `${index * 1.2}s` }}>{label}</span>)}</div>
      <MiniAction><ShoppingCart size={14} />Lägg till i inköpslistan</MiniAction>
    </MiniCard>
    <ArrowDown size={18} className={`mx-auto text-primary ${styles.transfer}`} />
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-xs"><ShoppingCart size={16} className="text-primary" /><span className="flex-1 font-semibold">Inköpslista</span><span>Mjölk</span><Check size={14} className="text-primary" /></div>
  </div>;

  if (step === 3) return <div className="w-full space-y-2">
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-xs"><span className={`flex size-5 items-center justify-center rounded-md bg-primary text-primary-foreground ${styles.check}`}><Check size={14} /></span><span className="flex-1">Mjölk</span><span className="text-primary">Handlat!</span></div>
    <ArrowDown size={18} className={`mx-auto text-primary ${styles.transfer}`} />
    <HomeForm />
  </div>;

  if (step === 4) return <MiniCard>
    <div className="flex items-center gap-2 text-primary"><BookOpen size={18} /><span className="font-semibold">Pannkakor</span></div>
    <div className="flex gap-2 text-[10px]"><span className="rounded-full bg-accent px-2 py-1 text-primary">2 av 3 finns hemma</span><span className="rounded-full bg-secondary px-2 py-1">4 portioner</span></div>
    <div className="divide-y divide-border">{[{ name: "Mjölk", amount: "6 dl", available: true }, { name: "Vetemjöl", amount: "3 dl", available: true }, { name: "Ägg", amount: "3 st", available: false }].map(({ name, amount, available }) => <div key={name} className="flex items-center gap-2 py-3">
      {available ? <Check size={15} className="text-primary" /> : <X size={15} className="text-destructive" />}
      <span className="flex-1">{name} <span className="text-[10px] text-muted-foreground">{amount}</span></span><span className={`text-[10px] ${available ? "text-primary" : "text-destructive"}`}>{available ? "Finns hemma" : "Saknas"}</span>
    </div>)}</div>
    <MiniAction><ShoppingCart size={14} />Lägg till saknade i inköpslistan</MiniAction>
  </MiniCard>;

  return <div className="flex w-full flex-col items-center gap-4 py-3">
    <div className="flex w-full items-center justify-center gap-7">{[0, 1, 2].map((index) => <span key={index} className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm"><UserRound size={24} strokeWidth={1.5} /></span>)}</div>
    <div className="h-5 w-2/3 rounded-b-xl border-x border-b border-primary/30" />
    <MiniCard>
      <div className="flex items-center justify-center gap-2 font-semibold text-primary"><UsersRound size={22} />Vårt hushåll</div>
      <div className="flex justify-center gap-3 border-t border-border pt-3">{navigationItems.map(({ label, icon: Icon }) => <div key={label} className="flex flex-col items-center gap-1.5 text-[10px]"><Icon size={20} className="text-primary" />{label}</div>)}</div>
      <p className="flex items-center justify-center gap-1 text-[10px] text-primary"><Check size={13} />Uppdaterat för alla</p>
    </MiniCard>
  </div>;
}
