"use client";

import { useEffect, useRef, useState } from "react";
import { ScanBarcode, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BarcodeScannerProps {
  disabled?: boolean;
  onDetected: (barcode: string) => void | Promise<void>;
}

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
}

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

const barcodeFormats = ["ean_8", "ean_13", "upc_a", "upc_e"];

function getCameraErrorMessage(error: unknown): string {
  if (!(error instanceof DOMException)) return "Kameran kunde inte startas. Försök igen.";
  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "Kameraåtkomst nekades. Tillåt kameran i webbläsarens inställningar och försök igen.";
  }
  if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
    return "Ingen användbar kamera hittades på enheten.";
  }
  if (error.name === "NotReadableError" || error.name === "AbortError") {
    return "Kameran används av en annan app eller kunde inte öppnas.";
  }
  return "Kameran kunde inte startas. Försök igen.";
}

export default function BarcodeScanner({ disabled = false, onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fallbackStopRef = useRef<(() => void) | null>(null);
  const noResultTimerRef = useRef<number | null>(null);
  const scanSessionRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Startar kameran...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function stopScanner() {
    scanSessionRef.current += 1;
    if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    fallbackStopRef.current?.();
    fallbackStopRef.current = null;
    if (noResultTimerRef.current !== null) window.clearTimeout(noResultTimerRef.current);
    noResultTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function closeScanner() {
    stopScanner();
    setIsOpen(false);
  }

  async function finishScan(rawValue: string, session: number) {
    if (session !== scanSessionRef.current) return;
    const barcode = rawValue.replace(/\D/g, "");
    if (barcode.length < 6 || barcode.length > 14) return;
    stopScanner();
    setIsOpen(false);
    await onDetected(barcode);
  }

  async function startNativeDetector(Detector: BarcodeDetectorConstructor, video: HTMLVideoElement, session: number) {
    const detector = new Detector({ formats: barcodeFormats });
    const detectFrame = async () => {
      if (session !== scanSessionRef.current) return;
      try {
        const barcodes = await detector.detect(video);
        if (barcodes[0]?.rawValue) {
          await finishScan(barcodes[0].rawValue, session);
          return;
        }
      } catch {
        // En enstaka bildruta kan vara oläsbar. Fortsätt med nästa.
      }
      animationFrameRef.current = window.requestAnimationFrame(() => void detectFrame());
    };
    void detectFrame();
  }

  async function startFallbackDetector(stream: MediaStream, video: HTMLVideoElement, session: number) {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    if (session !== scanSessionRef.current) return;
    const reader = new BrowserMultiFormatReader();
    const controls = await reader.decodeFromStream(stream, video, (result) => {
      if (result) void finishScan(result.getText(), session);
    });
    if (session !== scanSessionRef.current) {
      controls.stop();
      return;
    }
    fallbackStopRef.current = () => controls.stop();
  }

  async function startScanner() {
    if (disabled) return;
    stopScanner();
    const session = scanSessionRef.current;
    setIsOpen(true);
    setErrorMessage(null);
    setStatusMessage("Startar kameran...");

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("Camera API unavailable", "NotFoundError");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (session !== scanSessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video preview unavailable");
      video.srcObject = stream;
      await video.play();
      setStatusMessage("Rikta kameran mot streckkoden");
      noResultTimerRef.current = window.setTimeout(() => {
        setStatusMessage("Ingen kod hittades ännu. Håll kameran stilla och prova lite närmare.");
      }, 12_000);

      const Detector = (window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (Detector) await startNativeDetector(Detector, video, session);
      else await startFallbackDetector(stream, video, session);
    } catch (error) {
      if (session !== scanSessionRef.current) return;
      stopScanner();
      setErrorMessage(getCameraErrorMessage(error));
      setStatusMessage("Kameran kunde inte startas");
    }
  }

  useEffect(() => stopScanner, []);

  return (
    <>
      <Button type="button" variant="outline" size="icon" disabled={disabled} onClick={() => void startScanner()} aria-label="Skanna streckkod" className="h-10 w-10 shrink-0 rounded-2xl">
        <ScanBarcode aria-hidden="true" className="size-5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black" role="dialog" aria-modal="true" aria-labelledby="barcode-scanner-title">
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            <video ref={videoRef} muted playsInline autoPlay className="h-full w-full object-cover" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-[12%] top-1/2 aspect-[1.7/1] -translate-y-1/2 rounded-3xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.38)]" />
            <Button type="button" variant="secondary" size="icon" onClick={closeScanner} aria-label="Avbryt skanning" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] rounded-full bg-black/55 text-white hover:bg-black/70">
              <X aria-hidden="true" />
            </Button>
          </div>
          <div className="bg-black px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 text-center text-white">
            <h2 id="barcode-scanner-title" className="font-semibold">Skanna streckkod</h2>
            <p className="mt-1 text-sm text-white/75">{statusMessage}</p>
            {errorMessage && <p role="alert" className="mt-3 rounded-2xl bg-white/10 px-3 py-2 text-sm">{errorMessage}</p>}
            <Button type="button" variant="secondary" onClick={closeScanner} className="mt-4 rounded-2xl">Avbryt</Button>
          </div>
        </div>
      )}
    </>
  );
}
