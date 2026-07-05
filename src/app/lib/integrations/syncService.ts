import type {
  EstablishmentIntegration,
  FieldMapping,
  ImportBatch,
  ImportBatchRow,
  SyncLog,
  SyncResult,
  SyncStatus,
} from "../../types/integrations";
import { integrationStorage } from "./storage";

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const nowIso = () => new Date().toISOString();

const formatFrDate = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export type CataloguePropertyRef = {
  id: string;
  name: string;
  city: string;
  type: string;
  price: number;
  available: boolean;
};

export type CatalogueReservation = {
  id: string;
  propertyId: string;
  property: string;
  city: string;
  checkIn: string;
  checkOut: string;
  total: number;
  status: string;
  type: string;
  guests: number;
  client?: string;
};

function enabledMappings(mappings: FieldMapping[]) {
  return mappings.filter(m => m.enabled).map(m => m.sonapieField);
}

function simulatePmsFetch(integration: EstablishmentIntegration, property: CataloguePropertyRef | undefined) {
  const enabled = enabledMappings(integration.fieldMappings);
  const basePrice = property?.price ?? 75000;
  const variance = Math.floor(Math.random() * 15000) - 5000;
  return {
    availabilities: enabled.includes("disponibilités") ? Math.floor(Math.random() * 12) + 1 : 0,
    rates: enabled.includes("tarifs") ? Math.max(25000, basePrice + variance) : basePrice,
    reservations: enabled.includes("réservations") ? (Math.random() > 0.5 ? 1 : 0) : 0,
    payments: enabled.includes("paiements") ? (Math.random() > 0.6 ? 1 : 0) : 0,
    rooms: enabled.includes("chambres") ? Math.floor(Math.random() * 20) + 5 : 0,
  };
}

function connectionShouldFail(integration: EstablishmentIntegration): string | null {
  if (integration.status === "désactivé") return "Intégration désactivée";
  if (integration.integrationMode === "api" && !integration.apiConfig.baseUrl.trim()) {
    return "URL API manquante";
  }
  if (integration.integrationMode === "api" && !integration.apiConfig.apiKey.trim() && !integration.apiConfig.token.trim()) {
    return "Clé API ou token requis";
  }
  return null;
}

export async function testIntegrationConnection(
  integration: EstablishmentIntegration,
): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  await delay(600 + Math.random() * 400);
  const err = connectionShouldFail(integration);
  if (err) return { ok: false, message: err, latencyMs: 0 };
  if (integration.integrationMode === "import") {
    return { ok: true, message: "Mode import — prêt pour upload CSV/Excel", latencyMs: 120 };
  }
  if (integration.integrationMode === "manuel") {
    return { ok: true, message: "Saisie manuelle — aucune connexion distante requise", latencyMs: 50 };
  }
  return {
    ok: true,
    message: `Connexion ${integration.integrationMode.toUpperCase()} établie avec ${integration.establishmentName}`,
    latencyMs: Math.round(180 + Math.random() * 320),
  };
}

export async function runIntegrationSync(
  integration: EstablishmentIntegration,
  properties: CataloguePropertyRef[],
  existingReservationIds: Set<string>,
): Promise<SyncResult> {
  const started = nowIso();
  const logId = uid("SYNC");
  const errors: string[] = [];
  const property = properties.find(p => p.id === integration.propertyId);

  const pendingLog: SyncLog = {
    id: logId,
    integrationId: integration.id,
    status: "pending",
    startedAt: started,
    finishedAt: null,
    recordsProcessed: 0,
    recordsFailed: 0,
    summary: "Synchronisation en cours…",
    errors: [],
    details: {},
  };
  integrationStorage.appendSyncLog(pendingLog);

  await delay(900 + Math.random() * 1100);

  const connErr = connectionShouldFail(integration);
  if (connErr) {
    const failedLog: SyncLog = {
      ...pendingLog,
      status: "failed",
      finishedAt: nowIso(),
      recordsFailed: 1,
      summary: connErr,
      errors: [connErr],
    };
    integrationStorage.appendSyncLog(failedLog);
    return { log: failedLog, propertyUpdates: [], newReservations: [] };
  }

  const fetched = simulatePmsFetch(integration, property);
  const propertyUpdates: SyncResult["propertyUpdates"] = [];
  const newReservations: SyncResult["newReservations"] = [];

  if (property && integration.fieldMappings.find(m => m.sonapieField === "tarifs" && m.enabled)) {
    propertyUpdates.push({ propertyId: property.id, price: fetched.rates });
  }
  if (property && integration.fieldMappings.find(m => m.sonapieField === "disponibilités" && m.enabled)) {
    propertyUpdates.push({ propertyId: property.id, available: fetched.availabilities > 0 });
  }

  if (property && integration.fieldMappings.find(m => m.sonapieField === "réservations" && m.enabled) && fetched.reservations > 0) {
    const resId = `RES-PMS-${integration.id.slice(-4)}-${Date.now().toString().slice(-5)}`;
    if (!existingReservationIds.has(resId)) {
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 7);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 3);
      newReservations.push({
        id: resId,
        propertyId: property.id,
        property: property.name,
        city: property.city,
        checkIn: formatFrDate(checkIn),
        checkOut: formatFrDate(checkOut),
        total: fetched.rates * 3,
        status: "pending",
        type: property.type,
        guests: 2,
        client: `Import PMS — ${integration.establishmentName}`,
      });
    }
  }

  if (integration.integrationMode === "api" && Math.random() < 0.08) {
    errors.push("Timeout partiel sur endpoint paiements");
  }

  const processed = fetched.availabilities + fetched.reservations + fetched.payments + (propertyUpdates.length ? 1 : 0);
  const status: SyncStatus = errors.length
    ? (processed > 0 ? "partial" : "failed")
    : "success";

  const finishedLog: SyncLog = {
    id: logId,
    integrationId: integration.id,
    status,
    startedAt: started,
    finishedAt: nowIso(),
    recordsProcessed: processed,
    recordsFailed: errors.length,
    summary: status === "success"
      ? `Sync OK — ${processed} enregistrement(s)`
      : status === "partial"
        ? `Sync partielle — ${errors.length} erreur(s)`
        : "Échec de synchronisation",
    errors,
    details: {
      availabilities: fetched.availabilities,
      rates: propertyUpdates.length ? 1 : 0,
      reservations: newReservations.length,
      payments: fetched.payments,
    },
  };
  integrationStorage.appendSyncLog(finishedLog);

  return { log: finishedLog, propertyUpdates, newReservations };
}

