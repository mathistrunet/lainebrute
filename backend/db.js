const path = require('path');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const dbFile = path.join(__dirname, 'database.sqlite');
const db = new Database(dbFile);

const quoteIdentifier = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;

const getTableColumns = (table) =>
  db.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all();

const ensureColumn = (table, column, definition) => {
  const columns = getTableColumns(table);
  const columnNames = columns.map((info) => info.name);

  if (columnNames.includes('TEXT')) {
    console.warn(
      `Detected unexpected column named "TEXT" in table ${table}. Consider migrating this column to a proper name.`
    );
  }

  if (columnNames.includes(column)) {
    return;
  }

  const columnDefinition = `${quoteIdentifier(column)} ${definition}`;
  db.prepare(`ALTER TABLE ${quoteIdentifier(table)} ADD COLUMN ${columnDefinition}`).run();
};

const normalizeSiretValue = (value) => {
  if (typeof value === 'string') {
    return value.replace(/\D/g, '');
  }
  if (typeof value === 'number') {
    return String(value).replace(/\D/g, '');
  }
  return '';
};

db.pragma('foreign_keys = ON');

const createTables = () => {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('producer', 'admin', 'buyer')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS producers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      city TEXT,
      description TEXT,
      lat REAL,
      lng REAL,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      siret TEXT,
      show_identity INTEGER NOT NULL DEFAULT 0,
      show_phone INTEGER NOT NULL DEFAULT 0,
      show_siret INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  ensureColumn('producers', 'first_name', 'TEXT');
  ensureColumn('producers', 'last_name', 'TEXT');
  ensureColumn('producers', 'phone', 'TEXT');
  ensureColumn('producers', 'siret', 'TEXT');
  ensureColumn('producers', 'show_identity', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('producers', 'show_phone', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('producers', 'show_siret', 'INTEGER NOT NULL DEFAULT 0');

  db.prepare(`
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producer_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      city TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producer_id) REFERENCES producers(id) ON DELETE CASCADE
    )
  `).run();
};

const normalizeStoredSirets = () => {
  const rows = db.prepare('SELECT id, siret FROM producers WHERE siret IS NOT NULL').all();
  const updateStmt = db.prepare('UPDATE producers SET siret = ? WHERE id = ?');
  rows.forEach((producer) => {
    const normalized = normalizeSiretValue(producer.siret);
    if (normalized && normalized !== producer.siret) {
      updateStmt.run(normalized, producer.id);
    }
  });
};

const seedDatabase = () => {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount > 0) {
    return;
  }

  const passwordHash = bcrypt.hashSync('password123', 10);
  const insertUser = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');

  insertUser.run('admin@example.com', passwordHash, 'admin');
  const producerUserId = insertUser.run('producer@example.com', passwordHash, 'producer').lastInsertRowid;
  const secondProducerUserId = insertUser.run('verger@example.com', passwordHash, 'producer').lastInsertRowid;

  const insertProducer = db.prepare(`
    INSERT INTO producers (
      user_id,
      name,
      city,
      description,
      lat,
      lng,
      first_name,
      last_name,
      phone,
      siret,
      show_identity,
      show_phone,
      show_siret
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const fermeNordId = insertProducer.run(
    producerUserId,
    'Ferme du Nord',
    'Lille',
    'Production de pommes et pommes de terre en circuit court.',
    50.6292,
    3.0573,
    'Claire',
    'Dupont',
    '+33 3 20 00 00 00',
    '12345678900017',
    1,
    1,
    0
  ).lastInsertRowid;
  const vergerSudId = insertProducer.run(
    secondProducerUserId,
    'Les Jardins Provençaux',
    'Avignon',
    'Maraîchage diversifié et herbes aromatiques.',
    43.9493,
    4.8055,
    'Julien',
    'Martin',
    '+33 4 90 00 00 00',
    '98765432100032',
    1,
    0,
    1
  ).lastInsertRowid;

  const insertOffer = db.prepare('INSERT INTO offers (producer_id, title, description, city) VALUES (?, ?, ?, ?)');
  insertOffer.run(
    fermeNordId,
    'Tomates bio en cagettes',
    'Cagettes de 10 kg de tomates plein champ disponibles chaque semaine.',
    'Lille'
  );
  insertOffer.run(
    vergerSudId,
    'Herbes aromatiques fraîches',
    'Basilic, thym et romarin cueillis le matin même.',
    'Avignon'
  );
};

createTables();
normalizeStoredSirets();
seedDatabase();

module.exports = db;
