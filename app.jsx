import React, { useEffect, useState } from "react";

const SHEEP_TYPES = [
  "Ardes",
  "Aure et Campan",
  "Avranchin",
  "Barégeoise",
  "Basco-béarnaise",
  "Belle-Île",
  "Berrichon de l'Indre",
  "Berrichon du Cher",
  "Bizet",
  "Blanche du Massif central",
  "Bleu du Maine",
  "Boulonnaise",
  "Brigasque",
  "Castillonaise",
  "Caussenarde des Garrigues",
  "Causse du Lot",
  "Charmoise",
  "Clun Forest",
  "Corse",
  "Cotentin",
  "Dorset Down",
  "Est à laine Mérinos",
  "Finnoise",
  "Grivette",
  "Hampshire",
  "Île-de-France",
  "Romane",
  "Lacaune",
  "Lacaune lait",
  "Lacaune viande",
  "Landaise",
  "Landes de Bretagne",
  "Limousine",
  "Lourdaise",
  "Manech tête noire",
  "Manech tête rousse",
  "Martinik",
  "Mérinos",
  "Mérinos d'Arles",
  "Mérinos de Rambouillet",
  "Mérinos Précoce",
  "Montagne noire",
  "Mourerous",
  "Mouton Charollais",
  "Mouton marron des Aravis",
  "Mouton d'Ouessant",
  "Mouton Vendéen",
  "Noire du Velay",
  "Peï",
  "Préalpes du Sud",
  "Raïole",
  "Rava",
  "Romanov",
  "Rouge de l'Ouest",
  "Rouge du Roussillon",
  "Roussin de la Hague",
  "Sasi ardia",
  "Shropshire",
  "Scottish Blackface",
  "Solognote",
  "Southdown",
  "Suffolk",
  "Texel",
  "Tarasconnaise",
  "Thônes et Marthod",
  "Autre",
];

const STORAGE_USERS = "wl_users_v1";
const STORAGE_OFFERS = "wl_offers_v1";
const STORAGE_CURRENT = "wl_current_user_v1";

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveJson(key, v) {
  localStorage.setItem(key, JSON.stringify(v));
}

