const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const db = require('./db');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET =
  process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-insecure-secret');
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@example.com';
const PASSWORD_RESET_URL = process.env.PASSWORD_RESET_URL || FRONTEND_ORIGIN;
const EMAIL_VERIFICATION_URL = process.env.EMAIL_VERIFICATION_URL || BACKEND_BASE_URL;
const REPORT_EMAIL_TO = process.env.REPORT_EMAIL_TO || process.env.SMTP_USER || 'mathtrunet102@gmail.com';
const CONTACT_EMAIL_TO = process.env.CONTACT_EMAIL_TO || REPORT_EMAIL_TO;

if (process.env.NODE_ENV === 'production') {
  if (!JWT_SECRET || JWT_SECRET === 'change-me-in-production' || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET doit être défini avec une valeur robuste (>= 32 caractères).');
  }
}

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.set('etag', false);
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const findUserByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const findUserByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const insertUserStmt = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');
const updateUserResetTokenStmt = db.prepare(
  'UPDATE users SET password_reset_token = ?, password_reset_token_expires_at = ? WHERE id = ?'
);
const updateUserVerificationTokenStmt = db.prepare(
  'UPDATE users SET verification_token = ?, verification_token_expires_at = ? WHERE id = ?'
);
const findUserByResetTokenStmt = db.prepare('SELECT * FROM users WHERE password_reset_token = ?');
const findUserByVerificationTokenStmt = db.prepare(
  'SELECT * FROM users WHERE verification_token = ?'
);
const verifyUserStmt = db.prepare(
  'UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires_at = NULL WHERE id = ?'
);
const updateUserPasswordStmt = db.prepare(
  'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_token_expires_at = NULL WHERE id = ?'
);
const deleteUserByIdStmt = db.prepare('DELETE FROM users WHERE id = ?');
const deleteOffersByUserIdStmt = db.prepare('DELETE FROM offers WHERE user_id = ?');
const updateUserAdminStmt = db.prepare(
  'UPDATE users SET email = ?, role = ?, is_blocked = ? WHERE id = ?'
);
const listProducersStmt = db.prepare(`
  SELECT id, name, city, description, lat, lng, created_at,
         first_name, last_name, phone, siret,
         show_identity, show_phone, show_siret
  FROM producers
  ORDER BY name ASC
`);
const findProducerByUserIdStmt = db.prepare('SELECT * FROM producers WHERE user_id = ?');
const insertProducerStmt = db.prepare(`
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
const updateProducerStmt = db.prepare(`
  UPDATE producers
  SET name = ?,
      city = ?,
      description = ?,
      lat = ?,
      lng = ?,
      first_name = ?,
      last_name = ?,
      phone = ?,
      siret = ?,
      show_identity = ?,
      show_phone = ?,
      show_siret = ?
  WHERE id = ?
`);
const findProducerByIdStmt = db.prepare('SELECT * FROM producers WHERE id = ?');
const deleteProducerByIdStmt = db.prepare('DELETE FROM producers WHERE id = ?');
const listOffersStmt = db.prepare(`
  SELECT o.id, o.title, o.availability_date, o.quantity_kg, o.delivery_radius_km, o.sheep_breed,
         o.description, o.city, o.created_at, o.producer_id, o.user_id AS owner_user_id,
         u.role AS owner_role, u.email AS owner_email,
         p.name AS producer_name, p.city AS producer_city, p.description AS producer_description,
         p.lat AS producer_lat, p.lng AS producer_lng,
         p.first_name AS producer_first_name, p.last_name AS producer_last_name,
         p.phone AS producer_phone, p.siret AS producer_siret,
         p.show_identity AS producer_show_identity,
         p.show_phone AS producer_show_phone,
         p.show_siret AS producer_show_siret
  FROM offers o
  JOIN users u ON u.id = o.user_id
  LEFT JOIN producers p ON p.id = o.producer_id
  WHERE datetime(o.created_at) >= datetime('now', '-1 year')
  ORDER BY o.created_at DESC
`);
const listOffersByUserStmt = db.prepare(`
  SELECT o.id, o.title, o.availability_date, o.quantity_kg, o.delivery_radius_km, o.sheep_breed,
         o.description, o.city, o.created_at, o.producer_id, o.user_id AS owner_user_id,
         u.role AS owner_role, u.email AS owner_email,
         p.name AS producer_name, p.city AS producer_city,
         p.lat AS producer_lat, p.lng AS producer_lng,
         p.first_name AS producer_first_name, p.last_name AS producer_last_name,
         p.phone AS producer_phone, p.siret AS producer_siret,
         p.show_identity AS producer_show_identity,
         p.show_phone AS producer_show_phone,
         p.show_siret AS producer_show_siret
  FROM offers o
  JOIN users u ON u.id = o.user_id
  LEFT JOIN producers p ON p.id = o.producer_id
  WHERE o.user_id = ?
    AND datetime(o.created_at) >= datetime('now', '-1 year')
  ORDER BY o.created_at DESC
`);
const insertOfferStmt = db.prepare(
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
const updateOfferStmt = db.prepare(
  `UPDATE offers
   SET title = ?, availability_date = ?, quantity_kg = ?, delivery_radius_km = ?, sheep_breed = ?,
       description = ?, city = ?
   WHERE id = ?`
);
const selectOfferWithOwnerStmt = db.prepare(`
  SELECT o.*, o.user_id AS owner_user_id, u.email AS owner_email, u.role AS owner_role,
         p.user_id AS producer_user_id, p.name AS producer_name, p.city AS producer_city,
         p.description AS producer_description,
         p.lat AS producer_lat, p.lng AS producer_lng,
         p.first_name AS producer_first_name, p.last_name AS producer_last_name,
         p.phone AS producer_phone, p.siret AS producer_siret,
         p.show_identity AS producer_show_identity,
         p.show_phone AS producer_show_phone,
         p.show_siret AS producer_show_siret
  FROM offers o
  JOIN users u ON u.id = o.user_id
  LEFT JOIN producers p ON o.producer_id = p.id
  WHERE o.id = ?
`);
const countOffersByProducerIdStmt = db.prepare(
  'SELECT COUNT(*) AS count FROM offers WHERE producer_id = ?'
);
const deleteOfferStmt = db.prepare('DELETE FROM offers WHERE id = ?');
const selectOffersForExpirationNoticeStmt = db.prepare(`
  SELECT o.id, o.title, o.created_at, datetime(o.created_at, '+1 year') AS expires_at, u.email AS owner_email
  FROM offers o
  JOIN users u ON u.id = o.user_id
  WHERE o.expiration_notice_sent_at IS NULL
    AND o.user_id IS NOT NULL
    AND datetime(o.created_at) <= datetime('now', '-1 year', '+7 days')
    AND datetime(o.created_at) > datetime('now', '-1 year')
`);
const markOfferExpirationNoticeStmt = db.prepare(
  'UPDATE offers SET expiration_notice_sent_at = ? WHERE id = ?'
);
const deleteExpiredOffersStmt = db.prepare(
  "DELETE FROM offers WHERE datetime(created_at) < datetime('now', '-1 year')"
);
const adminUsersStmt = db.prepare(
  'SELECT id, email, role, is_blocked, created_at FROM users ORDER BY created_at DESC'
);
const adminProducersStmt = db.prepare(`
  SELECT p.id, p.user_id, p.name, p.city, p.description, p.lat, p.lng,
         p.first_name, p.last_name, p.phone, p.siret,
         p.show_identity, p.show_phone, p.show_siret, p.created_at,
         u.email AS user_email
  FROM producers p
  JOIN users u ON u.id = p.user_id
  ORDER BY p.created_at DESC
`);
const adminProducerByIdStmt = db.prepare(`
  SELECT p.id, p.user_id, p.name, p.city, p.description, p.lat, p.lng,
         p.first_name, p.last_name, p.phone, p.siret,
         p.show_identity, p.show_phone, p.show_siret, p.created_at,
         u.email AS user_email
  FROM producers p
  JOIN users u ON u.id = p.user_id
  WHERE p.id = ?
`);
const adminOffersStmt = db.prepare(`
  SELECT o.id, o.title, o.availability_date, o.quantity_kg, o.delivery_radius_km, o.sheep_breed,
         o.description, o.city, o.created_at,
         p.id AS producer_id, p.name AS producer_name, p.city AS producer_city,
         u.id AS user_id, u.email AS user_email, u.role AS user_role
  FROM offers o
  LEFT JOIN producers p ON p.id = o.producer_id
  JOIN users u ON u.id = o.user_id
  ORDER BY o.created_at DESC
`);
const listTablesStmt = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
);
const countUsersStmt = db.prepare('SELECT COUNT(*) AS count FROM users');
const countProducersStmt = db.prepare('SELECT COUNT(*) AS count FROM producers');
const countOffersStmt = db.prepare('SELECT COUNT(*) AS count FROM offers');
const usersByDayStmt = db.prepare(`
  SELECT date(created_at) AS day, COUNT(*) AS count
  FROM users
  WHERE datetime(created_at) >= datetime('now', ?)
  GROUP BY date(created_at)
  ORDER BY date(created_at) ASC
`);
const offersByDayStmt = db.prepare(`
  SELECT date(created_at) AS day, COUNT(*) AS count
  FROM offers
  WHERE datetime(created_at) >= datetime('now', ?)
  GROUP BY date(created_at)
  ORDER BY date(created_at) ASC
`);

const EMAIL_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const MIN_PASSWORD_LENGTH = 10;

const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

const buildPasswordResetLink = (token) => {
  const baseUrl = PASSWORD_RESET_URL.replace(/\/$/, '');
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
};

const buildVerificationLink = (token) => {
  const baseUrl = EMAIL_VERIFICATION_URL.replace(/\/$/, '');
  return `${baseUrl}/api/verify-email?token=${encodeURIComponent(token)}`;
};

const isPasswordStrong = (password) => {
  const normalized = String(password || '');
  if (normalized.length < MIN_PASSWORD_LENGTH) {
    return false;
  }
  const hasLetter = /[A-Za-z]/.test(normalized);
  const hasNumber = /[0-9]/.test(normalized);
  return hasLetter && hasNumber;
};

// Centralise la lecture de la configuration SMTP depuis les variables d'environnement.
const getSmtpConfig = () => ({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
});

// Validation explicite pour éviter un envoi en production avec une config incomplète.
const validateSmtpConfig = () => {
  const { host, port, user, pass } = getSmtpConfig();
  const missingKeys = [];

  if (!host) missingKeys.push('SMTP_HOST');
  if (!port) missingKeys.push('SMTP_PORT');
  if (!user) missingKeys.push('SMTP_USER');
  if (!pass) missingKeys.push('SMTP_PASS');
  if (!EMAIL_FROM) missingKeys.push('EMAIL_FROM');

  if (missingKeys.length > 0) {
    throw new Error(`SMTP non configuré : renseignez ${missingKeys.join(', ')}`);
  }

  return { host, port, user, pass };
};

const createMailTransport = () => {
  const smtpConfig = validateSmtpConfig();
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth: { user: smtpConfig.user, pass: smtpConfig.pass },
  });
};

const sendEmail = async ({ recipient, subject, text, html, attachments = [] }) => {
  const mailTransport = createMailTransport();
  const message = {
    from: EMAIL_FROM,
    to: recipient,
    subject,
    text,
    html,
    attachments,
  };

  await mailTransport.sendMail(message);
  return { sent: true, to: recipient };
};

const sendPasswordSetupEmail = async (recipient, resetUrl) => {
  const subject = 'Créez votre mot de passe';
  const text = `Bienvenue ! Créez votre mot de passe en cliquant sur ce lien (valide 24h) : ${resetUrl}`;
  const html = `
      <p>Bienvenue ! Créez votre mot de passe en cliquant sur ce lien (valide 24h) :</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
    `;
  return sendEmail({ recipient, subject, text, html });
};

const sendRegistrationEmail = async (recipient, verificationUrl, resetUrl) => {
  const subject = 'Bienvenue sur Laine Brute : vérifiez votre email';
  const text = [
    'Bienvenue sur Laine Brute !',
    '',
    `Vérifiez votre adresse email (valide 24h) : ${verificationUrl}`,
    `Créez ensuite votre mot de passe (valide 24h) : ${resetUrl}`,
  ].join('\n');
  const html = `
      <p>Bienvenue sur Laine Brute !</p>
      <p>Vérifiez votre adresse email (valide 24h) :</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>Créez ensuite votre mot de passe (valide 24h) :</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
    `;
  return sendEmail({ recipient, subject, text, html });
};

const sendPasswordResetEmail = async (recipient, resetUrl) => {
  const subject = 'Réinitialisez votre mot de passe';
  const text = `Vous avez demandé une réinitialisation de mot de passe. Cliquez sur ce lien (valide 24h) : ${resetUrl}`;
  const html = `
      <p>Vous avez demandé une réinitialisation de mot de passe. Cliquez sur ce lien (valide 24h) :</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
    `;
  return sendEmail({ recipient, subject, text, html });
};

const REPORT_CATEGORIES = new Map([
  ['ad', 'Signalement d’annonce'],
  ['producer', 'Signalement de producteur'],
  ['claim', "Revendiquer l'établissement"],
]);

const formatReportTarget = (target) => {
  if (!target || typeof target !== 'object') {
    return 'Cible non précisée';
  }
  if (target.type === 'ad') {
    return `Annonce #${target.id ?? 'N/A'}: ${target.title ?? 'Sans titre'} (${target.producer ?? 'Producteur inconnu'})`;
  }
  if (target.type === 'producer') {
    return `Producteur #${target.id ?? 'N/A'}: ${target.name ?? 'Sans nom'} (${target.city ?? 'Ville inconnue'})`;
  }
  return `Cible: ${JSON.stringify(target)}`;
};

