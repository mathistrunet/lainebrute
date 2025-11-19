import React, { useEffect, useMemo, useState } from "react";

const STORAGE_PRODUCERS = "lb_producers_v1";
const STORAGE_ADS = "lb_ads_v1";
const STORAGE_MESSAGES = "lb_messages_v1";
const STORAGE_LOGS = "lb_logs_v1";
const STORAGE_CURRENT_PRODUCER = "lb_current_producer_v1";
const STORAGE_IS_ADMIN = "lb_is_admin_v1";

const MAP_ORIGINS = {
  toulouse: { label: "Autour de Toulouse", lat: 43.6045, lng: 1.444 },
  paris: { label: "Autour de Paris", lat: 48.8566, lng: 2.3522 },
  lyon: { label: "Autour de Lyon", lat: 45.764, lng: 4.8357 },
};

const PRODUCT_TYPES = [
  "Légumes",
  "Fruits",
  "Viandes",
  "Produits laitiers",
  "Épicerie",
  "Plantes aromatiques",
];

const PRODUCTION_MODES = ["Bio", "Raisonné", "Pastoralisme", "Permaculture", "Conventionnel"];

const DEFAULT_PRODUCERS = [
  {
    id: "p1",
    email: "contact@fermedescoteaux.fr",
    password: "demo123",
    phone: "06 00 00 00 01",
    name: "Ferme des Coteaux",
    approxAddress: "Proximité de Montauban (82)",
    latitude: 44.018,
    longitude: 1.35,
    productionModes: ["Bio", "Pastoralisme"],
    deliveryZone: "40 km autour de Montauban",
    description: "Ferme familiale spécialisée dans les paniers hebdomadaires mixtes.",
    website: "https://fermedescoteaux.fr",
    products: [
      { id: "prod1", name: "Panier de légumes bio", type: "Légumes", price: "24 €", seasonality: "Toute l'année" },
      { id: "prod2", name: "Colis d'agneau", type: "Viandes", price: "18 €/kg", seasonality: "Mars - Octobre" },
    ],
    offers: [
      { id: "offer1", title: "Nouveaux agneaux de printemps", qty: "6 colis", availableAt: "2024-04-20" },
    ],
    status: "approved",
    mode: "Coopérative locale",
  },
  {
    id: "p2",
    email: "hello@marechaldo.fr",
    password: "demo123",
    phone: "06 00 00 00 02",
    name: "Maréchal & Do",
    approxAddress: "Entre Rennes et Fougères (35)",
    latitude: 48.3,
    longitude: -1.35,
    productionModes: ["Permaculture", "Bio"],
    deliveryZone: "Drive fermier Rennes + marchés locaux",
    description: "Micro-ferme maraîchère en planches permanentes.",
    website: "https://marechaldo.fr",
    products: [
      { id: "prod3", name: "Herbes aromatiques", type: "Plantes aromatiques", price: "2,50 € / botte", seasonality: "Mars - Novembre" },
      { id: "prod4", name: "Paniers découverte", type: "Légumes", price: "18 €", seasonality: "Toute l'année" },
    ],
    offers: [
      { id: "offer2", title: "Stages permaculture", qty: "12 places", availableAt: "2024-05-10" },
    ],
    status: "approved",
    mode: "Circuit court",
  },
  {
    id: "p3",
    email: "bonjour@bergeriedes3cols.fr",
    password: "demo123",
    phone: "06 00 00 00 03",
    name: "Bergerie des Trois Cols",
    approxAddress: "Plateau du Vercors (38)",
    latitude: 44.98,
    longitude: 5.52,
    productionModes: ["Raisonné", "Pastoralisme"],
    deliveryZone: "Livraison groupée Grenoble / Valence",
    description: "Élevage mixte brebis laitières et culture de petits fruits.",
    website: "https://bergeriedes3cols.fr",
    products: [
      { id: "prod5", name: "Fromage de brebis", type: "Produits laitiers", price: "32 €/kg", seasonality: "Février - Octobre" },
      { id: "prod6", name: "Confitures de myrtilles", type: "Épicerie", price: "6 €", seasonality: "Été" },
    ],
    offers: [],
    status: "pending",
    mode: "AMAP et marchés",
  },
];

