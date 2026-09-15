"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import IntroductionVisual from "./IntroductionVisual";
import styles from "./introduction.module.css";

const steps = [
  { title: "Välkommen till Kökshyllan!", text: "Håll koll på vad ni har hemma, vad som behöver handlas och vilka recept ni kan laga. Enklare matvardag, mindre svinn." },
  { title: "Håll koll på vad som finns hemma", text: "Lägg till varor manuellt eller skanna streckkoden. Ange mängd, plats och bäst före så håller Kökshyllan koll åt er. Samma streckkod känns igen nästa gång." },
  { title: "Börjar något ta slut?", text: "Lägg det direkt i inköpslistan från Hemmet – utan att skriva in varan igen. Enkelt och snabbt." },
  { title: "Från inköpslistan till Hemmet", text: "Bocka av det du handlat och lägg tillbaka varan i Hemmet med bara några tryck. Kökshyllan kommer dessutom ihåg var varan brukar förvaras." },
  { title: "Laga med det ni har hemma", text: "Lägg in mat- och bakrecept. Kökshyllan jämför ingredienserna med era varor så att ni ser vad ni har och vad som saknas. Lägg till saknade ingredienser i inköpslistan med ett tryck." },
  { title: "Använd Kökshyllan tillsammans", text: "Bjud in andra till hushållet så delar ni samma Hemma, inköpslista och recept – uppdaterat för alla. Perfekt för familj, sambos eller vänner som lagar mat ihop." },
] as const;

export default function IntroductionDialog({ open, saving, error, onFinish }: {
  open: boolean; saving: boolean; error: string | null; onFinish: () => void;
}) {
  // Let Portal unmount Popup and Backdrop together after closing. Removing Popup
  // early clears the ref Base UI needs for cleanup. Portal also resets the steps.
  return <Dialog.Root open={open} disablePointerDismissal onOpenChange={(next) => { if (!next && !saving) onFinish(); }}>
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-[#222722]/30 backdrop-blur-sm" />
      <IntroductionContent saving={saving} error={error} onFinish={onFinish} />
    </Dialog.Portal>
  </Dialog.Root>;
}

function IntroductionContent({ saving, error, onFinish }: {
  saving: boolean; error: string | null; onFinish: () => void;
}) {
  const [step, setStep] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const current = steps[step];

  function goTo(next: number) {
    if (saving) return;
    setStep(Math.max(0, Math.min(steps.length - 1, next)));
    titleRef.current?.focus({ preventScroll: true });
  }

  return <Dialog.Popup initialFocus={titleRef} className={`${styles.dialog} fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border border-border bg-popover text-popover-foreground shadow-[0_18px_60px_rgba(34,39,34,0.18)]`}>
    <div className="flex shrink-0 items-center justify-between px-5 pt-3 sm:px-8">
      <span className="text-xs font-semibold text-muted-foreground" aria-label={`Steg ${step + 1} av 6`}>{step + 1}/6</span>
      <Dialog.Close render={<Button variant="ghost" disabled={saving} className="min-h-11 text-xs text-muted-foreground" />}>Hoppa över</Dialog.Close>
    </div>
    <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-3 sm:px-8" style={{ touchAction: "pan-y" }}
      onTouchStart={(event) => {
        if (saving || event.touches.length !== 1 || (event.target as HTMLElement).closest("button,a,input,select,textarea")) { touch.current = null; return; }
        touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }}
      onTouchCancel={() => { touch.current = null; }}
      onTouchEnd={(event) => {
        const start = touch.current;
        touch.current = null;
        if (!start || !event.changedTouches[0]) return;
        const dx = event.changedTouches[0].clientX - start.x;
        const dy = event.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) goTo(step + (dx < 0 ? 1 : -1));
      }}>
      <div key={step} className={styles.visual} aria-hidden="true"><IntroductionVisual step={step} /></div>
      <div aria-live="polite" aria-atomic="true">
        <Dialog.Title ref={titleRef} tabIndex={-1} className="mt-5 text-center text-2xl font-bold leading-tight tracking-[-0.025em] outline-none">{current.title}</Dialog.Title>
        <Dialog.Description className="mt-3 text-center text-sm leading-6 text-muted-foreground">{current.text}</Dialog.Description>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
    <div className="shrink-0 px-5 pb-5 pt-3 sm:px-8 sm:pb-7">
      <div className="mb-5 flex justify-center gap-2" aria-hidden="true">{steps.map((_, index) => <span key={index} className={`h-1.5 rounded-full ${index === step ? "w-5 bg-primary" : "w-1.5 bg-border"}`} />)}</div>
      <div className="flex gap-3">
        {step > 0 && <Button variant="outline" size="lg" disabled={saving} onClick={() => goTo(step - 1)}><ArrowLeft aria-hidden="true" />Tillbaka</Button>}
        <Button size="lg" className="flex-1" disabled={saving} onClick={() => step === steps.length - 1 ? onFinish() : goTo(step + 1)}>{saving ? "Sparar…" : step === steps.length - 1 ? "Kom igång!" : "Nästa"}{!saving && <ArrowRight aria-hidden="true" />}</Button>
      </div>
    </div>
  </Dialog.Popup>;
}