const sendReportEmail = async ({ category, reason, contactEmail, target, documents = [] }) => {
  const subject = `${REPORT_CATEGORIES.get(category) ?? 'Signalement'} - Laine Brute`;
  const formattedTarget = formatReportTarget(target);
  const attachments = documents
    .filter((doc) => doc && doc.content)
    .map((doc) => ({
      filename: doc.name ?? 'document',
      content: Buffer.from(doc.content, 'base64'),
      contentType: doc.type || 'application/octet-stream',
    }));

  const text = [
    `Type: ${REPORT_CATEGORIES.get(category) ?? category}`,
    `Cible: ${formattedTarget}`,
    `Email contact: ${contactEmail ?? 'Non renseigné'}`,
    '',
    'Motif:',
    reason,
  ].join('\n');
  const html = `
      <p><strong>Type :</strong> ${REPORT_CATEGORIES.get(category) ?? category}</p>
      <p><strong>Cible :</strong> ${formattedTarget}</p>
      <p><strong>Email contact :</strong> ${contactEmail ?? 'Non renseigné'}</p>
      <p><strong>Motif :</strong></p>
      <p>${reason}</p>
    `;

  await sendEmail({ recipient: REPORT_EMAIL_TO, subject, text, html, attachments });
};

const sendContactEmail = async ({ name, email, subject, message }) => {
  const formattedSubject = `Contact - ${subject}`;
  const text = [
    `Nom: ${name}`,
    `Email: ${email}`,
    '',
    'Message:',
    message,
  ].join('\n');
  const html = `
      <p><strong>Nom :</strong> ${name}</p>
      <p><strong>Email :</strong> ${email}</p>
      <p><strong>Message :</strong></p>
      <p>${message}</p>
    `;

  await sendEmail({ recipient: CONTACT_EMAIL_TO, subject: formattedSubject, text, html });
};

