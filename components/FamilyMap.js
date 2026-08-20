'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { CirclePause, CirclePlay, Globe2, LocateFixed, Minus, Plus, RotateCcw, UserRound } from 'lucide-react';
import { feature, mesh } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import { displayName } from '@/lib/model';

const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 500;
const MAP_MIN_SCALE = 0.75;
const MAP_MAX_SCALE = 24;
const MAP_CLUSTER_DISTANCE = 28;
const TIME_STEPS = [1, 5, 10];
const PLAYBACK_SPEEDS = { slow: 1200, normal: 800, fast: 500 };
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

const clampMapScale = (scale) => Math.min(MAP_MAX_SCALE, Math.max(MAP_MIN_SCALE, scale));
const viewportDifference = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.scale - b.scale);

const viewportForLocations = (locations) => {
  if (!locations.length) return { x: 0, y: 0, scale: 1 };
  const points = locations.map((location) => project(location.latitude, location.longitude));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = Math.max(150, maxX - minX);
  const height = Math.max(100, maxY - minY);
  const padding = 90;
  const scale = clampMapScale(Math.min((WORLD_WIDTH - padding * 2) / width, (WORLD_HEIGHT - padding * 2) / height));
  return { scale, x: WORLD_WIDTH / 2 - centerX * scale, y: WORLD_HEIGHT / 2 - centerY * scale };
};

const clusterLocationsForViewport = (locations, viewport) => {
  const clusters = [];
  locations.forEach((location) => {
    const point = project(location.latitude, location.longitude);
    const screenPoint = { x: point.x * viewport.scale + viewport.x, y: point.y * viewport.scale + viewport.y };
    const cluster = clusters.find((candidate) => Math.hypot(candidate.screenPoint.x - screenPoint.x, candidate.screenPoint.y - screenPoint.y) < MAP_CLUSTER_DISTANCE);
    if (!cluster) {
      clusters.push({ locations: [location], screenPoint });
      return;
    }
    cluster.locations.push(location);
    cluster.screenPoint = cluster.locations.reduce((sum, item) => {
      const projected = project(item.latitude, item.longitude);
      return { x: sum.x + projected.x * viewport.scale + viewport.x, y: sum.y + projected.y * viewport.scale + viewport.y };
    }, { x: 0, y: 0 });
    cluster.screenPoint.x /= cluster.locations.length;
    cluster.screenPoint.y /= cluster.locations.length;
  });
  return clusters.map((cluster) => {
    if (cluster.locations.length === 1) return cluster.locations[0];
    const people = cluster.locations.flatMap((location) => location.people);
    const currentPeople = cluster.locations.flatMap((location) => location.currentPeople);
    const labels = [...new Set(cluster.locations.map((location) => location.label))];
    const first = cluster.locations[0];
    return { ...first, key: `cluster:${cluster.locations.map((location) => location.key).join('|')}`, label: labels.length === 1 ? labels[0] : `${cluster.locations.length} ubicaciones cercanas`, people, currentPeople, isCluster: true };
  });
};

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

