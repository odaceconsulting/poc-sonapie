import { SONAPIE_LOGO } from "../constants/brand";

/** Placeholder local — TODO : obtenir les images officielles auprès de la SONAPIE */
const PLACEHOLDER = SONAPIE_LOGO;

export interface SonapieEstablishment {
  id: string;
  name: string;
  city: string;
  type: string;
  description: string;
  services: string[];
  mainImage: string;
  gallery: string[];
  location: string;
  isSonapieManaged: true;
  lat: number;
  lng: number;
  price: number;
  rating: number;
  reviews: number;
  amenities: string[];
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  available: boolean;
  featured: boolean;
  tag?: string;
  image: string;
  images: string[];
  imagesPendingOfficial?: boolean;
}

/** Galerie : 1 vue à distance · 2 intérieur · 3 extérieur/piscine · 4 chambre */
function gallery4(
  distance: string,
  interior: string,
  exteriorPool: string,
  room: string,
): string[] {
  return [distance, interior, exteriorPool, room];
}

const IMG = {
  /** Sofitel Hôtel Ivoire — photos officielles Accor / sofitel.accor.com (ahstatic) */
  sofitelDistance:
    "https://www.ahstatic.com/photos/8844_wd_00_p_2048x1536.jpg",
  sofitelInterior:
    "https://www.ahstatic.com/photos/8844_rsr002_00_p_2048x1536.jpg",
  sofitelPool:
    "https://www.ahstatic.com/photos/8844_ho_03_p_1024x768.jpg",
  sofitelRoom:
    "https://www.ahstatic.com/photos/8844_roskd_00_p_2048x1536.jpg",

  /** Ivoire Golf Club — photos Google Images (sources indexées) */
  igcDistance:
    "https://baab.ci/wp-content/uploads/2022/07/Ivoire-Golf-Club-BAAB.jpg",
  igcInterior:
    "https://awe-inspiringplaces.com/wp-content/uploads/2024/01/The-Ivoire-Golf-Club-1024x576.jpeg",
  igcExterior:
    "https://web.ivoiregolfclub.com/wp-content/uploads/2025/04/index_piscineolympique.jpg",
  igcRoom:
    "https://assets.hole19golf.com/course_images/images/000/016/906/standard/678aeafecdc22807ada3f864f7d6520e3f7d4724.jpeg?1498123298",

  /** HEDEN Golf Hôtel — photos officielles hedengolfhotel.com */
  hedenDistance:
    "https://www.hedengolfhotel.com/wp-content/uploads/2025/03/HEDEN-GOLF-HOTEL-1.webp",
  hedenInterior:
    "https://www.hedengolfhotel.com/wp-content/uploads/2025/03/HEDEN-GOLF-HOTEL-32-700x466.webp",
  hedenPool:
    "https://www.hedengolfhotel.com/wp-content/uploads/2025/03/HEDEN-GOLF-HOTEL-29-700x466.webp",
  hedenRoom:
    "https://www.hedengolfhotel.com/wp-content/uploads/2025/03/HEDEN-GOLF-HOTEL-171.webp",

  /** Hôtel Président Yamoussoukro — Google Images + sources indexées (site officiel indisponible) */
  presidentDistance:
    "https://voyagerencotedivoire.com/wp-content/uploads/2025/07/yamossoukro-hotel-president.jpg",
  presidentInterior:
    "https://lh3.googleusercontent.com/p/AF1QipPqs1CshJ5aiohFzJDvHVoosVdaSfIETTT6QTSb=s1600-w1200",
  presidentPool:
    "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/13/67/f4/42/de-la-piscine-on-a-une.jpg",
  presidentRoom:
    "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/02/33/59/42/our-standard-tower-room.jpg",

  hpDistance: "https://hpresort.in-novation.tech/assets/images/gallery/1.jpg",
  hpInterior: "https://hpresort.in-novation.tech/assets/images/Accueil/5.jpg",
  hpPool: "https://hpresort.in-novation.tech/assets/images/Accueil/22.jpg",
  hpRoom:
    "https://hpresort.in-novation.tech/public/chambres/mUSGlzIzkPpmnF60JAC4synlZvJBn3rrt1YzKzFr.jpg",

  /** Hôtel de la Paix Daoukro — reportage photo BAAB (établissement réel, 2023) */
  paixDistance:
    "https://baab.ci/wp-content/uploads/2023/03/Hotel-de-la-paix-1-BAAB.jpeg",
  paixInterior:
    "https://baab.ci/wp-content/uploads/2023/03/Hotel-de-la-paix-2-BAAB.jpeg",
  paixPool:
    "https://baab.ci/wp-content/uploads/2023/03/Hotel-de-la-paix-4-BAAB.jpeg",
  paixRoom:
    "https://baab.ci/wp-content/uploads/2023/03/Hotel-de-la-paix-3-BAAB.jpeg",

  /** Hôtel Carrefour Séguéla — SONAPIE + site officiel hotelcarrefour.ci */
  carrefourDistance:
    "https://sonapie.ci/storage/banners/ApfAyrA0CBUiS9swRu3kYG7trZ8JHQzCpHaoSx1P.jpg",
  carrefourInterior:
    "https://sonapie.ci/storage/sites/rqN7G6K9lsQICSn9ys1Wv8r92yC3aLw6u4OwUwYF.jpg",
  carrefourPool: "https://hotelcarrefour.ci/images/pisc.jpg",
  carrefourRoom: "https://hotelcarrefour.ci/images/4.jpg",

  /** Hôtel Hambol Katiola — Trip.com + annuaire Abidjan.net */
  hambolDistance:
    "https://ak-d.tripcdn.com/images/2207180000015125r3CA4_R_960_660_R5_D.jpg",
  hambolInterior:
    "https://civ.abidjan.net/media/com_mtree/images/listings/m/354.jpg",
  hambolPool:
    "https://civ.abidjan.net/media/com_mtree/images/listings/m/353.jpg",
  hambolRoom:
    "https://civ.abidjan.net/media/com_mtree/images/listings/m/352.jpg",
} as const;

