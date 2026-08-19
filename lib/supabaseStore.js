import { supabase } from './supabaseClient.js';

const REMOTE_TREE_ID_KEY = 'raices.remoteTreeId';
const TREES_TABLE = 'trees';

export const remoteTreeStorageKey = REMOTE_TREE_ID_KEY;
export const treeRoleOrder = { viewer: 1, editor: 2, owner: 3 };

export async function listTreeInvitations(treeId) {
  if (!supabase) return { data: [], error: new Error('Supabase no configurado') };
  return supabase
    .from('tree_invitations')
    .select('id, tree_id, email, role, status, message, expires_at, created_at, accepted_at, revoked_at')
    .eq('tree_id', treeId)
    .order('created_at', { ascending: false });
}

export async function createTreeInvitation({ treeId, email, role, message = '' } = {}) {
  if (!supabase) return { data: null, error: new Error('Supabase no configurado') };
  const { data, error } = await supabase.rpc('create_tree_invitation', {
    invitation_tree_id: treeId,
    invitation_email: email,
    invitation_role: role,
    invitation_message: message
  });
  return { data: data?.[0] || null, error };
}

export async function revokeTreeInvitation(invitationId) {
  if (!supabase) return { data: false, error: new Error('Supabase no configurado') };
  return supabase.rpc('revoke_tree_invitation', { invitation_id: invitationId });
}

export async function acceptTreeInvitation(token) {
  if (!supabase) return { data: null, error: new Error('Supabase no configurado') };
  const { data, error } = await supabase.rpc('accept_tree_invitation', { invitation_token: token });
  return { data: data?.[0] || null, error };
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidMap = new Map();

function ensureUuid(str) {
  if (!str) return null;
  if (uuidRegex.test(str)) return str;
  if (!uuidMap.has(str)) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      uuidMap.set(str, crypto.randomUUID());
    } else {
      uuidMap.set(str, 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }));
    }
  }
  return uuidMap.get(str);
}

// --- Mapeadores de Entidades (JS camelCase <-> Postgres snake_case) ---

function personToDb(p, treeId) {
  return {
    id: ensureUuid(p.id),
    tree_id: treeId,
    given_names: p.givenNames || '',
    surnames: p.surnames || '',
    nickname: p.nickname || '',
    email: p.email || '',
    profile_image: p.profileImage || '',
    sex: p.sex || '',
    birth_date: p.birthDate || '',
    birth_place: p.birthPlace || '',
    birth_year: p.birthYear ?? null,
    birth_month: p.birthMonth ?? null,
    birth_day: p.birthDay ?? null,
    birth_date_precision: p.birthDatePrecision || null,
    birth_date_certainty: p.birthDateCertainty || 'exact',
    birth_place_id: ensureUuid(p.birthPlaceId) || null,
    birth_place_precision: p.birthPlacePrecision || null,
    birth_place_certainty: p.birthPlaceCertainty || 'exact',
    death_date: p.deathDate || '',
    death_year: p.deathYear ?? null,
    death_month: p.deathMonth ?? null,
    death_day: p.deathDay ?? null,
    death_date_precision: p.deathDatePrecision || null,
    death_date_certainty: p.deathDateCertainty || 'exact',
    death_place: p.deathPlace || '',
    death_place_precision: p.deathPlacePrecision || null,
    death_place_certainty: p.deathPlaceCertainty || 'exact',
    occupation: p.occupation || '',
    notes: p.notes || '',
    created_at: p.createdAt || new Date().toISOString(),
    updated_at: p.updatedAt || new Date().toISOString()
  };
}

