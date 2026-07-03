export type AdminChatAction = {
  label: string;
  page: string;
};

export type AdminChatReply = {
  text: string;
  actions?: AdminChatAction[];
};

export type AdminChatProperty = {
  id: string;
  name: string;
  type: string;
  city: string;
  price: number;
  capacity: number;
  bedrooms: number;
  available: boolean;
  featured: boolean;
};

export type AdminChatReservation = {
  id: string;
  property: string;
  city: string;
  checkIn: string;
  checkOut: string;
  total: number;
  status: string;
  guests: number;
  client?: string;
};

export type AdminChatUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  reservations: number;
  since: string;
};

export type AdminChatTicket = {
  id: string;
  property: string;
  issue: string;
  priority: string;
  status: string;
  date: string;
};

export type AdminChatClaim = {
  id: string;
  user: string;
  property: string;
  subject: string;
  status: string;
  date: string;
  priority: string;
};

export type AdminChatStats = {
  revenue: number;
  reservations: number;
  properties: number;
  users: number;
  revenueChange: number;
  reservationsChange: number;
  byCity: { city: string; count: number; revenue: number }[];
};

export type AdminChatSettings = {
  platformName: string;
  email: string;
  feePct: number;
};

export type AdminChatContext = {
  properties: AdminChatProperty[];
  reservations: AdminChatReservation[];
  users: AdminChatUser[];
  maintenanceTickets: AdminChatTicket[];
  claims: AdminChatClaim[];
  settings: AdminChatSettings;
  stats: AdminChatStats;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CI").format(n) + " FCFA";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "confirmée",
  pending: "en attente",
  completed: "terminée",
  cancelled: "annulée",
  active: "actif",
  suspended: "suspendu",
  open: "ouverte",
  "in-progress": "en cours",
  resolved: "résolue",
  high: "urgente",
  medium: "moyenne",
  low: "faible",
};

export const ADMIN_CHAT_QUICK_PROMPTS = [
  { label: "Réservations en attente", message: "Quelles réservations sont en attente de confirmation ?" },
  { label: "Biens disponibles", message: "Quels biens et chambres sont disponibles actuellement ?" },
  { label: "Statistiques", message: "Donne-moi un résumé des statistiques et revenus de la plateforme." },
  { label: "Clients actifs", message: "Quels sont les clients actifs et leurs comptes ?" },
  { label: "Réclamations urgentes", message: "Y a-t-il des réclamations ou tickets urgents à traiter ?" },
] as const;

function summarizeProperties(ctx: AdminChatContext): string {
  const available = ctx.properties.filter(p => p.available);
  const unavailable = ctx.properties.filter(p => !p.available);
  const byCity = new Map<string, AdminChatProperty[]>();
  for (const p of ctx.properties) {
    const list = byCity.get(p.city) ?? [];
    list.push(p);
    byCity.set(p.city, list);
  }

  const lines = [
    `Total biens : ${ctx.properties.length} (${available.length} disponibles, ${unavailable.length} indisponibles)`,
    ...Array.from(byCity.entries()).map(([city, props]) => {
      const avail = props.filter(p => p.available).length;
      return `- ${city} : ${props.length} bien(s), ${avail} disponible(s)`;
    }),
    "",
    "Liste des biens :",
    ...ctx.properties.map(
      p =>
        `- ${p.name} (${p.city}, ${p.type}) — ${fmt(p.price)}/nuit, ${p.capacity} pers., ${p.bedrooms} ch. — ${p.available ? "DISPONIBLE" : "INDISPONIBLE"}`,
    ),
  ];
  return lines.join("\n");
}

function summarizeReservations(ctx: AdminChatContext): string {
  const byStatus = (status: string) => ctx.reservations.filter(r => r.status === status);
  const pending = byStatus("pending");
  const confirmed = byStatus("confirmed");
  const completed = byStatus("completed");
  const cancelled = byStatus("cancelled");
  const totalRevenue = ctx.reservations
    .filter(r => r.status === "confirmed" || r.status === "completed")
    .reduce((s, r) => s + r.total, 0);

  const lines = [
    `Total réservations enregistrées : ${ctx.reservations.length}`,
    `- En attente : ${pending.length}`,
    `- Confirmées : ${confirmed.length}`,
    `- Terminées : ${completed.length}`,
    `- Annulées : ${cancelled.length}`,
    `Revenus réservations actives/terminées : ${fmt(totalRevenue)}`,
    "",
    "Détail des réservations :",
    ...ctx.reservations.map(
      r =>
        `- ${r.id} | ${r.property} (${r.city}) | ${r.checkIn} → ${r.checkOut} | ${r.guests} pers. | ${fmt(r.total)} | ${STATUS_LABELS[r.status] ?? r.status}${r.client ? ` | Client : ${r.client}` : ""}`,
    ),
  ];
  return lines.join("\n");
}

