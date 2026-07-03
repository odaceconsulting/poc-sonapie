# SONAPIE Booking Platform

Plateforme de réservation des biens patrimoniaux de l'État de Côte d'Ivoire — prototype web SONAPIE.

Logo officiel : [sonapie.ci](https://sonapie.ci/)

**Production (branche `main`)** : [poc-sonapie.vercel.app](https://poc-sonapie.vercel.app)

## Lancer en local

```bash
npm i
npm run dev
```

Copiez `.env.example` vers `.env` et renseignez `VITE_GROQ_API_KEY` pour activer les assistants IA (public + admin). Sur Vercel, ajoutez la même variable pour la production.