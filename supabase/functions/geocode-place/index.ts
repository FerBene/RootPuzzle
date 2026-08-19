const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const typeFor = (type = '') => {
  if (type === 'country') return 'country';
  if (['state', 'province', 'region', 'county', 'municipality'].includes(type)) return 'region';
  if (['city', 'town'].includes(type)) return 'city';
  if (['village', 'hamlet', 'suburb', 'neighbourhood', 'quarter', 'locality'].includes(type)) return 'locality';
  return 'other';
};

const externalIdFor = (item: Record<string, unknown>) => item.osm_type && item.osm_id ? `${item.osm_type}${item.osm_id}` : String(item.place_id || '');

const ancestor = (name: string, type: string, countryCode: string | null) => ({
  externalProvider: 'openstreetmap',
  externalId: `${type}:${countryCode || ''}:${name}`,
  name,
  type,
  countryCode,
  latitude: null,
  longitude: null
});

const normalize = (item: Record<string, any>) => {
  const address = item.address || {};
  const countryCode = address.country_code || null;
  const country = address.country ? ancestor(address.country, 'country', countryCode) : null;
  const regionName = address.state || address.province || address.region || address.county;
  const region = regionName ? ancestor(regionName, 'region', countryCode) : null;
  const cityName = address.city || address.town || address.municipality;
  const city = cityName ? ancestor(cityName, 'city', countryCode) : null;
  const localityName = address.village || address.hamlet || address.suburb || address.neighbourhood;
  const locality = localityName ? ancestor(localityName, 'locality', countryCode) : null;
  const selected = {
    externalProvider: 'openstreetmap',
    externalId: externalIdFor(item),
    name: item.name || item.display_name?.split(',')[0] || '',
    type: typeFor(item.type),
    countryCode,
    latitude: Number.isFinite(Number(item.lat)) ? Number(item.lat) : null,
    longitude: Number.isFinite(Number(item.lon)) ? Number(item.lon) : null
  };
  const hierarchy = [country, region, city, locality]
    .filter((node) => node && !(node.name === selected.name && node.type === selected.type));
  hierarchy.push(selected);
  return {
    ...selected,
    context: [regionName, address.country].filter(Boolean).join(', '),
    hierarchy: [...new Map(hierarchy.map((node) => [`${node.externalProvider}:${node.externalId}`, node])).values()]
  };
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const body = await request.json();
    const query = String(body?.query || '').trim();
    if (query.length < 2 || query.length > 120) return new Response(JSON.stringify({ places: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const params = new URLSearchParams({ q: query, format: 'jsonv2', addressdetails: '1', limit: '8', 'accept-language': String(body?.language || 'es'), layer: 'address' });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { Accept: 'application/json', 'User-Agent': 'RaicesGenealogy/0.2 (geocoding)' } });
    if (!response.ok) return new Response(JSON.stringify({ error: `Nominatim returned ${response.status}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const results = await response.json();
    const places = (Array.isArray(results) ? results : []).map(normalize).filter((place) => place.externalId && place.name);
    return new Response(JSON.stringify({ places }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
