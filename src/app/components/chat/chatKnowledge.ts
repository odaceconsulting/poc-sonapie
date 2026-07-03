import { SONAPIE_CITIES, SONAPIE_TYPES, SONAPIE_ESTABLISHMENTS } from "../../data/establishments";
import { APP_TAGLINE } from "../../constants/brand";

export type ChatAction = {
  label: string;
  page: string;
};

export type ChatReply = {
  text: string;
  actions?: ChatAction[];
};

const FEATURED = SONAPIE_ESTABLISHMENTS.filter(p => p.featured).slice(0, 4);
const CITY_LIST = SONAPIE_CITIES.join(", ");
const TYPE_LIST = SONAPIE_TYPES.filter(t => t !== "Toutes catégories").join(", ");

export const CHAT_QUICK_PROMPTS = [
  { label: "Comment réserver ?", message: "Comment réserver un bien sur le site ?" },
  { label: "Voir le catalogue", message: "Montrez-moi le catalogue des biens" },
  { label: "Destinations", message: "Quelles destinations sont disponibles ?" },
  { label: "Contact", message: "Comment vous contacter ?" },
] as const;

export function buildSystemPrompt(): string {
  const featuredList = FEATURED.map(p => `- ${p.name} (${p.city}, ${p.type}, ${p.price.toLocaleString("fr-FR")} FCFA/nuit)`).join("\n");

  return `Tu es l'assistant virtuel de SONAPIE Booking Platform, la plateforme officielle de réservation des biens patrimoniaux de l'État de Côte d'Ivoire.

RÔLE : guider les visiteurs (recherche, réservation, compte, paiement, contact) avec un ton professionnel, chaleureux et concis. Réponds TOUJOURS en français.

CONTEXTE DU SITE :
- ${APP_TAGLINE}
- ${SONAPIE_ESTABLISHMENTS.length} biens patrimoniaux référencés
- Villes : ${CITY_LIST}
- Types de biens : ${TYPE_LIST}
- Biens populaires :
${featuredList}

PARCOURS DE RÉSERVATION :
1. Accueil ou Catalogue → choisir un bien
2. Fiche bien → « Réserver »
3. Dates et voyageurs → informations personnelles → récapitulatif → paiement → confirmation

FONCTIONNALITÉS :
- Catalogue avec filtres (ville, type, dates, capacité, budget)
- Compte utilisateur (favoris, réservations, paiements, réclamations)
- Pages : Accueil, Catalogue, À propos, Contact
- Paiement en ligne (prototype) ; contact : info@sonapie.ci

RÈGLES :
- Réponses courtes (2 à 4 phrases max sauf si liste demandée)
- Si tu ne sais pas, oriente vers la page Contact ou info@sonapie.ci
- Ne invente pas de prix ou disponibilités précises pour un bien non listé
- Propose des actions concrètes (ex. « Consultez le catalogue »)`;
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some(k => text.includes(k));
}

