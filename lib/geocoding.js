const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

const searchViaBackend = async (query, { signal, language } = {}) => {
  try {
    const { supabase } = await import('./supabaseClient.js');
    if (!supabase) return null;
    const { data, error } = await supabase.functions.invoke('geocode-place', { body: { query, language } });
    if (error) return null;
    return Array.isArray(data?.places) ? data.places : null;
  } catch {
    return null;
  }
};

const typeFor = (category = '', type = '') => {
  if (type === 'country' || category === 'boundary') return 'country';
  if (['state', 'province', 'region', 'county', 'municipality'].includes(type)) return 'region';
  if (['city', 'town'].includes(type)) return 'city';
  if (['village', 'hamlet', 'suburb', 'neighbourhood', 'quarter', 'locality'].includes(type)) return 'locality';
  return 'other';
};

const externalIdFor = (item) => item.osm_type && item.osm_id ? `${item.osm_type}${item.osm_id}` : String(item.place_id || '');

const ancestorFrom = (item, key, name, type, countryCode) => ({
  externalProvider: 'openstreetmap', externalId: `${key}:${name}`,
  name, type, countryCode: countryCode || null, latitude: null, longitude: null
});

export const normalizeGeocoderResult = (item) => {
  const address = item.address || {};
  const country = address.country ? ancestorFrom(item, 'country', address.country, 'country', address.country_code) : null;
  const regionName = address.state || address.province || address.region || address.county;
  const region = regionName ? ancestorFrom(item, 'region', regionName, 'region', address.country_code) : null;
  const cityName = address.city || address.town || address.municipality;
  const city = cityName ? ancestorFrom(item, 'city', cityName, 'city', address.country_code) : null;
  const localityName = address.village || address.hamlet || address.suburb || address.neighbourhood;
  const locality = localityName ? ancestorFrom(item, 'locality', localityName, 'locality', address.country_code) : null;
  const selectedType = typeFor(item.type, item.type);
  const selected = {
    externalProvider: 'openstreetmap',
    externalId: externalIdFor(item),
    name: item.name || item.display_name?.split(',')[0] || '',
    type: selectedType,
    countryCode: address.country_code || null,
    latitude: Number.isFinite(Number(item.lat)) ? Number(item.lat) : null,
    longitude: Number.isFinite(Number(item.lon)) ? Number(item.lon) : null
  };
  const nodes = [country, region, city, locality].filter((node) => node && !(node.name === selected.name && node.type === selected.type));
  nodes.push(selected);
  const unique = [...new Map(nodes.map((node) => [`${node.externalProvider}:${node.externalId}`, node])).values()];
  return {
    ...selected,
    context: [regionName, address.country].filter(Boolean).join(', '),
    hierarchy: unique
  };
};

export async function searchPlaces(query, { signal, language = 'es' } = {}) {
  const trimmed = String(query || '').trim();
  if (trimmed.length < 2) return [];
  const backendResults = await searchViaBackend(trimmed, { signal, language });
  if (backendResults) return backendResults;
  const params = new URLSearchParams({ q: trimmed, format: 'jsonv2', addressdetails: '1', limit: '8', 'accept-language': language, layer: 'address' });
  const response = await fetch(`${NOMINATIM_URL}?${params}`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`No se pudo buscar lugares (${response.status}).`);
  const payload = await response.json();
  return (Array.isArray(payload) ? payload : []).map(normalizeGeocoderResult).filter((place) => place.externalId && place.name);
}

export const placeLabel = (place) => [place?.name, place?.context].filter(Boolean).join(', ');