const sendOfferExpirationNoticeEmail = async ({ recipient, title, expiresAt }) => {
  const subject = 'Votre annonce expirera bientôt';
  const normalizedExpiry = expiresAt
    ? new Date(`${String(expiresAt).replace(' ', 'T')}Z`)
    : null;
  const formattedDate =
    normalizedExpiry && !Number.isNaN(normalizedExpiry.getTime())
      ? normalizedExpiry.toLocaleDateString('fr-FR')
      : 'dans 7 jours';
  const text = `Bonjour,\n\nVotre annonce "${title}" expirera le ${formattedDate}. Pensez à la renouveler si nécessaire avant sa suppression automatique.\n\nMerci,\nL'équipe Laine Brute`;
  const html = `
      <p>Bonjour,</p>
      <p>Votre annonce <strong>${title}</strong> expirera le <strong>${formattedDate}</strong>.</p>
      <p>Pensez à la renouveler si nécessaire avant sa suppression automatique.</p>
      <p>Merci,<br />L'équipe Laine Brute</p>
    `;
  return sendEmail({ recipient, subject, text, html });
};

const escapeIdentifier = (identifier) => identifier.replace(/"/g, '""');
const quoteIdentifier = (identifier) => `"${escapeIdentifier(identifier)}"`;

const processOfferExpirations = async () => {
  const noticeCandidates = selectOffersForExpirationNoticeStmt.all();
  for (const offer of noticeCandidates) {
    try {
      await sendOfferExpirationNoticeEmail({
        recipient: offer.owner_email,
        title: offer.title,
        expiresAt: offer.expires_at,
      });
      markOfferExpirationNoticeStmt.run(new Date().toISOString(), offer.id);
    } catch (error) {
      console.error('Erreur envoi email expiration annonce', error);
    }
  }

  const deleted = deleteExpiredOffersStmt.run();
  if (deleted.changes) {
    console.log(`Suppression automatique des annonces expirées: ${deleted.changes}`);
  }
};

const scheduleOfferExpirationProcessing = () => {
  const run = async () => {
    try {
      await processOfferExpirations();
    } catch (error) {
      console.error('Erreur traitement expiration annonces', error);
    }
  };

  run();
  setInterval(run, 1000 * 60 * 60 * 24);
};

const toOfferPayload = (row) => {
  const producer = row.producer_id
    ? {
        id: row.producer_id,
        name: row.producer_name,
        city: row.producer_city,
        description: row.producer_description,
        lat: row.producer_lat ?? null,
        lng: row.producer_lng ?? null,
        contact: toPublicContact({
          first_name: row.producer_first_name,
          last_name: row.producer_last_name,
          phone: row.producer_phone,
          siret: row.producer_siret,
          show_identity: row.producer_show_identity,
          show_phone: row.producer_show_phone,
          show_siret: row.producer_show_siret,
        }),
      }
    : null;

  const owner = row.owner_user_id
    ? { id: row.owner_user_id, email: row.owner_email ?? null, role: row.owner_role ?? null }
    : null;

  return {
    id: row.id,
    title: row.title,
    availability_date: row.availability_date ?? null,
    quantity_kg: row.quantity_kg ?? null,
    delivery_radius_km: row.delivery_radius_km ?? null,
    sheep_breed: row.sheep_breed ?? null,
    description: row.description,
    city: row.city,
    created_at: row.created_at,
    producer_id: row.producer_id,
    owner,
    producer,
  };
};


const sanitizeCoordinate = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const toVisibilityFlag = (value, defaultValue = 0) => {
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'number') {
    return value ? 1 : 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'on', 'oui', 'yes'].includes(normalized)) {
      return 1;
    }
    if (['0', 'false', 'off', 'non', 'no'].includes(normalized)) {
      return 0;
    }
  }
  return defaultValue ? 1 : 0;
};