const DEFAULT_ADS = [
  {
    id: "ad1",
    producerId: "p1",
    title: "Colis de veau disponible en octobre",
    description: "10 colis de 5 kg, réservation ouverte",
    type: "Viandes",
    location: "Tarn-et-Garonne",
    organic: true,
    date: "2024-10-01",
    active: true,
  },
  {
    id: "ad2",
    producerId: "p2",
    title: "Recherche paniers légumes hebdomadaires",
    description: "Client basé à 20 km de Toulouse souhaite rejoindre une ferme",
    type: "Légumes",
    location: "Haute-Garonne",
    organic: false,
    date: "2024-04-08",
    active: true,
  },
  {
    id: "ad3",
    producerId: "p3",
    title: "Atelier transformation laitière",
    description: "Session découverte 2 jours",
    type: "Produits laitiers",
    location: "Isère",
    organic: false,
    date: "2024-05-28",
    active: false,
  },
];

const DEFAULT_MESSAGES = [
  {
    id: "m1",
    producerId: "p1",
    sender: "Camille",
    contact: "camille@example.com",
    message: "Bonjour, avez-vous encore des paniers disponibles ?",
    createdAt: "2024-04-02T08:00:00Z",
    status: "new",
  },
  {
    id: "m2",
    producerId: "p2",
    sender: "Thomas",
    contact: "+33 6 22 00 00 00",
    message: "Nous organisons un événement locavore, intéressés par vos herbes.",
    createdAt: "2024-04-09T10:30:00Z",
    status: "new",
  },
];

const DEFAULT_LOGS = [
  { id: "log1", createdAt: "2024-04-01T09:00:00Z", action: "Initialisation de la base démo" },
];