function summarizeUsers(ctx: AdminChatContext): string {
  const active = ctx.users.filter(u => u.status === "active");
  const suspended = ctx.users.filter(u => u.status === "suspended");
  const admins = ctx.users.filter(u => u.role === "admin");

  const lines = [
    `Utilisateurs : ${ctx.users.length} (${active.length} actifs, ${suspended.length} suspendus, ${admins.length} admin)`,
    "",
    ...ctx.users.map(
      u =>
        `- ${u.name} (${u.id}) | ${u.email} | ${u.phone} | Rôle : ${u.role} | Statut : ${u.status} | ${u.reservations} réservation(s) | Inscrit depuis ${u.since}`,
    ),
  ];
  return lines.join("\n");
}

function summarizeMaintenance(ctx: AdminChatContext): string {
  const urgent = ctx.maintenanceTickets.filter(t => t.priority === "high" && t.status !== "completed");
  const lines = [
    `Tickets maintenance : ${ctx.maintenanceTickets.length} (${urgent.length} urgent(s) non terminé(s))`,
    "",
    ...ctx.maintenanceTickets.map(
      t =>
        `- ${t.id} | ${t.property} | ${t.issue} | Priorité : ${STATUS_LABELS[t.priority] ?? t.priority} | Statut : ${STATUS_LABELS[t.status] ?? t.status} | ${t.date}`,
    ),
  ];
  return lines.join("\n");
}

function summarizeClaims(ctx: AdminChatContext): string {
  const open = ctx.claims.filter(c => c.status !== "resolved");
  const urgent = open.filter(c => c.priority === "high");
  const lines = [
    `Réclamations : ${ctx.claims.length} (${open.length} en cours, ${urgent.length} urgentes)`,
    "",
    ...ctx.claims.map(
      c =>
        `- ${c.id} | ${c.subject} | Client : ${c.user} | Bien : ${c.property} | Priorité : ${STATUS_LABELS[c.priority] ?? c.priority} | Statut : ${STATUS_LABELS[c.status] ?? c.status} | ${c.date}`,
    ),
  ];
  return lines.join("\n");
}

function summarizeStats(ctx: AdminChatContext): string {
  const { stats } = ctx;
  const lines = [
    `Revenus totaux plateforme : ${fmt(stats.revenue)} (${stats.revenueChange > 0 ? "+" : ""}${stats.revenueChange}%)`,
    `Réservations du mois : ${stats.reservations} (${stats.reservationsChange > 0 ? "+" : ""}${stats.reservationsChange}%)`,
    `Biens référencés : ${stats.properties}`,
    `Utilisateurs inscrits : ${stats.users.toLocaleString("fr-FR")}`,
  ];
  return lines.join("\n");
}

export function buildAdminSystemPrompt(ctx: AdminChatContext): string {
  return `Tu es l'assistant IA administrateur de SONAPIE Booking Platform.
Tu aides les administrateurs SONAPIE à piloter la plateforme : réservations, biens, clients, paiements, maintenance, réclamations et statistiques.

RÔLE : répondre avec précision en t'appuyant UNIQUEMENT sur les données ci-dessous (mises à jour en temps réel dans ce prototype).
Ton : professionnel, concis, orienté action. Réponds TOUJOURS en français.

PARAMÈTRES PLATEFORME :
- Nom : ${ctx.settings.platformName}
- Email contact : ${ctx.settings.email}
- Frais de service : ${ctx.settings.feePct}%

STATISTIQUES GLOBALES :
${summarizeStats(ctx)}

RÉPARTITION PAR VILLE :
${ctx.stats.byCity.map(c => `- ${c.city} : ${c.count} réservations, ${fmt(c.revenue)}`).join("\n")}

RÉSERVATIONS :
${summarizeReservations(ctx)}

BIENS / HÉBERGEMENTS :
${summarizeProperties(ctx)}

UTILISATEURS / COMPTES CLIENTS :
${summarizeUsers(ctx)}

MAINTENANCE :
${summarizeMaintenance(ctx)}

RÉCLAMATIONS :
${summarizeClaims(ctx)}

PAGES ADMIN DISPONIBLES :
- Tableau de bord (admin)
- Biens (admin-properties)
- Réservations (admin-reservations)
- Contrôle arrivée / scan QR (admin-verify)
- Utilisateurs (admin-users)
- Paiements (admin-payments)
- Maintenance (admin-maintenance)
- Réclamations (admin-claims)
- Statistiques (admin-stats)
- Paramètres (admin-settings)

RÈGLES :
- Cite des chiffres et noms exacts issus des données
- Pour les disponibilités, distingue bien « disponible » vs « indisponible »
- Si une info manque, dis-le clairement
- Propose une action admin pertinente quand c'est utile
- Réponses structurées (listes courtes) pour les synthèses`;
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some(k => text.includes(k));
}

