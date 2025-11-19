import { useEffect, useId, useState } from 'react';

const formatCityLabel = (city) => {
  const postalCodes = Array.isArray(city?.codesPostaux) && city.codesPostaux.length > 0
    ? ` (${city.codesPostaux.join(', ')})`
    : '';
  return `${city?.nom ?? ''}${postalCodes}`.trim();
};

const CityAutocomplete = ({
  label = 'Ville',
  name = 'city',
  value = '',
  placeholder = 'Recherchez une commune',
  onChange,
  onSelect,
}) => {
  const inputId = useId();
  const [suggestions, setSuggestions] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [selectedValue, setSelectedValue] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const trimmedValue = typeof value === 'string' ? value.trim() : '';

  useEffect(() => {
    if (!trimmedValue) {
      setSelectedValue('');
      setIsDirty(false);
      return;
    }
    if (!isDirty) {
      setSelectedValue(trimmedValue);
    }
  }, [trimmedValue, isDirty]);

  useEffect(() => {
    if (!trimmedValue || trimmedValue.length < 2) {
      setSuggestions([]);
      setStatus('idle');
      setError(null);
      return undefined;
    }

    if (selectedValue && trimmedValue === selectedValue) {
      setSuggestions([]);
      setStatus('idle');
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams({
        nom: trimmedValue,
        fields: 'nom,code,codesPostaux,centre,departement',
        limit: '8',
        boost: 'population',
      });
      setStatus('loading');
      fetch(`https://geo.api.gouv.fr/communes?${params.toString()}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Recherche de commune indisponible.');
          }
          return response.json();
        })
        .then((data) => {
          setSuggestions(Array.isArray(data) ? data : []);
          setStatus('success');
          setError(null);
        })
        .catch((fetchError) => {
          if (fetchError.name === 'AbortError') return;
          setStatus('error');
          setError('Impossible de récupérer les suggestions.');
          setSuggestions([]);
        });
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [trimmedValue, selectedValue]);

  const handleInputChange = (event) => {
    if (selectedValue) {
      setSelectedValue('');
    }
    if (!isDirty) {
      setIsDirty(true);
    }
    onChange?.(event);
  };

  const handleSelect = (city) => {
    const lat = city?.centre?.coordinates?.[1] ?? null;
    const lng = city?.centre?.coordinates?.[0] ?? null;
    const formatted = {
      label: formatCityLabel(city),
      lat,
      lng,
      code: city?.code,
      departement: city?.departement?.nom,
      raw: city,
    };
    onSelect?.(formatted);
    setIsDirty(false);
    setSelectedValue(formatted.label.trim());
    setSuggestions([]);
    setStatus('idle');
    setError(null);
  };

  return (
    <div className="city-autocomplete">
      <label htmlFor={inputId}>
        {label}
        <input
          id={inputId}
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={handleInputChange}
          autoComplete="off"
        />
      </label>
      {status === 'loading' && <small className="muted">Recherche de communes...</small>}
      {status === 'success' && value.trim().length >= 2 && suggestions.length === 0 && (
        <small className="muted">Aucune commune trouvée.</small>
      )}
      {error && <small className="error">{error}</small>}
      {suggestions.length > 0 && (
        <ul className="city-suggestions" role="listbox" aria-label="Suggestions de communes">
          {suggestions.map((city) => (
            <li key={city.code}>
              <button type="button" onClick={() => handleSelect(city)}>
                <span>{formatCityLabel(city)}</span>
                {city?.departement?.nom && <small>{city.departement.nom}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CityAutocomplete;