const toPublicContact = (producer) => ({
  first_name: producer.show_identity ? producer.first_name ?? null : null,
  last_name: producer.show_identity ? producer.last_name ?? null : null,
  phone: producer.show_phone ? producer.phone ?? null : null,
  siret: producer.show_siret ? producer.siret ?? null : null,
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ error: 'Token manquant.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const dbUser = findUserByIdStmt.get(payload.id);
    if (!dbUser) {
      return res.status(401).json({ error: 'Utilisateur introuvable.' });
    }
    if (dbUser.is_blocked) {
      return res.status(403).json({ error: 'Compte interdit.' });
    }
    req.user = { id: dbUser.id, email: dbUser.email, role: dbUser.role };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide.' });
  }
};

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Accès refusé pour ce rôle." });
  }
  return next();
};

const requireProducer = requireRole('producer', 'admin');
const requirePublisher = requireRole('producer', 'buyer', 'admin');
const requireAdmin = requireRole('admin');

const generateToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { email, role = 'producer' } = req.body ?? {};
    if (!email) {
      return res.status(400).json({ error: 'Email requis.' });
    }
    if (!['producer', 'buyer'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = findUserByEmailStmt.get(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'Email déjà utilisé.' });
    }

    const temporaryPassword = crypto.randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const result = insertUserStmt.run(normalizedEmail, passwordHash, role);
    const resetToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS).toISOString();
    updateUserResetTokenStmt.run(resetToken, expiresAt, result.lastInsertRowid);
    const verificationToken = generateVerificationToken();
    updateUserVerificationTokenStmt.run(verificationToken, expiresAt, result.lastInsertRowid);
    const resetUrl = buildPasswordResetLink(resetToken);
    const verificationUrl = buildVerificationLink(verificationToken);
    let emailDelivery = null;

    try {
      emailDelivery = await sendRegistrationEmail(normalizedEmail, verificationUrl, resetUrl);
    } catch (sendError) {
      console.error('Erreur envoi email de création mot de passe', sendError);
      deleteUserByIdStmt.run(result.lastInsertRowid);
      emailDelivery = {
        sent: false,
        to: email,
        error: sendError?.message || "Impossible d'envoyer l'email de création de mot de passe.",
      };
      return res
        .status(500)
        .json({
          error: "Impossible d'envoyer l'email de création de mot de passe. Veuillez réessayer.",
          data: { emailDelivery },
        });
    }

    res
      .status(201)
      .json({
        data: { id: result.lastInsertRowid, email: normalizedEmail, role, emailVerified: false, emailDelivery },
      });
  } catch (error) {
    console.error('Erreur register', error);
    res.status(500).json({ error: "Impossible de créer l'utilisateur." });
  }
});