export default function App() {
  const [users, setUsers] = useState(() => loadJson(STORAGE_USERS, []));
  const [offers, setOffers] = useState(() => loadJson(STORAGE_OFFERS, []));
  const [currentUser, setCurrentUser] = useState(() => loadJson(STORAGE_CURRENT, null));

  // Registration form state
  const [reg, setReg] = useState({
    siret: "",
    email: "",
    phone: "",
    company: "",
    location: "",
    sheepType: SHEEP_TYPES[0],
    woolQty: "",
    password: "",
  });

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Offer form
  const [offerComment, setOfferComment] = useState("");
  const [offerQty, setOfferQty] = useState("");

  // Filters
  const [filterType, setFilterType] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  useEffect(() => saveJson(STORAGE_USERS, users), [users]);
  useEffect(() => saveJson(STORAGE_OFFERS, offers), [offers]);
  useEffect(() => saveJson(STORAGE_CURRENT, currentUser), [currentUser]);

  function register(e) {
    e.preventDefault();
    // Basic validation
    if (!reg.email || !reg.phone || !reg.company || !reg.password) {
      alert("Veuillez renseigner au minimum l'email, le téléphone, le nom de l'entreprise et le mot de passe.");
      return;
    }
    // Prevent duplicate emails (case-insensitive)
    if (users.find((u) => u.email.toLowerCase() === reg.email.toLowerCase())) {
      alert("Un compte existe déjà avec cet email. Connectez-vous ou utilisez un autre email.");
      return;
    }
    const newUser = {
      id: Date.now().toString(),
      password: reg.password, // note: for production, hash on server-side
      email: reg.email,
      phone: reg.phone,
      company: reg.company,
      siret: reg.siret,
      location: reg.location,
      postalCode: reg.postalCode,
      city: reg.city,
      sheepType: reg.sheepType,
      woolQty: Number(reg.woolQty) || 0,
      comment: reg.comment || "",
      createdAt: new Date().toISOString(),
    };
    const newUsers = [...users, newUser];
    setUsers(newUsers);
    setCurrentUser(newUser);
    // clear form
    setReg({ siret: "", email: "", phone: "", company: "", location: "", postalCode: "", city: "", sheepType: SHEEP_TYPES[0], woolQty: "", comment: "", password: "" });
  }

  function login(e) {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      alert("Veuillez saisir votre email et mot de passe.");
      return;
    }
    const u = users.find((x) => x.email.toLowerCase() === loginEmail.toLowerCase() && x.password === loginPassword);
    if (!u) {
      alert("Aucun utilisateur trouvé pour cet email. Inscrivez-vous d'abord ou vérifiez vos identifiants.");
      return;
    }
    setCurrentUser(u);
    setLoginEmail("");
    setLoginPassword("");
  }

  function logout() {
    setCurrentUser(null);
  }

  function postOffer(e) {
    e.preventDefault();
    if (!currentUser) return;
    const qty = Number(offerQty);
    if (!qty || qty <= 0) {
      alert("Quantité invalide.");
      return;
    }
    const off = {
      id: Date.now().toString(),
      userId: currentUser.id,
      email: currentUser.email,
      company: currentUser.company,
      sheepType: currentUser.sheepType,
      qty: qty,
      location: currentUser.location || "Non renseignée",
      comment: offerComment,
      createdAt: new Date().toISOString(),
    };
    setOffers([off, ...offers]);
    // update user's available wool (demo behaviour)
    const updatedUsers = users.map((u) => (u.id === currentUser.id ? { ...u, woolQty: Math.max(0, (u.woolQty || 0) - qty) } : u));
    setUsers(updatedUsers);
    setCurrentUser({ ...currentUser, woolQty: Math.max(0, (currentUser.woolQty || 0) - qty) });

    setOfferComment("");
    setOfferQty("");
  }

  function deleteOffer(id) {
    if (!confirm("Supprimer cette offre ?")) return;
    setOffers(offers.filter((o) => o.id !== id));
  }

  const visibleOffers = offers.filter((o) => {
    if (filterType && o.sheepType !== filterType) return false;
    if (filterLocation && !o.location.toLowerCase().includes(filterLocation.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">lainebrut.fr — Plateforme d'échange de laine</h1>
          <div>
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-700">
                  Connecté en tant que <strong>{currentUser.company}</strong>
                </div>
                <button className="px-3 py-1 rounded bg-red-500 text-white" onClick={logout}>
                  Se déconnecter
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-600">Connectez-vous ou inscrivez-vous pour poster une offre</div>
            )}
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-1 bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-3">Mon compte</h2>
            {currentUser ? (
              <div className="space-y-2 text-sm">
                <div><strong>Email:</strong> {currentUser.email}</div>
                <div><strong>Tél:</strong> {currentUser.phone}</div>
                <div><strong>SIRET:</strong> {currentUser.siret}</div>
                <div><strong>Entreprise:</strong> {currentUser.company}</div>
                <div><strong>Adresse:</strong> {`${currentUser.location} ${currentUser.postalCode || ''} ${currentUser.city || ''}`.trim() || "—"}</div>
                <div><strong>Race du mouton:</strong> {currentUser.sheepType}</div>
                <div><strong>Quantité laine (dispo):</strong> {currentUser.woolQty ?? 0} kg</div>
              </div>
            ) : (
              <div>
                <form onSubmit={login} className="space-y-2">
                  <label className="block text-xs">Se connecter (email)</label>
                  <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="votre@email.com" />
                  <label className="block text-xs">Mot de passe</label>
                  <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                  <div className="flex space-x-2">
                    <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Se connecter</button>
                    <button type="button" onClick={() => { setLoginEmail(""); setLoginPassword(""); }} className="px-3 py-1 border rounded">Effacer</button>
                  </div>
                </form>
                <hr className="my-3" />
                <form onSubmit={register} className="space-y-2">
                  <h3 className="font-medium">Créer un compte</h3>
                  <label className="block text-xs">Email</label>
                  <input value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                  <label className="block text-xs">Téléphone</label>
                  <input value={reg.phone} onChange={(e) => setReg({ ...reg, phone: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                  <label className="block text-xs">SIRET</label>
                  <input value={reg.siret} onChange={(e) => setReg({ ...reg, siret: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                  <label className="block text-xs">Nom de l'entreprise</label>
                  <input value={reg.company} onChange={(e) => setReg({ ...reg, company: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                  <label className="block text-xs">Mot de passe</label>
                  <input type="password" value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                  <label className="block text-xs">Nom de l'entreprise</label>
                  <input value={reg.company} onChange={(e) => setReg({ ...reg, company: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                  <label className="block text-xs">Adresse</label>
                  <input value={reg.location} onChange={(e) => setReg({ ...reg, location: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                  <label className="block text-xs">Code postal</label>
                  <input value={reg.postalCode || ""} onChange={(e) => setReg({ ...reg, postalCode: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                  <label className="block text-xs">Ville</label>
                  <input value={reg.city || ""} onChange={(e) => setReg({ ...reg, city: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                  <label className="block text-xs">Race du mouton</label>
                  <select value={reg.sheepType} onChange={(e) => setReg({ ...reg, sheepType: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                    {SHEEP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label className="block text-xs">Quantité de laine disponible (kg)</label>
                  <input type="number" min="0" value={reg.woolQty} onChange={(e) => setReg({ ...reg, woolQty: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                  <label className="block text-xs">Commentaire</label>
                  <input value={reg.comment || ""} onChange={(e) => setReg({ ...reg, comment: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                  <button type="submit" className="w-full bg-green-600 text-white rounded py-2">S'inscrire et se connecter</button>
                </form>
              </div>
            )}
          </section>

          <section className="lg:col-span-2 space-y-6">
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-semibold mb-2">Publier une offre</h2>
              {currentUser ? (
                <form onSubmit={postOffer} className="space-y-3">
                  <div className="text-sm">Race du mouton: <strong>{currentUser.sheepType}</strong></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs">Quantité en kg</label>
                      <input type="number" min="0" value={offerQty} onChange={(e) => setOfferQty(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs">Localisation (pré-remplie)</label>
                      <input value={currentUser.location || ""} disabled className="w-full border rounded px-2 py-1 text-sm bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs">Commentaire (optionnel)</label>
                      <input value={offerComment} onChange={(e) => setOfferComment(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Publier l'offre</button>
                    <button type="button" onClick={() => { setOfferComment(""); setOfferQty(""); }} className="px-4 py-2 border rounded">Annuler</button>
                  </div>
                </form>
              ) : (
                <div className="text-sm text-gray-600">Connectez-vous pour publier une offre.</div>
              )}
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-semibold mb-2">Liste des offres</h2>
              <div className="flex gap-2 items-end mb-3 flex-wrap">
                <div>
                  <label className="block text-xs">Filtrer par race</label>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded px-2 py-1 text-sm">
                    <option value="">Tous</option>
                    {SHEEP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs">Filtrer par localisation</label>
                  <input placeholder="ex: Bretagne" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                </div>
                <div className="ml-auto text-sm text-gray-500">{visibleOffers.length} offre(s)</div>
              </div>

              <div className="space-y-3">
                {visibleOffers.length === 0 ? (
                  <div className="text-sm text-gray-500">Aucune offre pour le moment.</div>
                ) : visibleOffers.map((o) => (
                  <article key={o.id} className="border rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm"><strong>{o.company}</strong> — {o.email}</div>
                        <div className="text-xs text-gray-600">{o.location} • {o.sheepType}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{o.qty} kg</div>
                        <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                    {o.comment && <p className="mt-2 text-sm">{o.comment}</p>}
                    {currentUser && currentUser.id === o.userId && (
                      <div className="mt-2 flex gap-2">
                        <button className="px-3 py-1 border rounded" onClick={() => deleteOffer(o.id)}>Supprimer</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded shadow text-sm text-gray-600">
              <h3 className="font-medium mb-2">Remarques</h3>
              <ul className="list-disc pl-5">
                <li>Application de démonstration : les comptes et offres sont stockés localement dans votre navigateur (localStorage).</li>
                <li>Pour une version en production vous devrez ajouter : backend sécurisé, authentification réelle (email / mot de passe), validation côté serveur et protection des données.</li>
              </ul>
            </div>
          </section>
        </main>

        <footer className="text-center text-xs text-gray-500 mt-6">© lainebrut.fr — prototype — Arthur CHATIN</footer>
      </div>
    </div>
  );
}
