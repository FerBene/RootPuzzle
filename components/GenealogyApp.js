'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultDatabase, displayName, emptyDatabase, newId, normalizeDatabase, relativesFor, STORAGE_KEY } from '@/lib/model';
import { exportGedcom, importGedcom } from '@/lib/gedcom';

const sections = [
  ['tree', 'Árbol', '⌘'],
  ['people', 'Personas', '◎'],
  ['timeline', 'Línea de tiempo', '↕'],
  ['sources', 'Fuentes', '▱'],
  ['data', 'Importar / Exportar', '⇅']
];

const blankPerson = () => ({
  givenNames: '',
  surnames: '',
  nickname: '',
  email: '',
  profileImage: '',
  sex: '',
  birthDate: '',
  birthPlace: '',
  deathDate: '',
  deathPlace: '',
  occupation: '',
  notes: ''
});

const downloadText = (filename, text, type = 'text/plain') => {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const readProfileImage = (file) => new Promise((resolve, reject) => {
  if (!file || !file.type?.startsWith('image/')) {
    reject(new Error('El archivo no es una imagen.'));
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => reject(new Error('No pude leer la imagen.'));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('No pude procesar la imagen.'));
    img.onload = () => {
      const maxSize = 520;
      const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * ratio));
      const height = Math.max(1, Math.round(img.height * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.84));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

const readCanvasBackgroundImage = (file) => new Promise((resolve, reject) => {
  if (!file || !file.type?.startsWith('image/')) {
    reject(new Error('El archivo no es una imagen.'));
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => reject(new Error('No pude leer la imagen.'));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('No pude procesar la imagen.'));
    img.onload = () => {
      const maxSize = 1800;
      const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * ratio));
      const height = Math.max(1, Math.round(img.height * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.76));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

const TREE_CARD_WIDTH = 180;
const TREE_CARD_HEIGHT = 142;
const TREE_COLUMN_GAP = 28;
const TREE_ROW_GAP = 76;
const TREE_BRANCH_GAP_SLOTS = 0.18;
const TREE_MIN_CARD_GAP = 18;
const TEMPORAL_AXIS_WIDTH = 96;
const TEMPORAL_AXIS_GAP = 20;
const TEMPORAL_TOP_PADDING = 70;
const TEMPORAL_BOTTOM_PADDING = 96;
const TEMPORAL_PIXELS_PER_YEAR = 8;
const UNKNOWN_BIRTH_YEAR_OFFSET = 30;
const THEME_STORAGE_KEY = 'raices.theme';
const CANVAS_BACKGROUND_STORAGE_KEY = 'raices.canvasBackground';
const PUBLIC_TREE_HASH_PREFIX = '#public-tree=';

const parseDateRank = (value) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const raw = String(value).trim();
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return Number(`${match[1]}${match[2]}${match[3]}`);
  match = raw.match(/^(\d{4})-(\d{2})$/);
  if (match) return Number(`${match[1]}${match[2]}15`);
  match = raw.match(/^(\d{4})$/);
  if (match) return Number(`${match[1]}0701`);
  match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return Number(`${match[3]}${match[2].padStart(2, '0')}${match[1].padStart(2, '0')}`);
  return Number.POSITIVE_INFINITY;
};

const comparePeopleByDate = (a, b) => {
  const byDate = parseDateRank(a?.birthDate) - parseDateRank(b?.birthDate);
  if (byDate !== 0) return byDate;
  return displayName(a).localeCompare(displayName(b), 'es');
};

const comparePeopleByName = (a, b) => displayName(a).localeCompare(displayName(b), 'es');

const isDeceased = (person) => Boolean(String(person?.deathDate || '').trim());
const personStatusClass = (person) => isDeceased(person) ? 'deceased' : 'living';
const personStatusLabel = (person) => isDeceased(person) ? 'Fallecido/a' : 'Vivo/a';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const birthYearFor = (person) => {
  const raw = String(person?.birthDate || '').trim();
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})(?:-\d{2})?(?:-\d{2})?$/);
  const slash = raw.match(/^\d{1,2}\/\d{1,2}\/(\d{4})$/);
  const loose = raw.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  const year = Number(iso?.[1] || slash?.[1] || loose?.[1]);
  return Number.isFinite(year) ? year : null;
};

const temporalTickStep = (minYear, maxYear) => {
  const span = maxYear - minYear;
  if (span <= 30) return 5;
  if (span <= 80) return 10;
  if (span <= 160) return 20;
  return 50;
};

const encodeSharePayload = (value) => {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const decodeSharePayload = (value) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

const publicPerson = (person) => ({
  id: person.id,
  givenNames: person.givenNames || '',
  surnames: person.surnames || '',
  nickname: person.nickname || '',
  sex: person.sex || '',
  birthDate: person.birthDate || '',
  birthPlace: person.birthPlace || '',
  deathDate: person.deathDate || '',
  deathPlace: person.deathPlace || ''
});

const makePublicSnapshot = (db) => normalizeDatabase({
  version: db.version,
  people: db.people.map(publicPerson),
  parentChild: db.parentChild.map((rel) => ({ id: rel.id, parentId: rel.parentId, childId: rel.childId })),
  partnerships: db.partnerships.map((rel) => ({ id: rel.id, personAId: rel.personAId, personBId: rel.personBId, status: rel.status || '' })),
  events: [],
  sources: [],
  citations: [],
  detectiveSuggestions: [],
  puzzleSuggestions: [],
  settings: { treeName: db.settings.treeName, rootPersonId: db.settings.rootPersonId }
});

const makePublicTreeUrl = (db) => {
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}${PUBLIC_TREE_HASH_PREFIX}${encodeSharePayload(makePublicSnapshot(db))}`;
};

const makePuzzleContribution = ({ treeName, contributor, kind, personId, person, relation }) => ({
  id: newId('piece'),
  status: 'pending',
  createdAt: new Date().toISOString(),
  treeName,
  contributor: contributor || '',
  kind,
  personId: personId || '',
  person: { ...blankPerson(), ...(person || {}) },
  relation: relation || { kind: '', personId: '' }
});

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const buildPdfExportHtml = (db) => {
  const peopleById = new Map(db.people.map((person) => [person.id, person]));
  const rows = [...db.people].sort(comparePeopleByName).map((person) => {
    const rel = relativesFor(db, person.id);
    return `<article class="person">
      <h2>${escapeHtml(displayName(person))}</h2>
      <dl>
        <div><dt>Nacimiento</dt><dd>${escapeHtml([person.birthDate, person.birthPlace].filter(Boolean).join(' · ') || '-')}</dd></div>
        <div><dt>Fallecimiento</dt><dd>${escapeHtml([person.deathDate, person.deathPlace].filter(Boolean).join(' · ') || '-')}</dd></div>
        <div><dt>Ocupación</dt><dd>${escapeHtml(person.occupation || '-')}</dd></div>
        <div><dt>Padres</dt><dd>${escapeHtml(rel.parents.map(displayName).join(', ') || '-')}</dd></div>
        <div><dt>Parejas</dt><dd>${escapeHtml(rel.partners.map(displayName).join(', ') || '-')}</dd></div>
        <div><dt>Hijos</dt><dd>${escapeHtml(rel.children.map(displayName).join(', ') || '-')}</dd></div>
        <div><dt>Notas</dt><dd>${escapeHtml(person.notes || '-')}</dd></div>
      </dl>
    </article>`;
  }).join('');
  const relationships = db.parentChild
    .map((rel) => `${displayName(peopleById.get(rel.parentId))} → ${displayName(peopleById.get(rel.childId))}`)
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((text) => `<li>${escapeHtml(text)}</li>`)
    .join('');
  const sources = db.sources
    .map((source) => `<li><strong>${escapeHtml(source.title)}</strong>${source.repository ? ` · ${escapeHtml(source.repository)}` : ''}${source.url ? ` · ${escapeHtml(source.url)}` : ''}</li>`)
    .join('');
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(db.settings.treeName)} · Exportación PDF</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #1f2521; font-family: Inter, Arial, sans-serif; line-height: 1.45; }
    header { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #dfe7de; padding-bottom: 14px; margin-bottom: 18px; }
    img { width: 54px; height: 54px; border-radius: 12px; object-fit: cover; }
    h1 { margin: 0; font-size: 26px; }
    h2 { margin: 0 0 8px; font-size: 17px; break-after: avoid; }
    h3 { margin: 22px 0 8px; font-size: 15px; }
    .meta { color: #68756d; font-size: 12px; margin-top: 4px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0 20px; }
    .stat { border: 1px solid #dfe7de; border-radius: 8px; padding: 9px; }
    .stat strong { display: block; font-size: 18px; }
    .stat span { color: #68756d; font-size: 11px; }
    .person { break-inside: avoid; border-top: 1px solid #dfe7de; padding: 12px 0; }
    dl { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 14px; margin: 0; }
    dt { color: #68756d; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: .06em; }
    dd { margin: 2px 0 0; font-size: 12px; white-space: pre-wrap; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 4px 0; font-size: 12px; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <header>
    <img src="${window.location.origin}/raices-logo.png" alt="" />
    <div>
      <h1>${escapeHtml(db.settings.treeName)}</h1>
      <div class="meta">Exportado desde Raíces · ${new Date().toLocaleDateString('es-AR')}</div>
    </div>
  </header>
  <section class="stats">
    <div class="stat"><strong>${db.people.length}</strong><span>personas</span></div>
    <div class="stat"><strong>${db.parentChild.length}</strong><span>vínculos padre-hijo</span></div>
    <div class="stat"><strong>${db.partnerships.length}</strong><span>parejas</span></div>
    <div class="stat"><strong>${db.sources.length}</strong><span>fuentes</span></div>
  </section>
  <h3>Personas</h3>
  ${rows}
  <h3>Vínculos</h3>
  <ul>${relationships || '<li>Sin vínculos registrados.</li>'}</ul>
  <h3>Fuentes</h3>
  <ul>${sources || '<li>Sin fuentes registradas.</li>'}</ul>
</body>
</html>`;
};

const exportPdf = (db) => {
  const layout = buildAllPeopleLayout(db);
  downloadTreeCanvasPdf({
    db,
    layout,
    filename: 'raices-lienzo.pdf',
    title: db.settings.treeName,
    temporalScale: false,
    canvasBackground: ''
  });
};

