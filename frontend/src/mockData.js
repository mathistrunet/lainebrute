export const producers = [
  { id: 1, name: 'Ferme du Nord', city: 'Lille', products: ['Pommes', 'Pommes de terre'] },
  { id: 2, name: 'Domaine des Vignes', city: 'Bordeaux', products: ['Raisin', 'Vin rouge'] },
  { id: 3, name: 'Les Jardins Provençaux', city: 'Avignon', products: ['Tomates', 'Basilic'] },
];

export const ads = [
  { id: 1, type: 'offre', title: 'Tomates bio en cagettes', producerId: 3, city: 'Avignon' },
  { id: 2, type: 'demande', title: 'Recherche pommes de terre', producerId: 1, city: 'Roubaix' },
  { id: 3, type: 'offre', title: 'Vin rouge AOC', producerId: 2, city: 'Bordeaux' },
  { id: 4, type: 'demande', title: 'Acheteur pour basilic frais', producerId: 3, city: 'Marseille' },
];

export const producerOffers = [
  { id: 'p1', title: 'Panier hebdo de légumes', quantity: '20 paniers', price: '25€' },
  { id: 'p2', title: 'Herbes aromatiques fraîches', quantity: '50 bottes', price: '5€' },
];