app.post('/api/password-reset', emailLimiter, async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!email) {
      return res.status(400).json({ error: 'Adresse email requise.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = findUserByEmailStmt.get(normalizedEmail);
    if (!user) {
      return res.json({
        data: {
          emailDelivery: {
            sent: false,
            to: normalizedEmail,
            error: "Aucun compte associé à cette adresse.",
          },
        },
      });
    }

    const resetToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS).toISOString();
    updateUserResetTokenStmt.run(resetToken, expiresAt, user.id);

    const resetUrl = buildPasswordResetLink(resetToken);
    let emailDelivery = null;

    try {
      emailDelivery = await sendPasswordResetEmail(normalizedEmail, resetUrl);
    } catch (sendError) {
      console.error('Erreur envoi email de réinitialisation', sendError);
      emailDelivery = {
        sent: false,
        to: normalizedEmail,
        error: sendError?.message || "Impossible d'envoyer l'email de réinitialisation.",
      };
      return res.status(500).json({
        error: "Impossible d'envoyer l'email de réinitialisation. Veuillez réessayer.",
        data: { emailDelivery },
      });
    }

    return res.json({ data: { emailDelivery } });
  } catch (error) {
    console.error('Erreur password-reset', error);
    return res.status(500).json({ error: "Impossible de traiter la demande." });
  }
});

