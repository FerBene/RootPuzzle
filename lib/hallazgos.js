import manifest from '../public/hallazgos/manifest.json';
export { getTotalUnlockedAchievements, resolveAchievementProgress, targetValue } from './hallazgosLogic.js';
import { getTotalUnlockedAchievements, resolveAchievementProgress, targetValue } from './hallazgosLogic.js';

const categoryMeta = {
  construccion_del_arbol: { metric: 'personas incorporadas', tone: 'sage' },
  generaciones_descubiertas: { metric: 'generaciones hacia atrás', tone: 'clay' },
  viaje_en_el_tiempo: { metric: 'años atrás', tone: 'blue' },
  generaciones_completas: { metric: 'antepasados directos', tone: 'gold' },
  linaje_sin_fronteras: { metric: 'países descubiertos', tone: 'green' }
};

export const achievementCategories = manifest.categories.map((category) => ({
  ...category,
  ...categoryMeta[category.id]
}));

export function calculateGenerations(db) {
  const parentMap = new Map();
  for (const link of db.parentChild || []) {
    if (!parentMap.has(link.childId)) parentMap.set(link.childId, []);
    parentMap.get(link.childId).push(link.parentId);
  }
  let deepest = 0;
  for (const person of db.people || []) {
    const queue = [[person.id, 1]];
    const seen = new Set();
    while (queue.length) {
      const [id, depth] = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      deepest = Math.max(deepest, depth);
      for (const parentId of parentMap.get(id) || []) queue.push([parentId, depth + 1]);
    }
  }
  return deepest;
}

export function calculateCompleteAncestors(db) {
  const parentMap = new Map();
  for (const link of db.parentChild || []) {
    if (!parentMap.has(link.childId)) parentMap.set(link.childId, []);
    parentMap.get(link.childId).push(link.parentId);
  }
  let maximum = 0;
  for (const person of db.people || []) {
    const queue = [person.id];
    const ancestors = new Set();
    while (queue.length) {
      const id = queue.shift();
      for (const parentId of parentMap.get(id) || []) {
        if (ancestors.has(parentId)) continue;
        ancestors.add(parentId);
        queue.push(parentId);
      }
    }
    maximum = Math.max(maximum, ancestors.size);
  }
  return maximum;
}

export function calculateCountries(people) {
  return new Set((people || []).map((person) => (person.birthPlace || '').split(',').at(-1)?.trim()).filter(Boolean)).size;
}

export function calculateOldestYear(people) {
  const years = (people || []).map((person) => Number.parseInt(person.birthDate, 10)).filter((year) => Number.isFinite(year) && year > 0);
  return years.length ? Math.min(...years) : null;
}
