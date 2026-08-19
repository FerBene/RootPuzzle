'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { CirclePause, CirclePlay, Globe2, LocateFixed, Minus, Plus, RotateCcw, UserRound } from 'lucide-react';
import { feature, mesh } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import { displayName } from '@/lib/model';

const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 500;
const worldProjection = geoNaturalEarth1().fitSize([WORLD_WIDTH, WORLD_HEIGHT], { type: 'Sphere' });
const worldPath = geoPath(worldProjection);
const worldCountries = feature(worldAtlas, worldAtlas.objects.countries).features;
const worldBorders = mesh(worldAtlas, worldAtlas.objects.countries, (a, b) => a !== b);

const yearFrom = (person) => {
  const direct = Number(person?.birthYear);
  if (Number.isInteger(direct) && direct > 0) return direct;
  const match = String(person?.birthDate || '').match(/(?:^|\D)(\d{3,4})(?:\D|$)/);
  return match ? Number(match[1]) : null;
};

const project = (latitude, longitude) => ({
  x: worldProjection([Number(longitude), Number(latitude)])[0],
  y: worldProjection([Number(longitude), Number(latitude)])[1]
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
    <path className="familyMapSphere" d={worldPath({ type: 'Sphere' })} aria-hidden="true" />
    <g className="familyMapLand" aria-hidden="true">
      {worldCountries.map((country, index) => <path d={worldPath(country)} key={country.id || index} />)}
    </g>
    <path className="familyMapBorders" d={worldPath(worldBorders)} aria-hidden="true" />
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

function BirthLocationPopover({ location, mapViewport, onClose, onViewInTree }) {
  if (!location) return null;
  const point = project(location.latitude, location.longitude);
  const left = Math.min(79, Math.max(2, ((point.x * mapViewport.scale + mapViewport.x) / WORLD_WIDTH) * 100 - 4));
  const top = Math.min(70, Math.max(5, ((point.y * mapViewport.scale + mapViewport.y) / WORLD_HEIGHT) * 100 - 5));
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
  const [mapViewport, setMapViewport] = useState({ x: 0, y: 0, scale: 1 });
  const mapGestureRef = useRef(null);
  const mapSvgRef = useRef(null);
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
  const mapPointFromEvent = (event) => {
    const rect = mapSvgRef.current?.getBoundingClientRect();
    if (!rect) return { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
    return { x: ((event.clientX - rect.left) / rect.width) * WORLD_WIDTH, y: ((event.clientY - rect.top) / rect.height) * WORLD_HEIGHT };
  };
  const zoomMapAt = (nextScale, focalPoint = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }) => {
    const scale = Math.min(5, Math.max(.75, nextScale));
    setMapViewport((previous) => {
      const worldX = (focalPoint.x - previous.x) / previous.scale;
      const worldY = (focalPoint.y - previous.y) / previous.scale;
      return { scale, x: focalPoint.x - worldX * scale, y: focalPoint.y - worldY * scale };
    });
  };
  const onMapWheel = (event) => {
    event.preventDefault();
    zoomMapAt(mapViewport.scale * (event.deltaY > 0 ? .9 : 1.1), mapPointFromEvent(event));
  };
  const onMapPointerDown = (event) => {
    const point = mapPointFromEvent(event);
    if (!mapGestureRef.current) mapGestureRef.current = { pointers: new Map(), moved: false };
    mapGestureRef.current.pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY, point });
    const pointerCount = mapGestureRef.current.pointers.size;
    const startedOnMarker = Boolean(event.target.closest?.('.familyMapMarker'));
    // Preserve a one-pointer marker click; capture when panning or pinch starts.
    if (!startedOnMarker || pointerCount >= 2) event.currentTarget.setPointerCapture?.(event.pointerId);
    if (pointerCount === 2) {
      const [a, b] = [...mapGestureRef.current.pointers.values()];
      mapGestureRef.current.pinch = { distance: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) || 1, center: { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }, viewport: mapViewport };
    } else {
      mapGestureRef.current.pan = { clientX: event.clientX, clientY: event.clientY, point, viewport: mapViewport };
    }
  };
  const onMapPointerMove = (event) => {
    const gesture = mapGestureRef.current;
    if (!gesture?.pointers.has(event.pointerId)) return;
    const pointer = gesture.pointers.get(event.pointerId);
    gesture.moved = gesture.moved || Math.hypot(event.clientX - pointer.clientX, event.clientY - pointer.clientY) > 3;
    pointer.clientX = event.clientX; pointer.clientY = event.clientY;
    if (gesture.pointers.size >= 2 && gesture.pinch) {
      const [a, b] = [...gesture.pointers.values()];
      const distance = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) || 1;
      const rect = mapSvgRef.current?.getBoundingClientRect();
      const center = { x: (((a.clientX + b.clientX) / 2 - (rect?.left || 0)) / (rect?.width || 1)) * WORLD_WIDTH, y: (((a.clientY + b.clientY) / 2 - (rect?.top || 0)) / (rect?.height || 1)) * WORLD_HEIGHT };
      const scale = Math.min(5, Math.max(.75, gesture.pinch.viewport.scale * distance / gesture.pinch.distance));
      const worldX = (center.x - gesture.pinch.viewport.x) / gesture.pinch.viewport.scale;
      const worldY = (center.y - gesture.pinch.viewport.y) / gesture.pinch.viewport.scale;
      setMapViewport({ scale, x: center.x - worldX * scale, y: center.y - worldY * scale });
    } else if (gesture.pan) {
      const rect = mapSvgRef.current?.getBoundingClientRect();
      const dx = ((event.clientX - gesture.pan.clientX) / (rect?.width || 1)) * WORLD_WIDTH;
      const dy = ((event.clientY - gesture.pan.clientY) / (rect?.height || 1)) * WORLD_HEIGHT;
      setMapViewport({ ...gesture.pan.viewport, x: gesture.pan.viewport.x + dx, y: gesture.pan.viewport.y + dy });
    }
  };
  const onMapPointerUp = (event) => {
    if (!mapGestureRef.current) return;
    mapGestureRef.current.pointers.delete(event.pointerId);
    if (mapGestureRef.current.pointers.size < 2) mapGestureRef.current.pinch = null;
    if (!mapGestureRef.current.pointers.size) mapGestureRef.current = null;
  };
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
    <>
      <div className={`familyMapCanvas ${!events.length ? 'empty' : ''}`} aria-label="Mapa mundial de nacimientos" onWheel={onMapWheel}>
        <svg ref={mapSvgRef} viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`} role="img" aria-label={`Mapa mundial de nacimientos${currentYear ? ` hasta ${currentYear}` : ''}`} onPointerDown={onMapPointerDown} onPointerMove={onMapPointerMove} onPointerUp={onMapPointerUp} onPointerCancel={onMapPointerUp}>
          <g transform={`translate(${mapViewport.x} ${mapViewport.y}) scale(${mapViewport.scale})`}><WorldBase /><FamilyMapMarkers locations={locations} currentYear={currentYear} selectedLocation={selectedLocation} onSelect={setSelectedLocation} /></g>
        </svg>
        <div className="familyMapZoomControls" aria-label="Controles del mapa">
          <button type="button" onClick={() => zoomMapAt(mapViewport.scale * 1.2)} title="Acercar" aria-label="Acercar"><Plus size={16} /></button>
          <button type="button" onClick={() => zoomMapAt(mapViewport.scale / 1.2)} title="Alejar" aria-label="Alejar"><Minus size={16} /></button>
          <button type="button" onClick={() => setMapViewport({ x: 0, y: 0, scale: 1 })} title="Recentrar mapa" aria-label="Recentrar mapa"><LocateFixed size={16} /></button>
        </div>
        {!events.length && <div className="familyMapEmptyOverlay"><Globe2 size={25} /><strong>{people.length ? 'Agregá años de nacimiento para recorrer el mapa' : 'Tu mapa familiar empieza acá'}</strong><span>{people.length ? 'El mapa mundial queda listo para ubicar las historias.' : 'Cuando agregues personas y lugares, aparecerán sus ubicaciones.'}</span></div>}
        {selectedLocation && <BirthLocationPopover location={selectedLocation} mapViewport={mapViewport} onClose={() => setSelectedLocation(null)} onViewInTree={onViewInTree} />}
        <div className="familyMapLegend"><span><i className="geolocatedDot" /> Ubicación confirmada</span><span><i className="pendingDot" /> Pendiente de confirmar: {currentPending}</span></div>
      </div>
      <FamilyTimeline years={years} currentIndex={currentIndex} isPlaying={isPlaying} onIndexChange={(index) => { setCurrentIndex(index); setIsPlaying(false); }} onTogglePlay={() => { if (!isPlaying && currentIndex >= years.length - 1) setCurrentIndex(0); setIsPlaying((value) => !value); }} onReset={() => { setCurrentIndex(0); setIsPlaying(false); setSelectedLocation(null); }} />
      {events.length > 0 && <div className="familyMapContext"><div><span className="eyebrow">En este año</span><h3>{currentYear}</h3></div><div className="familyMapContextList">{currentEvents.length ? currentEvents.map((event) => <button type="button" className={`familyMapContextItem ${event.verified ? '' : 'pending'}`} key={event.person.id} onClick={() => event.verified && setSelectedLocation(locations.find((location) => location.people.some((person) => person.id === event.person.id)) || null)}><span>{event.verified ? <Globe2 size={16} /> : <span className="pendingIcon">?</span>}</span><div><strong>{displayName(event.person)}</strong><small>{event.label}{!event.verified && ' · Ubicación pendiente de confirmar'}</small></div></button>) : <p className="muted">No hay nacimientos registrados en este año.</p>}</div></div>}
    </>
  </section>;
}
