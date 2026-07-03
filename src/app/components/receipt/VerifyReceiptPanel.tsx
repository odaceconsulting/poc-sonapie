import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  verifyReceiptToken,
  getStoredReceipt,
  type VerifyResult,
  formatReceiptAmount,
  paymentLabel,
} from "../../lib/receipt";
import { BookingReceiptCard } from "./BookingReceiptCard";
import {
  Shield, ShieldCheck, ShieldX, ShieldAlert, ScanLine, Keyboard, Search, CheckCircle2, Camera,
} from "lucide-react";

type VerifyReceiptPanelProps = {
  initialToken?: string;
  mode?: "reception" | "public";
};

function extractToken(raw: string): string {
  const input = raw.trim();
  if (!input) return "";
  if (input.includes("verify=")) {
    try {
      return new URL(input).searchParams.get("verify") || input;
    } catch {
      const match = input.match(/[?&]verify=([^&]+)/);
      return match ? decodeURIComponent(match[1]) : input;
    }
  }
  return input;
}

export function VerifyReceiptPanel({ initialToken, mode = "public" }: VerifyReceiptPanelProps) {
  const reactId = useId().replace(/:/g, "");
  const scannerDivId = `sonapie-qr-scanner-${reactId}`;
  const [tab, setTab] = useState<"scan" | "manual">(initialToken ? "manual" : "scan");
  const [manualInput, setManualInput] = useState(initialToken ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handlingRef = useRef(false);

  const runVerify = useCallback(async (tokenOrRef: string) => {
    const input = tokenOrRef.trim();
    if (!input) return;

    setLoading(true);
    setResult(null);

    try {
      if (input.startsWith("RES-")) {
        const stored = getStoredReceipt(input);
        if (stored) {
          setResult(await verifyReceiptToken(stored.token));
        } else {
          setResult({
            status: "not_found",
            message: "Aucun reçu enregistré pour cette référence.",
          });
        }
      } else {
        setResult(await verifyReceiptToken(extractToken(input)));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialToken) runVerify(initialToken);
  }, [initialToken, runVerify]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) {
      setScanning(false);
      return;
    }
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      // ignore stop errors
    }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (scanning || scannerRef.current) return;
    setCameraError(null);
    setResult(null);
    handlingRef.current = false;

    // Wait for the scanner container to be in the DOM
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const el = document.getElementById(scannerDivId);
    if (!el) {
      setCameraError("Zone de scan indisponible. Réessayez.");
      return;
    }

    const isMobile = window.innerWidth < 640;
    const boxSize = Math.min(Math.floor(el.clientWidth * 0.72), isMobile ? 220 : 260);

    try {
      setScanning(true);
      const scanner = new Html5Qrcode(scannerDivId, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: { ideal: "environment" } },
        {
          fps: 12,
          qrbox: { width: boxSize, height: boxSize },
          aspectRatio: 1,
          disableFlip: false,
        },
        async (decoded) => {
          if (handlingRef.current) return;
          handlingRef.current = true;
          const token = extractToken(decoded);
          setManualInput(token);
          await stopScanner();
          await runVerify(token);
        },
        () => { /* frame without QR — ignore */ },
      );

      // iOS Safari: ensure video plays inline
      const video = el.querySelector("video");
      if (video) {
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.muted = true;
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";
      }
    } catch (err) {
      await stopScanner();
      const msg = err instanceof Error ? err.message : String(err);
      const denied = /permission|notallowed|denied|secure/i.test(msg);
      setCameraError(
        denied
          ? "Autorisez l'accès à la caméra dans les réglages du téléphone, puis réessayez."
          : "Caméra inaccessible. Utilisez la saisie manuelle ou photographiez le QR dans un environnement bien éclairé.",
      );
      setTab("manual");
    }
  }, [scanning, scannerDivId, runVerify, stopScanner]);

  useEffect(() => () => { void stopScanner(); }, [stopScanner]);

  // Auto-start camera on mobile when opening the scan tab (reception mode)
  useEffect(() => {
    if (tab !== "scan" || initialToken) return;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && mode === "reception") {
      const t = setTimeout(() => { void startScanner(); }, 350);
      return () => clearTimeout(t);
    }
  }, [tab, mode, initialToken, startScanner]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {mode === "reception" && (
        <div className="rounded-2xl bg-[#14261A] text-white px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base sm:text-lg">Contrôle d&apos;arrivée</h2>
              <p className="text-xs sm:text-sm text-white/70 leading-snug">
                Scannez le QR code du client avec la caméra du téléphone
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        <button
          type="button"
          onClick={() => { void stopScanner(); setTab("scan"); setCameraError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === "scan" ? "bg-white shadow text-foreground" : "text-muted-foreground"}`}
        >
          <ScanLine size={16} /> Scanner QR
        </button>
        <button
          type="button"
          onClick={() => { void stopScanner(); setTab("manual"); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === "manual" ? "bg-white shadow text-foreground" : "text-muted-foreground"}`}
        >
          <Keyboard size={16} /> Saisie manuelle
        </button>
      </div>

      {tab === "scan" && (
        <div className="space-y-3">
          <div
            id={scannerDivId}
            className={`sonapie-qr-reader w-full rounded-2xl overflow-hidden border-2 ${scanning ? "border-secondary" : "border-dashed border-border"} bg-black/90 relative`}
            style={{ minHeight: scanning ? undefined : 240 }}
          >
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80 p-6 text-center">
                <Camera size={36} className="text-white/50" />
                <p className="text-sm">Pointez la caméra vers le QR code du reçu</p>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
              {cameraError}
            </div>
          )}

          {!scanning ? (
            <button
              type="button"
              onClick={() => void startScanner()}
              className="w-full flex items-center justify-center gap-2 bg-secondary text-white font-semibold py-3.5 rounded-xl hover:bg-green-700 transition-colors active:scale-[0.99]"
            >
              <Camera size={18} /> Activer la caméra
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void stopScanner()}
              className="w-full border border-border py-3 rounded-xl font-medium hover:bg-muted transition-colors"
            >
              Arrêter le scan
            </button>
          )}

          <p className="text-xs text-center text-muted-foreground px-2">
            Sur mobile, autorisez l&apos;accès à la caméra arrière pour un scan rapide.
          </p>
        </div>
      )}

      {tab === "manual" && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Référence ou jeton QR</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="RES-2025-XXXX ou coller le jeton…"
              className="flex-1 min-w-0 bg-input-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary font-mono"
            />
            <button
              type="button"
              onClick={() => runVerify(manualInput)}
              disabled={loading || !manualInput.trim()}
              className="shrink-0 flex items-center justify-center gap-2 bg-primary text-white font-semibold px-5 py-3 rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              <Search size={16} />
              Vérifier
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-muted-foreground text-sm animate-pulse">
          Vérification en cours…
        </div>
      )}

      {result && !loading && <VerifyResultCard result={result} />}
    </div>
  );
}

