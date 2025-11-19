export const producers = [
  {
    id: 1,
    name: 'Ferme du Nord',
    email: 'contact@fermedunord.fr',
    phone: '+33 6 12 00 00 01',
    city: 'Lille',
    products: ['Pommes', 'Pommes de terre'],
    deliveryRadiusKm: 80,
    verified: true,
  },
  {
    id: 2,
    name: 'Domaine des Vignes',
    email: 'bonjour@domainedesvignes.fr',
    phone: '+33 6 00 00 00 02',
    city: 'Bordeaux',
    products: ['Raisin', 'Vin rouge'],
    deliveryRadiusKm: 120,
    verified: true,
  },
  {
    id: 3,
    name: 'Les Jardins Provençaux',
    email: 'hello@jardinsprovence.fr',
    phone: '+33 6 00 00 00 03',
    city: 'Avignon',
    products: ['Tomates', 'Basilic'],
    deliveryRadiusKm: 60,
    verified: false,
  },
];

export const ads = [
  { id: 1, type: 'offre', title: 'Tomates bio en cagettes', producerId: 3, city: 'Avignon', status: 'published' },
  { id: 2, type: 'demande', title: 'Recherche pommes de terre', producerId: 1, city: 'Roubaix', status: 'draft' },
  { id: 3, type: 'offre', title: 'Vin rouge AOC', producerId: 2, city: 'Bordeaux', status: 'published' },
  { id: 4, type: 'demande', title: 'Acheteur pour basilic frais', producerId: 3, city: 'Marseille', status: 'archived' },
];

export const producerOffers = [
  { id: 'p1', title: 'Panier hebdo de légumes', quantity: '20 paniers', price: '25€' },
  { id: 'p2', title: 'Herbes aromatiques fraîches', quantity: '50 bottes', price: '5€' },
];

export const messages = [
  { id: 'm1', producerId: 1, sender: 'Camille', contact: 'camille@example.com', message: 'Bonjour, reste-t-il des paniers pour vendredi ?' },
  { id: 'm2', producerId: 2, sender: 'Thomas', contact: 'thomas@example.com', message: 'Peut-on organiser une visite du domaine ?' },
];