const imageFromSrc = (src) => new Promise((resolve, reject) => {
  if (!src) {
    resolve(null);
    return;
  }
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const canvasToJpegBytes = (canvas) => {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  const binary = atob(dataUrl.split(',')[1]);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const makePdfFromJpeg = ({ imageBytes, imageWidth, imageHeight }) => {
  const encoder = new TextEncoder();
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 24;
  const scale = Math.min((pageWidth - margin * 2) / imageWidth, (pageHeight - margin * 2) / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const drawX = (pageWidth - drawWidth) / 2;
  const drawY = (pageHeight - drawHeight) / 2;
  const content = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm\n/Im0 Do\nQ\n`;
  const parts = [];
  const offsets = [0];
  let size = 0;
  const pushString = (value) => {
    const bytes = encoder.encode(value);
    parts.push(bytes);
    size += bytes.length;
  };
  const pushBytes = (bytes) => {
    parts.push(bytes);
    size += bytes.length;
  };
  const startObject = (id) => {
    offsets[id] = size;
    pushString(`${id} 0 obj\n`);
  };

  pushString('%PDF-1.3\n');
  startObject(1);
  pushString('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  startObject(2);
  pushString('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  startObject(3);
  pushString(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
  startObject(4);
  pushString(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`);
  pushBytes(imageBytes);
  pushString('\nendstream\nendobj\n');
  startObject(5);
  pushString(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`);
  const xrefOffset = size;
  pushString(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
};

const roundRectPath = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const drawCenteredText = (ctx, text, x, y, maxWidth) => {
  const raw = String(text || '');
  if (ctx.measureText(raw).width <= maxWidth) {
    ctx.fillText(raw, x, y);
    return;
  }
  let value = raw;
  while (value.length > 3 && ctx.measureText(`${value}...`).width > maxWidth) value = value.slice(0, -1);
  ctx.fillText(`${value}...`, x, y);
};

const drawTreeExportCanvas = async ({ db, layout, title, temporalScale, canvasBackground }) => {
  const hasTemporalAxis = temporalScale && layout.temporal;
  const xOffset = hasTemporalAxis ? TEMPORAL_AXIS_WIDTH + TEMPORAL_AXIS_GAP : 0;
  const padding = 36;
  const width = Math.max(1000, Math.ceil(layout.width + xOffset + padding * 2));
  const height = Math.max(700, Math.ceil(layout.height + padding * 2 + 72));
  const canvas = document.createElement('canvas');
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  ctx.scale(pixelRatio, pixelRatio);
  ctx.fillStyle = '#fbfaf6';
  ctx.fillRect(0, 0, width, height);

  const bg = await imageFromSrc(canvasBackground).catch(() => null);
  if (bg) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.filter = 'grayscale(18%) saturate(58%) contrast(82%) brightness(112%)';
    const ratio = Math.max(width / bg.width, height / bg.height);
    const bgWidth = bg.width * ratio;
    const bgHeight = bg.height * ratio;
    ctx.drawImage(bg, (width - bgWidth) / 2, (height - bgHeight) / 2, bgWidth, bgHeight);
    ctx.restore();
  }

  ctx.fillStyle = '#1f2521';
  ctx.font = '800 24px Arial';
  ctx.fillText(title || db.settings.treeName || 'Árbol familiar', padding, 38);
  ctx.fillStyle = '#707a72';
  ctx.font = '12px Arial';
  ctx.fillText(`${layout.allPeopleCount || layout.nodes.length} personas visibles · Exportado desde Raíces`, padding, 58);

  if (hasTemporalAxis) {
    ctx.save();
    ctx.translate(0, 72);
    layout.temporal.ticks.forEach((tick, index) => {
      const y = padding + tick.y;
      ctx.strokeStyle = index % 2 ? 'rgba(199,153,79,.32)' : 'rgba(36,91,77,.24)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillStyle = '#245b4d';
      ctx.font = '800 11px Arial';
      ctx.fillText(String(tick.year), 18, y - 4);
    });
    if (layout.temporal.hasUnknownDates) {
      const y = padding + layout.temporal.unknownY;
      ctx.strokeStyle = 'rgba(112,122,114,.45)';
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#707a72';
      ctx.fillText('Sin fecha', 18, y - 4);
    }
    ctx.restore();
  }

  const ox = padding + xOffset;
  const oy = padding + 72;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.strokeStyle = '#afa391';
  ctx.lineWidth = 2;
  layout.edges.forEach((edge) => {
    ctx.beginPath();
    if (edge.kind === 'peer') {
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#245b4d';
      const mx = edge.from.x + (edge.to.x - edge.from.x) / 2;
      ctx.moveTo(edge.from.x, edge.from.y);
      ctx.bezierCurveTo(mx, edge.from.y, mx, edge.to.y, edge.to.x, edge.to.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#afa391';
      return;
    }
    const middleY = edge.from.y + (edge.to.y - edge.from.y) / 2;
    ctx.moveTo(edge.from.x, edge.from.y);
    ctx.bezierCurveTo(edge.from.x, middleY, edge.to.x, middleY, edge.to.x, edge.to.y);
    ctx.stroke();
  });

  layout.nodes.forEach((node) => {
    const status = personStatusClass(node.person);
    roundRectPath(ctx, node.x, node.y, TREE_CARD_WIDTH, TREE_CARD_HEIGHT, 12);
    ctx.fillStyle = status === 'living' ? '#fffefb' : '#fffdf9';
    ctx.fill();
    ctx.strokeStyle = status === 'living' ? '#d4e5dc' : '#e3dcd2';
    ctx.stroke();
    ctx.fillStyle = '#245b4d';
    ctx.font = '800 8px Arial';
    ctx.textAlign = 'center';
    drawCenteredText(ctx, node.relationLabel || (node.generation === 0 ? 'Persona central' : treeNodeLabel(node)), node.x + TREE_CARD_WIDTH / 2, node.y + 19, TREE_CARD_WIDTH - 18);
    ctx.beginPath();
    ctx.arc(node.x + TREE_CARD_WIDTH / 2, node.y + 48, 19, 0, Math.PI * 2);
    ctx.fillStyle = status === 'living' ? '#0f7a55' : '#ece4d7';
    ctx.fill();
    ctx.fillStyle = status === 'living' ? '#ffffff' : '#4d4035';
    ctx.font = '900 12px Arial';
    const initials = [node.person?.nickname?.[0] || node.person?.givenNames?.[0], node.person?.surnames?.[0]].filter(Boolean).join('').toUpperCase() || '?';
    ctx.fillText(initials, node.x + TREE_CARD_WIDTH / 2, node.y + 53);
    ctx.fillStyle = '#1f2521';
    ctx.font = '800 12px Arial';
    drawCenteredText(ctx, displayName(node.person), node.x + TREE_CARD_WIDTH / 2, node.y + 86, TREE_CARD_WIDTH - 22);
    ctx.fillStyle = '#707a72';
    ctx.font = '10px Arial';
    drawCenteredText(ctx, node.person.birthDate || 'Fecha pendiente', node.x + TREE_CARD_WIDTH / 2, node.y + 106, TREE_CARD_WIDTH - 22);
  });
  ctx.restore();
  return canvas;
};

const downloadTreeCanvasPdf = async ({ db, layout, filename, title, temporalScale, canvasBackground }) => {
  const canvas = await drawTreeExportCanvas({ db, layout, title, temporalScale, canvasBackground });
  const pdf = makePdfFromJpeg({ imageBytes: canvasToJpegBytes(canvas), imageWidth: canvas.width, imageHeight: canvas.height });
  const url = URL.createObjectURL(pdf);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const makeLifeTimeline = (person, events) => {
  const items = events.map((event) => ({
    id: event.id,
    type: event.type,
    date: event.date || '',
    place: event.place || '',
    description: event.description || ''
  }));
  const hasBirth = items.some((event) => event.type.toLowerCase().startsWith('nacimiento'));
  const hasDeath = items.some((event) => event.type.toLowerCase().startsWith('fallecimiento'));
  if (person.birthDate && !hasBirth) {
    items.push({ id: `${person.id}_birth`, type: 'Nacimiento', date: person.birthDate, place: person.birthPlace || '', description: '' });
  }
  if (person.deathDate && !hasDeath) {
    items.push({ id: `${person.id}_death`, type: 'Fallecimiento', date: person.deathDate, place: person.deathPlace || '', description: '' });
  }
  return items.sort((a, b) => {
    const byDate = parseDateRank(a.date) - parseDateRank(b.date);
    if (byDate !== 0) return byDate;
    return a.type.localeCompare(b.type, 'es');
  });
};


const buildGlobalTimeline = (db) => {
  const eventsByPerson = new Map();
  db.events.forEach((event) => {
    if (!eventsByPerson.has(event.personId)) eventsByPerson.set(event.personId, []);
    eventsByPerson.get(event.personId).push(event);
  });

  return db.people
    .flatMap((person) => makeLifeTimeline(person, eventsByPerson.get(person.id) || []).map((event) => ({
      ...event,
      person,
      sortRank: parseDateRank(event.date)
    })))
    .sort((a, b) => {
      const byDate = a.sortRank - b.sortRank;
      if (byDate !== 0) return byDate;
      const byPerson = displayName(a.person).localeCompare(displayName(b.person), 'es');
      if (byPerson !== 0) return byPerson;
      return a.type.localeCompare(b.type, 'es');
    });
};

const positionTreeNodes = (nodes, edgesByKey) => {
  if (!nodes.length) return { nodes: [], edges: [], width: 0, height: 0, generationCount: 0 };

  const minSlot = Math.min(...nodes.map((node) => node.slot));
  const maxSlot = Math.max(...nodes.map((node) => node.slot));
  const minGeneration = Math.min(...nodes.map((node) => node.generation));
  const maxGeneration = Math.max(...nodes.map((node) => node.generation));
  const paddingX = 64;
  const paddingY = 58;
  const slotSize = TREE_CARD_WIDTH + TREE_COLUMN_GAP;
  const rowSize = TREE_CARD_HEIGHT + TREE_ROW_GAP;
  let width = Math.max(960, (maxSlot - minSlot) * slotSize + TREE_CARD_WIDTH + paddingX * 2);
  const height = Math.max(520, (maxGeneration - minGeneration) * rowSize + TREE_CARD_HEIGHT + paddingY * 2);

  const positionedNodes = nodes.map((node) => ({
    ...node,
    x: paddingX + (node.slot - minSlot) * slotSize,
    y: paddingY + (node.generation - minGeneration) * rowSize,
    depth: Math.abs(node.generation)
  }));
  const rowsByGeneration = new Map();
  positionedNodes.forEach((node) => {
    if (!rowsByGeneration.has(node.generation)) rowsByGeneration.set(node.generation, []);
    rowsByGeneration.get(node.generation).push(node);
  });

  rowsByGeneration.forEach((row) => {
    row.sort((a, b) => a.x - b.x || comparePeopleByDate(a.person, b.person));
    let nextAvailableX = Number.NEGATIVE_INFINITY;
    row.forEach((node) => {
      if (node.x < nextAvailableX) node.x = nextAvailableX;
      nextAvailableX = node.x + TREE_CARD_WIDTH + TREE_MIN_CARD_GAP;
    });
  });

  width = Math.max(width, ...positionedNodes.map((node) => node.x + TREE_CARD_WIDTH + paddingX));
  const nodeByKey = new Map(positionedNodes.map((node) => [node.key, node]));
  const positionedEdges = edgesByKey
    .filter((edge) => nodeByKey.has(edge.fromKey) && nodeByKey.has(edge.toKey))
    .map((edge) => {
      const from = nodeByKey.get(edge.fromKey);
      const to = nodeByKey.get(edge.toKey);
      if (edge.kind === 'peer') {
        const fromLeft = from.x < to.x;
        return {
          id: edge.id,
          kind: edge.kind,
          fromKey: edge.fromKey,
          toKey: edge.toKey,
          from: { x: from.x + (fromLeft ? TREE_CARD_WIDTH : 0), y: from.y + TREE_CARD_HEIGHT / 2 },
          to: { x: to.x + (fromLeft ? 0 : TREE_CARD_WIDTH), y: to.y + TREE_CARD_HEIGHT / 2 }
        };
      }
      return {
        id: edge.id,
        kind: edge.kind || 'parentChild',
        fromKey: edge.fromKey,
        toKey: edge.toKey,
        from: { x: from.x + TREE_CARD_WIDTH / 2, y: from.y + TREE_CARD_HEIGHT },
        to: { x: to.x + TREE_CARD_WIDTH / 2, y: to.y }
      };
    });

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    width,
    height,
    generationCount: maxGeneration - minGeneration + 1
  };
};

const buildAncestorLayout = (db, rootId, options = {}) => {
  const { showAncestors = true, showDescendants = true, showGeneration = false } = options;
  const peopleById = new Map(db.people.map((person) => [person.id, person]));
  const parentsByChild = new Map();
  const childrenByParent = new Map();

  db.parentChild.forEach((rel) => {
    if (!parentsByChild.has(rel.childId)) parentsByChild.set(rel.childId, []);
    parentsByChild.get(rel.childId).push(rel.parentId);
    if (!childrenByParent.has(rel.parentId)) childrenByParent.set(rel.parentId, []);
    childrenByParent.get(rel.parentId).push(rel.childId);
  });

  const root = peopleById.get(rootId);
  if (!root) return { nodes: [], edges: [], width: 0, height: 0, generationCount: 0, ancestorCount: 0, descendantCount: 0 };

  const rootKey = `root_${rootId}`;
  const validSortedIds = (ids = []) => [...new Set(ids)]
    .filter((id) => peopleById.has(id))
    .sort((a, b) => comparePeopleByDate(peopleById.get(a), peopleById.get(b)));

  const buildBranch = (personId, direction, generation, path, seen) => {
    const relationIds = validSortedIds(direction === 'ancestors' ? parentsByChild.get(personId) : childrenByParent.get(personId))
      .filter((id) => !seen.has(id));
    const nextGeneration = generation + (direction === 'ancestors' ? -1 : 1);
    const branches = relationIds.map((id) => buildBranch(id, direction, nextGeneration, [...path, id], new Set([...seen, id])));
    const key = personId === rootId && generation === 0 ? rootKey : `${direction}_${generation}_${path.join('_')}`;

    if (!branches.length) {
      return {
        width: 1,
        rootX: 0,
        rootKey: key,
        nodes: [{ key, id: personId, person: peopleById.get(personId), generation, slot: 0 }],
        edges: []
      };
    }

    let cursor = 0;
    const nodes = [];
    const edges = [];
    const relatedRoots = [];

    branches.forEach((branch) => {
      const shift = cursor - branch.rootX;
      branch.nodes.forEach((node) => nodes.push({ ...node, slot: node.slot + shift }));
      edges.push(...branch.edges);
      relatedRoots.push({ key: branch.rootKey, slot: branch.rootX + shift });
      cursor += branch.width + TREE_BRANCH_GAP_SLOTS;
    });

    const totalWidth = Math.max(1, cursor - TREE_BRANCH_GAP_SLOTS);
    const rootX = relatedRoots.reduce((sum, item) => sum + item.slot, 0) / relatedRoots.length;
    nodes.push({ key, id: personId, person: peopleById.get(personId), generation, slot: rootX });
    relatedRoots.forEach((related) => {
      edges.push(direction === 'ancestors'
        ? { id: `${related.key}_${key}`, fromKey: related.key, toKey: key }
        : { id: `${key}_${related.key}`, fromKey: key, toKey: related.key });
    });

    return { width: totalWidth, rootX, rootKey: key, nodes, edges };
  };

  const rootOnlyBranch = {
    width: 1,
    rootX: 0,
    rootKey,
    nodes: [{ key: rootKey, id: rootId, person: root, generation: 0, slot: 0 }],
    edges: []
  };
  const ancestors = showAncestors ? buildBranch(rootId, 'ancestors', 0, [rootId], new Set([rootId])) : rootOnlyBranch;
  const descendants = showDescendants ? buildBranch(rootId, 'descendants', 0, [rootId], new Set([rootId])) : rootOnlyBranch;
  const descendantShift = ancestors.rootX - descendants.rootX;
  const nodes = [
    ...ancestors.nodes,
    ...descendants.nodes
      .filter((node) => node.key !== rootKey)
      .map((node) => ({ ...node, slot: node.slot + descendantShift }))
  ];
  const edgeById = new Map([...ancestors.edges, ...descendants.edges].map((edge) => [edge.id, edge]));

  if (showGeneration) {
    const existingNodeIds = new Set(nodes.map((node) => node.id));
    const parentIds = validSortedIds(parentsByChild.get(rootId));
    const siblingIds = validSortedIds(parentIds.flatMap((parentId) => childrenByParent.get(parentId) || []))
      .filter((id) => id !== rootId && !existingNodeIds.has(id));
    const partnerIds = validSortedIds(db.partnerships
      .filter((rel) => rel.personAId === rootId || rel.personBId === rootId)
      .map((rel) => rel.personAId === rootId ? rel.personBId : rel.personAId))
      .filter((id) => !existingNodeIds.has(id));
    const generationIds = [...siblingIds, ...partnerIds.filter((id) => !siblingIds.includes(id))];
    const rootSlot = ancestors.rootX;
    generationIds.forEach((id, index) => {
      const side = index % 2 === 0 ? -1 : 1;
      const distance = Math.floor(index / 2) + 1;
      const key = `generation_${id}`;
      nodes.push({ key, id, person: peopleById.get(id), generation: 0, slot: rootSlot + side * distance, relationLabel: partnerIds.includes(id) ? 'Pareja' : 'Hermano/a' });
      existingNodeIds.add(id);
      parentIds.forEach((parentId) => {
        const parentNode = nodes.find((node) => node.id === parentId);
        if (parentNode) edgeById.set(`${parentNode.key}_${key}`, { id: `${parentNode.key}_${key}`, fromKey: parentNode.key, toKey: key });
      });
      if (partnerIds.includes(id)) edgeById.set(`${rootKey}_${key}_partner`, { id: `${rootKey}_${key}_partner`, kind: 'peer', fromKey: rootKey, toKey: key });
    });
  }

  const positioned = positionTreeNodes(nodes, [...edgeById.values()]);
  const uniqueAncestors = new Set(positioned.nodes.filter((node) => node.generation < 0).map((node) => node.id));
  const uniqueDescendants = new Set(positioned.nodes.filter((node) => node.generation > 0).map((node) => node.id));

  return {
    ...positioned,
    ancestorCount: uniqueAncestors.size,
    descendantCount: uniqueDescendants.size,
    allPeopleCount: positioned.nodes.length
  };
};

const buildAllPeopleLayout = (db) => {
  const peopleById = new Map(db.people.map((person) => [person.id, person]));
  const childIds = new Set(db.parentChild
    .filter((rel) => peopleById.has(rel.parentId) && peopleById.has(rel.childId))
    .map((rel) => rel.childId));
  const childrenByParent = new Map();
  const indegree = new Map(db.people.map((person) => [person.id, 0]));

  db.parentChild.forEach((rel) => {
    if (!peopleById.has(rel.parentId) || !peopleById.has(rel.childId)) return;
    if (!childrenByParent.has(rel.parentId)) childrenByParent.set(rel.parentId, []);
    childrenByParent.get(rel.parentId).push(rel.childId);
    indegree.set(rel.childId, (indegree.get(rel.childId) || 0) + 1);
  });

  const roots = db.people
    .filter((person) => !childIds.has(person.id))
    .sort(comparePeopleByDate);
  const queue = roots.length ? roots.map((person) => person.id) : db.people.sort(comparePeopleByDate).map((person) => person.id);
  const generationById = new Map(queue.map((id) => [id, 0]));
  const visitedQueue = [...queue];

  for (let index = 0; index < visitedQueue.length; index += 1) {
    const parentId = visitedQueue[index];
    const nextGeneration = (generationById.get(parentId) || 0) + 1;
    (childrenByParent.get(parentId) || []).sort((a, b) => comparePeopleByDate(peopleById.get(a), peopleById.get(b))).forEach((childId) => {
      if (!generationById.has(childId) || generationById.get(childId) < nextGeneration) generationById.set(childId, nextGeneration);
      indegree.set(childId, Math.max(0, (indegree.get(childId) || 0) - 1));
      if (indegree.get(childId) === 0 && !visitedQueue.includes(childId)) visitedQueue.push(childId);
    });
  }

  db.people.forEach((person) => {
    if (!generationById.has(person.id)) generationById.set(person.id, 0);
  });

  const levels = new Map();
  db.people.forEach((person) => {
    const generation = generationById.get(person.id) || 0;
    if (!levels.has(generation)) levels.set(generation, []);
    levels.get(generation).push(person);
  });

  const nodes = [];
  [...levels.entries()].sort((a, b) => a[0] - b[0]).forEach(([generation, people]) => {
    people.sort(comparePeopleByDate).forEach((person, index) => {
      nodes.push({ key: `all_${person.id}`, id: person.id, person, generation, slot: index });
    });
  });

  const edgesByKey = db.parentChild
    .filter((rel) => peopleById.has(rel.parentId) && peopleById.has(rel.childId))
    .map((rel) => ({ id: `all_${rel.parentId}_${rel.childId}`, fromKey: `all_${rel.parentId}`, toKey: `all_${rel.childId}` }));

  const positioned = positionTreeNodes(nodes, edgesByKey);
  return {
    ...positioned,
    ancestorCount: 0,
    descendantCount: 0,
    allPeopleCount: db.people.length
  };
};

const ancestorGenerationLabel = (distance) => {
  const labels = {
    1: 'Padre / madre',
    2: 'Abuelo/a',
    3: 'Bisabuelo/a',
    4: 'Tatarabuelo/a',
    5: 'Trastatarabuelo/a',
    6: 'Pentabuelo/a',
    7: 'Hexabuelo/a',
    8: 'Heptabuelo/a'
  };
  return labels[distance] || `Ancestro/a ${distance} generaciones`;
};

const descendantGenerationLabel = (distance) => {
  const labels = {
    1: 'Hijo / hija',
    2: 'Nieto/a',
    3: 'Bisnieto/a',
    4: 'Tataranieto/a',
    5: 'Trastataranieto/a'
  };
  return labels[distance] || `Descendiente ${distance} generaciones`;
};

const treeNodeLabel = (node) => {
  if (node.relationLabel) return node.relationLabel;
  if (node.generation === 0) return 'Persona central';
  if (node.generation < 0) return ancestorGenerationLabel(Math.abs(node.generation));
  return descendantGenerationLabel(node.generation);
};

const allPeopleNodeLabel = (node) => {
  if (node.generation === 0) return 'Origen / sin padres';
  return `Generación ${node.generation + 1}`;
};

const suggestionSourceTitle = 'Detective genealógico';

const makeRecordSearchUrl = (person, terms) => {
  const pieces = [
    `"${displayName(person)}"`,
    birthYearFor(person) || '',
    person.birthPlace || '',
    terms
  ].filter(Boolean);
  return `https://www.google.com/search?q=${encodeURIComponent(pieces.join(' '))}`;
};

const existingSuggestionKey = (suggestion) => suggestion.fingerprint || suggestion.id;

const createDetectiveSuggestions = (db) => {
  const peopleById = new Map(db.people.map((person) => [person.id, person]));
  const existingParentChild = new Set(db.parentChild.map((rel) => `${rel.parentId}|${rel.childId}`));
  const parentCountByChild = new Map();
  db.parentChild.forEach((rel) => parentCountByChild.set(rel.childId, (parentCountByChild.get(rel.childId) || 0) + 1));
  const existingFingerprints = new Set((db.detectiveSuggestions || []).map(existingSuggestionKey));
  const now = new Date().toISOString();
  const suggestions = [];

  const addSuggestion = (suggestion) => {
    if (existingFingerprints.has(suggestion.fingerprint)) return;
    existingFingerprints.add(suggestion.fingerprint);
    suggestions.push({
      id: newId('detective'),
      status: 'pending',
      createdAt: now,
      ...suggestion
    });
  };

  db.people.forEach((child) => {
    const childYear = birthYearFor(child);
    if (!childYear || (parentCountByChild.get(child.id) || 0) >= 2) return;
    const childSurname = String(child.surnames || '').split(/\s+/)[0]?.toLowerCase();
    if (!childSurname) return;
    const candidate = db.people
      .filter((person) => person.id !== child.id && !existingParentChild.has(`${person.id}|${child.id}`))
      .map((person) => ({ person, year: birthYearFor(person) }))
      .filter(({ person, year }) => {
        if (!year) return false;
        const personSurname = String(person.surnames || '').toLowerCase();
        const ageGap = childYear - year;
        return ageGap >= 18 && ageGap <= 55 && personSurname.includes(childSurname);
      })
      .sort((a, b) => Math.abs((childYear - a.year) - 30) - Math.abs((childYear - b.year) - 30))[0];

    if (!candidate) return;
    addSuggestion({
      fingerprint: `parent-child:${candidate.person.id}:${child.id}`,
      kind: 'link_parent_child',
      title: `Posible vínculo padre/madre-hijo: ${displayName(candidate.person)} → ${displayName(child)}`,
      summary: `Coinciden apellido y una diferencia de edad plausible (${childYear - candidate.year} años). Requiere validar contra actas antes de tratarlo como dato firme.`,
      confidence: 'Baja',
      source: {
        title: suggestionSourceTitle,
        type: 'INFERENCIA_INTERNA',
        url: makeRecordSearchUrl(child, 'acta nacimiento padres censo matrimonio defunción'),
        notes: 'Hipótesis generada por análisis del árbol vigente; no es una fuente documental.'
      },
      proposedChanges: [{ type: 'add_parent_child', parentId: candidate.person.id, childId: child.id }]
    });
  });

  db.people
    .filter((person) => person.givenNames || person.surnames)
    .sort(comparePeopleByDate)
    .slice(0, 8)
    .forEach((person) => {
      const missing = [
        !person.birthPlace && 'lugar de nacimiento',
        !person.deathDate && 'fallecimiento',
        (parentCountByChild.get(person.id) || 0) < 2 && 'padres'
      ].filter(Boolean);
      if (!missing.length) return;
      addSuggestion({
        fingerprint: `record-search:${person.id}:${missing.join('-')}`,
        kind: 'record_search',
        title: `Buscar registros públicos de ${displayName(person)}`,
        summary: `Faltan datos de ${missing.join(', ')}. Conviene revisar actas de nacimiento, matrimonio, defunción, censos y registros parroquiales.`,
        confidence: 'Pista',
        source: {
          title: `Búsqueda sugerida para ${displayName(person)}`,
          type: 'BUSQUEDA_DETECTIVE',
          url: makeRecordSearchUrl(person, 'acta nacimiento matrimonio defunción censo registro civil parroquial genealogía'),
          notes: 'Consulta preparada para investigación online. Al aceptar se agrega como fuente/pista pendiente de verificación.'
        },
        proposedChanges: [{ type: 'add_source' }]
      });
    });

  return suggestions;
};

const describeSuggestionChange = (change, db) => {
  const peopleById = new Map(db.people.map((person) => [person.id, person]));
  if (change.type === 'add_parent_child') {
    return `Agregar vínculo: ${displayName(peopleById.get(change.parentId))} como padre/madre de ${displayName(peopleById.get(change.childId))}.`;
  }
  if (change.type === 'add_source') return 'Agregar esta búsqueda como fuente/pista pendiente de verificación.';
  return 'Aplicar cambio propuesto.';
};

const buildTemporalLayout = (layout) => {
  const datedNodes = layout.nodes
    .map((node) => ({ node, year: birthYearFor(node.person) }))
    .filter((item) => item.year !== null);

  if (!datedNodes.length) return { ...layout, temporal: null };

  const minYear = Math.min(...datedNodes.map((item) => item.year));
  const maxYear = Math.max(...datedNodes.map((item) => item.year));
  const hasUnknownDates = layout.nodes.some((node) => birthYearFor(node.person) === null);
  const axisStartYear = hasUnknownDates ? minYear - UNKNOWN_BIRTH_YEAR_OFFSET : minYear;
  const rangeHeight = Math.max(1, maxYear - axisStartYear) * TEMPORAL_PIXELS_PER_YEAR;
  const unknownY = TEMPORAL_TOP_PADDING;
  const nodes = layout.nodes.map((node) => {
    const birthYear = birthYearFor(node.person);
    return {
      ...node,
      birthYear,
      y: birthYear === null ? unknownY : TEMPORAL_TOP_PADDING + (birthYear - axisStartYear) * TEMPORAL_PIXELS_PER_YEAR
    };
  });
  const nodeByKey = new Map(nodes.map((node) => [node.key, node]));
  const edges = layout.edges
    .filter((edge) => nodeByKey.has(edge.fromKey) && nodeByKey.has(edge.toKey))
    .map((edge) => {
      const from = nodeByKey.get(edge.fromKey);
      const to = nodeByKey.get(edge.toKey);
      return {
        ...edge,
        from: { x: from.x + TREE_CARD_WIDTH / 2, y: from.y + TREE_CARD_HEIGHT },
        to: { x: to.x + TREE_CARD_WIDTH / 2, y: to.y }
      };
    });

  const step = temporalTickStep(minYear, maxYear);
  const tickYears = new Set([minYear, maxYear]);
  for (let year = Math.ceil(minYear / step) * step; year <= maxYear; year += step) {
    tickYears.add(year);
  }
  const ticks = [...tickYears]
    .sort((a, b) => a - b)
    .map((year) => ({ year, y: TEMPORAL_TOP_PADDING + (year - axisStartYear) * TEMPORAL_PIXELS_PER_YEAR }));
  const height = Math.max(layout.height, TEMPORAL_TOP_PADDING + rangeHeight + TREE_CARD_HEIGHT + TEMPORAL_BOTTOM_PADDING);

  return {
    ...layout,
    nodes,
    edges,
    height,
    temporal: {
      minYear,
      maxYear,
      ticks,
      hasUnknownDates,
      unknownY
    }
  };
};

function PersonAvatar({ person, large = false }) {
  const initials = [person?.nickname?.[0] || person?.givenNames?.[0], person?.surnames?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const status = personStatusClass(person);
  return <div className={`avatar ${large ? 'avatarLarge' : ''} ${status}`}>{person?.profileImage ? <img src={person.profileImage} alt="" /> : initials}</div>;
}

function Stat({ value, label }) {
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader"><h2>{title}</h2><button className="iconButton" onClick={onClose}>×</button></div>
        {children}
      </div>
    </div>
  );
}

function PersonForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState({ ...blankPerson(), ...(initial || {}) });
  const imageInputRef = useRef(null);
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const setProfileImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const profileImage = await readProfileImage(file);
      setForm((prev) => ({ ...prev, profileImage }));
    } catch (error) {
      alert(error.message || 'No pude cargar esa imagen.');
    } finally {
      event.target.value = '';
    }
  };
  const submit = (event) => {
    event.preventDefault();
    if (!form.givenNames.trim() && !form.surnames.trim()) return;
    onSave(form);
  };
  return (
    <form onSubmit={submit} className="formStack">
      <div className="profileImageField">
        <PersonAvatar person={form} large />
        <div>
          <span>Imagen de perfil</span>
          <div className="buttonRow compact">
            <button type="button" className="secondaryButton" onClick={() => imageInputRef.current?.click()}>Cargar imagen</button>
            {form.profileImage && <button type="button" className="textButton" onClick={() => setForm((prev) => ({ ...prev, profileImage: '' }))}>Quitar</button>}
          </div>
          <input ref={imageInputRef} hidden type="file" accept="image/*" onChange={setProfileImage} />
        </div>
      </div>
      <div className="formGrid three">
        <label>Nombres<input value={form.givenNames} onChange={set('givenNames')} autoFocus /></label>
        <label>Apellidos<input value={form.surnames} onChange={set('surnames')} /></label>
        <label>Apodo<input value={form.nickname} onChange={set('nickname')} /></label>
      </div>
      <label>Email<input type="email" value={form.email} onChange={set('email')} placeholder="nombre@dominio.com" /></label>
      <div className="formGrid three">
        <label>Sexo<select value={form.sex} onChange={set('sex')}><option value="">Sin indicar</option><option value="M">Masculino</option><option value="F">Femenino</option><option value="X">Otro / no binario</option></select></label>
        <label>Nacimiento<input type="date" value={form.birthDate} onChange={set('birthDate')} /></label>
        <label>Lugar de nacimiento<input value={form.birthPlace} onChange={set('birthPlace')} placeholder="Ciudad, provincia, país" /></label>
      </div>
      <div className="formGrid two">
        <label>Fallecimiento<input type="date" value={form.deathDate} onChange={set('deathDate')} /></label>
        <label>Lugar de fallecimiento<input value={form.deathPlace} onChange={set('deathPlace')} /></label>
      </div>
      <label>Ocupación<input value={form.occupation} onChange={set('occupation')} /></label>
      <label>Notas<textarea rows="5" value={form.notes} onChange={set('notes')} placeholder="Hipótesis, datos pendientes, variantes del apellido..." /></label>
      <div className="modalActions"><button type="button" className="secondaryButton" onClick={onCancel}>Cancelar</button><button className="primaryButton">Guardar persona</button></div>
    </form>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="emptyState">
      <div className="emptyMark"><img src="/raices-logo.png" alt="" /></div>
      <h2>Empezá por una persona</h2>
      <p>El árbol se construye alrededor de personas y vínculos. Podés cargar datos incompletos e ir documentándolos a medida que investigás.</p>
      <button className="primaryButton" onClick={onAdd}>+ Agregar primera persona</button>
    </div>
  );
}

function PersonPicker({ people, excludeId, onPick, label }) {
  const [value, setValue] = useState('');
  const options = people.filter((p) => p.id !== excludeId).sort(comparePeopleByName);
  return (
    <div className="pickerRow">
      <select value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">Elegir persona…</option>
        {options.map((p) => <option key={p.id} value={p.id}>{displayName(p)}</option>)}
      </select>
      <button className="secondaryButton" disabled={!value} onClick={() => { onPick(value); setValue(''); }}>{label}</button>
    </div>
  );
}

function PersonDrawer({ db, person, mode, onModeChange, onClose, onSave, onFocus, onLink, onDelete, onAddEvent }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!person) return null;

  const rel = relativesFor(db, person.id);
  const events = db.events.filter((event) => event.personId === person.id);
  const timeline = makeLifeTimeline(person, events);
  const life = [person.birthDate && `N. ${person.birthDate}`, person.deathDate && `F. ${person.deathDate}`].filter(Boolean).join(' · ');
  const openInTree = (id = person.id) => {
    onClose();
    onFocus(id);
  };
  const isEditing = mode === 'edit';

  return (
    <div className="drawerBackdrop" onMouseDown={onClose}>
      <aside className={`personDrawer ${personStatusClass(person)}`} onMouseDown={(event) => event.stopPropagation()} aria-label="Ficha de persona">
        <div className="drawerHeader">
          <div>
            <p className="eyebrow">{isEditing ? 'Modo edición' : 'Modo vista'}</p>
            <h2>{isEditing ? 'Editar persona' : 'Ficha personal'}</h2>
          </div>
          <div className="drawerHeaderActions">
            <span className={`modePill ${isEditing ? 'editing' : 'viewing'}`}>{isEditing ? 'Editando' : 'Vista'}</span>
            <button className="iconButton" onClick={onClose}>×</button>
          </div>
        </div>

        {isEditing ? <div className="drawerEdit">
          <div className="modeNotice editing">Estás modificando los datos de esta persona. Guardar actualiza la ficha y vuelve al modo vista.</div>
          <PersonForm initial={person} onCancel={() => onModeChange('view')} onSave={(form) => onSave(person.id, form)} />
        </div> : <div className="drawerView">
          <div className="modeNotice viewing">Estás viendo la ficha. Usá Editar para cambiar datos.</div>
          <div className="detailTop">
            <PersonAvatar person={person} large />
            <div><p className="eyebrow">Persona</p><h2>{displayName(person)}</h2><p className="muted">{life || 'Fechas por investigar'}</p><span className={`statusPill ${personStatusClass(person)}`}>{personStatusLabel(person)}</span></div>
          </div>
          <div className="detailActions"><button className="secondaryButton" onClick={() => onModeChange('edit')}>Editar</button><button className="secondaryButton" onClick={() => openInTree()}>Ver en árbol</button></div>
          <dl className="factList">
            {person.nickname && <div><dt>Apodo</dt><dd>{person.nickname}</dd></div>}
            <div><dt>Email</dt><dd>{person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : '?'}</dd></div>
            <div><dt>Nacimiento</dt><dd>{[person.birthDate, person.birthPlace].filter(Boolean).join(' · ') || '?'}</dd></div>
            <div><dt>Fallecimiento</dt><dd>{[person.deathDate, person.deathPlace].filter(Boolean).join(' · ') || '?'}</dd></div>
            <div><dt>Ocupación</dt><dd>{person.occupation || '?'}</dd></div>
            <div><dt>Notas</dt><dd>{person.notes || '?'}</dd></div>
          </dl>
          <section className="detailSection"><div className="sectionTitle"><h3>Familia</h3></div>
            <RelationList title="Padres" people={[...rel.parents].sort(comparePeopleByDate)} onOpen={openInTree} />
            <PersonPicker people={db.people} excludeId={person.id} onPick={(id) => onLink('parent', id)} label="Agregar padre/madre" />
            <RelationList title="Parejas" people={[...rel.partners].sort(comparePeopleByDate)} onOpen={openInTree} />
            <PersonPicker people={db.people} excludeId={person.id} onPick={(id) => onLink('partner', id)} label="Agregar pareja" />
            <RelationList title="Hijos" people={[...rel.children].sort(comparePeopleByDate)} onOpen={openInTree} />
            <PersonPicker people={db.people} excludeId={person.id} onPick={(id) => onLink('child', id)} label="Agregar hijo/a" />
          </section>
          <section className="detailSection"><div className="sectionTitle"><h3>Línea de tiempo</h3><button className="textButton" onClick={onAddEvent}>+ Agregar</button></div>
            {timeline.length ? <ol className="timelineList">{timeline.map((event) => <li key={event.id} className="timelineItem"><span className="timelineDot" /><div><strong>{event.type}</strong><span>{[event.date, event.place].filter(Boolean).join(' · ') || 'Fecha pendiente'}</span>{event.description && <p>{event.description}</p>}</div></li>)}</ol> : <p className="muted small">Todavía no hay eventos registrados.</p>}
          </section>
          <button className="dangerText" onClick={onDelete}>Eliminar persona</button>
        </div>}
      </aside>
    </div>
  );
}

