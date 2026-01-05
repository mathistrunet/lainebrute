const path = require('path');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const dbFile = path.join(__dirname, 'database.sqlite');
const db = new Database(dbFile);

const quoteIdentifier = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;

const getTableColumns = (table) =>
  db.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all();

const expectedProducersColumns = [
  'id',
  'user_id',
  'name',
  'city',
  'description',
  'lat',
  'lng',
  'first_name',
  'last_name',
  'phone',
  'siret',
  'show_identity',
  'show_phone',
  'show_siret',
  'created_at',
];

const migrateProducersTableIfNeeded = () => {
  const columns = getTableColumns('producers');
  const columnNames = columns.map((info) => info.name);

  if (!columnNames.includes('TEXT')) {
    return;
  }

  const tempTable = 'producers_new';
  const copyColumns = expectedProducersColumns.filter((name) => columnNames.includes(name));
  const columnList = copyColumns.map(quoteIdentifier).join(', ');

  db.transaction(() => {
    db.prepare(`DROP TABLE IF EXISTS ${quoteIdentifier(tempTable)}`).run();
    db.prepare(`
      CREATE TABLE ${quoteIdentifier(tempTable)} (
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

    if (copyColumns.length > 0) {
      db.prepare(`
        INSERT INTO ${quoteIdentifier(tempTable)} (${columnList})
        SELECT ${columnList} FROM ${quoteIdentifier('producers')}
      `).run();
    }

    db.prepare(`DROP TABLE ${quoteIdentifier('producers')}`).run();
    db.prepare(`ALTER TABLE ${quoteIdentifier(tempTable)} RENAME TO ${quoteIdentifier('producers')}`)
      .run();
  })();
};

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

db.pragma('foreign_keys = ON');

const createTables = () => {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('producer', 'admin', 'buyer')),
      is_blocked INTEGER NOT NULL DEFAULT 0,
      email_verified INTEGER NOT NULL DEFAULT 0,
      verification_token TEXT,
      verification_token_expires_at TEXT,
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

  migrateProducersTableIfNeeded();

  ensureColumn('producers', 'first_name', 'TEXT');
  ensureColumn('producers', 'last_name', 'TEXT');
  ensureColumn('producers', 'phone', 'TEXT');
  ensureColumn('producers', 'siret', 'TEXT');
  ensureColumn('producers', 'show_identity', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('producers', 'show_phone', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('producers', 'show_siret', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'email_verified', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'verification_token', 'TEXT');
  ensureColumn('users', 'verification_token_expires_at', 'TEXT');
  ensureColumn('users', 'password_reset_token', 'TEXT');
  ensureColumn('users', 'password_reset_token_expires_at', 'TEXT');
  ensureColumn('users', 'is_blocked', 'INTEGER NOT NULL DEFAULT 0');

  db.prepare(`
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producer_id INTEGER,
      user_id INTEGER,
      title TEXT NOT NULL,
      availability_date TEXT,
      quantity_kg REAL,
      delivery_radius_km INTEGER,
      sheep_breed TEXT,
      description TEXT,
      city TEXT,
      expiration_notice_sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producer_id) REFERENCES producers(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();
};

const seedDatabase = () => {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount > 0) {
    return;
  }

  const buyerPasswordHash = bcrypt.hashSync('mathtrunet100', 10);
  const producerPasswordHash = bcrypt.hashSync('mathtrunet101', 10);
  const adminPasswordHash = bcrypt.hashSync('mathtrunet102', 10);
  const insertVerifiedUser = db.prepare(
    'INSERT INTO users (email, password_hash, role, email_verified) VALUES (?, ?, ?, 1)'
  );
  const buyerUserId = insertVerifiedUser
    .run('mathtrunet100@gmail.com', buyerPasswordHash, 'buyer')
    .lastInsertRowid;
  const producerUserId = insertVerifiedUser
    .run('mathtrunet101@gmail.com', producerPasswordHash, 'producer')
    .lastInsertRowid;
  insertVerifiedUser.run('mathtrunet102@gmail.com', adminPasswordHash, 'admin');

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

  const insertOffer = db.prepare(
    `INSERT INTO offers (
      producer_id,
      user_id,
      title,
      availability_date,
      quantity_kg,
      delivery_radius_km,
      sheep_breed,
      description,
      city
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertOffer.run(
    fermeNordId,
    producerUserId,
    'Tomates bio en cagettes',
    '2024-09-01',
    100,
    30,
    'Lacaune',
    'Cagettes de 10 kg de tomates plein champ disponibles chaque semaine.',
    'Lille'
  );
  insertOffer.run(
    null,
    buyerUserId,
    'Recherche lots de laine brute',
    '2024-10-15',
    250,
    50,
    'Texel',
    'Acheteur intéressé par des lots réguliers pour transformation.',
    'Grenoble'
  );
};

const ensureOfferOwners = () => {
  ensureColumn('offers', 'user_id', 'INTEGER');
  ensureColumn('offers', 'availability_date', 'TEXT');
  ensureColumn('offers', 'quantity_kg', 'REAL');
  ensureColumn('offers', 'delivery_radius_km', 'INTEGER');
  ensureColumn('offers', 'sheep_breed', 'TEXT');
  ensureColumn('offers', 'expiration_notice_sent_at', 'TEXT');

  const fillOwnerStmt = db.prepare(
    `UPDATE offers SET user_id = (SELECT user_id FROM producers WHERE producers.id = offers.producer_id)
     WHERE user_id IS NULL`
  );
  fillOwnerStmt.run();
};

const disableEmailVerification = () => {
  db.prepare(
    'UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires_at = NULL'
  ).run();
};

createTables();
ensureOfferOwners();
disableEmailVerification();
seedDatabase();

module.exports = db;