export function parseCsvPreview(text: string): { rows: ImportBatchRow[]; errors: string[] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const errors: string[] = [];
  if (lines.length < 2) {
    return { rows: [], errors: ["Fichier vide ou sans en-têtes"] };
  }

  const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase());
  const idx = (names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));

  const estIdx = idx(["établissement", "etablissement", "establishment", "nom"]);
  const priceIdx = idx(["prix", "price", "tarif"]);
  const availIdx = idx(["dispo", "available", "disponible"]);
  const checkInIdx = idx(["arrivée", "arrivee", "checkin", "check-in"]);
  const checkOutIdx = idx(["départ", "depart", "checkout", "check-out"]);
  const guestIdx = idx(["client", "guest", "voyageur"]);
  const roomIdx = idx(["chambre", "room", "type"]);

  if (estIdx < 0) errors.push("Colonne établissement introuvable");

  const rows: ImportBatchRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;]/).map(c => c.trim());
    const establishment = estIdx >= 0 ? cols[estIdx] : cols[0];
    if (!establishment) {
      errors.push(`Ligne ${i + 1}: nom établissement manquant`);
      continue;
    }
    rows.push({
      establishment,
      roomType: roomIdx >= 0 ? cols[roomIdx] : undefined,
      price: priceIdx >= 0 ? Number(cols[priceIdx]?.replace(/\s/g, "")) || undefined : undefined,
      available: availIdx >= 0 ? ["oui", "true", "1", "yes"].includes(cols[availIdx]?.toLowerCase()) : undefined,
      checkIn: checkInIdx >= 0 ? cols[checkInIdx] : undefined,
      checkOut: checkOutIdx >= 0 ? cols[checkOutIdx] : undefined,
      guestName: guestIdx >= 0 ? cols[guestIdx] : undefined,
      status: "pending",
    });
  }
  return { rows, errors };
}

export async function runImportBatch(
  integration: EstablishmentIntegration,
  rows: ImportBatchRow[],
  fileName: string,
  properties: CataloguePropertyRef[],
  existingReservationIds: Set<string>,
): Promise<{ batch: ImportBatch; propertyUpdates: SyncResult["propertyUpdates"]; newReservations: SyncResult["newReservations"] }> {
  await delay(500);
  const batchId = uid("IMP");
  const errors: string[] = [];
  const propertyUpdates: SyncResult["propertyUpdates"] = [];
  const newReservations: SyncResult["newReservations"] = [];
  let imported = 0;

  for (const row of rows) {
    const prop = properties.find(
      p => p.name.toLowerCase().includes(row.establishment.toLowerCase()) ||
        row.establishment.toLowerCase().includes(p.name.toLowerCase().slice(0, 8)),
    ) || properties.find(p => p.id === integration.propertyId);

    if (!prop) {
      errors.push(`Établissement non reconnu : ${row.establishment}`);
      continue;
    }

    if (row.price !== undefined && !Number.isNaN(row.price)) {
      propertyUpdates.push({ propertyId: prop.id, price: row.price });
    }
    if (row.available !== undefined) {
      propertyUpdates.push({ propertyId: prop.id, available: row.available });
    }
    if (row.checkIn && row.checkOut) {
      const resId = `RES-IMP-${batchId.slice(-6)}-${imported + 1}`;
      if (!existingReservationIds.has(resId)) {
        newReservations.push({
          id: resId,
          propertyId: prop.id,
          property: prop.name,
          city: prop.city,
          checkIn: row.checkIn,
          checkOut: row.checkOut,
          total: row.price ?? prop.price,
          status: row.status ?? "pending",
          type: prop.type,
          guests: 2,
          client: row.guestName ?? "Import CSV",
        });
      }
    }
    imported++;
  }

  const status: SyncStatus = errors.length
    ? (imported > 0 ? "partial" : "failed")
    : "success";

  const batch: ImportBatch = {
    id: batchId,
    integrationId: integration.id,
    fileName,
    uploadedAt: nowIso(),
    status,
    totalRows: rows.length,
    validRows: rows.length - errors.length,
    importedRows: imported,
    preview: rows.slice(0, 20),
    errors,
  };
  integrationStorage.appendImportBatch(batch);

  const syncLog: SyncLog = {
    id: uid("SYNC"),
    integrationId: integration.id,
    status,
    startedAt: nowIso(),
    finishedAt: nowIso(),
    recordsProcessed: imported,
    recordsFailed: errors.length,
    summary: `Import ${fileName} — ${imported}/${rows.length} ligne(s)`,
    errors,
    details: { rates: propertyUpdates.length, reservations: newReservations.length },
  };
  integrationStorage.appendSyncLog(syncLog);

  return { batch, propertyUpdates, newReservations };
}

export function getRecentSyncErrors(limit = 5): SyncLog[] {
  return integrationStorage.getSyncLogs()
    .filter(l => l.status === "failed" || l.status === "partial")
    .slice(0, limit);
}
