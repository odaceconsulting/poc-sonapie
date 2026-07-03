import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  type SonapieReceipt,
  getVerifyUrl,
  formatReceiptAmount,
  formatReceiptDate,
  paymentLabel,
  SONAPIE_LOGO,
} from "../../lib/receipt";

type BookingReceiptCardProps = {
  receipt: SonapieReceipt;
  id?: string;
  compact?: boolean;
};

export function BookingReceiptCard({ receipt, id = "sonapie-receipt", compact = false }: BookingReceiptCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, getVerifyUrl(receipt.token), {
      width: compact ? 96 : 112,
      margin: 1,
      color: { dark: "#14261A", light: "#FFFFFF" },
    }).then(() => setQrReady(true));
  }, [receipt.token, compact]);

  return (
    <div id={id} className="overflow-hidden rounded-xl border border-border bg-white shadow-lg">
      <div className="bg-[#14261A] px-6 py-5 text-white border-b-2 border-primary">
        <div className="flex items-start justify-between gap-4">
          <img src={SONAPIE_LOGO} alt="SONAPIE" className="h-9 w-auto object-contain" />
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-white/50">République de Côte d&apos;Ivoire</p>
            <h2 className="text-lg font-bold mt-1">Reçu officiel</h2>
            <p className="text-xs text-white/70 mt-0.5">{formatReceiptDate(receipt.issuedAt)}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Référence</p>
            <p className="text-2xl font-bold text-primary font-mono mt-1">{receipt.ref}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Code vérif.</p>
            <p className="text-base font-bold text-secondary font-mono mt-1">{receipt.verifyCode}</p>
          </div>
        </div>

        <hr className="border-border" />

        <div className={`grid gap-8 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Client</p>
            <Field label="Nom" value={receipt.client} />
            <Field label="E-mail" value={receipt.email} />
            <Field label="Téléphone" value={receipt.phone} />
          </div>
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Séjour</p>
            <Field label="Établissement" value={receipt.property} bold />
            <Field label="Ville" value={receipt.city} />
            <Field label="Dates" value={`${receipt.checkIn} → ${receipt.checkOut}`} />
            <Field label="Durée" value={`${receipt.nights} nuit(s) · ${receipt.guests} pers.`} />
          </div>
        </div>

        <hr className="border-border" />

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Paiement</p>
          <AmountRow label={`Sous-total (${receipt.nights} nuit(s))`} value={formatReceiptAmount(receipt.subtotal)} />
          <AmountRow label="Frais de service" value={formatReceiptAmount(receipt.fees)} />
          <AmountRow label="Mode" value={paymentLabel(receipt.paymentMethod)} />
          <hr className="border-border my-2" />
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-foreground">Total acquitté</span>
            <span className="text-xl font-bold text-primary">{formatReceiptAmount(receipt.total)}</span>
          </div>
        </div>

        <hr className="border-border" />

        <div className={`flex items-center gap-5 ${compact ? "flex-col text-center" : ""}`}>
          <canvas ref={canvasRef} className={`rounded-lg ${qrReady ? "opacity-100" : "opacity-30"}`} />
          <div className="text-sm text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-1">Vérification à l&apos;arrivée</p>
            <p>Présentez ce QR code à la réception SONAPIE.</p>
            <p className="text-xs font-mono text-secondary mt-2">ID {receipt.verifyCode}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 border-t border-border bg-muted/30 flex justify-between items-center gap-3">
        <p className="text-[10px] text-muted-foreground">Document certifié SONAPIE — Patrimoine de l&apos;État</p>
        <p className="text-[10px] font-semibold text-secondary shrink-0">sonapie.ci</p>
      </div>
    </div>
  );
}

function Field({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm mt-0.5 ${bold ? "font-semibold text-foreground" : "text-foreground"}`}>{value || "—"}</p>
    </div>
  );
}

function AmountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}