function normalize(input: string): string {
  return input.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function getAdminRuleBasedReply(input: string, ctx: AdminChatContext): AdminChatReply {
  const q = normalize(input);

  if (includesAny(q, ["bonjour", "salut", "hello", "bonsoir"])) {
    const pending = ctx.reservations.filter(r => r.status === "pending").length;
    const avail = ctx.properties.filter(p => p.available).length;
    return {
      text: `Bonjour ! Je suis l'assistant admin SONAPIE. Actuellement : **${pending}** réservation(s) en attente, **${avail}** bien(s) disponible(s) sur **${ctx.properties.length}**. Que souhaitez-vous vérifier ?`,
      actions: [
        { label: "Réservations", page: "admin-reservations" },
        { label: "Biens", page: "admin-properties" },
        { label: "Statistiques", page: "admin-stats" },
      ],
    };
  }

  if (includesAny(q, ["stat", "revenu", "chiffre", "kpi", "performance", "occupation"])) {
    const avail = ctx.properties.filter(p => p.available).length;
    const occupancy = ctx.properties.length
      ? Math.round(((ctx.properties.length - avail) / ctx.properties.length) * 100)
      : 0;
    return {
      text: `**Synthèse statistiques**\n\n- Revenus totaux : ${fmt(ctx.stats.revenue)}\n- Réservations du mois : ${ctx.stats.reservations}\n- Taux d'occupation estimé : ~${occupancy}%\n- Utilisateurs : ${ctx.stats.users.toLocaleString("fr-FR")}\n\n**Par ville :**\n${ctx.stats.byCity.map(c => `• ${c.city} — ${c.count} rés., ${fmt(c.revenue)}`).join("\n")}`,
      actions: [{ label: "Voir statistiques", page: "admin-stats" }],
    };
  }

  if (includesAny(q, ["reserv", "booking", "confirmation", "attente", "annul"])) {
    const pending = ctx.reservations.filter(r => r.status === "pending");
    const confirmed = ctx.reservations.filter(r => r.status === "confirmed");
    let text = `**${ctx.reservations.length}** réservation(s) au total.\n`;
    if (includesAny(q, ["attente", "pending", "confirmer"])) {
      text += pending.length
        ? `\n**En attente (${pending.length}) :**\n${pending.map(r => `• ${r.id} — ${r.property} — ${r.client ?? "—"} — ${fmt(r.total)}`).join("\n")}`
        : "\nAucune réservation en attente.";
    } else {
      text += `\n- Confirmées : ${confirmed.length}\n- En attente : ${pending.length}\n- Terminées : ${ctx.reservations.filter(r => r.status === "completed").length}`;
      text += `\n\nDernières réservations :\n${ctx.reservations.slice(0, 4).map(r => `• ${r.id} | ${r.property} | ${STATUS_LABELS[r.status] ?? r.status}`).join("\n")}`;
    }
    return {
      text,
      actions: [{ label: "Gérer les réservations", page: "admin-reservations" }],
    };
  }

  if (includesAny(q, ["bien", "hotel", "chambre", "hebergement", "disponib", "villa", "resort", "propriete", "catalogue"])) {
    const available = ctx.properties.filter(p => p.available);
    const cityMatch = ctx.stats.byCity.map(c => c.city).find(c => q.includes(normalize(c)));
    const filtered = cityMatch ? available.filter(p => p.city === cityMatch) : available;

    let text = `**${available.length}** bien(s) disponible(s) sur **${ctx.properties.length}**.\n`;
    if (cityMatch) {
      text += `\n**À ${cityMatch} (${filtered.length}) :**\n`;
    } else {
      text += "\n";
    }
    text += filtered.length
      ? filtered.map(p => `• ${p.name} (${p.city}) — ${p.type}, ${p.capacity} pers., ${p.bedrooms} ch. — ${fmt(p.price)}/nuit`).join("\n")
      : cityMatch
        ? `Aucun bien disponible à ${cityMatch} pour le moment.`
        : "Aucun bien disponible actuellement.";

    const unavailable = ctx.properties.filter(p => !p.available);
    if (includesAny(q, ["indisponib", "complet", "occupe"]) && unavailable.length) {
      text += `\n\n**Indisponibles :**\n${unavailable.map(p => `• ${p.name} (${p.city})`).join("\n")}`;
    }

    return {
      text,
      actions: [{ label: "Gérer les biens", page: "admin-properties" }],
    };
  }

  if (includesAny(q, ["client", "utilisateur", "compte", "user", "email", "telephone"])) {
    const nameMatch = ctx.users.find(u => q.includes(normalize(u.name.split(" ")[0])) || q.includes(normalize(u.name.split(" ").pop() ?? "")));
    if (nameMatch) {
      return {
        text: `**${nameMatch.name}** (${nameMatch.id})\n- Email : ${nameMatch.email}\n- Téléphone : ${nameMatch.phone}\n- Rôle : ${nameMatch.role}\n- Statut : ${nameMatch.status}\n- Réservations : ${nameMatch.reservations}\n- Inscrit depuis : ${nameMatch.since}`,
        actions: [{ label: "Voir utilisateurs", page: "admin-users" }],
      };
    }
    const active = ctx.users.filter(u => u.status === "active");
    return {
      text: `**${ctx.users.length}** compte(s) — **${active.length}** actif(s).\n\n${ctx.users.map(u => `• ${u.name} — ${u.email} — ${u.status} — ${u.reservations} rés.`).join("\n")}`,
      actions: [{ label: "Gérer les utilisateurs", page: "admin-users" }],
    };
  }

  if (includesAny(q, ["reclam", "plainte", "reclamation", "litige"])) {
    const open = ctx.claims.filter(c => c.status !== "resolved");
    const urgent = open.filter(c => c.priority === "high");
    return {
      text: open.length
        ? `**${open.length}** réclamation(s) en cours${urgent.length ? ` dont **${urgent.length}** urgente(s)` : ""} :\n\n${open.map(c => `• ${c.id} — ${c.subject} — ${c.user} (${c.property}) — ${STATUS_LABELS[c.priority] ?? c.priority}`).join("\n")}`
        : "Aucune réclamation en cours. Toutes sont résolues.",
      actions: [{ label: "Voir réclamations", page: "admin-claims" }],
    };
  }

  if (includesAny(q, ["maintenance", "ticket", "panne", "reparation", "urgent"])) {
    const open = ctx.maintenanceTickets.filter(t => t.status !== "completed");
    const urgent = open.filter(t => t.priority === "high");
    return {
      text: open.length
        ? `**${open.length}** ticket(s) ouvert(s)${urgent.length ? ` — **${urgent.length}** urgent(s)` : ""} :\n\n${open.map(t => `• ${t.id} — ${t.property} — ${t.issue} (${STATUS_LABELS[t.priority] ?? t.priority})`).join("\n")}`
        : "Aucun ticket de maintenance en cours.",
      actions: [{ label: "Voir maintenance", page: "admin-maintenance" }],
    };
  }

  if (includesAny(q, ["paiement", "transaction", "encaisse", "orange money", "wave", "mtn"])) {
    return {
      text: `Consultez la page **Paiements** pour le détail des transactions. Revenus totaux plateforme : **${fmt(ctx.stats.revenue)}**. Frais de service configurés : **${ctx.settings.feePct}%**.`,
      actions: [{ label: "Voir paiements", page: "admin-payments" }],
    };
  }

  if (includesAny(q, ["qr", "scan", "arrivee", "reception", "recu", "controle"])) {
    return {
      text: "Le **Contrôle d'arrivée** permet de scanner le QR code du reçu client pour vérifier l'authenticité de la réservation à la réception.",
      actions: [{ label: "Contrôle arrivée", page: "admin-verify" }],
    };
  }

  if (includesAny(q, ["parametre", "config", "frais", "plateforme"])) {
    return {
      text: `**Paramètres actuels**\n- Plateforme : ${ctx.settings.platformName}\n- Email : ${ctx.settings.email}\n- Frais de service : ${ctx.settings.feePct}%`,
      actions: [{ label: "Paramètres", page: "admin-settings" }],
    };
  }

  if (includesAny(q, ["merci", "au revoir", "bye"])) {
    return { text: "À votre service pour le pilotage SONAPIE. Bonne gestion !" };
  }

  return {
    text: "Je peux vous renseigner sur les **réservations**, **biens disponibles**, **statistiques**, **clients**, **réclamations**, **maintenance** et **paiements**. Posez une question précise ou utilisez une suggestion.",
    actions: [
      { label: "Tableau de bord", page: "admin" },
      { label: "Réservations", page: "admin-reservations" },
      { label: "Biens", page: "admin-properties" },
    ],
  };
}
