# LaineBrute

Ce dépôt est désormais organisé en deux parties indépendantes :

- `frontend/` contient l'application React (Vite) consommée par les utilisateurs.
- `backend/` expose une API Express qui centralise les futures interactions avec la base de données.

## Installation

```bash
# Front-end
cd frontend
npm install
npm run dev

# Back-end
cd backend
npm install
npm run dev
```

Configurez vos variables d'environnement à partir des fichiers `.env.example` situés dans chaque dossier.

## Communication front ↔ back

L'application front s'attend à trouver l'API sur l'URL définie par la variable `VITE_API_URL` (par défaut `http://localhost:4000/api`).
Le serveur back autorise l'origine indiquée par `FRONTEND_ORIGIN` (par défaut `http://localhost:5173`).

Cette séparation permet de brancher ultérieurement une vraie base de données sur la couche back-end sans modifier la logique d'interface.