const placeCombiningMarksPattern = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');
const normalizedPlaceText = (value) => String(value || '').normalize('NFD').replace(placeCombiningMarksPattern, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const placeForPerson = (person, placeById, places) => {
  const byId = person?.birthPlaceId ? placeById.get(person.birthPlaceId) : null;
  if (byId) return byId;
  const birthPlace = normalizedPlaceText(person?.birthPlace);
  if (!birthPlace) return null;
  return places
    .map((place) => ({ place, name: normalizedPlaceText(place.name) }))
    .filter(({ name }) => name && (name === birthPlace || birthPlace.includes(name) || name.includes(birthPlace)))
    .sort((a, b) => b.name.length - a.name.length)[0]?.place || null;
};

const branchOptionsFor = (people) => {
  const counts = new Map();
  people.forEach((person) => String(person.surnames || '').split(/\s+/).map((value) => value.trim()).filter((value) => value.length > 2).forEach((surname) => counts.set(surname, (counts.get(surname) || 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).slice(0, 4).map(([surname, count]) => ({ value: surname, label: `Rama ${surname}`, count }));
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

function FamilyMapMarkers({ locations, currentEventIds, selectedLocation, onSelect, mapScale = 1 }) {
  return <g className="familyMapMarkers" aria-label="Nacimientos ubicados en el mapa">
    {locations.map((location) => {
      const point = project(location.latitude, location.longitude);
      const current = location.currentPeople.some((person) => currentEventIds.has(person.id));
      const selected = selectedLocation?.key === location.key;
      return <g key={location.key} className={`familyMapMarker ${location.isCluster ? 'cluster' : ''} ${current ? 'current' : ''} ${selected ? 'selected' : ''}`} transform={`translate(${point.x} ${point.y})`} role="button" tabIndex="0" aria-label={`${location.label}: ${location.people.length} personas`} onClick={() => onSelect(location)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(location); } }}>
        <g transform={`scale(${1 / mapScale})`}>
          <circle className="familyMapMarkerHitArea" r="22" />
          {current && <circle className="familyMapMarkerPulse" r="15" />}
          <circle className="familyMapMarkerHalo" r={selected ? 13 : 10} />
          <circle className="familyMapMarkerDot" r={selected ? 7 : 5} />
          {location.people.length > 1 && <text className="familyMapMarkerCount" x="9" y="-8">{location.people.length}</text>}
        </g>
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

function FamilyTimeline({ years, currentIndex, isPlaying, timeStep, playbackSpeed, onTimeStepChange, onPlaybackSpeedChange, onIndexChange, onTogglePlay, onReset }) {
  const currentYear = years[currentIndex];
  const speedLabel = playbackSpeed === 'slow' ? 'Lenta' : playbackSpeed === 'fast' ? 'Rápida' : 'Normal';
  return <section className="familyTimeline" aria-label="Línea de tiempo de nacimientos">
    <div className="familyTimelineHeader">
      <div><span className="eyebrow">Recorrido familiar</span><strong>{currentYear || '—'}</strong><small>{years.length ? `Paso de ${timeStep} ${timeStep === 1 ? 'año' : 'años'} · ${currentIndex + 1} de ${years.length}` : 'Sin años disponibles'}</small></div>
      <div className="familyTimelineActions">
        <button className="secondaryButton iconTextButton" type="button" onClick={onTogglePlay} disabled={!years.length} aria-label={isPlaying ? 'Pausar recorrido temporal' : 'Reproducir recorrido temporal'}>{isPlaying ? <CirclePause size={16} /> : <CirclePlay size={16} />}<span>{isPlaying ? 'Pausar' : currentIndex >= years.length - 1 ? 'Reproducir de nuevo' : 'Reproducir'}</span></button>
        <button className="secondaryButton iconTextButton" type="button" onClick={onReset} disabled={!years.length}><RotateCcw size={15} /><span>Reiniciar</span></button>
      </div>
    </div>
    <div className="familyTimelineControls">
      <label><span>Paso temporal</span><select value={timeStep} onChange={(event) => onTimeStepChange(Number(event.target.value))} disabled={!years.length}>{TIME_STEPS.map((step) => <option value={step} key={step}>Cada {step} {step === 1 ? 'año' : 'años'}</option>)}</select></label>
      <label><span>Velocidad</span><select value={playbackSpeed} onChange={(event) => onPlaybackSpeedChange(event.target.value)} disabled={!years.length}><option value="slow">Lenta</option><option value="normal">Normal</option><option value="fast">Rápida</option></select></label>
      <span className="familyTimelineSpeed" aria-label={`Velocidad ${speedLabel}`}>{PLAYBACK_SPEEDS[playbackSpeed] / 1000}s por paso</span>
    </div>
    <input className="familyTimelineSlider" type="range" min="0" max={Math.max(0, years.length - 1)} step="1" value={currentIndex} onChange={(event) => onIndexChange(Number(event.target.value))} disabled={!years.length} aria-label={`Año de corte, ${currentYear || 'sin año'}; muestra el acumulado hasta ese año`} aria-valuetext={currentYear ? `Hasta ${currentYear}` : 'Sin año disponible'} />
    <div className="familyTimelineYears" aria-hidden="true">{years.map((year, index) => <span key={year} className={index === currentIndex ? 'active' : ''}>{year}</span>)}</div>
  </section>;
}

export default function FamilyMap({ people = [], places = [], onViewInTree, activeTreeName = 'Mi árbol familiar', accessibleTrees = [], remoteTreeId = '', onChangeTree }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [branchFilter, setBranchFilter] = useState('all');
  const [timeStep, setTimeStep] = useState(10);
  const [playbackSpeed, setPlaybackSpeed] = useState('normal');
  const [mapViewport, setMapViewport] = useState({ x: 0, y: 0, scale: 1 });
  const mapGestureRef = useRef(null);
  const mapSvgRef = useRef(null);
  const mapViewportRef = useRef(mapViewport);
  const mapAnimationRef = useRef(null);
  const viewportInitializedRef = useRef(false);
  const placeById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);
  const branchOptions = useMemo(() => branchOptionsFor(people), [people]);
  const filteredPeople = useMemo(() => people.filter((person) => branchFilter === 'all' || String(person.surnames || '').toLowerCase().includes(branchFilter.toLowerCase())), [people, branchFilter]);
  const events = useMemo(() => filteredPeople.map((person) => {
    const place = placeForPerson(person, placeById, places);
    const coordinates = safeCoordinates(place);
    return { person, year: yearFrom(person), place, coordinates, label: placeLabel(person, place), verified: Boolean(coordinates) && place?.verified !== false };
  }).filter((event) => event.year).sort((a, b) => a.year - b.year || displayName(a.person).localeCompare(displayName(b.person), 'es')), [filteredPeople, placeById, places]);
  const years = useMemo(() => {
    if (!events.length) return [];
    const first = Math.floor(events[0].year / timeStep) * timeStep;
    const last = Math.ceil(events[events.length - 1].year / timeStep) * timeStep;
    return Array.from({ length: Math.floor((last - first) / timeStep) + 1 }, (_, index) => first + index * timeStep);
  }, [events, timeStep]);
  const currentYear = years[currentIndex] || null;
  const previousYear = currentIndex > 0 ? years[currentIndex - 1] : null;
  const visibleEvents = useMemo(() => events.filter((event) => event.year <= currentYear), [events, currentYear]);
  const currentEvents = useMemo(() => events.filter((event) => event.year <= currentYear && (!previousYear || event.year > previousYear)), [events, currentYear, previousYear]);
  const currentEventIds = useMemo(() => new Set(currentEvents.map((event) => event.person.id)), [currentEvents]);
  const locations = useMemo(() => {
    const grouped = new Map();
    visibleEvents.filter((event) => event.verified).forEach((event) => {
      const key = `${event.coordinates.latitude.toFixed(3)}:${event.coordinates.longitude.toFixed(3)}`;
      const existing = grouped.get(key) || { key, latitude: event.coordinates.latitude, longitude: event.coordinates.longitude, label: event.label, people: [], currentPeople: [] };
      existing.people.push({ ...event.person, year: event.year, birthPlace: event.label });
      if (currentEventIds.has(event.person.id)) existing.currentPeople.push({ ...event.person, year: event.year });
      grouped.set(key, existing);
    });
    return [...grouped.values()];
  }, [visibleEvents, currentEventIds]);
  const visiblePeople = visibleEvents.length;
  const pendingCount = visibleEvents.filter((event) => !event.verified).length;
  const locationsPendingInStep = currentEvents.filter((event) => !event.verified).length;
  const peopleWithoutYear = filteredPeople.filter((person) => !yearFrom(person)).length;
  const displayLocations = useMemo(() => clusterLocationsForViewport(locations, mapViewport), [locations, mapViewport]);

  useEffect(() => {
    setCurrentIndex(0); setSelectedLocation(null); setIsPlaying(false);
  }, [branchFilter]);
  useEffect(() => {
    setCurrentIndex(0); setSelectedLocation(null); setIsPlaying(false);
  }, [timeStep]);
  useEffect(() => { mapViewportRef.current = mapViewport; }, [mapViewport]);
  const stopViewportAnimation = () => {
    if (mapAnimationRef.current) window.cancelAnimationFrame(mapAnimationRef.current);
    mapAnimationRef.current = null;
  };
  const mapPointFromEvent = (event) => {
    const rect = mapSvgRef.current?.getBoundingClientRect();
    if (!rect) return { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
    return { x: ((event.clientX - rect.left) / rect.width) * WORLD_WIDTH, y: ((event.clientY - rect.top) / rect.height) * WORLD_HEIGHT };
  };
  const zoomMapAt = (nextScale, focalPoint = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }) => {
    stopViewportAnimation();
    const scale = clampMapScale(nextScale);
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
    stopViewportAnimation();
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
      const scale = clampMapScale(gesture.pinch.viewport.scale * distance / gesture.pinch.distance);
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
    let frameId;
    const startedAt = performance.now();
    const duration = PLAYBACK_SPEEDS[playbackSpeed];
    const tick = (now) => {
      if (now - startedAt >= duration) {
        setCurrentIndex((index) => {
          if (index >= years.length - 1) { setIsPlaying(false); return index; }
          return index + 1;
        });
        return;
      }
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying, currentIndex, years.length, playbackSpeed]);
  useEffect(() => { if (currentIndex >= years.length && years.length) setCurrentIndex(years.length - 1); }, [currentIndex, years.length]);
  useEffect(() => {
    const target = viewportForLocations(locations);
    const start = mapViewportRef.current;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    stopViewportAnimation();
    if (!viewportInitializedRef.current || reducedMotion || viewportDifference(start, target) < 0.5) {
      setMapViewport(target);
      viewportInitializedRef.current = true;
      return undefined;
    }
    const startedAt = performance.now();
    const duration = 560;
    const easeInOut = (value) => value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = easeInOut(progress);
      setMapViewport({
        x: start.x + (target.x - start.x) * eased,
        y: start.y + (target.y - start.y) * eased,
        scale: start.scale + (target.scale - start.scale) * eased
      });
      if (progress < 1) mapAnimationRef.current = window.requestAnimationFrame(tick);
      else mapAnimationRef.current = null;
    };
    mapAnimationRef.current = window.requestAnimationFrame(tick);
    return stopViewportAnimation;
  }, [locations]);

  return <section className="familyMapPage">
    <header className="familyMapHeader">
      <div className="familyMapTitle"><span className="familyMapTitleIcon"><Globe2 size={25} /></span><div><p className="eyebrow">Exploración geográfica</p><h2>Mapa familiar</h2><p>Explora dónde comenzó cada historia familiar a través del tiempo.</p></div></div>
      <div className="familyMapFilters">
        <div className="familyMapTreeContext"><span>Árbol activo</span>{accessibleTrees.length > 1 ? <select value={remoteTreeId} onChange={(event) => onChangeTree?.(event.target.value)} aria-label="Cambiar árbol activo">{accessibleTrees.map((tree) => <option value={tree.id} key={tree.id}>{tree.name}</option>)}</select> : <strong>{activeTreeName}</strong>}</div>
        <label className="familyMapFilter"><span>Rama familiar</span><select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}><option value="all">Todo el árbol</option>{branchOptions.map((branch) => <option value={branch.value} key={branch.value}>{branch.label} · {branch.count}</option>)}</select></label>
      </div>
    </header>
    <div className="familyMapStats" aria-label="Resumen del mapa"><div><span>Año de corte</span><strong>{currentYear || '—'}</strong></div><div><span>Personas hasta este año</span><strong>{visiblePeople}</strong></div><div><span>Ubicaciones confirmadas</span><strong>{locations.length}</strong></div><div><span>Personas sin ubicación</span><strong>{pendingCount}</strong></div></div>
    <p className="familyMapExplanation" aria-live="polite">El mapa muestra el acumulado de personas con año de nacimiento hasta {currentYear || 'el año seleccionado'}. {currentEvents.length ? `${currentEvents.length} ${currentEvents.length === 1 ? 'persona se incorporó' : 'personas se incorporaron'} en este paso.` : 'No hay novedades en este paso.'}</p>
    <>
      <div className={`familyMapCanvas ${!events.length ? 'empty' : ''}`} aria-label="Mapa mundial de nacimientos" onWheel={onMapWheel}>
        <svg ref={mapSvgRef} viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`} role="img" aria-label={`Mapa mundial de nacimientos${currentYear ? ` hasta ${currentYear}` : ''}`} onPointerDown={onMapPointerDown} onPointerMove={onMapPointerMove} onPointerUp={onMapPointerUp} onPointerCancel={onMapPointerUp}>
          <g transform={`translate(${mapViewport.x} ${mapViewport.y}) scale(${mapViewport.scale})`}><WorldBase /><FamilyMapMarkers locations={displayLocations} currentEventIds={currentEventIds} selectedLocation={selectedLocation} onSelect={setSelectedLocation} mapScale={mapViewport.scale} /></g>
        </svg>
        <div className="familyMapZoomControls" aria-label="Controles del mapa">
          <button type="button" onClick={() => zoomMapAt(mapViewport.scale * 1.2)} title="Acercar" aria-label="Acercar"><Plus size={16} /></button>
          <button type="button" onClick={() => zoomMapAt(mapViewport.scale / 1.2)} title="Alejar" aria-label="Alejar"><Minus size={16} /></button>
          <button type="button" onClick={() => { stopViewportAnimation(); setMapViewport(viewportForLocations(locations)); }} title="Centrar ubicaciones" aria-label="Centrar ubicaciones"><LocateFixed size={16} /></button>
        </div>
        {!events.length && <div className="familyMapEmptyOverlay"><Globe2 size={25} /><strong>{people.length ? (peopleWithoutYear ? 'Agregá años de nacimiento para recorrer el mapa' : 'No hay personas en esta rama') : 'Tu mapa familiar empieza acá'}</strong><span>{people.length ? (peopleWithoutYear ? `${peopleWithoutYear} ${peopleWithoutYear === 1 ? 'persona no tiene' : 'personas no tienen'} un año de nacimiento válido.` : 'Probá con otra rama familiar.') : 'Cuando agregues personas y lugares, aparecerán sus ubicaciones.'}</span></div>}
        {events.length > 0 && !locations.length && <div className="familyMapEmptyOverlay"><Globe2 size={25} /><strong>No hay ubicaciones confirmadas todavía</strong><span>Las personas tienen años de nacimiento, pero sus lugares todavía no tienen coordenadas confirmadas.</span></div>}
        {selectedLocation && <BirthLocationPopover location={selectedLocation} mapViewport={mapViewport} onClose={() => setSelectedLocation(null)} onViewInTree={onViewInTree} />}
        <div className="familyMapLegend"><span><i className="geolocatedDot" /> Ubicación confirmada</span><span><i className="pendingDot" /> Sin ubicación: {pendingCount}</span></div>
      </div>
      <FamilyTimeline years={years} currentIndex={currentIndex} isPlaying={isPlaying} timeStep={timeStep} playbackSpeed={playbackSpeed} onTimeStepChange={setTimeStep} onPlaybackSpeedChange={(speed) => { setPlaybackSpeed(speed); setIsPlaying(false); }} onIndexChange={(index) => { setCurrentIndex(index); setIsPlaying(false); }} onTogglePlay={() => { if (!isPlaying && currentIndex >= years.length - 1) setCurrentIndex(0); setIsPlaying((value) => !value); }} onReset={() => { setCurrentIndex(0); setIsPlaying(false); setSelectedLocation(null); }} />
      {events.length > 0 && <div className="familyMapContext"><div><span className="eyebrow">Novedades del período</span><h3>Hasta {currentYear}</h3><p>{currentEvents.length ? `${currentEvents.length} ${currentEvents.length === 1 ? 'persona incorporada' : 'personas incorporadas'}${locationsPendingInStep ? ` · ${locationsPendingInStep} sin ubicación` : ''}` : 'Sin novedades en este paso'}</p></div><div className="familyMapContextList">{currentEvents.length ? currentEvents.map((event) => <button type="button" className={`familyMapContextItem ${event.verified ? '' : 'pending'}`} key={event.person.id} onClick={() => event.verified && setSelectedLocation(locations.find((location) => location.people.some((person) => person.id === event.person.id)) || null)}><span>{event.verified ? <Globe2 size={16} /> : <span className="pendingIcon">?</span>}</span><div><strong>{displayName(event.person)}</strong><small>{event.label}{!event.verified && ' · Ubicación pendiente de confirmar'}</small></div></button>) : <p className="muted">El mapa conserva el acumulado anterior. Avanzá para encontrar nuevas personas.</p>}</div></div>}
    </>
  </section>;
}