function build(
  base: Omit<
    SonapieEstablishment,
    "image" | "images" | "amenities" | "isSonapieManaged"
  > & { amenities?: string[] },
): SonapieEstablishment {
  return {
    ...base,
    isSonapieManaged: true,
    amenities: base.amenities ?? base.services,
    image: base.mainImage,
    images: base.gallery,
  };
}

const RAW: SonapieEstablishment[] = [
  build({
    id: "sonapie-1",
    name: "Sofitel Hôtel Ivoire",
    city: "Abidjan",
    type: "Hôtel",
    location: "Boulevard Hassan II, Cocody, Abidjan",
    description:
      "Emblème hôtelier d'Abidjan, le Sofitel Hôtel Ivoire domine la baie de Cocody. Établissement emblématique géré par SONAPIE, il propose des chambres et suites de prestige, une restauration raffinée, un bar panoramique et un spa.",
    services: ["Réservation", "Restauration", "Bar", "SPA"],
    mainImage: IMG.sofitelDistance,
    gallery: gallery4(
      IMG.sofitelDistance,
      IMG.sofitelInterior,
      IMG.sofitelPool,
      IMG.sofitelRoom,
    ),
    lat: 5.3361,
    lng: -3.9883,
    price: 75000,
    rating: 4.8,
    reviews: 412,
    capacity: 120,
    bedrooms: 380,
    bathrooms: 380,
    area: 45000,
    available: true,
    featured: true,
    tag: "Prestige",
  }),
  build({
    id: "sonapie-2",
    name: "Ivoire Golf Club",
    city: "Abidjan",
    type: "Complexe / Golf Club",
    location: "Riviera Golf, Cocody, Abidjan",
    description:
      "Complexe hôtelier et de réception au cœur de Cocody. Hébergement, restauration et espaces modulables pour séminaires, événements et séjours en bord de lagune.",
    services: ["Réservation", "Restauration", "Bar"],
    mainImage: IMG.igcDistance,
    gallery: gallery4(
      IMG.igcDistance,
      IMG.igcInterior,
      IMG.igcExterior,
      IMG.igcRoom,
    ),
    lat: 5.3375,
    lng: -4.0052,
    price: 42000,
    rating: 4.6,
    reviews: 178,
    capacity: 200,
    bedrooms: 0,
    bathrooms: 12,
    area: 85000,
    available: true,
    featured: true,
  }),
  build({
    id: "sonapie-3",
    name: "HEDEN Golf Hôtel",
    city: "Abidjan",
    type: "Hôtel",
    location: "Abidjan — quartier du golf",
    description:
      "Hôtel 4 étoiles au sein du domaine golfique d'Abidjan. Chambres confortables, restaurant, bar et cadre verdoyant pour séjours d'affaires ou de détente.",
    services: ["Réservation", "Restauration", "Bar"],
    mainImage: IMG.hedenDistance,
    gallery: gallery4(
      IMG.hedenDistance,
      IMG.hedenInterior,
      IMG.hedenPool,
      IMG.hedenRoom,
    ),
    lat: 5.338,
    lng: -4.002,
    price: 38000,
    rating: 4.4,
    reviews: 96,
    capacity: 80,
    bedrooms: 45,
    bathrooms: 45,
    area: 12000,
    available: true,
    featured: false,
  }),
  build({
    id: "sonapie-4",
    name: "Hôtel Président",
    city: "Yamoussoukro",
    type: "Hôtel",
    location: "Avenue Nangui Abrogoua, Yamoussoukro",
    description:
      "Hôtel institutionnel de la capitale politique, face au lac aux caïmans et à la Basilique Notre-Dame de la Paix. Hébergement protocolaire, salles de réunion, restauration et spa.",
    services: ["Réservation", "Restauration", "Bar", "SPA"],
    mainImage: IMG.presidentDistance,
    gallery: gallery4(
      IMG.presidentDistance,
      IMG.presidentInterior,
      IMG.presidentPool,
      IMG.presidentRoom,
    ),
    lat: 6.8112,
    lng: -5.2761,
    price: 48000,
    rating: 4.7,
    reviews: 234,
    capacity: 150,
    bedrooms: 185,
    bathrooms: 185,
    area: 28000,
    available: true,
    featured: true,
    tag: "Capitale politique",
  }),
  build({
    id: "sonapie-5",
    name: "HP Resort",
    city: "Yamoussoukro",
    type: "Resort",
    location: "Yamoussoukro — zone HP Resort",
    description:
      "Resort moderne à Yamoussoukro alliant hébergement, restauration et espaces de détente. Piscine, spa et cadre verdoyant pour séjours familiaux et professionnels.",
    services: ["Réservation", "Restauration", "Bar"],
    mainImage: IMG.hpDistance,
    gallery: gallery4(IMG.hpDistance, IMG.hpInterior, IMG.hpPool, IMG.hpRoom),
    lat: 6.827,
    lng: -5.289,
    price: 55000,
    rating: 4.5,
    reviews: 67,
    capacity: 100,
    bedrooms: 60,
    bathrooms: 60,
    area: 35000,
    available: true,
    featured: true,
  }),
  build({
    id: "sonapie-6",
    name: "Hôtel de la Paix",
    city: "Daoukro",
    type: "Hôtel",
    location: "Centre-ville, Daoukro",
    description:
      "Établissement hôtelier de Daoukro, ville historique du centre-est ivoirien. Hébergement confortable, restaurant et bar pour voyageurs d'affaires et visiteurs de la région.",
    services: ["Réservation", "Restauration", "Bar"],
    mainImage: IMG.paixDistance,
    gallery: gallery4(
      IMG.paixDistance,
      IMG.paixInterior,
      IMG.paixPool,
      IMG.paixRoom,
    ),
    lat: 7.059,
    lng: -3.963,
    price: 22000,
    rating: 4.2,
    reviews: 41,
    capacity: 60,
    bedrooms: 42,
    bathrooms: 42,
    area: 8500,
    available: true,
    featured: false,
  }),
  build({
    id: "sonapie-7",
    name: "Hôtel Carrefour",
    city: "Séguéla",
    type: "Hôtel",
    location: "Séguéla, région du Worodougou",
    description:
      "Hôtel de passage et de séjour à Séguéla, carrefour du nord-ouest ivoirien. Chambres fonctionnelles, restaurant et bar pour les professionnels et voyageurs de la région.",
    services: ["Réservation", "Restauration", "Bar"],
    mainImage: IMG.carrefourDistance,
    gallery: gallery4(
      IMG.carrefourDistance,
      IMG.carrefourInterior,
      IMG.carrefourPool,
      IMG.carrefourRoom,
    ),
    lat: 7.961,
    lng: -6.673,
    price: 18000,
    rating: 4.0,
    reviews: 22,
    capacity: 40,
    bedrooms: 28,
    bathrooms: 28,
    area: 4200,
    available: true,
    featured: false,
  }),
  build({
    id: "sonapie-8",
    name: "Hôtel Hambol",
    city: "Katiola",
    type: "Hôtel",
    location: "Katiola, région du Hambol",
    description:
      "Hôtel institutionnel de Katiola au cœur de la région du Hambol. Accueil des missions officielles et voyageurs avec restauration et bar sur place.",
    services: ["Réservation", "Restauration", "Bar"],
    mainImage: IMG.hambolDistance,
    gallery: gallery4(
      IMG.hambolDistance,
      IMG.hambolInterior,
      IMG.hambolPool,
      IMG.hambolRoom,
    ),
    lat: 8.137,
    lng: -5.1,
    price: 15000,
    rating: 3.9,
    reviews: 18,
    capacity: 35,
    bedrooms: 24,
    bathrooms: 24,
    area: 3800,
    available: true,
    featured: false,
  }),
];

export const SONAPIE_ESTABLISHMENTS: SonapieEstablishment[] = RAW;

export const SONAPIE_CITIES = [
  "Abidjan",
  "Yamoussoukro",
  "Daoukro",
  "Séguéla",
  "Katiola",
] as const;

export const SONAPIE_TYPES = [
  "Toutes catégories",
  "Hôtel",
  "Complexe / Golf Club",
  "Resort",
] as const;

export const ESTABLISHMENTS_PENDING_IMAGES = RAW.filter(e => e.imagesPendingOfficial).map(
  e => e.name,
);