const ADMIN_ACCOUNT = { email: "admin@lainebrut.fr", password: "admin42" };

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function distanceKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return Math.round(R * c);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function App() {
  const [producers, setProducers] = useState(() => loadJson(STORAGE_PRODUCERS, DEFAULT_PRODUCERS));
  const [ads, setAds] = useState(() => loadJson(STORAGE_ADS, DEFAULT_ADS));
  const [messages, setMessages] = useState(() => loadJson(STORAGE_MESSAGES, DEFAULT_MESSAGES));
  const [logs, setLogs] = useState(() => loadJson(STORAGE_LOGS, DEFAULT_LOGS));
  const [currentProducerId, setCurrentProducerId] = useState(() => loadJson(STORAGE_CURRENT_PRODUCER, null));
  const [isAdmin, setIsAdmin] = useState(() => loadJson(STORAGE_IS_ADMIN, false));

  const currentProducer = useMemo(() => producers.find((p) => p.id === currentProducerId) || null, [producers, currentProducerId]);

  const [producerLogin, setProducerLogin] = useState({ email: "", password: "" });
  const [producerSignup, setProducerSignup] = useState({
    name: "",
    email: "",
    phone: "",
    approxAddress: "",
    latitude: "",
    longitude: "",
    productionModes: "Bio",
    deliveryZone: "",
    description: "",
    password: "",
  });
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    approxAddress: "",
    latitude: "",
    longitude: "",
    deliveryZone: "",
    description: "",
    website: "",
  });
  const [productForm, setProductForm] = useState({ name: "", type: PRODUCT_TYPES[0], price: "", seasonality: "" });
  const [adForm, setAdForm] = useState({ title: "", description: "", type: PRODUCT_TYPES[0], location: "", organic: false, date: "" });
  const [mapFilters, setMapFilters] = useState({ originKey: "toulouse", product: "", mode: "", radius: 150 });
  const [selectedProducerId, setSelectedProducerId] = useState(null);
  const [adFilters, setAdFilters] = useState({ type: "", location: "", organic: "" });
  const [adminLogin, setAdminLogin] = useState({ email: "", password: "" });

  useEffect(() => saveJson(STORAGE_PRODUCERS, producers), [producers]);
  useEffect(() => saveJson(STORAGE_ADS, ads), [ads]);
  useEffect(() => saveJson(STORAGE_MESSAGES, messages), [messages]);
  useEffect(() => saveJson(STORAGE_LOGS, logs), [logs]);
  useEffect(() => saveJson(STORAGE_CURRENT_PRODUCER, currentProducerId), [currentProducerId]);
  useEffect(() => saveJson(STORAGE_IS_ADMIN, isAdmin), [isAdmin]);

  useEffect(() => {
    if (currentProducer) {
      setProfileForm({
        name: currentProducer.name,
        phone: currentProducer.phone,
        approxAddress: currentProducer.approxAddress,
        latitude: currentProducer.latitude,
        longitude: currentProducer.longitude,
        deliveryZone: currentProducer.deliveryZone,
        description: currentProducer.description,
        website: currentProducer.website || "",
      });
    }
  }, [currentProducer]);

  const selectedProducer = useMemo(() => producers.find((p) => p.id === selectedProducerId) || null, [producers, selectedProducerId]);

  const recordLog = (message) => {
    const newLog = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), action: message };
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (!producerSignup.name || !producerSignup.email || !producerSignup.password) {
      alert("Merci de renseigner au minimum le nom, l'email et le mot de passe.");
      return;
    }
    if (producers.some((p) => p.email.toLowerCase() === producerSignup.email.toLowerCase())) {
      alert("Un producteur existe déjà avec cet email.");
      return;
    }
    const newProducer = {
      id: crypto.randomUUID(),
      email: producerSignup.email,
      password: producerSignup.password,
      phone: producerSignup.phone,
      name: producerSignup.name,
      approxAddress: producerSignup.approxAddress,
      latitude: Number(producerSignup.latitude) || 0,
      longitude: Number(producerSignup.longitude) || 0,
      productionModes: producerSignup.productionModes
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
      deliveryZone: producerSignup.deliveryZone,
      description: producerSignup.description,
      website: "",
      products: [],
      offers: [],
      status: "pending",
      mode: "Nouveau",
    };
    setProducers((prev) => [...prev, newProducer]);
    setCurrentProducerId(newProducer.id);
    recordLog(`Nouveau producteur inscrit : ${newProducer.name}`);
    setProducerSignup({
      name: "",
      email: "",
      phone: "",
      approxAddress: "",
      latitude: "",
      longitude: "",
      productionModes: "Bio",
      deliveryZone: "",
      description: "",
      password: "",
    });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const found = producers.find(
      (p) => p.email.toLowerCase() === producerLogin.email.toLowerCase() && p.password === producerLogin.password
    );
    if (!found) {
      alert("Identifiants incorrects");
      return;
    }
    setCurrentProducerId(found.id);
    setProducerLogin({ email: "", password: "" });
  };

  const handleLogout = () => {
    setCurrentProducerId(null);
  };

  const updateProfile = (e) => {
    e.preventDefault();
    if (!currentProducer) return;
    setProducers((prev) =>
      prev.map((p) =>
        p.id === currentProducer.id
          ? {
              ...p,
              name: profileForm.name,
              phone: profileForm.phone,
              approxAddress: profileForm.approxAddress,
              latitude: Number(profileForm.latitude) || 0,
              longitude: Number(profileForm.longitude) || 0,
              deliveryZone: profileForm.deliveryZone,
              description: profileForm.description,
              website: profileForm.website,
            }
          : p
      )
    );
    recordLog(`Profil mis à jour : ${profileForm.name}`);
  };

  const addProduct = (e) => {
    e.preventDefault();
    if (!currentProducer) return;
    if (!productForm.name) {
      alert("Nom du produit obligatoire");
      return;
    }
    const newProduct = { id: crypto.randomUUID(), ...productForm };
    setProducers((prev) =>
      prev.map((p) => (p.id === currentProducer.id ? { ...p, products: [...p.products, newProduct] } : p))
    );
    setProductForm({ name: "", type: PRODUCT_TYPES[0], price: "", seasonality: "" });
  };

  const removeProduct = (producerId, productId) => {
    setProducers((prev) =>
      prev.map((p) => (p.id === producerId ? { ...p, products: p.products.filter((prod) => prod.id !== productId) } : p))
    );
  };

  const addAd = (e) => {
    e.preventDefault();
    if (!currentProducer) return;
    if (!adForm.title) {
      alert("Titre requis");
      return;
    }
    const newAd = {
      id: crypto.randomUUID(),
      producerId: currentProducer.id,
      ...adForm,
      organic: Boolean(adForm.organic),
      active: true,
    };
    setAds((prev) => [newAd, ...prev]);
    setAdForm({ title: "", description: "", type: PRODUCT_TYPES[0], location: "", organic: false, date: "" });
  };

  const toggleAdActive = (adId) => {
    setAds((prev) => prev.map((ad) => (ad.id === adId ? { ...ad, active: !ad.active } : ad)));
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminLogin.email === ADMIN_ACCOUNT.email && adminLogin.password === ADMIN_ACCOUNT.password) {
      setIsAdmin(true);
      setAdminLogin({ email: "", password: "" });
    } else {
      alert("Identifiants admin invalides");
    }
  };

  const logoutAdmin = () => setIsAdmin(false);

  const toggleProducerStatus = (producerId) => {
    setProducers((prev) =>
      prev.map((p) =>
        p.id === producerId
          ? { ...p, status: p.status === "approved" ? "suspended" : "approved" }
          : p
      )
    );
    const producer = producers.find((p) => p.id === producerId);
    if (producer) {
      recordLog(`Changement de statut pour ${producer.name}`);
    }
  };

  const deleteAdAdmin = (adId) => {
    setAds((prev) => prev.filter((ad) => ad.id !== adId));
    recordLog(`Annonce supprimée (${adId})`);
  };

  const markMessageHandled = (messageId) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: "handled" } : m)));
  };

  const producersForMap = useMemo(() => {
    const origin = MAP_ORIGINS[mapFilters.originKey];
    return producers.filter((producer) => {
      if (mapFilters.product) {
        const hasProduct = producer.products.some((p) => p.type === mapFilters.product);
        if (!hasProduct) return false;
      }
      if (mapFilters.mode && !producer.productionModes.includes(mapFilters.mode)) {
        return false;
      }
      const distance = distanceKm(origin.lat, origin.lng, producer.latitude, producer.longitude);
      return distance <= mapFilters.radius;
    });
  }, [producers, mapFilters]);

  const filteredAds = useMemo(() => {
    return ads.filter((ad) => {
      if (!ad.active) return false;
      if (adFilters.type && ad.type !== adFilters.type) return false;
      if (adFilters.location && !ad.location.toLowerCase().includes(adFilters.location.toLowerCase())) return false;
      if (adFilters.organic === "bio" && !ad.organic) return false;
      if (adFilters.organic === "nonbio" && ad.organic) return false;
      return true;
    });
  }, [ads, adFilters]);

  const currentProducerAds = currentProducer ? ads.filter((ad) => ad.producerId === currentProducer.id) : [];
  const currentProducerMessages = currentProducer ? messages.filter((m) => m.producerId === currentProducer.id) : [];

  const stats = {
    totalProducers: producers.length,
    approved: producers.filter((p) => p.status === "approved").length,
    pending: producers.filter((p) => p.status === "pending").length,
    activeAds: ads.filter((ad) => ad.active).length,
    handledMessages: messages.filter((m) => m.status === "handled").length,
  };

  const markerPosition = (producer) => {
    const LAT_RANGE = { min: 42, max: 51 };
    const LNG_RANGE = { min: -5, max: 8 };
    const top = ((LAT_RANGE.max - producer.latitude) / (LAT_RANGE.max - LAT_RANGE.min)) * 100;
    const left = ((producer.longitude - LNG_RANGE.min) / (LNG_RANGE.max - LNG_RANGE.min)) * 100;
    return { top: `${top}%`, left: `${left}%` };
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">Prototype métier</p>
            <h1 className="text-3xl font-bold">Plateforme circuits courts · lainebrut.fr</h1>
            <p className="text-sm text-slate-600">Carte, annonces, espace producteurs et gouvernance admin en un seul écran.</p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <a href="#carte" className="px-3 py-1 rounded border border-slate-300 bg-white">Carte</a>
            <a href="#annonces" className="px-3 py-1 rounded border border-slate-300 bg-white">Annonces</a>
            <a href="#producteurs" className="px-3 py-1 rounded border border-slate-300 bg-white">Espace producteur</a>
            <a href="#admin" className="px-3 py-1 rounded border border-slate-300 bg-white">Admin</a>
          </nav>
        </header>

        {/* Carte des producteurs */}
        <section id="carte" className="bg-white rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase text-slate-500">Page publique</p>
              <h2 className="text-2xl font-semibold">Carte des producteurs</h2>
              <p className="text-sm text-slate-500">Localisation approximative, filtres par produits / modes de production et rayon.</p>
            </div>
            <div className="flex gap-2 text-sm">
              <div>
                <label className="block text-xs">Point de recherche</label>
                <select
                  value={mapFilters.originKey}
                  onChange={(e) => setMapFilters((prev) => ({ ...prev, originKey: e.target.value }))}
                  className="border rounded px-2 py-1"
                >
                  {Object.entries(MAP_ORIGINS).map(([key, origin]) => (
                    <option key={key} value={key}>
                      {origin.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs">Produit</label>
                <select
                  value={mapFilters.product}
                  onChange={(e) => setMapFilters((prev) => ({ ...prev, product: e.target.value }))}
                  className="border rounded px-2 py-1"
                >
                  <option value="">Tous</option>
                  {PRODUCT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs">Mode</label>
                <select
                  value={mapFilters.mode}
                  onChange={(e) => setMapFilters((prev) => ({ ...prev, mode: e.target.value }))}
                  className="border rounded px-2 py-1"
                >
                  <option value="">Tous</option>
                  {PRODUCTION_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs">Rayon (km)</label>
                <input
                  type="number"
                  min="20"
                  className="border rounded px-2 py-1 w-24"
                  value={mapFilters.radius}
                  onChange={(e) => setMapFilters((prev) => ({ ...prev, radius: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div className="relative h-80 rounded-xl bg-gradient-to-br from-emerald-50 to-sky-50 overflow-hidden border">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds.png')] opacity-20" />
            {producersForMap.map((producer) => (
              <button
                key={producer.id}
                style={markerPosition(producer)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-xs font-semibold shadow transition ${
                  selectedProducerId === producer.id ? "bg-emerald-600 text-white" : "bg-white text-emerald-700"
                }`}
                onClick={() => setSelectedProducerId(producer.id)}
                title="Voir la fiche producteur"
              >
                {producer.name.split(" ")[0]}
              </button>
            ))}
            <div className="absolute bottom-3 right-3 text-[11px] bg-white/80 px-2 py-1 rounded">
              Positions volontairement floutées pour préserver la vie privée.
            </div>
          </div>

          {selectedProducer ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg">{selectedProducer.name}</h3>
                <p className="text-sm text-slate-600">{selectedProducer.description}</p>
                <dl className="mt-3 text-sm space-y-1">
                  <div>
                    <dt className="font-semibold">Localisation</dt>
                    <dd>{selectedProducer.approxAddress}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Zone de livraison</dt>
                    <dd>{selectedProducer.deliveryZone}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Modes de production</dt>
                    <dd>{selectedProducer.productionModes.join(", ")}</dd>
                  </div>
                </dl>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold">Contact</h4>
                <p className="text-sm">📧 {selectedProducer.email}</p>
                <p className="text-sm">📞 {selectedProducer.phone}</p>
                <p className="text-sm">🌐 {selectedProducer.website || "—"}</p>
                <h5 className="font-semibold mt-3">Produits principaux</h5>
                <ul className="text-sm list-disc pl-5">
                  {selectedProducer.products.map((prod) => (
                    <li key={prod.id}>
                      {prod.name} · {prod.type} · {prod.price} ({prod.seasonality})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Cliquez sur un producteur pour afficher sa fiche.</p>
          )}
        </section>

        {/* Page annonces */}
        <section id="annonces" className="bg-white rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase text-slate-500">Page publique</p>
              <h2 className="text-2xl font-semibold">Annonces ouvertes</h2>
              <p className="text-sm text-slate-500">Producteurs et clients peuvent publier des opportunités ponctuelles.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div>
                <label className="block text-xs">Type</label>
                <select
                  value={adFilters.type}
                  onChange={(e) => setAdFilters((prev) => ({ ...prev, type: e.target.value }))}
                  className="border rounded px-2 py-1"
                >
                  <option value="">Tous</option>
                  {PRODUCT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs">Zone</label>
                <input
                  value={adFilters.location}
                  onChange={(e) => setAdFilters((prev) => ({ ...prev, location: e.target.value }))}
                  className="border rounded px-2 py-1"
                  placeholder="ex: Isère"
                />
              </div>
              <div>
                <label className="block text-xs">Bio ?</label>
                <select
                  value={adFilters.organic}
                  onChange={(e) => setAdFilters((prev) => ({ ...prev, organic: e.target.value }))}
                  className="border rounded px-2 py-1"
                >
                  <option value="">Peu importe</option>
                  <option value="bio">Bio</option>
                  <option value="nonbio">Non bio</option>
                </select>
              </div>
              <div className="text-sm text-slate-500 self-center">{filteredAds.length} annonce(s)</div>
            </div>
          </div>

          <div className="grid gap-4">
            {filteredAds.map((ad) => {
              const producer = producers.find((p) => p.id === ad.producerId);
              return (
                <article key={ad.id} className="border rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold">{ad.title}</p>
                      <p className="text-sm text-slate-500">{ad.type} · {ad.location}</p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <p>{formatDate(ad.date)}</p>
                      <p>{ad.organic ? "Label bio" : "Non bio"}</p>
                    </div>
                  </div>
                  <p className="text-sm">{ad.description}</p>
                  {producer && (
                    <div className="text-xs text-slate-600">
                      Producteur : <strong>{producer.name}</strong> ({producer.approxAddress}) · <a href="#carte" className="text-emerald-600">Voir la fiche</a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* Espace producteur */}
        <section id="producteurs" className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Espace authentifié</p>
            <h2 className="text-2xl font-semibold">Espace Producteur</h2>
          </div>

          {!currentProducer && (
            <div className="grid gap-6 md:grid-cols-2">
              <form onSubmit={handleLogin} className="border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">Connexion</h3>
                <div>
                  <label className="block text-xs">Email</label>
                  <input
                    type="email"
                    value={producerLogin.email}
                    onChange={(e) => setProducerLogin((prev) => ({ ...prev, email: e.target.value }))}
                    className="border rounded px-2 py-1 w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs">Mot de passe</label>
                  <input
                    type="password"
                    value={producerLogin.password}
                    onChange={(e) => setProducerLogin((prev) => ({ ...prev, password: e.target.value }))}
                    className="border rounded px-2 py-1 w-full"
                  />
                </div>
                <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded w-full">
                  Se connecter
                </button>
              </form>

              <form onSubmit={handleSignup} className="border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">Créer un compte producteur</h3>
                <div>
                  <label className="block text-xs">Nom de la ferme</label>
                  <input
                    value={producerSignup.name}
                    onChange={(e) => setProducerSignup((prev) => ({ ...prev, name: e.target.value }))}
                    className="border rounded px-2 py-1 w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs">Email</label>
                    <input
                      type="email"
                      value={producerSignup.email}
                      onChange={(e) => setProducerSignup((prev) => ({ ...prev, email: e.target.value }))}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs">Téléphone</label>
                    <input
                      value={producerSignup.phone}
                      onChange={(e) => setProducerSignup((prev) => ({ ...prev, phone: e.target.value }))}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs">Adresse approximative</label>
                  <input
                    value={producerSignup.approxAddress}
                    onChange={(e) => setProducerSignup((prev) => ({ ...prev, approxAddress: e.target.value }))}
                    className="border rounded px-2 py-1 w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs">Latitude</label>
                    <input
                      value={producerSignup.latitude}
                      onChange={(e) => setProducerSignup((prev) => ({ ...prev, latitude: e.target.value }))}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs">Longitude</label>
                    <input
                      value={producerSignup.longitude}
                      onChange={(e) => setProducerSignup((prev) => ({ ...prev, longitude: e.target.value }))}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs">Modes de production (séparés par des virgules)</label>
                  <input
                    value={producerSignup.productionModes}
                    onChange={(e) => setProducerSignup((prev) => ({ ...prev, productionModes: e.target.value }))}
                    className="border rounded px-2 py-1 w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs">Zone de livraison</label>
                  <input
                    value={producerSignup.deliveryZone}
                    onChange={(e) => setProducerSignup((prev) => ({ ...prev, deliveryZone: e.target.value }))}
                    className="border rounded px-2 py-1 w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs">Description</label>
                  <textarea
                    value={producerSignup.description}
                    onChange={(e) => setProducerSignup((prev) => ({ ...prev, description: e.target.value }))}
                    className="border rounded px-2 py-1 w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs">Mot de passe</label>
                  <input
                    type="password"
                    value={producerSignup.password}
                    onChange={(e) => setProducerSignup((prev) => ({ ...prev, password: e.target.value }))}
                    className="border rounded px-2 py-1 w-full"
                  />
                </div>
                <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded w-full">
                  Créer mon espace
                </button>
              </form>
            </div>
          )}

          {currentProducer && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-slate-500">Connecté en tant que</p>
                  <p className="text-lg font-semibold">{currentProducer.name}</p>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      currentProducer.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {currentProducer.status === "approved" ? "Validé" : "En attente / suspendu"}
                  </span>
                  <button onClick={handleLogout} className="px-3 py-1 border rounded">
                    Déconnexion
                  </button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <form onSubmit={updateProfile} className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold">Profil producteur</h3>
                  {[{ key: "name", label: "Nom de la ferme" }, { key: "phone", label: "Téléphone" }, { key: "approxAddress", label: "Adresse approximative" }, { key: "latitude", label: "Latitude" }, { key: "longitude", label: "Longitude" }, { key: "deliveryZone", label: "Zone de livraison" }].map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs">{field.label}</label>
                      <input
                        value={profileForm[field.key] ?? ""}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="border rounded px-2 py-1 w-full"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs">Site web</label>
                    <input
                      value={profileForm.website}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, website: e.target.value }))}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs">Description</label>
                    <textarea
                      value={profileForm.description}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </div>
                  <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded w-full">
                    Enregistrer
                  </button>
                </form>

                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold">Produits / offres permanentes</h3>
                  <form onSubmit={addProduct} className="grid gap-3 text-sm">
                    <div>
                      <label className="block text-xs">Produit</label>
                      <input
                        value={productForm.name}
                        onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="border rounded px-2 py-1 w-full"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs">Type</label>
                        <select
                          value={productForm.type}
                          onChange={(e) => setProductForm((prev) => ({ ...prev, type: e.target.value }))}
                          className="border rounded px-2 py-1 w-full"
                        >
                          {PRODUCT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs">Prix / format</label>
                        <input
                          value={productForm.price}
                          onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))}
                          className="border rounded px-2 py-1 w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs">Saisonnalité</label>
                      <input
                        value={productForm.seasonality}
                        onChange={(e) => setProductForm((prev) => ({ ...prev, seasonality: e.target.value }))}
                        className="border rounded px-2 py-1 w-full"
                      />
                    </div>
                    <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded">
                      Ajouter
                    </button>
                  </form>

                  <ul className="text-sm divide-y">
                    {currentProducer.products.map((prod) => (
                      <li key={prod.id} className="py-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{prod.name}</p>
                          <p className="text-xs text-slate-500">
                            {prod.type} · {prod.price} · {prod.seasonality}
                          </p>
                        </div>
                        <button className="text-xs text-red-500" onClick={() => removeProduct(currentProducer.id, prod.id)}>
                          Supprimer
                        </button>
                      </li>
                    ))}
                    {currentProducer.products.length === 0 && (
                      <li className="py-4 text-center text-xs text-slate-500">Aucun produit listé pour l'instant.</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold">Annonces ponctuelles</h3>
                  <form onSubmit={addAd} className="space-y-3 text-sm">
                    <div>
                      <label className="block text-xs">Titre</label>
                      <input
                        value={adForm.title}
                        onChange={(e) => setAdForm((prev) => ({ ...prev, title: e.target.value }))}
                        className="border rounded px-2 py-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs">Description</label>
                      <textarea
                        value={adForm.description}
                        onChange={(e) => setAdForm((prev) => ({ ...prev, description: e.target.value }))}
                        className="border rounded px-2 py-1 w-full"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs">Type</label>
                        <select
                          value={adForm.type}
                          onChange={(e) => setAdForm((prev) => ({ ...prev, type: e.target.value }))}
                          className="border rounded px-2 py-1 w-full"
                        >
                          {PRODUCT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs">Localisation</label>
                        <input
                          value={adForm.location}
                          onChange={(e) => setAdForm((prev) => ({ ...prev, location: e.target.value }))}
                          className="border rounded px-2 py-1 w-full"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs">Date</label>
                        <input
                          type="date"
                          value={adForm.date}
                          onChange={(e) => setAdForm((prev) => ({ ...prev, date: e.target.value }))}
                          className="border rounded px-2 py-1 w-full"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={adForm.organic}
                          onChange={(e) => setAdForm((prev) => ({ ...prev, organic: e.target.checked }))}
                        />
                        <span className="text-xs">Annonce bio</span>
                      </div>
                    </div>
                    <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded">
                      Publier
                    </button>
                  </form>

                  <div className="space-y-2">
                    {currentProducerAds.map((ad) => (
                      <article key={ad.id} className="border rounded p-3 text-sm">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold">{ad.title}</p>
                          <button className="text-xs" onClick={() => toggleAdActive(ad.id)}>
                            {ad.active ? "Masquer" : "Réactiver"}
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">{ad.location} · {formatDate(ad.date)}</p>
                        <p>{ad.description}</p>
                      </article>
                    ))}
                    {currentProducerAds.length === 0 && (
                      <p className="text-xs text-slate-500">Aucune annonce publiée.</p>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold">Messagerie</h3>
                  <p className="text-sm text-slate-500">Les messages proviennent du formulaire public.</p>
                  <div className="space-y-3">
                    {currentProducerMessages.map((message) => (
                      <article key={message.id} className="border rounded p-3 text-sm space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold">{message.sender}</span>
                          <span className="text-slate-500">{formatDate(message.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-500">Contact : {message.contact}</p>
                        <p>{message.message}</p>
                        <div className="flex justify-between items-center text-xs">
                          <span className={message.status === "handled" ? "text-emerald-600" : "text-amber-600"}>
                            {message.status === "handled" ? "Traité" : "Nouveau"}
                          </span>
                          {message.status !== "handled" && (
                            <button className="text-emerald-700" onClick={() => markMessageHandled(message.id)}>
                              Marquer comme traité
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                    {currentProducerMessages.length === 0 && (
                      <p className="text-xs text-slate-500">Aucun message pour le moment.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Admin */}
        <section id="admin" className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Back-office</p>
            <h2 className="text-2xl font-semibold">Espace Admin</h2>
          </div>

          {!isAdmin ? (
            <form onSubmit={handleAdminLogin} className="border rounded-lg p-4 space-y-3 max-w-md">
              <h3 className="font-semibold">Connexion admin</h3>
              <div>
                <label className="block text-xs">Email</label>
                <input
                  type="email"
                  value={adminLogin.email}
                  onChange={(e) => setAdminLogin((prev) => ({ ...prev, email: e.target.value }))}
                  className="border rounded px-2 py-1 w-full"
                />
              </div>
              <div>
                <label className="block text-xs">Mot de passe</label>
                <input
                  type="password"
                  value={adminLogin.password}
                  onChange={(e) => setAdminLogin((prev) => ({ ...prev, password: e.target.value }))}
                  className="border rounded px-2 py-1 w-full"
                />
              </div>
              <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded w-full">
                Se connecter
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-slate-500">Producteurs</p>
                    <p className="text-2xl font-semibold">{stats.totalProducers}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-slate-500">Validés</p>
                    <p className="text-2xl font-semibold text-emerald-600">{stats.approved}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-slate-500">Annonces actives</p>
                    <p className="text-2xl font-semibold">{stats.activeAds}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-slate-500">Messages traités</p>
                    <p className="text-2xl font-semibold">{stats.handledMessages}</p>
                  </div>
                </div>
                <button onClick={logoutAdmin} className="px-3 py-1 border rounded text-sm">
                  Déconnexion admin
                </button>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="border rounded-lg p-4 space-y-3 text-sm">
                  <h3 className="font-semibold">Producteurs</h3>
                  {producers.map((producer) => (
                    <article key={producer.id} className="border rounded p-3 flex flex-col gap-1">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold">{producer.name}</p>
                          <p className="text-xs text-slate-500">{producer.email} · {producer.approxAddress}</p>
                        </div>
                        <button className="text-xs" onClick={() => toggleProducerStatus(producer.id)}>
                          {producer.status === "approved" ? "Suspendre" : "Valider"}
                        </button>
                      </div>
                      <p className="text-xs">Modes : {producer.productionModes.join(", ")}</p>
                      <p className="text-xs">Zone : {producer.deliveryZone}</p>
                    </article>
                  ))}
                </div>

                <div className="border rounded-lg p-4 space-y-3 text-sm">
                  <h3 className="font-semibold">Annonces / signalements</h3>
                  {ads.map((ad) => (
                    <article key={ad.id} className="border rounded p-3">
                      <div className="flex justify-between">
                        <p className="font-semibold">{ad.title}</p>
                        <div className="space-x-2 text-xs">
                          <button onClick={() => toggleAdActive(ad.id)}>{ad.active ? "Masquer" : "Réactiver"}</button>
                          <button className="text-red-600" onClick={() => deleteAdAdmin(ad.id)}>
                            Supprimer
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{ad.type} · {ad.location}</p>
                      <p className="text-sm">{ad.description}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-4 text-sm space-y-2">
                <h3 className="font-semibold">Logs / opérations</h3>
                {logs.map((log) => (
                  <div key={log.id} className="flex justify-between text-xs border-b py-1 last:border-0">
                    <span>{formatDate(log.createdAt)}</span>
                    <span>{log.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <footer className="text-center text-xs text-slate-500 pb-4">© 2024 lainebrut.fr — prototype produit</footer>
      </div>
    </div>
  );
}