function dbToPerson(row) {
  return {
    id: row.id,
    givenNames: row.given_names || '',
    surnames: row.surnames || '',
    nickname: row.nickname || '',
    email: row.email || '',
    profileImage: row.profile_image || '',
    sex: row.sex || '',
    birthDate: row.birth_date || '',
    birthPlace: row.birth_place || '',
    birthYear: row.birth_year ?? null,
    birthMonth: row.birth_month ?? null,
    birthDay: row.birth_day ?? null,
    birthDatePrecision: row.birth_date_precision || null,
    birthDateCertainty: row.birth_date_certainty || 'exact',
    birthPlaceId: row.birth_place_id || null,
    birthPlacePrecision: row.birth_place_precision || null,
    birthPlaceCertainty: row.birth_place_certainty || 'exact',
    deathDate: row.death_date || '',
    deathYear: row.death_year ?? null,
    deathMonth: row.death_month ?? null,
    deathDay: row.death_day ?? null,
    deathDatePrecision: row.death_date_precision || null,
    deathDateCertainty: row.death_date_certainty || 'exact',
    deathPlace: row.death_place || '',
    deathPlacePrecision: row.death_place_precision || null,
    deathPlaceCertainty: row.death_place_certainty || 'exact',
    occupation: row.occupation || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function sourceToDb(s, treeId) {
  return {
    id: ensureUuid(s.id),
    tree_id: treeId,
    title: s.title || '',
    type: s.type || '',
    repository: s.repository || '',
    url: s.url || '',
    notes: s.notes || '',
    created_at: s.createdAt || new Date().toISOString(),
    updated_at: s.updatedAt || new Date().toISOString()
  };
}

function dbToSource(row) {
  return {
    id: row.id,
    title: row.title || '',
    type: row.type || '',
    repository: row.repository || '',
    url: row.url || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function eventToDb(e, treeId) {
  return {
    id: ensureUuid(e.id),
    tree_id: treeId,
    person_id: ensureUuid(e.personId),
    type: e.type || '',
    date: e.date || '',
    place: e.place || '',
    description: e.description || '',
    created_at: e.createdAt || new Date().toISOString(),
    updated_at: e.updatedAt || new Date().toISOString()
  };
}

function dbToEvent(row) {
  return {
    id: row.id,
    personId: row.person_id,
    type: row.type || '',
    date: row.date || '',
    place: row.place || '',
    description: row.description || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function partnershipToDb(rel, treeId) {
  return {
    id: ensureUuid(rel.id),
    tree_id: treeId,
    person_a_id: ensureUuid(rel.personAId),
    person_b_id: ensureUuid(rel.personBId),
    status: rel.status || '',
    created_at: rel.createdAt || new Date().toISOString(),
    updated_at: rel.updatedAt || new Date().toISOString()
  };
}

function dbToPartnership(row) {
  return {
    id: row.id,
    personAId: row.person_a_id,
    personBId: row.person_b_id,
    status: row.status || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parentChildToDb(rel, treeId) {
  return {
    id: ensureUuid(rel.id),
    tree_id: treeId,
    parent_id: ensureUuid(rel.parentId),
    child_id: ensureUuid(rel.childId),
    source_id: ensureUuid(rel.sourceId) || null,
    notes: rel.notes || '',
    created_at: rel.createdAt || new Date().toISOString()
  };
}

function dbToParentChild(row) {
  return {
    id: row.id,
    parentId: row.parent_id,
    childId: row.child_id,
    sourceId: row.source_id || null,
    notes: row.notes || '',
    createdAt: row.created_at
  };
}

function citationToDb(c, treeId) {
  return {
    id: ensureUuid(c.id),
    tree_id: treeId,
    source_id: ensureUuid(c.sourceId) || null,
    person_id: ensureUuid(c.personId) || null,
    event_id: ensureUuid(c.eventId) || null,
    quote: c.quote || '',
    notes: c.notes || '',
    created_at: c.createdAt || new Date().toISOString(),
    updated_at: c.updatedAt || new Date().toISOString()
  };
}

function dbToCitation(row) {
  return {
    id: row.id,
    sourceId: row.source_id || null,
    personId: row.person_id || null,
    eventId: row.event_id || null,
    quote: row.quote || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function suggestionToDb(s, treeId) {
  return {
    id: ensureUuid(s.id),
    tree_id: treeId,
    status: s.status || 'pending',
    fingerprint: s.fingerprint || '',
    kind: s.kind || '',
    title: s.title || '',
    summary: s.summary || '',
    confidence: s.confidence || '',
    source: s.source || {},
    proposed_changes: s.proposedChanges || [],
    reviewed_at: s.reviewedAt || null,
    applied_source_id: ensureUuid(s.appliedSourceId) || null,
    created_at: s.createdAt || new Date().toISOString(),
    updated_at: s.updatedAt || new Date().toISOString()
  };
}

function dbToSuggestion(row) {
  return {
    id: row.id,
    status: row.status || 'pending',
    fingerprint: row.fingerprint || '',
    kind: row.kind || '',
    title: row.title || '',
    summary: row.summary || '',
    confidence: row.confidence || '',
    source: row.source || {},
    proposedChanges: row.proposed_changes || [],
    reviewedAt: row.reviewed_at || null,
    appliedSourceId: row.applied_source_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// --- Métodos Principales de Almacenamiento Relacional ---

export async function listAccessibleTrees() {
  if (!supabase) return { data: [], error: new Error('Supabase no configurado') };
  const { data: memberships, error: membershipError } = await supabase
    .from('tree_memberships')
    .select('tree_id, role')
    .order('created_at', { ascending: true });
  if (membershipError) return { data: [], error: membershipError };
  const ids = (memberships || []).map((item) => item.tree_id).filter(Boolean);
  if (!ids.length) return { data: [], error: null };
  let { data: trees, error: treeError } = await supabase
    .from(TREES_TABLE)
    .select('id, name, description, root_person_id, is_public, created_at, updated_at')
    .in('id', ids)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });
  // Keep existing environments usable until the soft-delete migration is applied.
  if (treeError?.code === '42703' || treeError?.message?.includes('is_deleted')) {
    ({ data: trees, error: treeError } = await supabase
      .from(TREES_TABLE)
      .select('id, name, description, root_person_id, is_public, created_at, updated_at')
      .in('id', ids)
      .order('updated_at', { ascending: false }));
  }
  if (treeError) return { data: [], error: treeError };
  const roles = new Map((memberships || []).map((item) => [item.tree_id, item.role]));
  return { data: (trees || []).map((tree) => ({ ...tree, role: roles.get(tree.id) || 'viewer' })), error: null };
}

export async function createRemoteTree({ name, description = '' } = {}) {
  if (!supabase) return { data: null, error: new Error('Supabase no configurado') };
  const { data, error } = await supabase.rpc('create_tree', {
    tree_name: name || 'Mi árbol familiar',
    tree_description: description
  });
  return { data: data?.[0] || data || null, error };
}

export async function renameRemoteTree({ treeId, name } = {}) {
  if (!supabase) return { data: null, error: new Error('Supabase no configurado') };
  const { data, error } = await supabase.rpc('rename_tree', { tree_id: treeId, tree_name: name });
  return { data: data?.[0] || null, error };
}

function placeToDb(place) {
  return {
    id: ensureUuid(place.id),
    name: place.name || '',
    type: place.type || 'other',
    parent_id: ensureUuid(place.parentId) || null,
    country_code: place.countryCode || null,
    latitude: place.latitude ?? null,
    longitude: place.longitude ?? null,
    external_provider: place.externalProvider || 'openstreetmap',
    external_id: place.externalId || '',
    created_at: place.createdAt || new Date().toISOString(),
    updated_at: place.updatedAt || new Date().toISOString()
  };
}

function dbToPlace(row) {
  return { id: row.id, name: row.name, type: row.type, parentId: row.parent_id || null, countryCode: row.country_code || null, latitude: row.latitude, longitude: row.longitude, externalProvider: row.external_provider, externalId: row.external_id, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function deleteRemoteTree({ treeId } = {}) {
  if (!supabase) return { data: null, error: new Error('Supabase no configurado') };
  const firstAttempt = await supabase.rpc('soft_delete_tree', { target_tree_id: treeId });
  if (!firstAttempt.error || !['PGRST202', '42883'].includes(firstAttempt.error.code)) {
    return { data: firstAttempt.data?.[0] || null, error: firstAttempt.error };
  }
  // Compatibility with databases where the first version of the migration was applied.
  const legacyAttempt = await supabase.rpc('soft_delete_tree', { tree_id: treeId });
  return { data: legacyAttempt.data?.[0] || null, error: legacyAttempt.error };
}

export async function getRemoteTree(remoteTreeId) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase no configurado') };
  }

  try {
    if (!remoteTreeId || !uuidRegex.test(remoteTreeId)) return { data: null, error: null };
    let { data: treeRecord, error: treeError } = await supabase
      .from(TREES_TABLE)
      .select('id, name, description, root_person_id')
      .eq('id', remoteTreeId)
      .eq('is_deleted', false)
      .maybeSingle();
    if (treeError?.code === '42703' || treeError?.message?.includes('is_deleted')) {
      ({ data: treeRecord, error: treeError } = await supabase
        .from(TREES_TABLE)
        .select('id, name, description, root_person_id')
        .eq('id', remoteTreeId)
        .maybeSingle());
    }
    if (treeError) return { data: null, error: treeError };

    if (!treeRecord) {
      return { data: null, error: null };
    }

    const treeId = treeRecord.id;

    // 2. Obtener concurrentemente todas las entidades del árbol filtradas por tree_id
    const [
      { data: peopleRows, error: pErr },
      { data: placeRows, error: placeErr },
      { data: parentChildRows },
      { data: partnershipRows },
      { data: eventRows },
      { data: sourceRows },
      { data: citationRows },
      { data: suggestionRows }
    ] = await Promise.all([
      supabase.from('people').select('*').eq('tree_id', treeId),
      supabase.from('places').select('*'),
      supabase.from('parent_child').select('*').eq('tree_id', treeId),
      supabase.from('partnerships').select('*').eq('tree_id', treeId),
      supabase.from('events').select('*').eq('tree_id', treeId),
      supabase.from('sources').select('*').eq('tree_id', treeId),
      supabase.from('citations').select('*').eq('tree_id', treeId),
      supabase.from('detective_suggestions').select('*').eq('tree_id', treeId)
    ]);

    if (pErr) return { data: null, error: pErr };
    if (placeErr) return { data: null, error: placeErr };

    const people = (peopleRows || []).map(dbToPerson);
    const rootPersonId = treeRecord.root_person_id || people[0]?.id || null;

    const constructedDb = {
      version: 1,
      people,
      places: (placeRows || []).map(dbToPlace),
      parentChild: (parentChildRows || []).map(dbToParentChild),
      partnerships: (partnershipRows || []).map(dbToPartnership),
      events: (eventRows || []).map(dbToEvent),
      sources: (sourceRows || []).map(dbToSource),
      citations: (citationRows || []).map(dbToCitation),
      detectiveSuggestions: (suggestionRows || []).map(dbToSuggestion),
      puzzleSuggestions: [],
      settings: {
        rootPersonId,
        treeName: treeRecord.name || 'Mi árbol familiar'
      }
    };

    return { data: { id: treeId, data: constructedDb }, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function saveRemoteTree({ id, data }) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase no configurado') };
  }

  try {
    const treeName = data?.settings?.treeName || 'Arbol familiar Raíces';
    const rootPersonId = ensureUuid(data?.settings?.rootPersonId);
    let treeId = id && uuidRegex.test(id) ? id : null;

    // 1. Garantizar existencia de la fila metadata en 'trees'
    if (treeId) {
      const { data: updated, error: updateErr } = await supabase
        .from(TREES_TABLE)
        .update({ name: treeName })
        .eq('id', treeId)
        .select('id')
        .single();

      if (updateErr) treeId = null;
    }

    if (!treeId) return { data: null, error: new Error('No hay un árbol seleccionado') };

    // 2. Mapear y preparar todas las entidades relacionales asignando tree_id
    let peopleDb = (data?.people || []).map((p) => personToDb(p, treeId));
    const placesDb = (data?.places || []).map(placeToDb).filter((place) => place.id && place.external_id);
    const sourcesDb = (data?.sources || []).map((s) => sourceToDb(s, treeId));
    const validPeopleIds = new Set(peopleDb.map((p) => p.id));
    const validSourceIds = new Set(sourcesDb.map((s) => s.id));

    const eventsDb = (data?.events || []).map((e) => eventToDb(e, treeId)).filter((e) => validPeopleIds.has(e.person_id));
    const partnershipsDb = (data?.partnerships || []).map((p) => partnershipToDb(p, treeId)).filter((p) => validPeopleIds.has(p.person_a_id) && validPeopleIds.has(p.person_b_id));
    const parentChildDb = (data?.parentChild || data?.parent_child || []).map((pc) => parentChildToDb(pc, treeId)).filter((pc) => validPeopleIds.has(pc.parent_id) && validPeopleIds.has(pc.child_id));

    const validEventIds = new Set(eventsDb.map((e) => e.id));
    const citationsDb = (data?.citations || []).map((c) => citationToDb(c, treeId)).filter((c) => (!c.person_id || validPeopleIds.has(c.person_id)) && (!c.source_id || validSourceIds.has(c.source_id)) && (!c.event_id || validEventIds.has(c.event_id)));
    const suggestionsDb = (data?.detectiveSuggestions || data?.detective_suggestions || []).map((s) => suggestionToDb(s, treeId));

    // 3. Upsert por jerarquía de claves foráneas
    if (placesDb.length > 0) {
      const { data: existingPlaces, error: existingPlacesErr } = await supabase.from('places').select('id, external_provider, external_id, parent_id');
      if (existingPlacesErr) return { data: null, error: existingPlacesErr };
      const existingByExternal = new Map((existingPlaces || []).map((place) => [`${place.external_provider}:${place.external_id}`, place]));
      const rawPlacesById = new Map(placesDb.map((place) => [place.id, place]));
      const canonicalByLocalId = new Map();
      const canonicalId = (localId) => {
        if (!localId) return null;
        if (canonicalByLocalId.has(localId)) return canonicalByLocalId.get(localId);
        const place = rawPlacesById.get(localId);
        if (!place) return localId;
        const existing = existingByExternal.get(`${place.external_provider}:${place.external_id}`);
        const id = existing?.id || place.id;
        canonicalByLocalId.set(localId, id);
        return id;
      };
      placesDb.forEach((place) => {
        const localId = place.id;
        place.id = canonicalId(localId);
        place.parent_id = canonicalId(place.parent_id);
      });
      const { data: savedPlaces, error: placesErr } = await supabase.from('places').upsert(placesDb, { onConflict: 'external_provider,external_id' }).select('id, external_provider, external_id');
      if (placesErr) return { data: null, error: placesErr };
      const placeIdByExternal = new Map((savedPlaces || []).map((place) => [`${place.external_provider}:${place.external_id}`, place.id]));
      const canonicalPlaceId = (localId) => canonicalByLocalId.get(localId) || localId;
      peopleDb = peopleDb.map((person) => ({ ...person, birth_place_id: canonicalPlaceId(person.birth_place_id) }));
    }
    if (peopleDb.length > 0) {
      const { error: pErr } = await supabase.from('people').upsert(peopleDb);
      if (pErr) return { data: null, error: pErr };
    }

    if (sourcesDb.length > 0) {
      const { error: sErr } = await supabase.from('sources').upsert(sourcesDb);
      if (sErr) console.error('Error upserting sources:', sErr);
    }

    await Promise.all([
      eventsDb.length > 0 ? supabase.from('events').upsert(eventsDb) : Promise.resolve(),
      partnershipsDb.length > 0 ? supabase.from('partnerships').upsert(partnershipsDb) : Promise.resolve(),
      parentChildDb.length > 0 ? supabase.from('parent_child').upsert(parentChildDb) : Promise.resolve(),
      suggestionsDb.length > 0 ? supabase.from('detective_suggestions').upsert(suggestionsDb) : Promise.resolve()
    ]);

    if (citationsDb.length > 0) {
      await supabase.from('citations').upsert(citationsDb);
    }

    // Actualizar FK diferida root_person_id en la tabla trees si se proporcionó
    if (rootPersonId && validPeopleIds.has(rootPersonId)) {
      await supabase.from(TREES_TABLE).update({ root_person_id: rootPersonId }).eq('id', treeId);
    }

    // 4. Limpieza de registros eliminados en el contexto de este tree_id
    await Promise.all([
      syncDeletions('people', treeId, peopleDb.map((p) => p.id)),
      syncDeletions('sources', treeId, sourcesDb.map((s) => s.id)),
      syncDeletions('events', treeId, eventsDb.map((e) => e.id)),
      syncDeletions('partnerships', treeId, partnershipsDb.map((p) => p.id)),
      syncDeletions('parent_child', treeId, parentChildDb.map((pc) => pc.id)),
      syncDeletions('citations', treeId, citationsDb.map((c) => c.id)),
      syncDeletions('detective_suggestions', treeId, suggestionsDb.map((s) => s.id))
    ]);

    return { data: { id: treeId, data }, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

async function syncDeletions(tableName, treeId, currentIds) {
  try {
    const { data: existing } = await supabase.from(tableName).select('id').eq('tree_id', treeId);
    if (!existing || existing.length === 0) return;
    const currentSet = new Set(currentIds);
    const toDelete = existing.filter((row) => !currentSet.has(row.id)).map((row) => row.id);
    if (toDelete.length > 0) {
      await supabase.from(tableName).delete().eq('tree_id', treeId).in('id', toDelete);
    }
  } catch {
    // Ignorar errores menores de sincronización de borrado
  }
}