function VerifyResultCard({ result }: { result: VerifyResult }) {
  const config = {
    valid: {
      icon: ShieldCheck,
      color: "text-secondary",
      bg: "bg-secondary/10 border-secondary/30",
      badge: "AUTHENTIQUE",
      badgeColor: "bg-secondary text-white",
    },
    invalid: {
      icon: ShieldX,
      color: "text-destructive",
      bg: "bg-destructive/10 border-destructive/30",
      badge: "NON VALIDE",
      badgeColor: "bg-destructive text-white",
    },
    expired: {
      icon: ShieldAlert,
      color: "text-orange-600",
      bg: "bg-orange-50 border-orange-200",
      badge: "EXPIRÉ",
      badgeColor: "bg-orange-500 text-white",
    },
    not_found: {
      icon: Shield,
      color: "text-muted-foreground",
      bg: "bg-muted border-border",
      badge: "INTROUVABLE",
      badgeColor: "bg-muted-foreground text-white",
    },
  }[result.status];

  const Icon = config.icon;
  const receipt = result.receipt;

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border-2 p-4 sm:p-5 ${config.bg}`}>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}>
            <Icon size={26} className={config.color} />
          </div>
          <div className="flex-1 min-w-0">
            <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mb-2 ${config.badgeColor}`}>
              {config.badge}
            </span>
            <p className={`font-semibold text-base sm:text-lg leading-snug ${config.color}`}>{result.message}</p>
            {receipt && result.status === "valid" && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Réf. </span><span className="font-mono font-bold break-all">{receipt.ref}</span></div>
                <div><span className="text-muted-foreground">Client </span><span className="font-medium">{receipt.client}</span></div>
                <div className="sm:col-span-2"><span className="text-muted-foreground">Bien </span><span className="font-medium">{receipt.property} — {receipt.city}</span></div>
                <div><span className="text-muted-foreground">Séjour </span><span>{receipt.checkIn} → {receipt.checkOut}</span></div>
                <div><span className="text-muted-foreground">Montant </span><span className="font-bold text-primary">{formatReceiptAmount(receipt.total)}</span></div>
                <div className="sm:col-span-2 flex items-center gap-1.5 text-secondary font-medium">
                  <CheckCircle2 size={14} />
                  Paiement {paymentLabel(receipt.paymentMethod)} confirmé
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {receipt && result.status === "valid" && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-primary hover:underline list-none flex items-center gap-2">
            Voir le reçu complet
          </summary>
          <div className="mt-4 overflow-x-auto">
            <BookingReceiptCard receipt={receipt} compact />
          </div>
        </details>
      )}
    </div>
  );
}
