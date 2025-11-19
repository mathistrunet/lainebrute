# LaineBrute

Ce dépôt est désormais organisé en deux parties indépendantes :

- `frontend/` contient l'application React (Vite) consommée par les utilisateurs.
- `backend/` expose une API Express qui centralise les futures interactions avec la base de données.

## Installation

```bash
# Back-end (API Express + SQLite)
cd backend
npm install
npm run dev   # lance http://localhost:4000

# Front-end (React + Vite)
cd ../frontend
npm install
npm run dev   # lance http://localhost:5173
```

Configurez vos variables d'environnement à partir de `backend/.env.example` (pour `PORT`, `FRONTEND_ORIGIN`, `JWT_SECRET`) et `frontend/.env` si vous souhaitez surcharger `VITE_API_URL`.

Des comptes de démonstration sont pré-créés lors du premier lancement de l'API :

- Producteur : `producer@example.com` / `password123`
- Administrateur : `admin@example.com` / `password123`

## Communication front ↔ back

L'application front s'attend à trouver l'API sur l'URL définie par la variable `VITE_API_URL` (par défaut `http://localhost:4000/api`).
Le serveur back autorise l'origine indiquée par `FRONTEND_ORIGIN` (par défaut `http://localhost:5173`).

Cette séparation permet de brancher ultérieurement une vraie base de données sur la couche back-end sans modifier la logique d'interface.