function RelationList({ title, people, onOpen }) {
  if (!people.length) return <div className="relationBlock"><span>{title}</span><em>Sin datos</em></div>;
  return <div className="relationBlock"><span>{title}</span><div>{people.map((p) => <button key={p.id} className={`relationChip ${personStatusClass(p)}`} onClick={() => onOpen(p.id)}>{displayName(p)}</button>)}</div></div>;
}

function TreeCard({ person, label, onOpen, onFocus, focal = false, style }) {
  const clickTimerRef = useRef(null);

  useEffect(() => () => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
  }, []);

  if (!person) return null;

  const handleClick = () => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      onOpen(person.id);
    }, 220);
  };

  const handleDoubleClick = (event) => {
    event.preventDefault();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onFocus(person.id);
  };

  return (
    <button className={`treeCard treeNode ${personStatusClass(person)} ${focal ? 'focal' : ''}`} style={style} onPointerDown={(e) => e.stopPropagation()} onClick={handleClick} onDoubleClick={handleDoubleClick} title="Click: ver ficha. Doble click: centrar árbol.">
      <span className="treeLabel">{label}</span>
      <PersonAvatar person={person} />
      <strong>{displayName(person)}</strong>
      <small>{person.birthDate || 'Fecha pendiente'}</small>
      <span className={`lifeDot ${personStatusClass(person)}`} aria-label={personStatusLabel(person)} title={personStatusLabel(person)} />
    </button>
  );
}

