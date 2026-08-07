import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportGedcom, importGedcom } from '../lib/gedcom.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoots = ['app', 'components', 'lib', 'scripts'];
const sourceExtensions = new Set(['.js', '.mjs', '.css', '.md', '.json']);
const suspiciousCodepoints = new Map([
  [0x00c3, 'U+00C3'],
  [0x00c2, 'U+00C2'],
  [0xfffd, 'U+FFFD']
]);

function collectSourceFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, files);
    } else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function verifySourceEncoding() {
  const files = sourceRoots.flatMap((folder) => collectSourceFiles(path.join(projectRoot, folder)));
  const problems = [];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = path.relative(projectRoot, file);
    if (/\\u[0-9a-fA-F]{4}/.test(source)) problems.push(relative + ': contains a literal unicode escape');
    for (const char of source) {
      const code = char.codePointAt(0);
      if (suspiciousCodepoints.has(code)) {
        problems.push(relative + ': contains suspicious mojibake marker ' + suspiciousCodepoints.get(code));
        break;
      }
    }
  }

  if (problems.length) throw new Error('Source encoding check failed:\n' + problems.join('\n'));
}

verifySourceEncoding();

const db = {
  people: [
    { id: 'a', givenNames: 'Ana', surnames: 'Prueba', nickname: 'Anita', email: 'ana@example.com', sex: 'F', birthDate: '1950-01-02', birthPlace: 'Córdoba', deathDate: '', deathPlace: '', occupation: 'Docente', notes: '' },
    { id: 'b', givenNames: 'Bruno', surnames: 'Prueba', sex: 'M', birthDate: '1948-05-04', birthPlace: 'Mendoza', deathDate: '', deathPlace: '', occupation: '', notes: '' },
    { id: 'c', givenNames: 'Carla', surnames: 'Prueba', sex: 'F', birthDate: '1975-06-07', birthPlace: 'Salta', deathDate: '', deathPlace: '', occupation: '', notes: '' }
  ],
  parentChild: [
    { id: '1', parentId: 'a', childId: 'c' },
    { id: '2', parentId: 'b', childId: 'c' }
  ],
  partnerships: [{ id: 'p', personAId: 'a', personBId: 'b', status: '' }],
  events: [], sources: [], citations: [], settings: {}
};

const ged = exportGedcom(db);
if (!ged.includes('0 @I1@ INDI') || !ged.includes('1 CHIL @I3@') || !ged.includes('1 NICK Anita') || !ged.includes('1 EMAIL ana@example.com')) throw new Error('GEDCOM export failed');
const imported = importGedcom(ged);
if (imported.people.length !== 3) throw new Error('GEDCOM import did not preserve people');
if (imported.people[0].nickname !== 'Anita') throw new Error('GEDCOM import did not preserve nicknames');
if (imported.people[0].email !== 'ana@example.com') throw new Error('GEDCOM import did not preserve email');
if (imported.parentChild.length !== 2) throw new Error('GEDCOM import did not preserve parent-child links');
if (imported.partnerships.length !== 1) throw new Error('GEDCOM import did not preserve partnership');
console.log('OK: source encoding and GEDCOM round-trip core verified.');
