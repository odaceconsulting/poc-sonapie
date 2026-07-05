import { SONAPIE_ESTABLISHMENTS } from "../../data/establishments";
import type {
  EstablishmentIntegration,
  ImportBatch,
  IntegrationCreateInput,
  IntegrationEstablishmentType,
  IntegrationMode,
  IntegrationStatus,
  IntegrationUpdateInput,
  SyncLog,
} from "../../types/integrations";
import { DEFAULT_FIELD_MAPPINGS as DEFAULT_MAPPINGS, EMPTY_API_CONFIG } from "../../types/integrations";
import { integrationStorage } from "./storage";
import {
  parseCsvPreview,
  runImportBatch,
  runIntegrationSync,
  testIntegrationConnection,
  type CataloguePropertyRef,
  type CatalogueReservation,
} from "./syncService";

const uid = () => `INT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const nowIso = () => new Date().toISOString();

function seedIntegrations(): EstablishmentIntegration[] {
  const seeds: Array<{
    propertyId: string;
    name: string;
    type: IntegrationEstablishmentType;
    mode: IntegrationMode;
    status: IntegrationStatus;
    lastSync: string | null;
  }> = [
    { propertyId: "sonapie-1", name: "Sofitel Hôtel Ivoire", type: "hôtel", mode: "api", status: "connecté", lastSync: "2025-06-28T14:30:00Z" },
    { propertyId: "sonapie-5", name: "HP Resort", type: "resort", mode: "connecteur", status: "connecté", lastSync: "2025-06-27T09:15:00Z" },
    { propertyId: "sonapie-4", name: "Hôtel Président", type: "hôtel", mode: "import", status: "en attente", lastSync: null },
    { propertyId: "sonapie-2", name: "Ivoire Golf Club", type: "resort", mode: "api", status: "erreur", lastSync: "2025-06-20T11:00:00Z" },
  ];

  return seeds.map((s, i) => ({
    id: `int-seed-${i + 1}`,
    propertyId: s.propertyId,
    establishmentName: s.name,
    establishmentType: s.type,
    integrationMode: s.mode,
    status: s.status,
    lastSyncAt: s.lastSync,
    apiConfig: {
      baseUrl: s.mode === "api" ? `https://pms.${s.propertyId}.sonapie.ci/api/v1` : "",
      apiKey: s.mode === "api" ? `sk_live_${s.propertyId.replace(/-/g, "")}` : "",
      token: "",
      webhookUrl: `https://poc-sonapie.vercel.app/webhooks/pms/${s.propertyId}`,
    },
    fieldMappings: DEFAULT_MAPPINGS.map(m => ({ ...m })),
    createdAt: "2025-01-15T08:00:00Z",
    updatedAt: nowIso(),
  }));
}

function ensureIntegrations(): EstablishmentIntegration[] {
  const stored = integrationStorage.getIntegrations();
  if (stored.length) return stored;
  const seeded = seedIntegrations();
  integrationStorage.setIntegrations(seeded);
  integrationStorage.appendSyncLog({
    id: "SYNC-seed-err-1",
    integrationId: "int-seed-4",
    status: "failed",
    startedAt: "2025-06-20T10:55:00Z",
    finishedAt: "2025-06-20T11:00:00Z",
    recordsProcessed: 0,
    recordsFailed: 1,
    summary: "Échec connexion API — Ivoire Golf Club",
    errors: ["Timeout sur endpoint /availability — code 504"],
    details: {},
  });
  integrationStorage.appendSyncLog({
    id: "SYNC-seed-partial-1",
    integrationId: "int-seed-2",
    status: "partial",
    startedAt: "2025-06-27T09:10:00Z",
    finishedAt: "2025-06-27T09:15:00Z",
    recordsProcessed: 12,
    recordsFailed: 1,
    summary: "Sync partielle — HP Resort",
    errors: ["Paiements non synchronisés — permissions insuffisantes"],
    details: { availabilities: 8, rates: 1, reservations: 2, payments: 0 },
  });
  return seeded;
}

function findIntegration(id: string): EstablishmentIntegration | undefined {
  return ensureIntegrations().find(i => i.id === id);
}

function saveIntegration(updated: EstablishmentIntegration): EstablishmentIntegration {
  const all = ensureIntegrations().map(i => (i.id === updated.id ? updated : i));
  integrationStorage.setIntegrations(all);
  return updated;
}

/** GET /admin/integrations */
export async function listIntegrations(filters?: {
  status?: IntegrationStatus | "all";
  mode?: IntegrationMode | "all";
  search?: string;
}): Promise<EstablishmentIntegration[]> {
  await delay(80);
  let items = ensureIntegrations();
  if (filters?.status && filters.status !== "all") {
    items = items.filter(i => i.status === filters.status);
  }
  if (filters?.mode && filters.mode !== "all") {
    items = items.filter(i => i.integrationMode === filters.mode);
  }
  if (filters?.search?.trim()) {
    const q = filters.search.toLowerCase();
    items = items.filter(i =>
      i.establishmentName.toLowerCase().includes(q) ||
      i.establishmentType.includes(q) ||
      i.integrationMode.includes(q),
    );
  }
  return items.sort((a, b) => (b.lastSyncAt ?? "").localeCompare(a.lastSyncAt ?? ""));
}

