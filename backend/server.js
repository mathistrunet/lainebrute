const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db = require('./db');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());

const findUserByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const insertUserStmt = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');
const listProducersStmt = db.prepare(
  'SELECT id, name, city, description, lat, lng, created_at FROM producers ORDER BY name ASC'
);
const findProducerByUserIdStmt = db.prepare('SELECT * FROM producers WHERE user_id = ?');
const insertProducerStmt = db.prepare(
  'INSERT INTO producers (user_id, name, city, description, lat, lng) VALUES (?, ?, ?, ?, ?, ?)'
);
const updateProducerStmt = db.prepare(
  'UPDATE producers SET name = ?, city = ?, description = ?, lat = ?, lng = ? WHERE id = ?'
);
const listOffersStmt = db.prepare(`
  SELECT o.id, o.title, o.description, o.city, o.created_at, o.producer_id,
         p.name AS producer_name, p.city AS producer_city, p.description AS producer_description
  FROM offers o
  JOIN producers p ON p.id = o.producer_id
  ORDER BY o.created_at DESC
`);
const listOffersByUserStmt = db.prepare(`
  SELECT o.id, o.title, o.description, o.city, o.created_at, o.producer_id,
         p.name AS producer_name, p.city AS producer_city
  FROM offers o
  JOIN producers p ON p.id = o.producer_id
  WHERE p.user_id = ?
  ORDER BY o.created_at DESC
`);
const insertOfferStmt = db.prepare('INSERT INTO offers (producer_id, title, description, city) VALUES (?, ?, ?, ?)');
const selectOfferWithOwnerStmt = db.prepare(`
  SELECT o.*, p.user_id AS producer_user_id, p.name AS producer_name, p.city AS producer_city,
         p.description AS producer_description
  FROM offers o
  JOIN producers p ON o.producer_id = p.id
  WHERE o.id = ?
`);
const deleteOfferStmt = db.prepare('DELETE FROM offers WHERE id = ?');
const adminUsersStmt = db.prepare('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC');
const adminOffersStmt = db.prepare(`
  SELECT o.id, o.title, o.description, o.city, o.created_at,
         p.id AS producer_id, p.name AS producer_name, p.city AS producer_city,
         u.id AS user_id, u.email AS user_email, u.role AS user_role
  FROM offers o
  JOIN producers p ON p.id = o.producer_id
  JOIN users u ON u.id = p.user_id
  ORDER BY o.created_at DESC
`);

const toOfferPayload = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  city: row.city,
  created_at: row.created_at,
  producer_id: row.producer_id,
  producer: {
    id: row.producer_id,
    name: row.producer_name,
    city: row.producer_city,
    description: row.producer_description,
  },
});

const sanitizeCoordinate = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ error: 'Token manquant.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide.' });
  }
};

const requireProducer = (req, res, next) => {
  if (req.user?.role !== 'producer') {
    return res.status(403).json({ error: 'Accès réservé aux producteurs.' });
  }
  return next();
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  return next();
};

const generateToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.post('/api/register', async (req, res) => {
  try {
    const { email, password, role = 'producer' } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }
    if (!['producer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    const existingUser = findUserByEmailStmt.get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email déjà utilisé.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = insertUserStmt.run(email, passwordHash, role);
    res.status(201).json({ data: { id: result.lastInsertRowid, email, role } });
  } catch (error) {
    console.error('Erreur register', error);
    res.status(500).json({ error: "Impossible de créer l'utilisateur." });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const user = findUserByEmailStmt.get(email);
    if (!user) {
      return res.status(400).json({ error: 'Identifiants incorrects.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Identifiants incorrects.' });
    }

    const token = generateToken(user);
    res.json({ data: { token } });
  } catch (error) {
    console.error('Erreur login', error);
    res.status(500).json({ error: 'Impossible de se connecter.' });
  }
});

app.get('/api/producers', (req, res) => {
  try {
    const producers = listProducersStmt.all();
    res.json({ data: producers });
  } catch (error) {
    console.error('Erreur producers', error);
    res.status(500).json({ error: 'Impossible de récupérer les producteurs.' });
  }
});

app.get('/api/my-producer', authenticateToken, requireProducer, (req, res) => {
  try {
    const producer = findProducerByUserIdStmt.get(req.user.id) ?? null;
    res.json({ data: producer });
  } catch (error) {
    console.error('Erreur my-producer', error);
    res.status(500).json({ error: 'Impossible de récupérer le profil producteur.' });
  }
});

app.post('/api/producers', authenticateToken, requireProducer, (req, res) => {
  try {
    const { name, city = null, description = null, lat = null, lng = null } = req.body ?? {};
    if (!name) {
      return res.status(400).json({ error: "Le nom de l'exploitation est requis." });
    }

    const existing = findProducerByUserIdStmt.get(req.user.id);
    const payload = [name, city, description, sanitizeCoordinate(lat), sanitizeCoordinate(lng)];

    if (existing) {
      updateProducerStmt.run(...payload, existing.id);
      const updated = findProducerByUserIdStmt.get(req.user.id);
      return res.json({ data: updated });
    }

    insertProducerStmt.run(req.user.id, ...payload);
    const created = findProducerByUserIdStmt.get(req.user.id);
    return res.status(201).json({ data: created });
  } catch (error) {
    console.error('Erreur création producteur', error);
    res.status(500).json({ error: 'Impossible de sauvegarder le producteur.' });
  }
});

app.get('/api/offers', (req, res) => {
  try {
    const offers = listOffersStmt.all().map(toOfferPayload);
    res.json({ data: offers });
  } catch (error) {
    console.error('Erreur offers', error);
    res.status(500).json({ error: 'Impossible de récupérer les offres.' });
  }
});

app.get('/api/my-offers', authenticateToken, requireProducer, (req, res) => {
  try {
    const offers = listOffersByUserStmt.all(req.user.id).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      city: row.city,
      created_at: row.created_at,
      producer_id: row.producer_id,
      producer: {
        id: row.producer_id,
        name: row.producer_name,
        city: row.producer_city,
      },
    }));
    res.json({ data: offers });
  } catch (error) {
    console.error('Erreur my-offers', error);
    res.status(500).json({ error: 'Impossible de récupérer vos offres.' });
  }
});

app.post('/api/offers', authenticateToken, requireProducer, (req, res) => {
  try {
    const { title, description = null, city = null } = req.body ?? {};
    if (!title) {
      return res.status(400).json({ error: "Le titre de l'offre est requis." });
    }

    const producer = findProducerByUserIdStmt.get(req.user.id);
    if (!producer) {
      return res.status(400).json({ error: 'Veuillez créer votre profil producteur avant de publier une offre.' });
    }

    const result = insertOfferStmt.run(producer.id, title, description, city);
    const created = selectOfferWithOwnerStmt.get(result.lastInsertRowid);
    res.status(201).json({ data: toOfferPayload(created) });
  } catch (error) {
    console.error('Erreur création offre', error);
    res.status(500).json({ error: "Impossible de créer l'offre." });
  }
});

app.delete('/api/offers/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const offer = selectOfferWithOwnerStmt.get(id);
    if (!offer) {
      return res.status(404).json({ error: 'Offre introuvable.' });
    }

    if (req.user.role !== 'admin' && offer.producer_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez pas supprimer cette offre.' });
    }

    deleteOfferStmt.run(id);
    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Erreur suppression offre', error);
    res.status(500).json({ error: "Impossible de supprimer l'offre." });
  }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = adminUsersStmt.all();
    res.json({ data: users });
  } catch (error) {
    console.error('Erreur admin users', error);
    res.status(500).json({ error: 'Impossible de récupérer les utilisateurs.' });
  }
});

app.get('/api/admin/offers', authenticateToken, requireAdmin, (req, res) => {
  try {
    const offers = adminOffersStmt.all().map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      city: row.city,
      created_at: row.created_at,
      producer: { id: row.producer_id, name: row.producer_name, city: row.producer_city },
      user: { id: row.user_id, email: row.user_email, role: row.user_role },
    }));
    res.json({ data: offers });
  } catch (error) {
    console.error('Erreur admin offers', error);
    res.status(500).json({ error: 'Impossible de récupérer les offres.' });
  }
});

app.use((err, req, res, next) => {
  console.error('Erreur inattendue', err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

app.listen(PORT, () => {
  console.log(`API LaineBrute démarrée sur http://localhost:${PORT}`);
});