function TreeView({ db, focusedId, setFocusedId, onOpenPerson, onAdd }) {
  const person = db.people.find((p) => p.id === focusedId) || db.people[0];
  const [viewport, setViewport] = useState({ x: 24, y: 18, scale: 0.92 });
  const [showAllPeople, setShowAllPeople] = useState(false);
  const [showAncestors, setShowAncestors] = useState(true);
  const [showDescendants, setShowDescendants] = useState(true);
  const [showGeneration, setShowGeneration] = useState(false);
  const [temporalScale, setTemporalScale] = useState(false);
  const [isCanvasMaximized, setCanvasMaximized] = useState(false);
  const [canvasBackground, setCanvasBackground] = useState('');
  const dragRef = useRef(null);
  const backgroundInputRef = useRef(null);
  const baseLayout = useMemo(() => showAllPeople ? buildAllPeopleLayout(db) : buildAncestorLayout(db, person?.id, { showAncestors, showDescendants, showGeneration }), [db, person?.id, showAllPeople, showAncestors, showDescendants, showGeneration]);
  const layout = useMemo(() => temporalScale ? buildTemporalLayout(baseLayout) : baseLayout, [baseLayout, temporalScale]);

  useEffect(() => {
    try {
      setCanvasBackground(localStorage.getItem(CANVAS_BACKGROUND_STORAGE_KEY) || '');
    } catch {
      setCanvasBackground('');
    }
  }, []);

  useEffect(() => {
    try {
      if (canvasBackground) localStorage.setItem(CANVAS_BACKGROUND_STORAGE_KEY, canvasBackground);
      else localStorage.removeItem(CANVAS_BACKGROUND_STORAGE_KEY);
    } catch {
      // localStorage can reject large background images; keep the in-memory preview.
    }
  }, [canvasBackground]);

  useEffect(() => {
    setViewport({ x: 24, y: 18, scale: 0.92 });
  }, [person?.id, showAllPeople, showAncestors, showDescendants, showGeneration, temporalScale]);

  useEffect(() => {
    if (!isCanvasMaximized) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setCanvasMaximized(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCanvasMaximized]);

  if (!person) return <EmptyState onAdd={onAdd} />;

  const setZoom = (nextScale) => {
    setViewport((prev) => ({ ...prev, scale: clamp(nextScale, 0.45, 1.7) }));
  };

  const onPointerDown = (event) => {
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: viewport.x, originY: viewport.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    setViewport((prev) => ({ ...prev, x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY }));
  };

  const onPointerUp = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const loadCanvasBackground = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setCanvasBackground(await readCanvasBackgroundImage(file));
    } catch (error) {
      alert(error.message || 'No pude cargar esa imagen.');
    } finally {
      event.target.value = '';
    }
  };

  const exportCurrentCanvasPdf = () => {
    downloadTreeCanvasPdf({
      db,
      layout,
      filename: `raices-${Date.now()}.pdf`,
      title: showAllPeople ? `${db.settings.treeName} · Todas las personas` : `${db.settings.treeName} · ${displayName(person)}`,
      temporalScale,
      canvasBackground
    });
  };

  return (
    <div className={`treeWorkspace ${isCanvasMaximized ? 'canvasMaximized' : ''}`}>
      <div className="treeToolbar">
        <div><p className="eyebrow">{showAllPeople ? 'Vista completa' : 'Ascendencia y descendencia'}</p><h2>{showAllPeople ? 'Todas las personas' : displayName(person)}</h2><p>{showAllPeople ? `${layout.allPeopleCount} personas visibles · doble click para enfocar una rama.${temporalScale ? ' Escala temporal activa.' : ''}` : `${layout.ancestorCount} ancestros · ${layout.descendantCount} descendientes · ramas ordenadas por fecha.${temporalScale ? ' Escala temporal activa.' : ''}`}</p></div>
        <div className="treeControls">
          <select value={person.id} onChange={(e) => { setShowAllPeople(false); setFocusedId(e.target.value); }}>{[...db.people].sort(comparePeopleByName).map((p) => <option key={p.id} value={p.id}>{displayName(p)}</option>)}</select>
          <button className={`secondaryButton ${showAllPeople ? 'activeToggle' : ''}`} type="button" onClick={() => setShowAllPeople((value) => !value)}>{showAllPeople ? 'Ver rama enfocada' : 'Ver todas las personas'}</button>
          {!showAllPeople && <div className="treeFilterChecks" aria-label="Filtros de rama">
            <label><input type="checkbox" checked={showAncestors} onChange={(event) => setShowAncestors(event.target.checked)} /> Mostrar ascendencia</label>
            <label><input type="checkbox" checked={showDescendants} onChange={(event) => setShowDescendants(event.target.checked)} /> Mostrar descendencia</label>
            <label><input type="checkbox" checked={showGeneration} onChange={(event) => setShowGeneration(event.target.checked)} /> Mostrar generación</label>
          </div>}
          <div className="zoomControls" aria-label="Controles de zoom">
            <button className={`secondaryButton ${temporalScale ? 'activeToggle' : ''}`} type="button" onClick={() => setTemporalScale((value) => !value)}>Escala temporal</button>
            <button className={`secondaryButton ${isCanvasMaximized ? 'activeToggle' : ''}`} type="button" onClick={() => setCanvasMaximized((value) => !value)}>{isCanvasMaximized ? 'Salir' : 'Maximizar'}</button>
            <button className={`secondaryButton ${canvasBackground ? 'activeToggle' : ''}`} type="button" onClick={() => backgroundInputRef.current?.click()}>Fondo</button>
            {canvasBackground && <button className="textButton" type="button" onClick={() => setCanvasBackground('')}>Quitar fondo</button>}
            <input ref={backgroundInputRef} hidden type="file" accept="image/*" onChange={loadCanvasBackground} />
            <button className="secondaryButton" type="button" onClick={exportCurrentCanvasPdf}>PDF</button>
            <button className="iconButton" type="button" onClick={() => setZoom(viewport.scale - 0.12)} title="Alejar">-</button>
            <span>{Math.round(viewport.scale * 100)}%</span>
            <button className="iconButton" type="button" onClick={() => setZoom(viewport.scale + 0.12)} title="Acercar">+</button>
            <button className="secondaryButton" type="button" onClick={() => setViewport({ x: 24, y: 18, scale: 0.92 })}>Centrar</button>
          </div>
        </div>
      </div>
      <div className={`treeCanvas ${temporalScale ? 'temporalCanvas' : ''} ${canvasBackground ? 'hasCanvasBackground' : ''}`} style={canvasBackground ? { '--canvas-bg-image': `url(${canvasBackground})` } : undefined} onWheel={(event) => { event.preventDefault(); setZoom(viewport.scale + (event.deltaY > 0 ? -0.08 : 0.08)); }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        {temporalScale && layout.temporal && <div className="temporalGuideLayer" aria-hidden="true">
          {layout.temporal.ticks.map((tick, index) => <div key={tick.year} className={`temporalGuideLine ${index % 2 ? 'alternate' : ''}`} style={{ top: viewport.y + tick.y * viewport.scale }} />)}
          {layout.temporal.hasUnknownDates && <div className="temporalGuideLine unknown" style={{ top: viewport.y + layout.temporal.unknownY * viewport.scale }} />}
        </div>}
        {temporalScale && layout.temporal && <div className="temporalAxis" aria-hidden="true">
          <div className="temporalAxisTitle">Nacimiento</div>
          <div className="temporalAxisLine" />
          {layout.temporal.ticks.map((tick) => <div key={tick.year} className="temporalTick" style={{ top: viewport.y + tick.y * viewport.scale }}><span>{tick.year}</span></div>)}
          {layout.temporal.hasUnknownDates && <div className="temporalTick unknown" style={{ top: viewport.y + layout.temporal.unknownY * viewport.scale }}><span>Sin fecha</span></div>}
        </div>}
        <div className="treePanLayer" style={{ transform: `translate(${viewport.x + (temporalScale && layout.temporal ? TEMPORAL_AXIS_WIDTH + TEMPORAL_AXIS_GAP : 0)}px, ${viewport.y}px) scale(${viewport.scale})` }}>
          <div className="treeContent" style={{ width: layout.width, height: layout.height }}>
            <svg className="treeLines" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
              {layout.edges.map((edge) => {
                if (edge.kind === 'peer') {
                  return <path key={edge.id} className="peerLine" d={`M ${edge.from.x} ${edge.from.y} C ${edge.from.x + (edge.to.x - edge.from.x) / 2} ${edge.from.y}, ${edge.from.x + (edge.to.x - edge.from.x) / 2} ${edge.to.y}, ${edge.to.x} ${edge.to.y}`} />;
                }
                const middleY = edge.from.y + (edge.to.y - edge.from.y) / 2;
                return <path key={edge.id} d={`M ${edge.from.x} ${edge.from.y} C ${edge.from.x} ${middleY}, ${edge.to.x} ${middleY}, ${edge.to.x} ${edge.to.y}`} />;
              })}
            </svg>
            {layout.nodes.map((node) => <TreeCard key={node.key} person={node.person} label={showAllPeople ? allPeopleNodeLabel(node) : treeNodeLabel(node)} focal={!showAllPeople && node.id === person.id} onOpen={onOpenPerson} onFocus={(id) => { setShowAllPeople(false); setFocusedId(id); }} style={{ left: node.x, top: node.y }} />)}
          </div>
        </div>
      </div>
      <p className="treeHint">Arrastrá el lienzo para moverte. Usá la rueda o los botones para acercar y alejar.</p>
    </div>
  );
}