app.post('/api/password-reset/confirm', authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body ?? {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token et mot de passe requis.' });
    }

    if (!isPasswordStrong(password)) {
      return res.status(400).json({
        error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères, avec des lettres et des chiffres.`,
      });
    }

    const user = findUserByResetTokenStmt.get(token);
    if (!user || !user.password_reset_token_expires_at) {
      return res.status(400).json({ error: 'Lien de réinitialisation invalide.' });
    }

    const expiresAt = new Date(user.password_reset_token_expires_at).getTime();
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Lien de réinitialisation expiré.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    updateUserPasswordStmt.run(passwordHash, user.id);

    return res.json({ data: { message: 'Mot de passe mis à jour.' } });
  } catch (error) {
    console.error('Erreur password-reset-confirm', error);
    return res.status(500).json({ error: "Impossible de réinitialiser le mot de passe." });
  }
});

app.post('/api/reports', writeLimiter, async (req, res) => {
  try {
    const { category, reason, contactEmail = null, target = null, documents = [] } = req.body ?? {};

    if (!category || !REPORT_CATEGORIES.has(category)) {
      return res.status(400).json({ error: 'Type de signalement invalide.' });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'Motif requis.' });
    }

    const normalizedDocs = Array.isArray(documents) ? documents : [];
    if (category === 'claim' && normalizedDocs.length === 0) {
      return res.status(400).json({ error: 'Documents justificatifs requis pour la revendication.' });
    }

    await sendReportEmail({
      category,
      reason: String(reason).trim(),
      contactEmail: contactEmail ? String(contactEmail).trim() : null,
      target,
      documents: normalizedDocs,
    });

    return res.json({ data: { message: 'Signalement envoyé.' } });
  } catch (error) {
    console.error('Erreur report', error);
    return res.status(500).json({ error: "Impossible d'envoyer le signalement." });
  }
});

app.post('/api/contact', writeLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body ?? {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Nom requis.' });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'Email requis.' });
    }
    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ error: 'Sujet requis.' });
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message requis.' });
    }

    await sendContactEmail({
      name: String(name).trim(),
      email: String(email).trim(),
      subject: String(subject).trim(),
      message: String(message).trim(),
    });

    return res.json({ data: { message: 'Demande de contact envoyée.' } });
  } catch (error) {
    console.error('Erreur contact', error);
    return res.status(500).json({ error: "Impossible d'envoyer la demande de contact." });
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = findUserByEmailStmt.get(normalizedEmail);
    if (!user) {
      return res.status(400).json({ error: 'Identifiants incorrects.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Identifiants incorrects.' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Compte interdit.' });
    }

    if (!user.email_verified && user.role !== 'admin') {
      return res.status(403).json({ error: 'Veuillez vérifier votre adresse email.' });
    }

    const token = generateToken(user);
    res.json({ data: { token } });
  } catch (error) {
    console.error('Erreur login', error);
    res.status(500).json({ error: 'Impossible de se connecter.' });
  }
});

app.get('/api/verify-email', emailLimiter, async (req, res) => {
  try {
    const token = req.query.token || req.body?.token;
    if (!token) {
      return res.status(400).json({ error: 'Token requis.' });
    }

    const user = findUserByVerificationTokenStmt.get(token);
    if (!user || !user.verification_token_expires_at) {
      return res.status(400).json({ error: 'Lien de vérification invalide.' });
    }

    const expiresAt = new Date(user.verification_token_expires_at).getTime();
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Lien de vérification expiré.' });
    }

    verifyUserStmt.run(user.id);
    return res.json({ data: { message: 'Adresse email vérifiée.' } });
  } catch (error) {
    console.error('Erreur verification email', error);
    return res.status(500).json({ error: "Impossible de vérifier l'email." });
  }
});

app.delete('/api/account', authenticateToken, (req, res) => {
  try {
    const existing = findUserByIdStmt.get(req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    deleteOffersByUserIdStmt.run(req.user.id);
    deleteUserByIdStmt.run(req.user.id);
    return res.json({ data: { success: true } });
  } catch (error) {
    console.error('Erreur suppression compte', error);
    return res.status(500).json({ error: "Impossible de supprimer le compte." });
  }
});

app.get('/api/producers', (req, res) => {
  try {
    const producers = listProducersStmt.all().map((producer) => ({
      id: producer.id,
      name: producer.name,
      city: producer.city,
      description: producer.description,
      lat: producer.lat,
      lng: producer.lng,
      created_at: producer.created_at,
      contact: toPublicContact(producer),
    }));
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
    const {
      name,
      city = null,
      description = null,
      lat = null,
      lng = null,
      first_name = null,
      last_name = null,
      phone = null,
      siret = null,
      show_identity = 0,
      show_phone = 0,
      show_siret = 0,
    } = req.body ?? {};
    if (!name) {
      return res.status(400).json({ error: "Le nom de l'exploitation est requis." });
    }

    const sanitizedSiret =
      typeof siret === 'string' || typeof siret === 'number' ? String(siret).trim() : '';
    const siretValue = sanitizedSiret === '' ? null : sanitizedSiret;
    const existing = findProducerByUserIdStmt.get(req.user.id);

    const payload = [
      name,
      city,
      description,
      sanitizeCoordinate(lat),
      sanitizeCoordinate(lng),
      first_name,
      last_name,
      phone,
      siretValue,
      toVisibilityFlag(show_identity),
      toVisibilityFlag(show_phone),
      toVisibilityFlag(show_siret),
    ];

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

app.get('/api/my-offers', authenticateToken, requirePublisher, (req, res) => {
  try {
    const offers = listOffersByUserStmt.all(req.user.id).map(toOfferPayload);
    res.json({ data: offers });
  } catch (error) {
    console.error('Erreur my-offers', error);
    res.status(500).json({ error: 'Impossible de récupérer vos offres.' });
  }
});

app.post('/api/offers', authenticateToken, requirePublisher, (req, res) => {
  try {
    const {
      title,
      availability_date = null,
      quantity_kg = null,
      delivery_radius_km = null,
      sheep_breed = null,
      description = null,
      city = null,
    } = req.body ?? {};
    if (!title) {
      return res.status(400).json({ error: "Le titre de l'offre est requis." });
    }
    if (!availability_date) {
      return res.status(400).json({ error: "La date de disponibilité est requise." });
    }
    if (quantity_kg === null || quantity_kg === undefined || quantity_kg === '') {
      return res.status(400).json({ error: 'La quantité est requise.' });
    }
    if (delivery_radius_km === null || delivery_radius_km === undefined || delivery_radius_km === '') {
      return res.status(400).json({ error: 'La zone de livraison est requise.' });
    }
    if (!sheep_breed) {
      return res.status(400).json({ error: 'La race de mouton est requise.' });
    }

    let producerId = null;
    if (req.user.role === 'producer') {
      const producer = findProducerByUserIdStmt.get(req.user.id);
      if (!producer) {
        return res
          .status(400)
          .json({ error: 'Veuillez créer votre profil producteur avant de publier une offre.' });
      }
      producerId = producer.id;
      const existingOffers = countOffersByProducerIdStmt.get(producerId)?.count ?? 0;
      if (existingOffers >= 10) {
        return res
          .status(400)
          .json({ error: 'Limite atteinte : un producteur ne peut publier que 10 annonces.' });
      }
    }

    const result = insertOfferStmt.run(
      producerId,
      req.user.id,
      title,
      availability_date,
      quantity_kg,
      delivery_radius_km,
      sheep_breed,
      description,
      city
    );
    const created = selectOfferWithOwnerStmt.get(result.lastInsertRowid);
    res.status(201).json({ data: toOfferPayload(created) });
  } catch (error) {
    console.error('Erreur création offre', error);
    res.status(500).json({ error: "Impossible de créer l'offre." });
  }
});

app.put('/api/offers/:id', authenticateToken, requirePublisher, (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      availability_date = null,
      quantity_kg = null,
      delivery_radius_km = null,
      sheep_breed = null,
      description = null,
      city = null,
    } = req.body ?? {};

    if (!title) {
      return res.status(400).json({ error: "Le titre de l'offre est requis." });
    }
    if (!availability_date) {
      return res.status(400).json({ error: "La date de disponibilité est requise." });
    }
    if (quantity_kg === null || quantity_kg === undefined || quantity_kg === '') {
      return res.status(400).json({ error: 'La quantité est requise.' });
    }
    if (delivery_radius_km === null || delivery_radius_km === undefined || delivery_radius_km === '') {
      return res.status(400).json({ error: 'La zone de livraison est requise.' });
    }
    if (!sheep_breed) {
      return res.status(400).json({ error: 'La race de mouton est requise.' });
    }

    const offer = selectOfferWithOwnerStmt.get(id);
    if (!offer) {
      return res.status(404).json({ error: 'Offre introuvable.' });
    }

    if (req.user.role !== 'admin' && offer.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier cette offre.' });
    }

    updateOfferStmt.run(
      title,
      availability_date,
      quantity_kg,
      delivery_radius_km,
      sheep_breed,
      description,
      city,
      id
    );
    const updatedOffer = selectOfferWithOwnerStmt.get(id);
    res.json({ data: toOfferPayload(updatedOffer) });
  } catch (error) {
    console.error('Erreur mise à jour offre', error);
    res.status(500).json({ error: "Impossible de modifier l'offre." });
  }
});

app.delete('/api/offers/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const offer = selectOfferWithOwnerStmt.get(id);
    if (!offer) {
      return res.status(404).json({ error: 'Offre introuvable.' });
    }

    if (req.user.role !== 'admin' && offer.user_id !== req.user.id) {
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

app.put('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const userId = Number(id);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'Identifiant utilisateur invalide.' });
    }

    const existing = findUserByIdStmt.get(userId);
    if (!existing) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    const { email = existing.email, role = existing.role, is_blocked = existing.is_blocked } = req.body ?? {};

    if (!['producer', 'admin', 'buyer'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    if (String(email).trim() === '') {
      return res.status(400).json({ error: 'Email requis.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const emailOwner = findUserByEmailStmt.get(normalizedEmail);
    if (emailOwner && emailOwner.id !== userId) {
      return res.status(400).json({ error: 'Email déjà utilisé.' });
    }

    const blockedFlag = Number(is_blocked) ? 1 : 0;

    if (req.user.id === userId && blockedFlag) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous interdire vous-même.' });
    }
    if (req.user.id === userId && role !== 'admin') {
      return res.status(400).json({ error: 'Vous ne pouvez pas retirer votre rôle administrateur.' });
    }

    updateUserAdminStmt.run(normalizedEmail, role, blockedFlag, userId);
    const updated = findUserByIdStmt.get(userId);
    res.json({
      data: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        is_blocked: updated.is_blocked,
        created_at: updated.created_at,
      },
    });
  } catch (error) {
    console.error('Erreur admin update user', error);
    res.status(500).json({ error: "Impossible de mettre à jour l'utilisateur." });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const userId = Number(id);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'Identifiant utilisateur invalide.' });
    }
    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }
    const existing = findUserByIdStmt.get(userId);
    if (!existing) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }
    deleteOffersByUserIdStmt.run(userId);
    deleteUserByIdStmt.run(userId);
    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Erreur admin delete user', error);
    res.status(500).json({ error: "Impossible de supprimer l'utilisateur." });
  }
});

app.get('/api/admin/producers', authenticateToken, requireAdmin, (req, res) => {
  try {
    const producers = adminProducersStmt.all();
    res.json({ data: producers });
  } catch (error) {
    console.error('Erreur admin producers', error);
    res.status(500).json({ error: 'Impossible de récupérer les producteurs.' });
  }
});

app.put('/api/admin/producers/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const producerId = Number(id);
    if (!Number.isInteger(producerId)) {
      return res.status(400).json({ error: 'Identifiant producteur invalide.' });
    }

    const existing = findProducerByIdStmt.get(producerId);
    if (!existing) {
      return res.status(404).json({ error: 'Producteur introuvable.' });
    }

    const {
      name = existing.name,
      city = existing.city,
      description = existing.description,
      lat = existing.lat,
      lng = existing.lng,
      first_name = existing.first_name,
      last_name = existing.last_name,
      phone = existing.phone,
      siret = existing.siret,
      show_identity = existing.show_identity,
      show_phone = existing.show_phone,
      show_siret = existing.show_siret,
    } = req.body ?? {};

    if (!name || String(name).trim() === '') {
      return res.status(400).json({ error: "Le nom de l'exploitation est requis." });
    }

    const sanitizedSiret =
      typeof siret === 'string' || typeof siret === 'number' ? String(siret).trim() : '';
    const siretValue = sanitizedSiret === '' ? null : sanitizedSiret;

    updateProducerStmt.run(
      String(name).trim(),
      city ? String(city).trim() : null,
      description ? String(description).trim() : null,
      sanitizeCoordinate(lat),
      sanitizeCoordinate(lng),
      first_name ? String(first_name).trim() : null,
      last_name ? String(last_name).trim() : null,
      phone ? String(phone).trim() : null,
      siretValue,
      toVisibilityFlag(show_identity, existing.show_identity),
      toVisibilityFlag(show_phone, existing.show_phone),
      toVisibilityFlag(show_siret, existing.show_siret),
      producerId
    );
    const updated = adminProducerByIdStmt.get(producerId);
    res.json({ data: updated });
  } catch (error) {
    console.error('Erreur admin update producer', error);
    res.status(500).json({ error: 'Impossible de mettre à jour le producteur.' });
  }
});

app.delete('/api/admin/producers/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const producerId = Number(id);
    if (!Number.isInteger(producerId)) {
      return res.status(400).json({ error: 'Identifiant producteur invalide.' });
    }

    const existing = findProducerByIdStmt.get(producerId);
    if (!existing) {
      return res.status(404).json({ error: 'Producteur introuvable.' });
    }

    deleteProducerByIdStmt.run(producerId);
    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Erreur admin delete producer', error);
    res.status(500).json({ error: 'Impossible de supprimer le producteur.' });
  }
});

app.get('/api/admin/offers', authenticateToken, requireAdmin, (req, res) => {
  try {
    const offers = adminOffersStmt.all().map((row) => ({
      id: row.id,
      title: row.title,
      availability_date: row.availability_date,
      quantity_kg: row.quantity_kg,
      delivery_radius_km: row.delivery_radius_km,
      sheep_breed: row.sheep_breed,
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

app.get('/api/admin/database', authenticateToken, requireAdmin, (req, res) => {
  try {
    const parsedLimit = Number(req.query.limit);
    const limit = Number.isFinite(parsedLimit) && parsedLimit >= 0 ? Math.min(parsedLimit, 1000) : 200;
    const sensitiveColumns = new Set([
      'password_hash',
      'password_reset_token',
      'password_reset_token_expires_at',
      'verification_token',
      'verification_token_expires_at',
    ]);

    const tables = listTablesStmt.all().map(({ name }) => {
      const safeName = escapeIdentifier(name);
      const columnsInfo = db.prepare(`PRAGMA table_info("${safeName}")`).all();
      const columns = columnsInfo.map((column) => column.name);
      const visibleColumns = columns.filter((column) => !sensitiveColumns.has(column));
      const rowCount = db.prepare(`SELECT COUNT(*) AS count FROM "${safeName}"`).get().count;
      const columnList = visibleColumns.map((column) => quoteIdentifier(column)).join(', ');
      const rows =
        limit === 0 || visibleColumns.length === 0
          ? []
          : db.prepare(`SELECT ${columnList} FROM "${safeName}" LIMIT ?`).all(limit);
      return {
        name,
        columns: visibleColumns,
        rows,
        rowCount,
        truncated: limit > 0 && rowCount > rows.length,
      };
    });
    res.json({ data: tables });
  } catch (error) {
    console.error('Erreur admin database', error);
    res.status(500).json({ error: 'Impossible de récupérer la base de données.' });
  }
});

app.get('/api/admin/traffic', authenticateToken, requireAdmin, (req, res) => {
  try {
    const range = '-14 days';
    const totals = {
      users: countUsersStmt.get().count,
      producers: countProducersStmt.get().count,
      offers: countOffersStmt.get().count,
    };
    const usersByDay = usersByDayStmt.all(range);
    const offersByDay = offersByDayStmt.all(range);
    res.json({ data: { totals, usersByDay, offersByDay, range } });
  } catch (error) {
    console.error('Erreur admin traffic', error);
    res.status(500).json({ error: 'Impossible de récupérer la fréquentation.' });
  }
});

app.use((err, req, res, next) => {
  console.error('Erreur inattendue', err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

scheduleOfferExpirationProcessing();

app.listen(PORT, () => {
  console.log(`API LaineBrute démarrée sur http://localhost:${PORT}`);
});
