'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CirclePause, CirclePlay, Globe2, RotateCcw, UserRound } from 'lucide-react';
import { displayName } from '@/lib/model';

const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 500;

const yearFrom = (person) => {
  const direct = Number(person?.birthYear);
  if (Number.isInteger(direct) && direct > 0) return direct;
  const match = String(person?.birthDate || '').match(/(?:^|\D)(\d{3,4})(?:\D|$)/);
  return match ? Number(match[1]) : null;
};

const project = (latitude, longitude) => ({
  x: ((Number(longitude) + 180) / 360) * WORLD_WIDTH,
  y: ((90 - Number(latitude)) / 180) * WORLD_HEIGHT
});

const safeCoordinates = (place) => {
  const latitude = Number(place?.latitude);
  const longitude = Number(place?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    ? { latitude, longitude }
    : null;
};

const placeLabel = (person, place) => {
  const label = [place?.name, place?.context].filter(Boolean).join(', ');
  return label || person.birthPlace || 'Lugar no especificado';
};

const branchOptionsFor = (people) => {
  const counts = new Map();
  people.forEach((person) => String(person.surnames || '').split(/\s+/).map((value) => value.trim()).filter((value) => value.length > 2).forEach((surname) => counts.set(surname, (counts.get(surname) || 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).slice(0, 4).map(([surname]) => ({ value: surname, label: `Rama ${surname}` }));
};

function WorldBase() {
  return <>
    <defs>
      <pattern id="familyMapGrid" width="100" height="50" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="1" /></pattern>
      <linearGradient id="familyMapOcean" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".08" /><stop offset="1" stopColor="currentColor" stopOpacity=".03" /></linearGradient>
    </defs>
    <rect width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="url(#familyMapOcean)" />
    <rect width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="url(#familyMapGrid)" />
    <g className="familyMapLand" aria-hidden="true">
      <path d="M86 91 119 64 173 59 218 84 254 122 245 164 215 183 205 224 178 249 154 224 129 219 113 184 79 164 57 128Z" />
      <path d="M267 276 299 287 325 324 331 371 309 419 288 459 269 438 276 394 256 354 265 319Z" />
      <path d="M438 87 479 60 537 67 572 91 601 101 625 139 606 164 572 154 550 176 516 157 482 173 454 148 423 136Z" />
      <path d="M558 190 595 184 626 205 663 200 706 226 750 234 782 274 771 303 731 298 699 319 665 305 627 315 599 290 574 277Z" />
      <path d="M787 88 821 71 869 82 901 112 888 145 855 154 830 132 796 132 777 111Z" />
      <path d="M861 373 894 363 932 381 941 413 915 441 878 433 856 405Z" />
      <path d="M500 181 520 190 515 208 494 206Z" />
    </g>
  </>;
}

function FamilyMapMarkers({ locations, currentYear, selectedLocation, onSelect }) {
  return <g className="familyMapMarkers" aria-label="Nacimientos ubicados en el mapa">
    {locations.map((location) => {
      const point = project(location.latitude, location.longitude);
      const current = location.currentPeople.some((person) => person.year === currentYear);
      const selected = selectedLocation?.key === location.key;
      return <g key={location.key} className={`familyMapMarker ${current ? 'current' : ''} ${selected ? 'selected' : ''}`} transform={`translate(${point.x} ${point.y})`} role="button" tabIndex="0" aria-label={`${location.label}: ${location.people.length} personas`} onClick={() => onSelect(location)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(location); } }}>
        {current && <circle className="familyMapMarkerPulse" r="15" />}
        <circle className="familyMapMarkerHalo" r={selected ? 13 : 10} />
        <circle className="familyMapMarkerDot" r={selected ? 7 : 5} />
        {location.people.length > 1 && <text className="familyMapMarkerCount" x="9" y="-8">{location.people.length}</text>}
      </g>;
    })}
  </g>;
}

function BirthLocationPopover({ location, onClose, onViewInTree }) {
  if (!location) return null;
  const point = project(location.latitude, location.longitude);
  const left = Math.min(79, Math.max(2, (point.x / WORLD_WIDTH) * 100 - 4));
  const top = Math.min(70, Math.max(5, (point.y / WORLD_HEIGHT) * 100 - 5));
  return <div className="familyMapPopover" style={{ left: `${left}%`, top: `${top}%` }}>
    <button className="familyMapPopoverClose" type="button" onClick={onClose} aria-label="Cerrar ubicación">×</button>
    <strong>{location.label}</strong>
    <span>{location.people.length} {location.people.length === 1 ? 'persona' : 'personas'}</span>
    <div className="familyMapPopoverPeople">
      {location.people.map((person) => <div className="familyMapPopoverPerson" key={person.id}>
        {person.profileImage ? <img src={person.profileImage} alt="" /> : <span className="familyMapAvatar"><UserRound size={14} /></span>}
        <div><b>{displayName(person)}</b><small>{person.year} · {person.birthPlace || location.label}</small></div>
        <button type="button" className="textButton compactTextButton" onClick={() => onViewInTree(person.id)}>Ver en el árbol</button>
      </div>)}
    </div>
  </div>;
}

function FamilyTimeline({ years, currentIndex, isPlaying, onIndexChange, onTogglePlay, onReset }) {
  const currentYear = years[currentIndex];
  return <section className="familyTimeline" aria-label="Línea de tiempo de nacimientos">
    <div className="familyTimelineHeader">
      <div><span className="eyebrow">Recorrido familiar</span><strong>{currentYear || '—'}</strong></div>
      <div className="familyTimelineActions">
        <button className="secondaryButton iconTextButton" type="button" onClick={onTogglePlay} disabled={!years.length} aria-label={isPlaying ? 'Pausar reproducción' : 'Reproducir nacimientos'}>{isPlaying ? <CirclePause size={16} /> : <CirclePlay size={16} />}<span>{isPlaying ? 'Pausa' : 'Play'}</span></button>
        <button className="secondaryButton iconTextButton" type="button" onClick={onReset} disabled={!years.length}><RotateCcw size={15} /><span>Reiniciar</span></button>
      </div>
    </div>
    <input className="familyTimelineSlider" type="range" min="0" max={Math.max(0, years.length - 1)} step="1" value={currentIndex} onChange={(event) => onIndexChange(Number(event.target.value))} disabled={!years.length} aria-label="Año seleccionado" />
    <div className="familyTimelineYears" aria-hidden="true">{years.map((year, index) => <button type="button" key={year} className={index === currentIndex ? 'active' : ''} onClick={() => onIndexChange(index)}>{year}</button>)}</div>
  </section>;
}

export default function FamilyMap({ people = [], places = [], onViewInTree }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [branchFilter, setBranchFilter] = useState('all');
  const placeById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);
  const branchOptions = useMemo(() => branchOptionsFor(people), [people]);
  const events = useMemo(() => people.map((person) => {
    const place = placeById.get(person.birthPlaceId);
    const coordinates = safeCoordinates(place);
    return { person, year: yearFrom(person), place, coordinates, label: placeLabel(person, place), verified: Boolean(coordinates) && place?.verified !== false };
  }).filter((event) => event.year && (branchFilter === 'all' || String(event.person.surnames || '').toLowerCase().includes(branchFilter.toLowerCase()))).sort((a, b) => a.year - b.year || displayName(a.person).localeCompare(displayName(b.person), 'es')), [people, placeById, branchFilter]);
  const years = useMemo(() => [...new Set(events.map((event) => event.year))], [events]);
  const currentYear = years[currentIndex] || null;
  const visibleEvents = useMemo(() => events.filter((event) => event.year <= currentYear), [events, currentYear]);
  const currentEvents = useMemo(() => events.filter((event) => event.year === currentYear), [events, currentYear]);
  const locations = useMemo(() => {
    const grouped = new Map();
    visibleEvents.filter((event) => event.verified).forEach((event) => {
      const key = `${event.coordinates.latitude.toFixed(3)}:${event.coordinates.longitude.toFixed(3)}`;
      const existing = grouped.get(key) || { key, latitude: event.coordinates.latitude, longitude: event.coordinates.longitude, label: event.label, people: [], currentPeople: [] };
      existing.people.push({ ...event.person, year: event.year, birthPlace: event.label });
      if (event.year === currentYear) existing.currentPeople.push({ ...event.person, year: event.year });
      grouped.set(key, existing);
    });
    return [...grouped.values()];
  }, [visibleEvents, currentYear]);
  const visiblePeople = visibleEvents.length;
  const pendingCount = visibleEvents.filter((event) => !event.verified).length;
  const currentPending = currentEvents.filter((event) => !event.verified).length;

  useEffect(() => {
    setCurrentIndex(0); setSelectedLocation(null); setIsPlaying(false);
  }, [branchFilter]);
  useEffect(() => {
    if (!isPlaying || !years.length) return undefined;
    const timer = window.setInterval(() => setCurrentIndex((index) => {
      if (index >= years.length - 1) { setIsPlaying(false); return index; }
      return index + 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, years.length]);
  useEffect(() => { if (currentIndex >= years.length && years.length) setCurrentIndex(years.length - 1); }, [currentIndex, years.length]);

  return <section className="familyMapPage">
    <header className="familyMapHeader">
      <div className="familyMapTitle"><span className="familyMapTitleIcon"><Globe2 size={25} /></span><div><p className="eyebrow">Exploración geográfica</p><h2>Mapa familiar</h2><p>Explora dónde comenzó cada historia familiar a través del tiempo.</p></div></div>
      <label className="familyMapFilter"><span>Rama familiar</span><select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}><option value="all">Todo el árbol</option>{branchOptions.map((branch) => <option value={branch.value} key={branch.value}>{branch.label}</option>)}</select></label>
    </header>
    <div className="familyMapStats" aria-label="Resumen del mapa"><div><span>Año</span><strong>{currentYear || '—'}</strong></div><div><span>Personas visibles</span><strong>{visiblePeople}</strong></div><div><span>Ubicaciones pendientes</span><strong>{pendingCount}</strong></div></div>
    {!events.length ? <div className="familyMapEmpty"><Globe2 size={30} /><h3>{people.length ? 'Todavía no hay nacimientos para recorrer' : 'Este árbol todavía no tiene personas'}</h3><p>{people.length ? 'Agregá años de nacimiento para construir la línea de tiempo familiar.' : 'Cuando agregues personas con fecha de nacimiento, aparecerán en este mapa.'}</p></div> : <>
      <div className="familyMapCanvas" aria-label="Mapa mundial de nacimientos">
        <svg viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`} role="img" aria-label={`Mapa de nacimientos hasta ${currentYear}`}><WorldBase /><FamilyMapMarkers locations={locations} currentYear={currentYear} selectedLocation={selectedLocation} onSelect={setSelectedLocation} /></svg>
        {selectedLocation && <BirthLocationPopover location={selectedLocation} onClose={() => setSelectedLocation(null)} onViewInTree={onViewInTree} />}
        <div className="familyMapLegend"><span><i className="geolocatedDot" /> Ubicación confirmada</span><span><i className="pendingDot" /> Pendiente de confirmar: {currentPending}</span></div>
      </div>
      <FamilyTimeline years={years} currentIndex={currentIndex} isPlaying={isPlaying} onIndexChange={(index) => { setCurrentIndex(index); setIsPlaying(false); }} onTogglePlay={() => { if (!isPlaying && currentIndex >= years.length - 1) setCurrentIndex(0); setIsPlaying((value) => !value); }} onReset={() => { setCurrentIndex(0); setIsPlaying(false); setSelectedLocation(null); }} />
      <div className="familyMapContext"><div><span className="eyebrow">En este año</span><h3>{currentYear}</h3></div><div className="familyMapContextList">{currentEvents.length ? currentEvents.map((event) => <button type="button" className={`familyMapContextItem ${event.verified ? '' : 'pending'}`} key={event.person.id} onClick={() => event.verified && setSelectedLocation(locations.find((location) => location.people.some((person) => person.id === event.person.id)) || null)}><span>{event.verified ? <Globe2 size={16} /> : <span className="pendingIcon">?</span>}</span><div><strong>{displayName(event.person)}</strong><small>{event.label}{!event.verified && ' · Ubicación pendiente de confirmar'}</small></div></button>) : <p className="muted">No hay nacimientos registrados en este año.</p>}</div></div>
    </>}
  </section>;
}