function PublicContributionForm({ db, initialPersonId = '', onClose }) {
  const [kind, setKind] = useState(initialPersonId ? 'edit_person' : 'add_person');
  const [contributor, setContributor] = useState('');
  const [targetPersonId, setTargetPersonId] = useState(initialPersonId);
  const [relationKind, setRelationKind] = useState('');
  const [relationPersonId, setRelationPersonId] = useState(initialPersonId || '');
  const [form, setForm] = useState({ ...blankPerson() });
  const [pieceText, setPieceText] = useState('');
  const targetPerson = db.people.find((person) => person.id === targetPersonId);
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  useEffect(() => {
    if (kind === 'edit_person' && targetPerson) setForm({ ...blankPerson(), ...targetPerson });
    if (kind === 'add_person') setForm({ ...blankPerson() });
  }, [kind, targetPerson]);

  const submit = (event) => {
    event.preventDefault();
    const contribution = makePuzzleContribution({
      treeName: db.settings.treeName,
      contributor,
      kind,
      personId: kind === 'edit_person' ? targetPersonId : '',
      person: form,
      relation: kind === 'add_person' ? { kind: relationKind, personId: relationPersonId } : { kind: '', personId: '' }
    });
    setPieceText(JSON.stringify(contribution, null, 2));
  };

  const downloadPiece = () => {
    downloadText(`pieza-${Date.now()}.json`, pieceText, 'application/json');
  };

  return (
    <Modal title="Aportar pieza" onClose={onClose}>
      <form className="formStack puzzleForm" onSubmit={submit}>
        <div className="modeNotice viewing">Cada aporte es una pieza del rompecabezas familiar. El dueño del árbol podrá importarla, revisar la fuente y aceptarla o rechazarla.</div>
        <label>Tu nombre o contacto<input value={contributor} onChange={(event) => setContributor(event.target.value)} placeholder="Opcional" /></label>
        <div className="segmentedControl">
          <button type="button" className={kind === 'edit_person' ? 'active' : ''} onClick={() => setKind('edit_person')}>Sugerir edición</button>
          <button type="button" className={kind === 'add_person' ? 'active' : ''} onClick={() => setKind('add_person')}>Agregar persona</button>
        </div>
        {kind === 'edit_person' && <label>Persona a editar<select value={targetPersonId} onChange={(event) => setTargetPersonId(event.target.value)}><option value="">Elegir persona</option>{[...db.people].sort(comparePeopleByName).map((person) => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></label>}
        {kind === 'add_person' && <div className="formGrid two">
          <label>Relación sugerida<select value={relationKind} onChange={(event) => setRelationKind(event.target.value)}><option value="">Sin vínculo por ahora</option><option value="parent_of">Es padre/madre de</option><option value="child_of">Es hijo/a de</option><option value="partner_of">Es pareja de</option></select></label>
          <label>Persona vinculada<select value={relationPersonId} onChange={(event) => setRelationPersonId(event.target.value)}><option value="">Elegir persona</option>{[...db.people].sort(comparePeopleByName).map((person) => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></label>
        </div>}
        <div className="formGrid two">
          <label>Nombres<input value={form.givenNames} onChange={set('givenNames')} required={kind === 'add_person'} /></label>
          <label>Apellidos<input value={form.surnames} onChange={set('surnames')} /></label>
        </div>
        <div className="formGrid two">
          <label>Nacimiento<input type="date" value={form.birthDate} onChange={set('birthDate')} /></label>
          <label>Lugar de nacimiento<input value={form.birthPlace} onChange={set('birthPlace')} /></label>
        </div>
        <div className="formGrid two">
          <label>Fallecimiento<input type="date" value={form.deathDate} onChange={set('deathDate')} /></label>
          <label>Lugar de fallecimiento<input value={form.deathPlace} onChange={set('deathPlace')} /></label>
        </div>
        <label>Fuente o explicación<textarea rows="4" value={form.notes} onChange={set('notes')} placeholder="Acta, censo, recuerdo familiar, enlace, archivo..." /></label>
        <div className="modalActions"><button type="button" className="secondaryButton" onClick={onClose}>Cancelar</button><button className="primaryButton">Generar pieza</button></div>
        {pieceText && <div className="pieceOutput">
          <strong>Pieza lista para enviar</strong>
          <p>Descargala y enviasela al dueño del árbol para que la importe en su sección Importar / Exportar.</p>
          <textarea rows="7" readOnly value={pieceText} />
          <div className="buttonRow compact"><button type="button" className="primaryButton" onClick={downloadPiece}>Descargar pieza</button><button type="button" className="secondaryButton" onClick={() => navigator.clipboard?.writeText(pieceText)}>Copiar</button></div>
        </div>}
      </form>
    </Modal>
  );
}

function PublicTreePage({ db }) {
  const [viewport, setViewport] = useState({ x: 24, y: 18, scale: 0.82 });
  const [contributionPersonId, setContributionPersonId] = useState(null);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const dragRef = useRef(null);
  const layout = useMemo(() => buildAllPeopleLayout(db), [db]);

  const setZoom = (nextScale) => setViewport((prev) => ({ ...prev, scale: clamp(nextScale, 0.45, 1.7) }));
  const openContribution = (personId = '') => {
    setContributionPersonId(personId);
    setShowContributionForm(true);
  };
  const onPointerDown = (event) => {
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: viewport.x, originY: viewport.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    setViewport((prev) => ({ ...prev, x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY }));
  };
  const onPointerUp = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  return (
    <main className="publicShell">
      <header className="publicHeader">
        <div><p className="eyebrow">Árbol público</p><h1>{db.settings.treeName}</h1><p>{db.people.length} personas publicadas · solo lectura</p></div>
        <div className="topbarActions"><button className="primaryButton puzzleButton" onClick={() => openContribution('')}>🧩 Aportar pieza</button></div>
      </header>
      <section className="treeWorkspace publicTreeWorkspace">
        <div className="treeToolbar">
          <div><p className="eyebrow">Vista pública</p><h2>Árbol familiar</h2><p>Hacé click en una persona para aportar una pieza sobre esa ficha.</p></div>
          <div className="zoomControls">
            <button className="iconButton" type="button" onClick={() => setZoom(viewport.scale - 0.12)} title="Alejar">-</button>
            <span>{Math.round(viewport.scale * 100)}%</span>
            <button className="iconButton" type="button" onClick={() => setZoom(viewport.scale + 0.12)} title="Acercar">+</button>
          </div>
        </div>
        <div className="treeCanvas publicCanvas" onWheel={(event) => { event.preventDefault(); setZoom(viewport.scale + (event.deltaY > 0 ? -0.08 : 0.08)); }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <div className="treePanLayer" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}>
            <div className="treeContent" style={{ width: layout.width, height: layout.height }}>
              <svg className="treeLines" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
                {layout.edges.map((edge) => {
                  const middleY = edge.from.y + (edge.to.y - edge.from.y) / 2;
                  return <path key={edge.id} d={`M ${edge.from.x} ${edge.from.y} C ${edge.from.x} ${middleY}, ${edge.to.x} ${middleY}, ${edge.to.x} ${edge.to.y}`} />;
                })}
              </svg>
              {layout.nodes.map((node) => <TreeCard key={node.key} person={node.person} label={allPeopleNodeLabel(node)} onOpen={openContribution} onFocus={openContribution} style={{ left: node.x, top: node.y }} />)}
            </div>
          </div>
        </div>
      </section>
      {showContributionForm && <PublicContributionForm db={db} initialPersonId={contributionPersonId || ''} onClose={() => setShowContributionForm(false)} />}
    </main>
  );
}

function TimelineView({ db, onOpenPerson }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const timeline = useMemo(() => buildGlobalTimeline(db), [db]);
  const eventTypes = useMemo(() => [...new Set(timeline.map((event) => event.type))].sort((a, b) => a.localeCompare(b, 'es')), [timeline]);
  const visibleEvents = typeFilter === 'all' ? timeline : timeline.filter((event) => event.type === typeFilter);
  const datedCount = timeline.filter((event) => Number.isFinite(event.sortRank)).length;

  return (
    <section className="contentPanel globalTimelinePanel">
      <div className="panelHeader timelineHeader">
        <div>
          <p className="eyebrow">{'Cronología familiar'}</p>
          <h2>{'Línea de tiempo'}</h2>
          <p>{ 'Eventos de todas las personas, ordenados por fecha conocida. Los eventos sin fecha quedan al final.' }</p>
        </div>
        <div className="timelineSummary">
          <strong>{timeline.length}</strong><span>eventos</span>
          <strong>{datedCount}</strong><span>con fecha</span>
        </div>
      </div>
      <div className="timelineFilters">
        <label>Tipo<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">Todos</option>{eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
      </div>
      {visibleEvents.length ? <ol className="globalTimelineList">{visibleEvents.map((event) => <li key={`${event.person.id}_${event.id}`} className="globalTimelineItem">
        <div className="globalTimelineDate">{event.date || 'Sin fecha'}</div>
        <div className="globalTimelineDot" />
        <article>
          <div className="globalTimelineTop"><span>{event.type}</span><button className="textButton" onClick={() => onOpenPerson(event.person.id)}>{displayName(event.person)}</button></div>
          {[event.place, event.description].filter(Boolean).length ? <p>{[event.place, event.description].filter(Boolean).join(' · ')}</p> : <p className="muted small">Sin lugar ni descripción.</p>}
        </article>
      </li>)}</ol> : <div className="softEmpty"><h3>No hay eventos para mostrar</h3><p>Agregá eventos desde la ficha de una persona para construir la cronología familiar.</p></div>}
    </section>
  );
}
function EventForm({ person, onClose, onSave }) {
  const [form, setForm] = useState({ type: 'Residencia', date: '', place: '', description: '' });
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  return <Modal title={`Nuevo evento · ${displayName(person)}`} onClose={onClose}><form className="formStack" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
    <div className="formGrid two"><label>Tipo<select value={form.type} onChange={set('type')}><option>Nacimiento</option><option>Bautismo</option><option>Residencia</option><option>Inmigración</option><option>Emigración</option><option>Matrimonio</option><option>Educación</option><option>Ocupación</option><option>Entierro</option><option>Otro</option></select></label><label>Fecha<input type="date" value={form.date} onChange={set('date')} /></label></div>
    <label>Lugar<input value={form.place} onChange={set('place')} /></label><label>Descripción<textarea rows="4" value={form.description} onChange={set('description')} /></label>
    <div className="modalActions"><button type="button" className="secondaryButton" onClick={onClose}>Cancelar</button><button className="primaryButton">Guardar evento</button></div>
  </form></Modal>;
}

function SourceForm({ onClose, onSave }) {
  const [form, setForm] = useState({ title: '', type: 'Acta', repository: '', url: '', notes: '' });
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  return <Modal title="Nueva fuente" onClose={onClose}><form className="formStack" onSubmit={(e) => { e.preventDefault(); if (form.title.trim()) onSave(form); }}>
    <div className="formGrid two"><label>Título<input autoFocus value={form.title} onChange={set('title')} /></label><label>Tipo<select value={form.type} onChange={set('type')}><option>Acta</option><option>Censo</option><option>Libro parroquial</option><option>Registro civil</option><option>Fotografía</option><option>Entrevista</option><option>Web</option><option>Otro</option></select></label></div>
    <label>Archivo / repositorio<input value={form.repository} onChange={set('repository')} placeholder="FamilySearch, archivo provincial, parroquia…" /></label><label>URL<input value={form.url} onChange={set('url')} /></label><label>Notas<textarea rows="4" value={form.notes} onChange={set('notes')} /></label>
    <div className="modalActions"><button type="button" className="secondaryButton" onClick={onClose}>Cancelar</button><button className="primaryButton">Guardar fuente</button></div>
  </form></Modal>;
}

function DetectivePanel({ suggestions, db, running, onRun, onAccept, onReject }) {
  const pending = suggestions.filter((suggestion) => suggestion.status === 'pending');
  const reviewed = suggestions.filter((suggestion) => suggestion.status !== 'pending');

  return (
    <section className="detectivePanel">
      <div className="panelHeader detectiveHeader">
        <div>
          <p className="eyebrow">Detective genealógico</p>
          <h2>Posibles hallazgos</h2>
          <p>Revisá cada sugerencia antes de tocar el árbol. Las hipótesis internas se marcan como baja confianza; las búsquedas online quedan citadas como pistas pendientes.</p>
        </div>
        <button className="primaryButton" onClick={onRun} disabled={running}>{running ? 'Investigando…' : 'Activar detective'}</button>
      </div>
      <div className="detectiveSummary">
        <span><strong>{pending.length}</strong> pendientes</span>
        <span><strong>{reviewed.filter((item) => item.status === 'accepted').length}</strong> aceptadas</span>
        <span><strong>{reviewed.filter((item) => item.status === 'rejected').length}</strong> rechazadas</span>
      </div>
      {suggestions.length ? <div className="detectiveList">
        {suggestions.map((suggestion) => <article key={suggestion.id} className={`detectiveSuggestion ${suggestion.status}`}>
          <div className="suggestionTop">
            <span className="sourceType">{suggestion.confidence}</span>
            <span className={`suggestionStatus ${suggestion.status}`}>{suggestion.status === 'pending' ? 'Pendiente' : suggestion.status === 'accepted' ? 'Aceptada' : 'Rechazada'}</span>
          </div>
          <h3>{suggestion.title}</h3>
          <p>{suggestion.summary}</p>
          <div className="suggestionSource">
            <strong>Fuente:</strong> {suggestion.source?.title || 'Sin título'} · {suggestion.source?.type || 'Sin tipo'}
            {suggestion.source?.url && <a href={suggestion.source.url} target="_blank" rel="noreferrer">Abrir búsqueda ↗</a>}
            {suggestion.source?.notes && <small>{suggestion.source.notes}</small>}
          </div>
          <ul className="suggestionChanges">
            {(suggestion.proposedChanges || []).map((change, index) => <li key={`${suggestion.id}_${index}`}>{describeSuggestionChange(change, db)}</li>)}
          </ul>
          {suggestion.status === 'pending' && <div className="buttonRow compact">
            <button className="primaryButton" onClick={() => onAccept(suggestion.id)}>Aceptar</button>
            <button className="secondaryButton" onClick={() => onReject(suggestion.id)}>Rechazar</button>
          </div>}
        </article>)}
      </div> : <div className="softEmpty"><h3>Sin sugerencias todavía</h3><p>Activá el detective para generar hipótesis, búsquedas y fuentes candidatas a partir del árbol vigente.</p></div>}
    </section>
  );
}

function PuzzleSuggestionsPanel({ suggestions, db, onAccept, onReject }) {
  const pending = suggestions.filter((suggestion) => suggestion.status === 'pending');
  if (!suggestions.length) return null;
  return (
    <section className="detectivePanel puzzlePanel">
      <div className="panelHeader detectiveHeader">
        <div>
          <p className="eyebrow">Piezas recibidas</p>
          <h2>Aportes del árbol público</h2>
          <p>Revisá cada pieza antes de incorporarla. Podés aceptar una edición de ficha o una persona nueva con vínculo sugerido.</p>
        </div>
        <div className="timelineSummary"><strong>{pending.length}</strong><span>pendientes</span></div>
      </div>
      <div className="detectiveList">
        {suggestions.map((suggestion) => {
          const person = db.people.find((item) => item.id === suggestion.personId);
          const related = db.people.find((item) => item.id === suggestion.relation?.personId);
          return <article key={suggestion.id} className={`detectiveSuggestion ${suggestion.status}`}>
            <div className="suggestionTop"><span className="sourceType">🧩 Pieza</span><span className={`suggestionStatus ${suggestion.status}`}>{suggestion.status === 'pending' ? 'Pendiente' : suggestion.status === 'accepted' ? 'Aceptada' : 'Rechazada'}</span></div>
            <h3>{suggestion.kind === 'edit_person' ? `Editar ${displayName(person)}` : `Agregar ${displayName(suggestion.person)}`}</h3>
            <p>{suggestion.contributor ? `Aporte de ${suggestion.contributor}.` : 'Aporte anónimo.'}</p>
            <div className="suggestionSource">
              <strong>Fuente / explicación:</strong>
              <small>{suggestion.person?.notes || 'Sin fuente indicada.'}</small>
            </div>
            <ul className="suggestionChanges">
              {suggestion.kind === 'edit_person' && <li>Actualizar datos públicos de {displayName(person)} con la información propuesta.</li>}
              {suggestion.kind === 'add_person' && <li>Agregar persona: {displayName(suggestion.person)}.</li>}
              {suggestion.kind === 'add_person' && suggestion.relation?.kind && related && <li>Vincular con {displayName(related)} como {suggestion.relation.kind === 'parent_of' ? 'padre/madre de esa persona' : suggestion.relation.kind === 'child_of' ? 'hijo/a de esa persona' : 'pareja'}.</li>}
            </ul>
            {suggestion.status === 'pending' && <div className="buttonRow compact"><button className="primaryButton" onClick={() => onAccept(suggestion.id)}>Aceptar pieza</button><button className="secondaryButton" onClick={() => onReject(suggestion.id)}>Rechazar</button></div>}
          </article>;
        })}
      </div>
    </section>
  );
}

export default function GenealogyApp() {
  const [db, setDb] = useState(emptyDatabase);
  const [publicDb, setPublicDb] = useState(null);
  const [publicLoadError, setPublicLoadError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [section, setSection] = useState('tree');
  const [selectedId, setSelectedId] = useState(null);
  const [focusedId, setFocusedId] = useState(null);
  const [drawerPersonId, setDrawerPersonId] = useState(null);
  const [drawerMode, setDrawerMode] = useState('view');
  const [personModal, setPersonModal] = useState(null);
  const [eventModal, setEventModal] = useState(false);
  const [sourceModal, setSourceModal] = useState(false);
  const [query, setQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [detectiveRunning, setDetectiveRunning] = useState(false);
  const [publicTreeUrl, setPublicTreeUrl] = useState('');
  const importRef = useRef(null);
  const gedcomRef = useRef(null);
  const pieceImportRef = useRef(null);

  useEffect(() => {
    try {
      if (window.location.hash.startsWith(PUBLIC_TREE_HASH_PREFIX)) {
        const payload = window.location.hash.slice(PUBLIC_TREE_HASH_PREFIX.length);
        setPublicDb(normalizeDatabase(decodeSharePayload(payload)));
        setHydrated(true);
        return;
      }
      setDarkMode(localStorage.getItem(THEME_STORAGE_KEY) === 'dark');
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? normalizeDatabase(JSON.parse(saved)) : defaultDatabase();
      const nextDb = parsed.people.length ? parsed : defaultDatabase();
      setDb(nextDb);
      setSelectedId(nextDb.settings.rootPersonId || nextDb.people[0]?.id || null);
      setFocusedId(nextDb.settings.rootPersonId || nextDb.people[0]?.id || null);
    } catch {
      if (window.location.hash.startsWith(PUBLIC_TREE_HASH_PREFIX)) setPublicLoadError('No pude abrir este enlace público. Puede estar incompleto o dañado.');
      else setDb(defaultDatabase());
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || publicDb) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }, [db, hydrated, publicDb]);

  useEffect(() => {
    if (!hydrated || publicDb) return;
    localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode, hydrated, publicDb]);

  const selected = db.people.find((p) => p.id === selectedId) || null;
  const filteredPeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...db.people].sort((a, b) => displayName(a).localeCompare(displayName(b), 'es'));
    return db.people.filter((p) => [p.givenNames, p.nickname, p.surnames, p.email, p.birthPlace, p.occupation].join(' ').toLowerCase().includes(q));
  }, [db.people, query]);

  const updateDb = (fn) => setDb((prev) => normalizeDatabase(fn(prev)));

  const savePerson = (form) => {
    const now = new Date().toISOString();
    const person = { id: newId('person'), ...form, createdAt: now, updatedAt: now };
    updateDb((prev) => ({ ...prev, people: [...prev.people, person], settings: { ...prev.settings, rootPersonId: prev.settings.rootPersonId || person.id } }));
    setSelectedId(person.id);
    setFocusedId((id) => id || person.id);
    setDrawerPersonId(person.id);
    setDrawerMode('view');
    setPersonModal(null);
  };

  const saveExistingPerson = (personId, form) => {
    const now = new Date().toISOString();
    updateDb((prev) => ({ ...prev, people: prev.people.map((p) => p.id === personId ? { ...p, ...form, id: p.id, createdAt: p.createdAt, updatedAt: now } : p) }));
    setSelectedId(personId);
    setDrawerPersonId(personId);
    setDrawerMode('view');
  };

  const openPersonDrawer = (id, mode = 'view') => {
    setSelectedId(id);
    setDrawerPersonId(id);
    setDrawerMode(mode);
  };

  const linkPerson = (kind, otherId) => {
    if (!selected || otherId === selected.id) return;
    if (kind === 'parent') {
      if (db.parentChild.some((r) => r.parentId === otherId && r.childId === selected.id)) return;
      updateDb((prev) => ({ ...prev, parentChild: [...prev.parentChild, { id: newId('pc'), parentId: otherId, childId: selected.id }] }));
    } else if (kind === 'child') {
      if (db.parentChild.some((r) => r.parentId === selected.id && r.childId === otherId)) return;
      updateDb((prev) => ({ ...prev, parentChild: [...prev.parentChild, { id: newId('pc'), parentId: selected.id, childId: otherId }] }));
    } else if (kind === 'partner') {
      if (db.partnerships.some((r) => [r.personAId, r.personBId].includes(selected.id) && [r.personAId, r.personBId].includes(otherId))) return;
      updateDb((prev) => ({ ...prev, partnerships: [...prev.partnerships, { id: newId('partner'), personAId: selected.id, personBId: otherId, status: '' }] }));
    }
  };

  const deleteSelected = () => {
    if (!selected || !confirm(`¿Eliminar a ${displayName(selected)}? También se eliminarán sus vínculos y eventos.`)) return;
    const id = selected.id;
    updateDb((prev) => ({
      ...prev,
      people: prev.people.filter((p) => p.id !== id),
      parentChild: prev.parentChild.filter((r) => r.parentId !== id && r.childId !== id),
      partnerships: prev.partnerships.filter((r) => r.personAId !== id && r.personBId !== id),
      events: prev.events.filter((e) => e.personId !== id),
      citations: prev.citations.filter((c) => c.personId !== id),
      settings: { ...prev.settings, rootPersonId: prev.settings.rootPersonId === id ? null : prev.settings.rootPersonId }
    }));
    const next = db.people.find((p) => p.id !== id)?.id || null;
    setSelectedId(next);
    setDrawerPersonId(null);
    setDrawerMode('view');
    if (focusedId === id) setFocusedId(next);
  };

  const openInTree = (id) => {
    setFocusedId(id);
    setSelectedId(id);
    setSection('tree');
  };

  const addEvent = (form) => {
    if (!selected) return;
    updateDb((prev) => ({ ...prev, events: [...prev.events, { id: newId('event'), personId: selected.id, ...form }] }));
    setEventModal(false);
  };

  const runDetective = async () => {
    setDetectiveRunning(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    updateDb((prev) => {
      const suggestions = createDetectiveSuggestions(prev);
      return {
        ...prev,
        detectiveSuggestions: [...(prev.detectiveSuggestions || []), ...suggestions]
      };
    });
    setDetectiveRunning(false);
  };

  const updateDetectiveSuggestionStatus = (suggestionId, status) => {
    updateDb((prev) => ({
      ...prev,
      detectiveSuggestions: (prev.detectiveSuggestions || []).map((suggestion) => suggestion.id === suggestionId ? { ...suggestion, status, reviewedAt: new Date().toISOString() } : suggestion)
    }));
  };

  const acceptDetectiveSuggestion = (suggestionId) => {
    updateDb((prev) => {
      const suggestion = (prev.detectiveSuggestions || []).find((item) => item.id === suggestionId);
      if (!suggestion || suggestion.status !== 'pending') return prev;
      const sourceId = newId('source');
      let next = {
        ...prev,
        sources: [...prev.sources, {
          id: sourceId,
          title: suggestion.source?.title || suggestion.title,
          type: suggestion.source?.type || 'DETECTIVE',
          repository: suggestion.source?.url || '',
          url: suggestion.source?.url || '',
          notes: suggestion.source?.notes || suggestion.summary || ''
        }]
      };
      (suggestion.proposedChanges || []).forEach((change) => {
        if (change.type === 'add_parent_child' && !next.parentChild.some((rel) => rel.parentId === change.parentId && rel.childId === change.childId)) {
          next = { ...next, parentChild: [...next.parentChild, { id: newId('pc'), parentId: change.parentId, childId: change.childId, sourceId, notes: suggestion.summary }] };
        }
      });
      return {
        ...next,
        detectiveSuggestions: (next.detectiveSuggestions || []).map((item) => item.id === suggestionId ? { ...item, status: 'accepted', reviewedAt: new Date().toISOString(), appliedSourceId: sourceId } : item)
      };
    });
  };

  const importJson = async (file) => {
    try {
      const parsed = normalizeDatabase(JSON.parse(await file.text()));
      if (!confirm('Esto reemplazará los datos actuales de este navegador. ¿Continuar?')) return;
      setDb(parsed);
      setSelectedId(parsed.people[0]?.id || null);
      setFocusedId(parsed.settings.rootPersonId || parsed.people[0]?.id || null);
    } catch {
      alert('No pude leer ese backup JSON.');
    }
  };

  const importGed = async (file) => {
    try {
      const imported = importGedcom(await file.text());
      if (!imported.people.length) throw new Error('No people');
      if (!confirm(`Se importarán ${imported.people.length} personas y se reemplazarán los datos actuales. ¿Continuar?`)) return;
      const next = { ...emptyDatabase(), ...imported, settings: { ...emptyDatabase().settings, rootPersonId: imported.people[0]?.id || null } };
      setDb(next);
      setSelectedId(imported.people[0]?.id || null);
      setFocusedId(imported.people[0]?.id || null);
    } catch {
      alert('No pude interpretar ese GEDCOM. Esta versión soporta el núcleo GEDCOM 5.5/5.5.1.');
    }
  };

  const publishTree = async () => {
    const url = makePublicTreeUrl(db);
    setPublicTreeUrl(url);
    try {
      await navigator.clipboard?.writeText(url);
    } catch {
      // Clipboard may be unavailable; the URL remains visible for manual copy.
    }
  };

  const importPuzzlePiece = async (file) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || !parsed.id || !parsed.kind || !parsed.person) throw new Error('Invalid piece');
      updateDb((prev) => {
        const exists = (prev.puzzleSuggestions || []).some((item) => item.id === parsed.id);
        return exists ? prev : { ...prev, puzzleSuggestions: [...(prev.puzzleSuggestions || []), { ...parsed, status: parsed.status || 'pending' }] };
      });
    } catch {
      alert('No pude leer esa pieza. Verificá que sea un JSON generado desde el árbol público.');
    }
  };

  const rejectPuzzleSuggestion = (suggestionId) => {
    updateDb((prev) => ({ ...prev, puzzleSuggestions: (prev.puzzleSuggestions || []).map((item) => item.id === suggestionId ? { ...item, status: 'rejected', reviewedAt: new Date().toISOString() } : item) }));
  };

  const acceptPuzzleSuggestion = (suggestionId) => {
    updateDb((prev) => {
      const suggestion = (prev.puzzleSuggestions || []).find((item) => item.id === suggestionId);
      if (!suggestion || suggestion.status !== 'pending') return prev;
      let next = { ...prev };
      if (suggestion.kind === 'edit_person') {
        next = { ...next, people: next.people.map((person) => person.id === suggestion.personId ? { ...person, ...suggestion.person, id: person.id, updatedAt: new Date().toISOString() } : person) };
      } else if (suggestion.kind === 'add_person') {
        const personId = newId('person');
        const person = { id: personId, ...suggestion.person, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        next = { ...next, people: [...next.people, person] };
        if (suggestion.relation?.kind && suggestion.relation?.personId) {
          if (suggestion.relation.kind === 'parent_of') next = { ...next, parentChild: [...next.parentChild, { id: newId('pc'), parentId: personId, childId: suggestion.relation.personId, notes: 'Aporte público de pieza de rompecabezas.' }] };
          if (suggestion.relation.kind === 'child_of') next = { ...next, parentChild: [...next.parentChild, { id: newId('pc'), parentId: suggestion.relation.personId, childId: personId, notes: 'Aporte público de pieza de rompecabezas.' }] };
          if (suggestion.relation.kind === 'partner_of') next = { ...next, partnerships: [...next.partnerships, { id: newId('partner'), personAId: personId, personBId: suggestion.relation.personId, status: 'Sugerido por aporte público' }] };
        }
      }
      return { ...next, puzzleSuggestions: (next.puzzleSuggestions || []).map((item) => item.id === suggestionId ? { ...item, status: 'accepted', reviewedAt: new Date().toISOString() } : item) };
    });
  };

  if (!hydrated) return <main className="loading"><img className="loadingLogo" src="/raices-logo.png" alt="" /><span>Abriendo tu árbol…</span></main>;
  if (publicLoadError) return <main className="loading"><img className="loadingLogo" src="/raices-logo.png" alt="" /><span>{publicLoadError}</span></main>;
  if (publicDb) return <PublicTreePage db={publicDb} />;

  return (
    <main className={`appShell ${darkMode ? 'darkMode' : ''}`}>
      <aside className="sidebar">
        <div className="brand"><div className="brandMark"><img src="/raices-logo.png" alt="" /></div><div><strong>Raíces</strong><span>Genealogía web</span></div></div>
        <nav>{sections.map(([id, label, icon]) => <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}><span>{icon}</span>{label}</button>)}</nav>
        <div className="sidebarBottom"><div className="privacy"><span>●</span><div><strong>Privado por defecto</strong><small>Los datos quedan en este navegador.</small></div></div></div>
      </aside>

      <section className="mainArea">
        <header className="topbar">
          <div><p className="eyebrow">{db.settings.treeName}</p><h1>{section === 'tree' ? 'Árbol familiar' : section === 'people' ? 'Personas' : section === 'timeline' ? 'Línea de tiempo' : section === 'sources' ? 'Fuentes documentales' : 'Tus datos'}</h1></div>
          <div className="topbarActions">
            <button className={`secondaryButton ${darkMode ? 'activeToggle' : ''}`} type="button" onClick={() => setDarkMode((value) => !value)}>{darkMode ? 'Modo claro' : 'Dark mode'}</button>
            <button className="primaryButton" onClick={() => setPersonModal({ mode: 'new' })}>+ Nueva persona</button>
          </div>
        </header>

        <div className="statsBar"><Stat value={db.people.length} label="personas" /><Stat value={db.parentChild.length + db.partnerships.length} label="vínculos" /><Stat value={db.events.length} label="eventos" /><Stat value={db.sources.length} label="fuentes" /></div>

        {section === 'tree' && <TreeView db={db} focusedId={focusedId} setFocusedId={(id) => { setFocusedId(id); setSelectedId(id); }} onOpenPerson={(id) => openPersonDrawer(id, 'view')} onAdd={() => setPersonModal({ mode: 'new' })} />}

        {section === 'timeline' && <TimelineView db={db} onOpenPerson={(id) => { setSelectedId(id); setFocusedId(id); setSection('people'); }} />}

        {section === 'people' && <div className="peopleLayout peopleListOnly">
          <section className="peoplePane">
            <div className="paneToolbar"><input className="searchInput" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, apodo, apellido, lugar…" /><span>{filteredPeople.length} resultados</span></div>
            {db.people.length === 0 ? <EmptyState onAdd={() => setPersonModal({ mode: 'new' })} /> : <div className="personList">{filteredPeople.map((person) => <button key={person.id} className={`personRow ${personStatusClass(person)} ${selectedId === person.id ? 'selected' : ''}`} onClick={() => openPersonDrawer(person.id, 'view')}><PersonAvatar person={person} /><div><strong>{displayName(person)}</strong><span>{[person.birthDate, person.birthPlace].filter(Boolean).join(' · ') || 'Datos biográficos pendientes'}</span></div><span className="chevron">›</span></button>)}</div>}
          </section>
        </div>}

        {section === 'sources' && <section className="contentPanel">
          <div className="panelHeader"><div><p className="eyebrow">Evidencia</p><h2>Fuentes y documentos</h2><p>Registrá de dónde sale cada dato antes de sacar conclusiones.</p></div><button className="primaryButton" onClick={() => setSourceModal(true)}>+ Nueva fuente</button></div>
          {db.sources.length ? <div className="sourceGrid">{db.sources.map((source) => <article key={source.id} className="sourceCard"><span className="sourceType">{source.type}</span><h3>{source.title}</h3><p>{source.repository || 'Repositorio no indicado'}</p>{source.url && <a href={source.url} target="_blank" rel="noreferrer">Abrir referencia ↗</a>}<small>{source.notes}</small></article>)}</div> : <div className="softEmpty"><h3>Todavía no cargaste fuentes</h3><p>Podés registrar actas, censos, libros parroquiales, fotografías, entrevistas y páginas web.</p></div>}
        </section>}

        {section === 'data' && <section className="contentPanel dataPanel">
          <div className="panelHeader"><div><p className="eyebrow">Portabilidad</p><h2>Importar, exportar y respaldar</h2><p>No quedás encerrado en la aplicación: tus datos pueden salir en JSON o GEDCOM.</p></div></div>
          <div className="dataGrid">
            <article className="dataCard"><div className="dataIcon">{`{ }`}</div><h3>Backup completo JSON</h3><p>Guarda personas, vínculos, eventos, fuentes y configuración.</p><div className="buttonRow"><button className="secondaryButton" onClick={() => downloadText('raices-backup.json', JSON.stringify(db, null, 2), 'application/json')}>Exportar JSON</button><button className="textButton" onClick={() => importRef.current?.click()}>Importar</button></div><input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} /></article>
            <article className="dataCard"><div className="dataIcon">GED</div><h3>GEDCOM 5.5.1</h3><p>Intercambio básico con otras aplicaciones genealógicas.</p><div className="buttonRow"><button className="secondaryButton" onClick={() => downloadText('raices.ged', exportGedcom(db), 'text/plain')}>Exportar GEDCOM</button><button className="textButton" onClick={() => gedcomRef.current?.click()}>Importar</button></div><input ref={gedcomRef} hidden type="file" accept=".ged,text/plain" onChange={(e) => e.target.files?.[0] && importGed(e.target.files[0])} /></article>
            <article className="dataCard"><div className="dataIcon">PDF</div><h3>Exportar como PDF</h3><p>Descarga un PDF del lienzo del árbol. Para respetar filtros, escala temporal y fondo, usá también el botón PDF dentro del lienzo.</p><div className="buttonRow"><button className="secondaryButton" onClick={() => exportPdf(db)}>Exportar PDF</button></div></article>
            <article className="dataCard publishCard"><div className="dataIcon puzzleIcon">🧩</div><h3>Publicar árbol</h3><p>Genera un enlace público de solo lectura con nombres, relaciones, fechas y lugares. Quien lo vea puede aportar una pieza del rompecabezas familiar.</p><div className="buttonRow"><button className="secondaryButton" onClick={publishTree}>Generar enlace</button></div>{publicTreeUrl && <div className="shareBox"><input readOnly value={publicTreeUrl} onFocus={(event) => event.target.select()} /><small>El enlace se copió al portapapeles si el navegador lo permitió.</small></div>}</article>
            <article className="dataCard accent"><div className="dataIcon">☁</div><h3>Siguiente paso: sincronización</h3><p>La arquitectura está preparada para reemplazar el almacenamiento del navegador por Postgres/Supabase cuando quieras usar el mismo árbol desde distintos dispositivos.</p></article>
            <article className="dataCard detectiveCard"><div className="dataIcon detectiveIcon">🕵</div><h3>Activar detective</h3><p>Analiza el árbol vigente, genera hipótesis, arma búsquedas en actas/censos/registros y deja sugerencias aceptables o rechazables con fuente citada.</p><div className="buttonRow"><button className="secondaryButton" onClick={runDetective} disabled={detectiveRunning}>{detectiveRunning ? 'Investigando…' : 'Activar detective'}</button></div></article>
            <article className="dataCard puzzleCard"><div className="dataIcon puzzleIcon">🧩</div><h3>Importar pieza</h3><p>Importa una sugerencia enviada desde el árbol público para revisarla antes de actualizar tu árbol.</p><div className="buttonRow"><button className="secondaryButton" onClick={() => pieceImportRef.current?.click()}>Importar pieza</button></div><input ref={pieceImportRef} hidden type="file" accept="application/json,.json" onChange={(e) => e.target.files?.[0] && importPuzzlePiece(e.target.files[0])} /></article>
          </div>
          <PuzzleSuggestionsPanel suggestions={db.puzzleSuggestions || []} db={db} onAccept={acceptPuzzleSuggestion} onReject={rejectPuzzleSuggestion} />
          <DetectivePanel suggestions={db.detectiveSuggestions || []} db={db} running={detectiveRunning} onRun={runDetective} onAccept={acceptDetectiveSuggestion} onReject={(id) => updateDetectiveSuggestionStatus(id, 'rejected')} />
          <div className="warningBox"><strong>Importante sobre esta versión:</strong> al estar pensada como MVP web sin cuenta ni servidor de base de datos, los datos se guardan en <code>localStorage</code> del navegador. Hacé backups JSON periódicos. Si borrás los datos del navegador, también se borra el árbol local.</div>
        </section>}
      </section>

      {drawerPersonId && <PersonDrawer db={db} person={db.people.find((p) => p.id === drawerPersonId)} mode={drawerMode} onModeChange={setDrawerMode} onClose={() => { setDrawerPersonId(null); setDrawerMode('view'); }} onSave={saveExistingPerson} onFocus={openInTree} onLink={linkPerson} onDelete={deleteSelected} onAddEvent={() => setEventModal(true)} />}
      {personModal && <Modal title="Nueva persona" onClose={() => setPersonModal(null)}><PersonForm initial={personModal.person} onCancel={() => setPersonModal(null)} onSave={savePerson} /></Modal>}
      {eventModal && selected && <EventForm person={selected} onClose={() => setEventModal(false)} onSave={addEvent} />}
      {sourceModal && <SourceForm onClose={() => setSourceModal(false)} onSave={(source) => { updateDb((prev) => ({ ...prev, sources: [...prev.sources, { id: newId('source'), ...source }] })); setSourceModal(false); }} />}
    </main>
  );
}
