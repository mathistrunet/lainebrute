import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const REPORT_CATEGORIES = [
  { value: 'ad', label: "Signaler une annonce" },
  { value: 'producer', label: 'Signaler un producteur' },
  { value: 'claim', label: "Revendiquer l'établissement" },
];

const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const content = result.split(',')[1] ?? '';
      resolve({ name: file.name, type: file.type, size: file.size, content });
    };
    reader.onerror = () => reject(new Error(`Impossible de lire le fichier ${file.name}.`));
    reader.readAsDataURL(file);
  });

function ReportDialog({ isOpen, onClose, context, defaultCategory = 'ad' }) {
  const [category, setCategory] = useState(defaultCategory);
  const [reason, setReason] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCategory(defaultCategory);
    setReason('');
    setContactEmail('');
    setDocuments([]);
    setStatus('idle');
    setMessage('');
    setError('');
  }, [defaultCategory, isOpen, context]);

  const contextLabel = useMemo(() => {
    if (!context) return 'Sélectionnez une annonce ou un producteur.';
    if (context.type === 'ad') {
      return `Annonce : ${context.title}${context.producer ? ` — ${context.producer}` : ''}`;
    }
    return `Producteur : ${context.name}${context.city ? ` — ${context.city}` : ''}`;
  }, [context]);

  const isClaim = category === 'claim';

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files ?? []);
    setDocuments(files);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    setError('');

    if (!reason.trim()) {
      setStatus('idle');
      setError('Merci de préciser le motif du signalement.');
      return;
    }

    if (isClaim && documents.length === 0) {
      setStatus('idle');
      setError('Merci de joindre au moins un justificatif pour la revendication.');
      return;
    }

    try {
      const encodedDocs = await Promise.all(documents.map((file) => readFileAsBase64(file)));
      const payload = {
        category,
        reason: reason.trim(),
        contactEmail: contactEmail.trim() || null,
        target: context,
        documents: encodedDocs,
      };
      const response = await api.sendReport(payload);
      setMessage(response?.message ?? 'Votre demande a bien été envoyée.');
      setDocuments([]);
      setReason('');
      setContactEmail('');
      setStatus('idle');
    } catch (submitError) {
      setStatus('idle');
      setError(submitError.message || "Impossible d'envoyer la demande.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="identity-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <header className="modal-header">
          <div>
            <p className="eyebrow">Signalement</p>
            <h2>Signaler ou revendiquer</h2>
            <p className="muted">{contextLabel}</p>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            Fermer
          </button>
        </header>

        <form className="form-card modal-form" onSubmit={handleSubmit}>
          <label>
            Type de demande
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {REPORT_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Votre email de contact (optionnel)
            <input
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="vous@email.fr"
            />
          </label>
          <label>
            Motif du signalement
            <textarea
              rows="4"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Décrivez le problème ou votre demande..."
              required
            />
          </label>

          {isClaim && (
            <label>
              Documents justificatifs
              <input type="file" multiple onChange={handleFileChange} />
              <p className="helper-text">
                Joignez des justificatifs attestant que l&apos;établissement vous appartient.
              </p>
            </label>
          )}

          {documents.length > 0 && (
            <ul className="file-list">
              {documents.map((file) => (
                <li key={`${file.name}-${file.size}`} className="file-pill">
                  {file.name}
                </li>
              ))}
            </ul>
          )}

          <p className="helper-text">
            Votre demande sera analysée manuellement. Un email est envoyé à
            {' '}
            <strong>mathtrunet100@gmailcom</strong>.
          </p>

          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Envoi en cours...' : 'Envoyer la demande'}
            </button>
            <button type="button" className="ghost" onClick={onClose}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReportDialog;
