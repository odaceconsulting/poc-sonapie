/** Modèles — Intégration établissements / synchronisation PMS */

export type IntegrationEstablishmentType = "hôtel" | "resort" | "appartement" | "résidence";
export type IntegrationMode = "api" | "connecteur" | "import" | "manuel";
export type IntegrationStatus = "connecté" | "en attente" | "erreur" | "désactivé";
export type SyncStatus = "success" | "pending" | "failed" | "partial";

export type MappableField =
  | "chambres"
  | "tarifs"
  | "réservations"
  | "disponibilités"
  | "paiements";

export interface FieldMapping {
  sonapieField: MappableField;
  pmsField: string;
  enabled: boolean;
  transform?: string;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  token: string;
  webhookUrl: string;
}

export interface EstablishmentIntegration {
  id: string;
  propertyId: string;
  establishmentName: string;
  establishmentType: IntegrationEstablishmentType;
  integrationMode: IntegrationMode;
  status: IntegrationStatus;
  lastSyncAt: string | null;
  apiConfig: ApiConfig;
  fieldMappings: FieldMapping[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLog {
  id: string;
  integrationId: string;
  status: SyncStatus;
  startedAt: string;
  finishedAt: string | null;
  recordsProcessed: number;
  recordsFailed: number;
  summary: string;
  errors: string[];
  details: {
    availabilities?: number;
    rates?: number;
    reservations?: number;
    payments?: number;
  };
}

export interface ImportBatchRow {
  establishment: string;
  roomType?: string;
  price?: number;
  available?: boolean;
  checkIn?: string;
  checkOut?: string;
  guestName?: string;
  status?: string;
}

export interface ImportBatch {
  id: string;
  integrationId: string;
  fileName: string;
  uploadedAt: string;
  status: SyncStatus;
  totalRows: number;
  validRows: number;
  importedRows: number;
  preview: ImportBatchRow[];
  errors: string[];
}

export interface IntegrationCreateInput {
  establishmentName: string;
  establishmentType: IntegrationEstablishmentType;
  integrationMode: IntegrationMode;
  propertyId?: string;
  apiConfig?: Partial<ApiConfig>;
  fieldMappings?: FieldMapping[];
  notes?: string;
}

export interface IntegrationUpdateInput extends Partial<IntegrationCreateInput> {
  status?: IntegrationStatus;
}

export interface SyncResult {
  log: SyncLog;
  propertyUpdates: Array<{ propertyId: string; price?: number; available?: boolean }>;
  newReservations: Array<{
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
  }>;
}

export const DEFAULT_FIELD_MAPPINGS: FieldMapping[] = [
  { sonapieField: "chambres", pmsField: "room_types", enabled: true },
  { sonapieField: "tarifs", pmsField: "rates.daily", enabled: true },
  { sonapieField: "réservations", pmsField: "bookings", enabled: true },
  { sonapieField: "disponibilités", pmsField: "availability", enabled: true },
  { sonapieField: "paiements", pmsField: "payments", enabled: false },
];

export const EMPTY_API_CONFIG: ApiConfig = {
  baseUrl: "",
  apiKey: "",
  token: "",
  webhookUrl: "",
};