export function getRuleBasedReply(input: string): ChatReply {
  const q = input.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

  if (includesAny(q, ["bonjour", "salut", "hello", "bonsoir", "coucou"])) {
    return {
      text: "Bonjour ! Je suis l'assistant SONAPIE. Je peux vous aider à découvrir nos biens patrimoniaux, comprendre le processus de réservation ou vous orienter sur le site. Que souhaitez-vous faire ?",
      actions: [
        { label: "Catalogue", page: "catalogue" },
        { label: "Comment réserver", page: "about" },
      ],
    };
  }

  if (includesAny(q, ["reserv", "book", "louer", "louer un", "comment ca marche", "etapes", "parcours"])) {
    return {
      text: `Pour réserver un bien patrimonial SONAPIE :\n\n1. Parcourez le **Catalogue** ou utilisez la barre de recherche sur l'accueil\n2. Ouvrez la fiche du bien qui vous intéresse\n3. Cliquez sur « Réserver » puis choisissez vos dates\n4. Renseignez vos informations et validez le paiement\n\nNous avons ${SONAPIE_ESTABLISHMENTS.length} biens dans ${SONAPIE_CITIES.length} villes.`,
      actions: [
        { label: "Voir le catalogue", page: "catalogue" },
        { label: "Accueil", page: "home" },
      ],
    };
  }

  if (includesAny(q, ["catalogue", "bien", "biens", "hotel", "villa", "resort", "hebergement", "logement", "propriete"])) {
    return {
      text: `Notre catalogue réunit ${SONAPIE_ESTABLISHMENTS.length} biens patrimoniaux : ${TYPE_LIST}. Filtrez par ville (${CITY_LIST}), dates, capacité ou budget. Biens populaires : ${FEATURED.map(p => p.name).join(", ")}.`,
      actions: [{ label: "Ouvrir le catalogue", page: "catalogue" }],
    };
  }

  if (includesAny(q, ["ville", "destination", "ou aller", "abidjan", "yamoussoukro", "daoukro", "seguela", "katiola"])) {
    return {
      text: `SONAPIE propose des biens dans ${SONAPIE_CITIES.length} destinations : **${CITY_LIST}**. Abidjan concentre le plus d'établissements (hôtels, resorts). Yamoussoukro et Daoukro offrent un patrimoine historique unique.`,
      actions: [
        { label: "Explorer le catalogue", page: "catalogue" },
        { label: "Accueil", page: "home" },
      ],
    };
  }

  if (includesAny(q, ["prix", "tarif", "budget", "cout", "combien", "fcfa", "cher"])) {
    return {
      text: "Les tarifs varient selon le type de bien et la saison. Utilisez le filtre **Budget max** sur l'accueil ou le catalogue. Les prix sont affichés en FCFA par nuit sur chaque fiche bien. Des frais de service peuvent s'appliquer au moment du paiement.",
      actions: [{ label: "Catalogue", page: "catalogue" }],
    };
  }

  if (includesAny(q, ["paiement", "payer", "carte", "mobile money", "orange money", "mtn"])) {
    return {
      text: "Le paiement s'effectue en ligne à la fin du parcours de réservation (étape Paiement). Ce prototype accepte les modes de paiement simulés. Pour toute question sur une transaction, contactez-nous ou consultez votre espace client après connexion.",
      actions: [
        { label: "Mon compte", page: "login" },
        { label: "Contact", page: "contact" },
      ],
    };
  }

  if (includesAny(q, ["compte", "connexion", "connecter", "inscription", "creer un compte", "login", "mot de passe"])) {
    return {
      text: "Créez un compte gratuit pour gérer vos réservations, favoris, paiements et réclamations. Cliquez sur « Connexion » en haut à droite, puis « Créer un compte » si vous êtes nouveau.",
      actions: [
        { label: "Se connecter", page: "login" },
        { label: "S'inscrire", page: "register" },
      ],
    };
  }

  if (includesAny(q, ["favori", "sauvegard", "bookmark"])) {
    return {
      text: "Ajoutez un bien à vos favoris via l'icône cœur sur les cartes ou les fiches. Retrouvez-les dans votre espace client une fois connecté.",
      actions: [{ label: "Catalogue", page: "catalogue" }],
    };
  }

  if (includesAny(q, ["contact", "email", "telephone", "joindre", "aide", "support", "reclamation", "plainte"])) {
    return {
      text: "Pour nous contacter : page **Contact** du site ou e-mail **info@sonapie.ci**. Vous pouvez aussi déposer une réclamation depuis votre espace client. Notre équipe vous répond sous 24 à 48 h ouvrées.",
      actions: [{ label: "Page Contact", page: "contact" }],
    };
  }

  if (includesAny(q, ["sonapie", "qui etes", "apropos", "patrimoine", "etat", "cote d ivoire", "mission"])) {
    return {
      text: "SONAPIE (Société Nationale de Gestion du Patrimoine de l'État) gère et valorise le patrimoine immobilier de l'État de Côte d'Ivoire. Cette plateforme permet de découvrir et réserver en ligne villas, hôtels, résidences et espaces événementiels officiels.",
      actions: [
        { label: "À propos", page: "about" },
        { label: "Catalogue", page: "catalogue" },
      ],
    };
  }

  if (includesAny(q, ["annul", "modifier", "changer date", "rembours"])) {
    return {
      text: "Pour modifier ou annuler une réservation, connectez-vous à votre espace client → Mes réservations. Selon les conditions du bien, des frais peuvent s'appliquer. En cas de difficulté, utilisez la page Contact ou déposez une réclamation.",
      actions: [
        { label: "Mon compte", page: "login" },
        { label: "Contact", page: "contact" },
      ],
    };
  }

  if (includesAny(q, ["merci", "au revoir", "bye", "a plus"])) {
    return {
      text: "Avec plaisir ! N'hésitez pas si vous avez d'autres questions. Bonne découverte du patrimoine ivoirien !",
    };
  }

  return {
    text: "Je peux vous aider sur la réservation, le catalogue, les destinations, les tarifs, votre compte ou le contact. Posez-moi une question précise ou choisissez une suggestion ci-dessous.",
    actions: [
      { label: "Catalogue", page: "catalogue" },
      { label: "Comment réserver", page: "home" },
      { label: "Contact", page: "contact" },
    ],
  };
}