/** POST /admin/integrations */
export async function createIntegration(input: IntegrationCreateInput): Promise<EstablishmentIntegration> {
  await delay(120);
  const prop = SONAPIE_ESTABLISHMENTS.find(p => p.id === input.propertyId);
  const item: EstablishmentIntegration = {
    id: uid(),
    propertyId: input.propertyId ?? prop?.id ?? "",
    establishmentName: input.establishmentName,
    establishmentType: input.establishmentType,
    integrationMode: input.integrationMode,
    status: input.integrationMode === "manuel" ? "connecté" : "en attente",
    lastSyncAt: null,
    apiConfig: { ...EMPTY_API_CONFIG, ...input.apiConfig },
    fieldMappings: input.fieldMappings ?? DEFAULT_MAPPINGS.map(m => ({ ...m })),
    notes: input.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const all = [...ensureIntegrations(), item];
  integrationStorage.setIntegrations(all);
  return item;
}

/** GET /admin/integrations/:id */
export async function getIntegration(id: string): Promise<EstablishmentIntegration | null> {
  await delay(60);
  return findIntegration(id) ?? null;
}

/** PUT /admin/integrations/:id */
export async function updateIntegration(id: string, input: IntegrationUpdateInput): Promise<EstablishmentIntegration | null> {
  await delay(100);
  const current = findIntegration(id);
  if (!current) return null;
  const updated: EstablishmentIntegration = {
    ...current,
    ...input,
    apiConfig: input.apiConfig ? { ...current.apiConfig, ...input.apiConfig } : current.apiConfig,
    fieldMappings: input.fieldMappings ?? current.fieldMappings,
    updatedAt: nowIso(),
  };
  return saveIntegration(updated);
}

/** POST /admin/integrations/:id/test */
export async function testIntegration(id: string) {
  const integration = findIntegration(id);
  if (!integration) throw new Error("Intégration introuvable");
  const result = await testIntegrationConnection(integration);
  if (result.ok && integration.status === "en attente") {
    saveIntegration({ ...integration, status: "connecté", updatedAt: nowIso() });
  } else if (!result.ok) {
    saveIntegration({ ...integration, status: "erreur", updatedAt: nowIso() });
  }
  return result;
}

/** POST /admin/integrations/:id/sync */
export async function syncIntegration(
  id: string,
  properties: CataloguePropertyRef[],
  existingReservationIds: Set<string>,
) {
  const integration = findIntegration(id);
  if (!integration) throw new Error("Intégration introuvable");
  const result = await runIntegrationSync(integration, properties, existingReservationIds);
  const statusMap: Record<string, IntegrationStatus> = {
    success: "connecté",
    partial: "connecté",
    failed: "erreur",
    pending: "en attente",
  };
  saveIntegration({
    ...integration,
    status: statusMap[result.log.status] ?? integration.status,
    lastSyncAt: result.log.finishedAt ?? nowIso(),
    updatedAt: nowIso(),
  });
  return result;
}

/** POST /admin/integrations/:id/import */
export async function importIntegrationFile(
  id: string,
  fileText: string,
  fileName: string,
  properties: CataloguePropertyRef[],
  existingReservationIds: Set<string>,
) {
  const integration = findIntegration(id);
  if (!integration) throw new Error("Intégration introuvable");
  const { rows, errors: parseErrors } = parseCsvPreview(fileText);
  if (!rows.length) throw new Error(parseErrors[0] ?? "Aucune ligne valide");
  const result = await runImportBatch(integration, rows, fileName, properties, existingReservationIds);
  saveIntegration({
    ...integration,
    status: result.batch.status === "failed" ? "erreur" : "connecté",
    lastSyncAt: nowIso(),
    updatedAt: nowIso(),
  });
  return { ...result, parseErrors };
}

/** GET /admin/integrations/:id/logs */
export async function getIntegrationLogs(id: string): Promise<SyncLog[]> {
  await delay(50);
  return integrationStorage.getSyncLogs().filter(l => l.integrationId === id);
}

export async function getImportBatches(integrationId: string): Promise<ImportBatch[]> {
  await delay(50);
  return integrationStorage.getImportBatches().filter(b => b.integrationId === integrationId);
}

export async function disableIntegration(id: string): Promise<EstablishmentIntegration | null> {
  return updateIntegration(id, { status: "désactivé" });
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export type { CataloguePropertyRef, CatalogueReservation };
