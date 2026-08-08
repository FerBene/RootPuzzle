import { beneitezMassaroSeed } from './seedData.js';

export const STORAGE_KEY = 'raices.genealogy.v1';

export const emptyDatabase = () => ({
  version: 1,
  people: [],
  parentChild: [],
  partnerships: [],
  events: [],
  sources: [],
  citations: [],
  detectiveSuggestions: [],
  puzzleSuggestions: [],
  settings: {
    rootPersonId: null,
    treeName: 'Mi árbol familiar'
  }
});

const knownNicknamesByName = new Map([
  ['fernando|beneitez massaro', 'Cheni'],
  ['maria rocio|pelussa', 'Rochy']
]);

const combiningMarksPattern = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

const stripDiacritics = (value = '') => String(value).normalize('NFD').replace(combiningMarksPattern, '').toLowerCase().trim();

const knownNicknameFor = (person = {}) => {
  const plainKey = `${stripDiacritics(person.givenNames)}|${stripDiacritics(person.surnames)}`;
  const exactKey = `${String(person.givenNames || '').toLowerCase().trim()}|${String(person.surnames || '').toLowerCase().trim()}`;
  return knownNicknamesByName.get(exactKey) || knownNicknamesByName.get(plainKey) || '';
};

const normalizePerson = (person = {}) => ({
  ...person,
  nickname: String(person.nickname || knownNicknameFor(person) || '').trim(),
  email: String(person.email || '').trim(),
  profileImage: String(person.profileImage || '').trim()
});

export const newId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const displayName = (person) => {
  if (!person) return 'Persona desconocida';
  const givenNames = String(person.givenNames || '').trim();
  const surnames = String(person.surnames || '').trim();
  const nickname = String(person.nickname || '').trim();
  if (givenNames || surnames) {
    return [givenNames, nickname && `\"${nickname}\"`, surnames].filter(Boolean).join(' ');
  }
  return nickname || 'Sin nombre';
};

export const normalizeDatabase = (value) => {
  const base = emptyDatabase();
  if (!value || typeof value !== 'object') return base;
  return {
    ...base,
    ...value,
    people: Array.isArray(value.people) ? value.people.map(normalizePerson) : [],
    parentChild: Array.isArray(value.parentChild) ? value.parentChild : [],
    partnerships: Array.isArray(value.partnerships) ? value.partnerships : [],
    events: Array.isArray(value.events) ? value.events : [],
    sources: Array.isArray(value.sources) ? value.sources : [],
    citations: Array.isArray(value.citations) ? value.citations : [],
    detectiveSuggestions: Array.isArray(value.detectiveSuggestions) ? value.detectiveSuggestions : [],
    puzzleSuggestions: Array.isArray(value.puzzleSuggestions) ? value.puzzleSuggestions : [],
    settings: { ...base.settings, ...(value.settings || {}) }
  };
};

export const defaultDatabase = () => normalizeDatabase(beneitezMassaroSeed);

export const relativesFor = (db, personId) => {
  const peopleById = new Map(db.people.map((person) => [person.id, person]));
  const parents = db.parentChild
    .filter((rel) => rel.childId === personId)
    .map((rel) => peopleById.get(rel.parentId))
    .filter(Boolean);
  const children = db.parentChild
    .filter((rel) => rel.parentId === personId)
    .map((rel) => peopleById.get(rel.childId))
    .filter(Boolean);
  const partners = db.partnerships
    .filter((rel) => rel.personAId === personId || rel.personBId === personId)
    .map((rel) => peopleById.get(rel.personAId === personId ? rel.personBId : rel.personAId))
    .filter(Boolean);
  return { parents, children, partners };
};
