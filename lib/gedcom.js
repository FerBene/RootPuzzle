const clean = (value = '') => String(value).replace(/[\r\n]+/g, ' ').trim();

const gedcomDate = (value) => {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return clean(value);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]}`;
};

const isoDate = (value = '') => {
  const months = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
  const match = clean(value).toUpperCase().match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);
  if (!match || !months[match[2]]) return clean(value);
  return `${match[3]}-${months[match[2]]}-${String(Number(match[1])).padStart(2, '0')}`;
};

export function exportGedcom(db) {
  const lines = [
    '0 HEAD',
    '1 SOUR RAICES_WEB',
    '1 GEDC',
    '2 VERS 5.5.1',
    '2 FORM LINEAGE-LINKED',
    '1 CHAR UTF-8'
  ];

  const indiRef = new Map();
  db.people.forEach((person, index) => {
    const ref = `@I${index + 1}@`;
    indiRef.set(person.id, ref);
    lines.push(`0 ${ref} INDI`);
    lines.push(`1 NAME ${clean(person.givenNames)} /${clean(person.surnames)}/`);
    if (person.nickname) lines.push(`1 NICK ${clean(person.nickname)}`);
    if (person.email) lines.push(`1 EMAIL ${clean(person.email)}`);
    if (person.sex) lines.push(`1 SEX ${person.sex}`);
    if (person.birthDate || person.birthPlace) {
      lines.push('1 BIRT');
      if (person.birthDate) lines.push(`2 DATE ${gedcomDate(person.birthDate)}`);
      if (person.birthPlace) lines.push(`2 PLAC ${clean(person.birthPlace)}`);
    }
    if (person.deathDate || person.deathPlace) {
      lines.push('1 DEAT');
      if (person.deathDate) lines.push(`2 DATE ${gedcomDate(person.deathDate)}`);
      if (person.deathPlace) lines.push(`2 PLAC ${clean(person.deathPlace)}`);
    }
    if (person.occupation) lines.push(`1 OCCU ${clean(person.occupation)}`);
    if (person.notes) lines.push(`1 NOTE ${clean(person.notes)}`);
  });

  const families = [];
  const usedPairs = new Set();
  db.partnerships.forEach((partnership) => {
    const key = [partnership.personAId, partnership.personBId].sort().join('|');
    if (usedPairs.has(key)) return;
    usedPairs.add(key);
    families.push({
      partnerA: partnership.personAId,
      partnerB: partnership.personBId,
      children: db.parentChild
        .filter((pc) => pc.parentId === partnership.personAId)
        .map((pc) => pc.childId)
        .filter((childId) => db.parentChild.some((pc) => pc.parentId === partnership.personBId && pc.childId === childId))
    });
  });

  const assignedChildren = new Set(families.flatMap((family) => family.children));
  db.parentChild.forEach((pc) => {
    if (assignedChildren.has(pc.childId)) return;
    const existing = families.find((family) => family.partnerA === pc.parentId && !family.partnerB);
    if (existing) existing.children.push(pc.childId);
    else families.push({ partnerA: pc.parentId, partnerB: null, children: [pc.childId] });
    assignedChildren.add(pc.childId);
  });

  families.forEach((family, index) => {
    lines.push(`0 @F${index + 1}@ FAM`);
    const a = db.people.find((p) => p.id === family.partnerA);
    const b = db.people.find((p) => p.id === family.partnerB);
    if (a) lines.push(`1 ${a.sex === 'F' ? 'WIFE' : 'HUSB'} ${indiRef.get(a.id)}`);
    if (b) lines.push(`1 ${b.sex === 'F' ? 'WIFE' : 'HUSB'} ${indiRef.get(b.id)}`);
    [...new Set(family.children)].forEach((childId) => {
      if (indiRef.has(childId)) lines.push(`1 CHIL ${indiRef.get(childId)}`);
    });
  });

  lines.push('0 TRLR');
  return `${lines.join('\n')}\n`;
}

export function importGedcom(text) {
  const people = [];
  const families = [];
  let current = null;
  let activeEvent = null;

  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const match = rawLine.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?([^\s]+)(?:\s+(.*))?$/);
    if (!match) continue;
    const level = Number(match[1]);
    const xref = match[2] || null;
    const tag = match[3];
    const value = match[4] || '';

    if (level === 0 && tag === 'INDI') {
      current = { kind: 'INDI', xref, person: { _xref: xref, givenNames: '', surnames: '', sex: '', nickname: '', email: '', profileImage: '', birthDate: '', birthPlace: '', deathDate: '', deathPlace: '', occupation: '', notes: '' } };
      people.push(current.person);
      activeEvent = null;
      continue;
    }
    if (level === 0 && tag === 'FAM') {
      current = { kind: 'FAM', xref, family: { husband: null, wife: null, children: [] } };
      families.push(current.family);
      activeEvent = null;
      continue;
    }
    if (!current) continue;

    if (current.kind === 'INDI') {
      const person = current.person;
      if (level === 1) activeEvent = null;
      if (level === 1 && tag === 'NAME') {
        const name = value.match(/^(.*?)\s*\/(.*?)\/?$/);
        person.givenNames = clean(name ? name[1] : value);
        person.surnames = clean(name ? name[2] : '');
      } else if (level === 1 && tag === 'NICK') person.nickname = clean(value);
      else if (level === 1 && tag === 'EMAIL') person.email = clean(value);
      else if (level === 1 && tag === 'SEX') person.sex = clean(value);
      else if (level === 1 && tag === 'BIRT') activeEvent = 'BIRT';
      else if (level === 1 && tag === 'DEAT') activeEvent = 'DEAT';
      else if (level === 1 && tag === 'OCCU') person.occupation = clean(value);
      else if (level === 1 && tag === 'NOTE') person.notes = clean(value);
      else if (level === 2 && tag === 'DATE' && activeEvent === 'BIRT') person.birthDate = isoDate(value);
      else if (level === 2 && tag === 'PLAC' && activeEvent === 'BIRT') person.birthPlace = clean(value);
      else if (level === 2 && tag === 'DATE' && activeEvent === 'DEAT') person.deathDate = isoDate(value);
      else if (level === 2 && tag === 'PLAC' && activeEvent === 'DEAT') person.deathPlace = clean(value);
    } else if (current.kind === 'FAM') {
      if (level === 1 && tag === 'HUSB') current.family.husband = clean(value);
      else if (level === 1 && tag === 'WIFE') current.family.wife = clean(value);
      else if (level === 1 && tag === 'CHIL') current.family.children.push(clean(value));
    }
  }

  const ids = new Map();
  const mappedPeople = people.map((person, index) => {
    const id = `person_import_${index + 1}_${Date.now()}`;
    ids.set(person._xref, id);
    const { _xref, ...rest } = person;
    return { id, ...rest, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  });

  const parentChild = [];
  const partnerships = [];
  families.forEach((family, index) => {
    const a = ids.get(family.husband);
    const b = ids.get(family.wife);
    if (a && b) partnerships.push({ id: `partner_import_${index + 1}_${Date.now()}`, personAId: a, personBId: b, status: '' });
    family.children.forEach((childRef, childIndex) => {
      const childId = ids.get(childRef);
      if (!childId) return;
      if (a) parentChild.push({ id: `pc_import_a_${index}_${childIndex}_${Date.now()}`, parentId: a, childId });
      if (b) parentChild.push({ id: `pc_import_b_${index}_${childIndex}_${Date.now()}`, parentId: b, childId });
    });
  });

  return { people: mappedPeople, parentChild, partnerships };
}
