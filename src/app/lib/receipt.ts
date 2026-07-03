import { SONAPIE_LOGO } from "../constants/brand";
import QRCode from "qrcode";

/** Clé de signature locale (POC — en production : secret serveur) */
const RECEIPT_SECRET = "SONAPIE-CI-PATRIMOINE-2026";

export interface ReceiptPayload {
  ref: string;
  propertyId: string;
  property: string;
  city: string;
  client: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  subtotal: number;
  fees: number;
  total: number;
  paymentMethod: string;
  idType?: string;
  idNumber?: string;
  issuedAt: string;
}

export interface SonapieReceipt extends ReceiptPayload {
  token: string;
  verifyCode: string;
}

export type VerifyStatus = "valid" | "invalid" | "expired" | "not_found";

export interface VerifyResult {
  status: VerifyStatus;
  receipt?: SonapieReceipt;
  message: string;
}

const STORAGE_KEY = "sonapie:receipts";

async function sha256Short(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 20)
    .toUpperCase();
}

export async function signPayload(payload: ReceiptPayload): Promise<string> {
  return sha256Short(JSON.stringify(payload) + RECEIPT_SECRET);
}

export function buildVerifyCode(sig: string): string {
  return sig.slice(0, 4) + "-" + sig.slice(4, 8) + "-" + sig.slice(8, 12);
}

export async function createReceiptToken(payload: ReceiptPayload): Promise<string> {
  const sig = await signPayload(payload);
  return btoa(unescape(encodeURIComponent(JSON.stringify({ ...payload, sig }))));
}

export async function parseReceiptToken(token: string): Promise<(ReceiptPayload & { sig: string }) | null> {
  try {
    const decoded = JSON.parse(decodeURIComponent(escape(atob(token))));
    if (!decoded?.ref || !decoded?.sig) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function verifyReceiptToken(token: string): Promise<VerifyResult> {
  const parsed = await parseReceiptToken(token);
  if (!parsed) {
    return { status: "invalid", message: "QR code ou jeton invalide — document non reconnu." };
  }

  const { sig, ...payload } = parsed;
  const expected = await signPayload(payload as ReceiptPayload);

  if (sig !== expected) {
    return { status: "invalid", message: "Signature cryptographique invalide — reçu potentiellement falsifié." };
  }

  const stored = getStoredReceipt(payload.ref);
  const receipt: SonapieReceipt = stored ?? {
    ...(payload as ReceiptPayload),
    token,
    verifyCode: buildVerifyCode(sig),
  };

  const issued = new Date(payload.issuedAt);
  const daysSince = (Date.now() - issued.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > 365) {
    return {
      status: "expired",
      receipt,
      message: "Ce reçu a dépassé la durée de validité (12 mois).",
    };
  }

  return {
    status: "valid",
    receipt,
    message: "Reçu authentique — réservation vérifiée par SONAPIE.",
  };
}

export function getStoredReceipts(): Record<string, SonapieReceipt> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getStoredReceipt(ref: string): SonapieReceipt | null {
  return getStoredReceipts()[ref] ?? null;
}

export function saveReceipt(receipt: SonapieReceipt): void {
  const all = getStoredReceipts();
  all[receipt.ref] = receipt;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export async function issueReceipt(data: Omit<ReceiptPayload, "issuedAt">): Promise<SonapieReceipt> {
  const payload: ReceiptPayload = {
    ...data,
    issuedAt: new Date().toISOString(),
  };
  const sig = await signPayload(payload);
  const token = await createReceiptToken(payload);
  const receipt: SonapieReceipt = {
    ...payload,
    token,
    verifyCode: buildVerifyCode(sig),
  };
  saveReceipt(receipt);
  return receipt;
}

export function getVerifyUrl(token: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://poc-sonapie.vercel.app";
  return `${base}/?verify=${encodeURIComponent(token)}`;
}

const PAYMENT_LABELS: Record<string, string> = {
  "orange-money": "Orange Money",
  "mtn-money": "MTN Money",
  wave: "Wave",
  "tresor-pay": "Trésor Pay",
  card: "Carte bancaire",
  admin: "Paiement administratif",
};

export function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method;
}

export function formatReceiptAmount(amount: number): string {
  const n = Math.round(Number(amount) || 0);
  const formatted = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted} FCFA`;
}

export function formatReceiptDate(isoOrDisplay: string): string {
  const d = new Date(isoOrDisplay);
  if (!Number.isNaN(d.getTime()) && isoOrDisplay.includes("T")) {
    return d.toLocaleDateString("fr-CI", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  return isoOrDisplay;
}

export function buildWhatsAppMessage(receipt: SonapieReceipt, withAttachmentNote = true): string {
  const line = "━━━━━━━━━━━━━━━━━━━━━━";
  const lines = [
    "🏛️ *SONAPIE — RÉPUBLIQUE DE CÔTE D'IVOIRE*",
    "_Patrimoine immobilier de l'État_",
    "",
    line,
    "✅ *REÇU OFFICIEL DE RÉSERVATION*",
    line,
    "",
    `Bonjour *${receipt.client}*, 👋`,
    "",
    "Votre paiement a été *confirmé avec succès*. Merci de votre confiance.",
    "",
    "📋 *RÉSERVATION*",
    `▸ Référence : *${receipt.ref}*`,
    `▸ Code vérif. : *${receipt.verifyCode}*`,
    "",
    "🏨 *SÉJOUR*",
    `▸ Établissement : *${receipt.property}*`,
    `▸ Ville : ${receipt.city}`,
    `▸ Dates : ${receipt.checkIn} → ${receipt.checkOut}`,
    `▸ Durée : ${receipt.nights} nuit${receipt.nights > 1 ? "s" : ""} · ${receipt.guests} voyageur${receipt.guests > 1 ? "s" : ""}`,
    "",
    "💳 *PAIEMENT*",
    `▸ Mode : ${paymentLabel(receipt.paymentMethod)}`,
    `▸ *Total acquitté : ${formatReceiptAmount(receipt.total)}*`,
    "",
    line,
  ];

  if (withAttachmentNote) {
    lines.push(
      "📎 *Pièce jointe :* reçu PDF officiel SONAPIE",
      "_Le document contient votre QR code de vérification._",
      "",
    );
  }

  lines.push(
    "🔐 *À l'arrivée*",
    "Présentez le QR code du reçu à la réception.",
    "Notre équipe scannera le document pour valider votre réservation.",
    "",
    "— *SONAPIE*",
    "Société Nationale de Gestion du Patrimoine de l'État",
    "🇨🇮 Côte d'Ivoire · 🌐 sonapie.ci",
  );

  return lines.join("\n");
}

export function getReceiptPdfFilename(receipt: SonapieReceipt): string {
  return `SONAPIE-${receipt.ref}-recu.pdf`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type WhatsAppShareResult = "whatsapp-opened" | "failed";

function normalizeWhatsAppPhone(phone?: string): string {
  let digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return "";
  if (digits.startsWith("0") && digits.length === 10) digits = `225${digits.slice(1)}`;
  if (digits.length === 8) digits = `225${digits}`;
  return digits.length >= 11 ? digits : "";
}

function openWhatsAppDirect(phone: string, message: string): void {
  const encoded = encodeURIComponent(message);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (phone) {
    if (isMobile) {
      window.location.href = `whatsapp://send?phone=${phone}&text=${encoded}`;
      return;
    }
    window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`, "_blank", "noopener,noreferrer");
    return;
  }

  if (isMobile) {
    window.location.href = `whatsapp://send?text=${encoded}`;
    return;
  }
  window.open(`https://web.whatsapp.com/send?text=${encoded}`, "_blank", "noopener,noreferrer");
}

export async function shareReceiptViaWhatsApp(
  receipt: SonapieReceipt,
  phone?: string,
): Promise<WhatsAppShareResult> {
  try {
    const pdfBlob = await generateReceiptPdfBlob(receipt);
    const filename = getReceiptPdfFilename(receipt);
    triggerBlobDownload(pdfBlob, filename);

    const waPhone = normalizeWhatsAppPhone(phone);
    const message = [
      buildWhatsAppMessage(receipt, false),
      "",
      `📎 *Pièce jointe :* ${filename}`,
      "_Le reçu PDF vient d'être téléchargé sur votre appareil._",
      "_Dans WhatsApp : appuyez sur 📎 puis sélectionnez le fichier pour l'envoyer._",
    ].join("\n");

    setTimeout(() => openWhatsAppDirect(waPhone, message), 400);
    return "whatsapp-opened";
  } catch {
    return "failed";
  }
}

/** @deprecated Utiliser shareReceiptViaWhatsApp */
export function openWhatsAppShare(receipt: SonapieReceipt, phone?: string): void {
  void shareReceiptViaWhatsApp(receipt, phone);
}

async function loadAssetDataUrl(path: string): Promise<string> {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`Asset introuvable: ${path}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function pdfHLine(doc: import("jspdf").jsPDF, y: number, m: number, w: number) {
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.line(m, y, w - m, y);
}

function pdfField(
  doc: import("jspdf").jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  maxW: number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(26, 26, 46);
  const lines = doc.splitTextToSize(value, maxW);
  doc.text(lines, x, y + 5);
  return y + 5 + lines.length * 4.2 + 5;
}

async function buildReceiptPdfDocument(receipt: SonapieReceipt) {
  const { jsPDF } = await import("jspdf");

  const [logoDataUrl, qrDataUrl] = await Promise.all([
    loadAssetDataUrl(SONAPIE_LOGO),
    QRCode.toDataURL(getVerifyUrl(receipt.token), {
      width: 280,
      margin: 1,
      color: { dark: "#14261A", light: "#FFFFFF" },
    }),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W = 210;
  const M = 18;
  const R = W - M;
  const CW = W - M * 2;

  // En-tête épuré
  doc.setFillColor(20, 38, 26);
  doc.rect(0, 0, W, 48, "F");
  doc.setFillColor(245, 124, 0);
  doc.rect(0, 48, W, 1.5, "F");

  doc.addImage(logoDataUrl, "PNG", M, 14, 55, 15);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("REPUBLIQUE DE COTE D'IVOIRE", R, 18, { align: "right" });
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text("Recu officiel", R, 28, { align: "right" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Reservation patrimoniale", R, 35, { align: "right" });
  doc.setFontSize(7);
  doc.setTextColor(200, 200, 200);
  doc.text(`Emis le ${formatReceiptDate(receipt.issuedAt)}`, R, 42, { align: "right" });

  let y = 60;

  // Référence — sans cadre
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 130, 130);
  doc.text("REFERENCE", M, y);
  doc.text("CODE DE VERIFICATION", R, y, { align: "right" });
  y += 6;
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(245, 124, 0);
  doc.text(receipt.ref, M, y);
  doc.setFontSize(13);
  doc.setTextColor(0, 158, 73);
  doc.text(receipt.verifyCode, R, y, { align: "right" });

  y += 12;
  pdfHLine(doc, y, M, W);
  y += 10;

  // Client & Séjour — deux colonnes, sans cadres
  const colW = CW / 2 - 4;
  let yLeft = y;
  let yRight = y;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(245, 124, 0);
  doc.text("CLIENT", M, yLeft);
  doc.text("SEJOUR", M + colW + 8, yRight);
  yLeft += 7;
  yRight += 7;

  [
    ["Nom", receipt.client],
    ["E-mail", receipt.email || "-"],
    ["Telephone", receipt.phone || "-"],
    ...(receipt.idNumber ? [[`${receipt.idType || "Piece"}`, receipt.idNumber]] : []),
  ].forEach(([l, v]) => { yLeft = pdfField(doc, l, v, M, yLeft, colW); });

  [
    ["Etablissement", receipt.property],
    ["Ville", receipt.city],
    ["Arrivee", receipt.checkIn],
    ["Depart", receipt.checkOut],
    ["Duree", `${receipt.nights} nuit(s) · ${receipt.guests} pers.`],
  ].forEach(([l, v]) => { yRight = pdfField(doc, l, v, M + colW + 8, yRight, colW); });

  y = Math.max(yLeft, yRight) + 4;
  pdfHLine(doc, y, M, W);
  y += 10;

  // Paiement — lignes simples
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(245, 124, 0);
  doc.text("PAIEMENT", M, y);
  y += 9;

  const amountRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 9.5);
    doc.setTextColor(bold ? 26 : 100, bold ? 26 : 100, bold ? 46 : 100);
    doc.text(label, M, y);
    doc.setTextColor(bold ? 245 : 26, bold ? 124 : 26, bold ? 0 : 46);
    doc.text(value, R, y, { align: "right" });
    y += bold ? 10 : 7;
  };

  amountRow(`Sous-total (${receipt.nights} nuit(s))`, formatReceiptAmount(receipt.subtotal));
  amountRow("Frais de service", formatReceiptAmount(receipt.fees));
  amountRow("Mode de paiement", paymentLabel(receipt.paymentMethod));

  pdfHLine(doc, y, M, W);
  y += 8;
  amountRow("TOTAL ACQUITTÉ", formatReceiptAmount(receipt.total), true);

  y += 6;
  pdfHLine(doc, y, M, W);
  y += 12;

  // QR — minimal
  doc.addImage(qrDataUrl, "PNG", M, y, 32, 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 46);
  doc.text("Verification a l'arrivee", M + 38, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text(
    doc.splitTextToSize(
      "Presentez ce QR code a la reception SONAPIE pour confirmer l'authenticite de votre reservation.",
      CW - 42,
    ),
    M + 38,
    y + 14,
  );
  doc.setFont("courier", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 158, 73);
  doc.text(`ID ${receipt.verifyCode}`, M + 38, y + 28);

  y += 42;
  pdfHLine(doc, y, M, W);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text(
    doc.splitTextToSize(
      "Document electronique certifie SONAPIE — Patrimoine immobilier de l'Etat de Cote d'Ivoire.",
      CW - 30,
    ),
    M,
    y + 4,
  );
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 158, 73);
  doc.text("sonapie.ci", R, y + 4, { align: "right" });

  return doc;
}

export async function generateReceiptPdfBlob(receipt: SonapieReceipt): Promise<Blob> {
  const doc = await buildReceiptPdfDocument(receipt);
  return doc.output("blob");
}

export async function downloadReceiptPdf(receipt: SonapieReceipt): Promise<void> {
  const blob = await generateReceiptPdfBlob(receipt);
  triggerBlobDownload(blob, getReceiptPdfFilename(receipt));
}

export { SONAPIE_LOGO };
