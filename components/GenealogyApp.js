'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { achievementCategories, calculateCompleteAncestors, calculateCountries, calculateGenerations, calculateOldestYear, getTotalUnlockedAchievements, resolveAchievementProgress } from '@/lib/hallazgos';
import { defaultDatabase, displayName, emptyDatabase, newId, normalizeDatabase, relativesFor, STORAGE_KEY } from '@/lib/model';
import { exportGedcom, importGedcom } from '@/lib/gedcom';
import { acceptTreeInvitation, createRemoteTree, createTreeInvitation, deleteRemoteTree, getRemoteTree, listAccessibleTrees, listTreeInvitations, remoteTreeStorageKey, renameRemoteTree, revokeTreeInvitation, saveRemoteTree } from '@/lib/supabaseStore';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { AlertTriangle, Award, BookOpen, CalendarDays, Check, ChevronDown, ChevronsLeft, ChevronsRight, Clock3, Compass, Copy, Database, FileDown, Globe2, Hourglass, Image as ImageIcon, Layers3, LocateFixed, LockKeyhole, Maximize2, Minimize2, Moon, MoreHorizontal, Puzzle, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Sprout, Sun, Trash2, TreePine, UserCircle, UserPlus, UsersRound, Waypoints, ZoomIn, ZoomOut } from 'lucide-react';

const iconProps = { size: 20, strokeWidth: 1.9, 'aria-hidden': true };
const IconHome = <Sprout {...iconProps} className="rootsNavIcon" />;
const IconPieces = <Puzzle {...iconProps} />;
const IconTimeline = <Hourglass {...iconProps} />;
const IconSources = <BookOpen {...iconProps} />;
const IconData = <Database {...iconProps} />;
const IconProfile = <UserCircle {...iconProps} />;
const IconCollaborators = <UsersRound {...iconProps} />;
const IconFindings = <Award {...iconProps} />;

const I18N = {
  es: {
    appSubtitle: 'Genealogía web',
    loading: { openingTree: 'Abriendo tu árbol' },
    nav: { expand: 'Expandir menú', collapse: 'Colapsar menú', navigation: 'Navegación', rootsShort: 'Raíces', timelineShort: 'Historia', profileShort: 'Perfil' },
    sections: { tree: 'Mis raíces', people: 'Piezas', timeline: 'Historia', findings: 'Hallazgos', sources: 'Fuentes', data: 'Datos', profile: 'Mi perfil' },
    subtitles: {
      tree: 'Visualiza y navega el árbol familiar.',
      people: 'Gestiona las piezas registradas y sus perfiles.',
      timeline: 'Revisa los eventos en orden cronológico.',
      sources: 'Organiza las fuentes documentales de tu investigación.',
      data: 'Importa, exporta y respalda tu árbol.',
      profile: 'Cuenta y preferencias.'
    },
    actions: { newPiece: '+ Nueva pieza', newSource: '+ Nueva fuente', cancel: 'Cancelar', savePiece: 'Guardar pieza', saveEvent: 'Guardar evento', saveSource: 'Guardar fuente', edit: 'Editar', viewInTree: 'Ver en árbol', add: '+ Agregar', remove: 'Quitar', import: 'Importar', exportJson: 'Exportar JSON', exportGedcom: 'Exportar GEDCOM', exportPdf: 'Exportar PDF', generateLink: 'Generar enlace', activateDetective: 'Activar detective', accept: 'Aceptar', reject: 'Rechazar', acceptPiece: 'Aceptar pieza', rejectPiece: 'Rechazar', importPiece: 'Importar pieza', tools: 'Herramientas', hideTools: 'Ocultar herramientas', allPieces: 'Todas las piezas', focusedBranch: 'Rama enfocada', uploadImage: 'Cargar imagen', copy: 'Copiar', downloadPiece: 'Descargar pieza' },
    stats: { pieces: 'piezas', links: 'vínculos', events: 'eventos', sources: 'fuentes', results: 'resultados', dated: 'con fecha', pending: 'pendientes', accepted: 'aceptadas', rejected: 'rechazadas' },
    forms: { names: 'Nombres', surnames: 'Apellidos', birthYear: 'Año de nacimiento', nickname: 'Apodo', relationship: 'Parentesco', noLinkYet: 'Sin vínculo por ahora', parentOf: 'Es padre/madre de', childOf: 'Es hijo/a de', partnerOf: 'Es pareja de', noPiecesToLink: 'Sin otras piezas para vincular', linkWith: 'Vincular con', choosePiece: 'Elegir pieza', moreData: '+ datos', profileImage: 'Imagen de perfil', email: 'Email', sex: 'Sexo', unspecified: 'Sin indicar', male: 'Masculino', female: 'Femenino', otherGender: 'Otro / no binario', birthPlace: 'Lugar de nacimiento', death: 'Fallecimiento', deathPlace: 'Lugar de fallecimiento', occupation: 'Ocupación', notes: 'Notas', type: 'Tipo', date: 'Fecha', place: 'Lugar', description: 'Descripción', title: 'Título', repository: 'Archivo / repositorio', url: 'URL' },
    placeholders: { birthYear: 'Ej. 1942', email: 'nombre@dominio.com', birthPlace: 'Ciudad, provincia, país', notes: 'Hipótesis, datos pendientes, variantes del apellido...', search: 'Buscar por nombre, apodo, apellido, lugar…', repository: 'FamilySearch, archivo provincial, parroquia…', sourceExplanation: 'Acta, censo, recuerdo familiar, enlace, archivo...' },
    modalTitles: { newPiece: 'Nueva pieza', newSource: 'Nueva fuente', newEvent: 'Nuevo evento · {name}' },
    people: { bioPending: 'Datos biográficos pendientes' },
    tree: { branch: 'Rama', filters: 'Filtros de rama', tools: 'Herramientas del lienzo', scale: 'Escala', temporalScale: 'Escala temporal', background: 'Fondo', changeBackground: 'Cambiar fondo', center: 'Centrar', zoomIn: 'Acercar', zoomOut: 'Alejar', maximize: 'Maximizar lienzo', restore: 'Restaurar vista', ancestry: 'Ascendencia', descendants: 'Descendencia', generation: 'Generación', noDate: 'Fecha pendiente', unknownDate: 'Sin fecha', birthAxis: 'Nacimiento', hint: 'Arrastrá el lienzo para moverte. Usá la rueda o los botones para acercar y alejar.', cardTitle: 'Click: ver ficha. Doble click: centrar árbol.', siblings: 'Hermanos', partners: 'Parejas', familyGroup: 'Grupo familiar', selectTree: 'Árbol', newTree: 'Nuevo árbol', createTree: 'Crear árbol', role: 'Rol' },
    card: { birthDate: 'Fecha de nacimiento', familyBranch: 'Rama familiar', sources: 'Fuentes', noBranch: 'Rama pendiente', missingName: 'Nombre pendiente' },
    profile: { account: 'Cuenta', title: 'Mi perfil', subtitle: 'Accedé a tu perfil y ajustes', localNoEmail: 'Cuenta local sin email', localAccount: 'Cuenta local', visualPreference: 'Preferencia visual', darkActive: 'Interfaz oscura activa', lightActive: 'Interfaz clara activa', language: 'Idioma', esSelected: 'Español seleccionado', enSelected: 'English selected', changeToEnglish: 'Cambiar idioma a inglés', changeToSpanish: 'Cambiar idioma a español', notice: 'Perfil básico local. Para sincronizar y tener cuenta, configurá Supabase.', darkToLight: 'Cambiar a modo claro', lightToDark: 'Cambiar a modo oscuro' },
    empty: { title: 'Empezá por una pieza', body: 'El árbol se construye alrededor de piezas y vínculos. Podés cargar datos incompletos e ir documentándolos a medida que investigás.', firstPiece: '+ Agregar primera pieza' },
    drawer: { viewMode: 'Modo vista', editMode: 'Modo edición', personalFile: 'Ficha personal', editPerson: 'Editar persona', editing: 'Editando', view: 'Vista', deletePerson: 'Eliminar persona', editingNotice: 'Estás modificando los datos de esta persona. Guardar actualiza la ficha y vuelve al modo vista.', viewingNotice: 'Estás viendo la ficha. Usá Editar para cambiar datos.', person: 'Persona', datesToResearch: 'Fechas por investigar', family: 'Familia', parents: 'Padres', partners: 'Parejas', children: 'Hijos', addParent: 'Agregar padre/madre', addPartner: 'Agregar pareja', addChild: 'Agregar hijo/a', timeline: 'Línea de tiempo', noEvents: 'Todavía no hay eventos registrados.', noData: 'Sin datos', choosePerson: 'Elegir persona…', removeLink: 'Eliminar vínculo' },
    facts: { nickname: 'Apodo', email: 'Email', birth: 'Nacimiento', death: 'Fallecimiento', occupation: 'Ocupación', notes: 'Notas' },
    status: { living: 'Vivo/a', deceased: 'Fallecido/a' },
    auth: { login: 'Iniciar sesión', register: 'Crear cuenta', email: 'Email', password: 'Contraseña', confirmPassword: 'Repetir contraseña', submitLogin: 'Entrar', submitRegister: 'Registrarme', forgot: '¿Olvidaste tu contraseña?', reset: 'Enviar enlace de recuperación', backToLogin: 'Volver al inicio de sesión', noAccount: '¿Todavía no tenés una cuenta?', hasAccount: '¿Ya tenés una cuenta?', signup: 'Registrate', signin: 'Iniciá sesión', welcome: 'Tu historia familiar, protegida', subtitle: 'Ingresá para continuar construyendo y documentando tus raíces.', configured: 'La autenticación está disponible porque el proyecto está conectado a Supabase.', passwordMismatch: 'Las contraseñas no coinciden.', successRegister: 'Cuenta creada. Revisá tu email para confirmar el acceso.', successReset: 'Te enviamos un enlace para restablecer tu contraseña.', genericError: 'No pudimos completar la operación.' },
    timeline: { intro: 'Eventos de todas las personas, ordenados por fecha conocida. Los eventos sin fecha quedan al final.', all: 'Todos', noEventsTitle: 'No hay eventos para mostrar', noEventsBody: 'Agregá eventos desde la ficha de una persona para construir la cronología familiar.', noPlaceDescription: 'Sin lugar ni descripción.' },
    data: { jsonTitle: 'Backup completo JSON', jsonBody: 'Guarda piezas, vínculos, eventos, fuentes y configuración.', gedcomBody: 'Intercambio básico con otras aplicaciones genealógicas.', pdfTitle: 'Exportar como PDF', pdfBody: 'Descarga un PDF del lienzo del árbol. Para respetar filtros, escala temporal y fondo, usá también el botón PDF dentro del lienzo.', publishTitle: 'Publicar árbol', publishBody: 'Genera un enlace público de solo lectura con nombres, relaciones, fechas y lugares. Quien lo vea puede aportar una pieza del rompecabezas familiar.', linkCopied: 'El enlace se copió al portapapeles si el navegador lo permitió.', syncTitle: 'Siguiente paso: sincronización', detectiveTitle: 'Activar detective', detectiveBody: 'Analiza el árbol vigente, genera hipótesis, arma búsquedas en actas/censos/registros y deja sugerencias aceptables o rechazables con fuente citada.', investigating: 'Investigando…', importPieceTitle: 'Importar pieza', importPieceBody: 'Importa una sugerencia enviada desde el árbol público para revisarla antes de actualizar tu árbol.', warningTitle: 'Importante sobre esta versión:' },
    sources: { emptyTitle: 'Todavía no cargaste fuentes', emptyBody: 'Podés registrar actas, censos, libros parroquiales, fotografías, entrevistas y páginas web.', noRepository: 'Repositorio no indicado', openReference: 'Abrir referencia ↗' },
    detective: { eyebrow: 'Detective genealógico', title: 'Posibles hallazgos', body: 'Revisá cada sugerencia antes de tocar el árbol. Las hipótesis internas se marcan como baja confianza; las búsquedas online quedan citadas como pistas pendientes.', pending: 'pendientes', accepted: 'aceptadas', rejected: 'rechazadas', pendingOne: 'Pendiente', acceptedOne: 'Aceptada', rejectedOne: 'Rechazada', source: 'Fuente:', untitled: 'Sin título', noType: 'Sin tipo', openSearch: 'Abrir búsqueda ↗', emptyTitle: 'Sin sugerencias todavía', emptyBody: 'Activá el detective para generar hipótesis, búsquedas y fuentes candidatas a partir del árbol vigente.' },
    puzzle: { eyebrow: 'Piezas recibidas', title: 'Aportes del árbol público', body: 'Revisá cada pieza antes de incorporarla. Podés aceptar una edición de ficha o una persona nueva con vínculo sugerido.', piece: 'Pieza', edit: 'Editar {name}', add: 'Agregar {name}', contributor: 'Aporte de {name}.', anonymous: 'Aporte anónimo.', source: 'Fuente / explicación:', noSource: 'Sin fuente indicada.', updatePublicData: 'Actualizar datos públicos de {name} con la información propuesta.', addPerson: 'Agregar persona: {name}.', linkAs: 'Vincular con {name} como {relation}.', relationParent: 'padre/madre de esa persona', relationChild: 'hijo/a de esa persona', relationPartner: 'pareja' },
    warning: { localStorage: 'al estar pensada como MVP web sin cuenta ni servidor de base de datos, los datos se guardan en localStorage del navegador. Hacé backups JSON periódicos. Si borrás los datos del navegador, también se borra el árbol local.' },
    errors: { imageLoad: 'No pude cargar esa imagen.', publicLoad: 'No pude abrir este enlace público. Puede estar incompleto o dañado.', jsonRead: 'No pude leer ese backup JSON.', gedcomRead: 'No pude interpretar ese GEDCOM. Esta versión soporta el núcleo GEDCOM 5.5/5.5.1.', pieceRead: 'No pude leer esa pieza. Verificá que sea un JSON generado desde el árbol público.', supabaseConnect: 'No pude conectar con Supabase: {message}', supabaseSave: 'No pude guardar los cambios en Supabase: {message}' },
    confirms: { deletePerson: '¿Eliminar a {name}? También se eliminarán sus vínculos y eventos.', replaceData: 'Esto reemplazará los datos actuales de este navegador. ¿Continuar?', importGedcom: 'Se importarán {count} personas y se reemplazarán los datos actuales. ¿Continuar?' },
    deletion: { personTitle: 'Eliminar persona', personLead: 'Esta acción quitará la ficha y sus vínculos del árbol.', personConfirm: '¿Querés eliminar a {name}?', treeTitle: 'Eliminar árbol', treeLead: 'Esta acción quitará el árbol de tu lista.', treeConfirm: 'Para confirmar, escribí el nombre exacto del árbol.', treeAction: 'Eliminar árbol', typeName: 'Escribí el nombre para confirmar', treeNameToDelete: 'Árbol que vas a eliminar', mismatch: 'El nombre no coincide.', cancel: 'Conservar árbol' },
    sync: { failing: 'Sincronización en la nube falla: {message}', synced: 'Sincronizado con Supabase{suffix}', creating: ' (creando registro remoto)', local: 'Supabase no está configurado. Usa localStorage y agrega las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.' },
    public: { publicTree: 'Árbol público', readOnly: 'personas publicadas · solo lectura', contribute: '🧩 Aportar pieza', publicView: 'Vista pública', familyTree: 'Árbol familiar', clickToContribute: 'Hacé click en una persona para aportar una pieza sobre esa ficha.', contributionIntro: 'Cada aporte es una pieza del rompecabezas familiar. El dueño del árbol podrá importarla, revisar la fuente y aceptarla o rechazarla.', yourContact: 'Tu nombre o contacto', optional: 'Opcional', suggestEdit: 'Sugerir edición', addPiece: 'Agregar pieza', personToEdit: 'Persona a editar', suggestedRelation: 'Relación sugerida', relatedPerson: 'Persona vinculada', sourceExplanation: 'Fuente o explicación', generatePiece: 'Generar pieza', pieceReady: 'Pieza lista para enviar', pieceReadyBody: 'Descargala y enviasela al dueño del árbol para que la importe en su sección Importar / Exportar.', downloadPiece: 'Descargar pieza', copy: 'Copiar' }
  },
  en: {
    appSubtitle: 'Genealogy web',
    loading: { openingTree: 'Opening your tree' },
    nav: { expand: 'Expand menu', collapse: 'Collapse menu', navigation: 'Navigation', rootsShort: 'Roots', timelineShort: 'History', profileShort: 'Profile' },
    sections: { tree: 'My roots', people: 'Pieces', timeline: 'History', findings: 'Findings', sources: 'Sources', data: 'Data', profile: 'My profile' },
    subtitles: { tree: 'View and explore your family tree.', people: 'Manage registered pieces and profiles.', timeline: 'Review events in chronological order.', sources: 'Organize your research sources.', data: 'Import, export and back up your tree.', profile: 'Account and preferences.' },
    actions: { newPiece: '+ New piece', newSource: '+ New source', cancel: 'Cancel', savePiece: 'Save piece', saveEvent: 'Save event', saveSource: 'Save source', edit: 'Edit', viewInTree: 'View in tree', add: '+ Add', remove: 'Remove', import: 'Import', exportJson: 'Export JSON', exportGedcom: 'Export GEDCOM', exportPdf: 'Export PDF', generateLink: 'Generate link', activateDetective: 'Activate detective', accept: 'Accept', reject: 'Reject', acceptPiece: 'Accept piece', rejectPiece: 'Reject', importPiece: 'Import piece', tools: 'Tools', hideTools: 'Hide tools', allPieces: 'All pieces', focusedBranch: 'Focused branch', uploadImage: 'Upload image', copy: 'Copy', downloadPiece: 'Download piece' },
    stats: { pieces: 'pieces', links: 'links', events: 'events', sources: 'sources', results: 'results', dated: 'dated', pending: 'pending', accepted: 'accepted', rejected: 'rejected' },
    forms: { names: 'Given names', surnames: 'Surnames', birthYear: 'Birth year', nickname: 'Nickname', relationship: 'Relationship', noLinkYet: 'No link yet', parentOf: 'Is parent of', childOf: 'Is child of', partnerOf: 'Is partner of', noPiecesToLink: 'No other pieces to link', linkWith: 'Link with', choosePiece: 'Choose piece', moreData: '+ details', profileImage: 'Profile image', email: 'Email', sex: 'Sex', unspecified: 'Unspecified', male: 'Male', female: 'Female', otherGender: 'Other / non-binary', birthPlace: 'Birth place', death: 'Death', deathPlace: 'Death place', occupation: 'Occupation', notes: 'Notes', type: 'Type', date: 'Date', place: 'Place', description: 'Description', title: 'Title', repository: 'File / repository', url: 'URL' },
    placeholders: { birthYear: 'Ex. 1942', email: 'name@domain.com', birthPlace: 'City, state, country', notes: 'Hypotheses, pending data, surname variants...', search: 'Search by name, nickname, surname, place…', repository: 'FamilySearch, provincial archive, parish…', sourceExplanation: 'Certificate, census, family memory, link, file...' },
    modalTitles: { newPiece: 'New piece', newSource: 'New source', newEvent: 'New event · {name}' },
    people: { bioPending: 'Biographical data pending' },
    tree: { branch: 'Branch', filters: 'Branch filters', tools: 'Canvas tools', scale: 'Scale', temporalScale: 'Timeline scale', background: 'Background', changeBackground: 'Change background', center: 'Center', zoomIn: 'Zoom in', zoomOut: 'Zoom out', maximize: 'Maximize canvas', restore: 'Restore view', ancestry: 'Ancestry', descendants: 'Descendants', generation: 'Generation', noDate: 'Date pending', unknownDate: 'No date', birthAxis: 'Birth', hint: 'Drag the canvas to move. Use the wheel or buttons to zoom.', cardTitle: 'Click: view profile. Double click: focus tree.', siblings: 'Siblings', partners: 'Partners', familyGroup: 'Family group', selectTree: 'Tree', newTree: 'New tree', createTree: 'Create tree', role: 'Role' },
    card: { birthDate: 'Birth date', familyBranch: 'Family branch', sources: 'Sources', noBranch: 'Branch pending', missingName: 'Name pending' },
    profile: { account: 'Account', title: 'My profile', subtitle: 'Access your profile and settings', localNoEmail: 'Local account without email', localAccount: 'Local account', visualPreference: 'Visual preference', darkActive: 'Dark interface active', lightActive: 'Light interface active', language: 'Language', esSelected: 'Spanish selected', enSelected: 'English selected', changeToEnglish: 'Switch language to English', changeToSpanish: 'Switch language to Spanish', notice: 'Local basic profile. Configure Supabase to sync and create an account.', darkToLight: 'Switch to light mode', lightToDark: 'Switch to dark mode' },
    empty: { title: 'Start with one piece', body: 'The tree is built around pieces and links. You can add incomplete data and document it as you research.', firstPiece: '+ Add first piece' },
    drawer: { viewMode: 'View mode', editMode: 'Edit mode', personalFile: 'Personal profile', editPerson: 'Edit person', editing: 'Editing', view: 'View', deletePerson: 'Delete person', editingNotice: 'You are editing this person. Saving updates the profile and returns to view mode.', viewingNotice: 'You are viewing the profile. Use Edit to change data.', person: 'Person', datesToResearch: 'Dates to research', family: 'Family', parents: 'Parents', partners: 'Partners', children: 'Children', addParent: 'Add parent', addPartner: 'Add partner', addChild: 'Add child', timeline: 'Timeline', noEvents: 'No events registered yet.', noData: 'No data', choosePerson: 'Choose person…', removeLink: 'Remove link' },
    facts: { nickname: 'Nickname', email: 'Email', birth: 'Birth', death: 'Death', occupation: 'Occupation', notes: 'Notes' },
    status: { living: 'Living', deceased: 'Deceased' },
    auth: { login: 'Sign in', register: 'Create account', email: 'Email', password: 'Password', confirmPassword: 'Repeat password', submitLogin: 'Sign in', submitRegister: 'Create account', forgot: 'Forgot your password?', reset: 'Send recovery link', backToLogin: 'Back to sign in', noAccount: "Don't have an account yet?", hasAccount: 'Already have an account?', signup: 'Sign up', signin: 'Sign in', welcome: 'Your family story, protected', subtitle: 'Sign in to keep building and documenting your roots.', configured: 'Authentication is available because the project is connected to Supabase.', passwordMismatch: 'Passwords do not match.', successRegister: 'Account created. Check your email to confirm access.', successReset: 'We sent you a password recovery link.', genericError: 'We could not complete the operation.' },
    timeline: { intro: 'Events for all people, sorted by known date. Undated events appear at the end.', all: 'All', noEventsTitle: 'No events to show', noEventsBody: 'Add events from a person profile to build the family timeline.', noPlaceDescription: 'No place or description.' },
    data: { jsonTitle: 'Full JSON backup', jsonBody: 'Saves pieces, links, events, sources and settings.', gedcomBody: 'Basic exchange with other genealogy apps.', pdfTitle: 'Export as PDF', pdfBody: 'Download a PDF of the tree canvas. To preserve filters, timeline scale and background, also use the PDF button inside the canvas.', publishTitle: 'Publish tree', publishBody: 'Generate a read-only public link with names, relationships, dates and places. Viewers can contribute a family puzzle piece.', linkCopied: 'The link was copied to the clipboard if the browser allowed it.', syncTitle: 'Next step: sync', detectiveTitle: 'Activate detective', detectiveBody: 'Analyzes the current tree, generates hypotheses, searches records and leaves source-backed suggestions to accept or reject.', investigating: 'Investigating…', importPieceTitle: 'Import piece', importPieceBody: 'Import a suggestion sent from the public tree to review it before updating your tree.', warningTitle: 'Important about this version:' },
    sources: { emptyTitle: 'You have not added sources yet', emptyBody: 'You can register certificates, censuses, parish books, civil records, photos, interviews and websites.', noRepository: 'Repository not specified', openReference: 'Open reference ↗' },
    detective: { eyebrow: 'Genealogy detective', title: 'Possible findings', body: 'Review each suggestion before changing the tree. Internal hypotheses are marked as low confidence; online searches are cited as pending leads.', pending: 'pending', accepted: 'accepted', rejected: 'rejected', pendingOne: 'Pending', acceptedOne: 'Accepted', rejectedOne: 'Rejected', source: 'Source:', untitled: 'Untitled', noType: 'No type', openSearch: 'Open search ↗', emptyTitle: 'No suggestions yet', emptyBody: 'Activate the detective to generate hypotheses, searches and candidate sources from the current tree.' },
    puzzle: { eyebrow: 'Received pieces', title: 'Public tree contributions', body: 'Review each piece before adding it. You can accept a profile edit or a new person with a suggested link.', piece: 'Piece', edit: 'Edit {name}', add: 'Add {name}', contributor: 'Contribution from {name}.', anonymous: 'Anonymous contribution.', source: 'Source / explanation:', noSource: 'No source provided.', updatePublicData: 'Update public data for {name} with the proposed information.', addPerson: 'Add person: {name}.', linkAs: 'Link with {name} as {relation}.', relationParent: 'parent of that person', relationChild: 'child of that person', relationPartner: 'partner' },
    warning: { localStorage: 'this MVP runs without an account or database server, so data is stored in browser localStorage. Make periodic JSON backups. If you clear browser data, the local tree is removed too.' },
    errors: { imageLoad: 'I could not load that image.', publicLoad: 'I could not open this public link. It may be incomplete or damaged.', jsonRead: 'I could not read that JSON backup.', gedcomRead: 'I could not interpret that GEDCOM. This version supports the GEDCOM 5.5/5.5.1 core.', pieceRead: 'I could not read that piece. Check that it is a JSON generated from the public tree.', supabaseConnect: 'I could not connect to Supabase: {message}', supabaseSave: 'I could not save changes to Supabase: {message}' },
    confirms: { deletePerson: 'Delete {name}? Their links and events will also be removed.', replaceData: 'This will replace the current data in this browser. Continue?', importGedcom: '{count} people will be imported and current data will be replaced. Continue?' },
    deletion: { personTitle: 'Delete person', personLead: 'This removes the profile and its links from the tree.', personConfirm: 'Delete {name}?', treeTitle: 'Delete tree', treeLead: 'This action removes the tree from your list.', treeConfirm: 'To confirm, type the exact tree name.', treeAction: 'Delete tree', typeName: 'Type the name to confirm', treeNameToDelete: 'Tree you are deleting', mismatch: 'The name does not match.', cancel: 'Keep tree' },
    sync: { failing: 'Cloud sync is failing: {message}', synced: 'Synced with Supabase{suffix}', creating: ' (creating remote record)', local: 'Supabase is not configured. It uses localStorage; add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' },
    public: { publicTree: 'Public tree', readOnly: 'published people · read only', contribute: '🧩 Contribute piece', publicView: 'Public view', familyTree: 'Family tree', clickToContribute: 'Click a person to contribute a piece about that profile.', contributionIntro: 'Each contribution is a family puzzle piece. The tree owner can import it, review the source and accept or reject it.', yourContact: 'Your name or contact', optional: 'Optional', suggestEdit: 'Suggest edit', addPiece: 'Add piece', personToEdit: 'Person to edit', suggestedRelation: 'Suggested relationship', relatedPerson: 'Related person', sourceExplanation: 'Source or explanation', generatePiece: 'Generate piece', pieceReady: 'Piece ready to send', pieceReadyBody: 'Download it and send it to the tree owner so they can import it from Import / Export.', downloadPiece: 'Download piece', copy: 'Copy' }
  }
};

const LanguageContext = createContext({ language: 'es', t: (key) => key });

const translate = (language, key, vars = {}) => {
  const parts = key.split('.');
  let value = I18N[language] || I18N.es;
  for (const part of parts) value = value?.[part];
  if (value === undefined && language !== 'es') return translate('es', key, vars);
  const text = typeof value === 'string' ? value : key;
  return Object.entries(vars).reduce((acc, [name, replacement]) => acc.replaceAll(`{${name}}`, replacement ?? ''), text);
};

const useI18n = () => useContext(LanguageContext);

const sections = [
  ['tree', 'sections.tree', IconHome],
  ['people', 'sections.people', IconPieces],
  ['timeline', 'sections.timeline', IconTimeline],
  ['findings', 'sections.findings', <Award {...iconProps} />],
  ['collaborators', 'sections.collaborators', IconCollaborators]
];

const sectionHashMap = {
  canvas: 'tree',
  tree: 'tree',
  people: 'people',
  timeline: 'timeline',
  collaborators: 'collaborators',
  sources: 'sources',
  data: 'data',
  findings: 'findings',
  profile: 'profile'
};

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

const TREE_CARD_VARIANTS = {
  landscape: { variant: 'portrait', width: 188, height: 200, columnGap: 18, rowGap: 52, maxColumnGap: 52 },
  portrait: { variant: 'portrait', width: 176, height: 192, columnGap: 14, rowGap: 48, maxColumnGap: 48 }
};
const TREE_CARD_DEFAULT = TREE_CARD_VARIANTS.landscape;
const TREE_CARD_WIDTH = TREE_CARD_DEFAULT.width;
const TREE_CARD_HEIGHT = TREE_CARD_DEFAULT.height;
const TREE_COLUMN_GAP = TREE_CARD_DEFAULT.columnGap;
const TREE_ROW_GAP = TREE_CARD_DEFAULT.rowGap;
const TREE_BRANCH_GAP_SLOTS = 0.1;
const TREE_MIN_CARD_GAP = 8;
const TREE_GROUP_GAP_SLOTS = 0.35;
// Keep independent family components visually separated even when cards within
// each component use the tighter mobile-friendly spacing.
const TREE_COMPONENT_GAP_SLOTS = 1.4;
const TEMPORAL_AXIS_WIDTH = 96;
const TEMPORAL_AXIS_GAP = 20;
const TEMPORAL_TOP_PADDING = 70;
const TEMPORAL_BOTTOM_PADDING = 96;
const TEMPORAL_PIXELS_PER_YEAR = 8;
const UNKNOWN_BIRTH_YEAR_OFFSET = 30;
const THEME_STORAGE_KEY = 'raices.theme';
const LANGUAGE_STORAGE_KEY = 'rootPuzzle.language';
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
const personStatusLabel = (person, language = 'es') => isDeceased(person) ? translate(language, 'status.deceased') : translate(language, 'status.living');
const displayField = (value) => String(value || '-');

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
      <div class="meta">Exportado desde Root Puzzle · ${new Date().toLocaleDateString('es-AR')}</div>
    </div>
  </header>
  <section class="stats">
    <div class="stat"><strong>${db.people.length}</strong><span>personas</span></div>
    <div class="stat"><strong>${db.parentChild.length}</strong><span>vínculos padre-hijo</span></div>
    <div class="stat"><strong>${db.partnerships.length}</strong><span>parejas</span></div>
    <div class="stat"><strong>${db.sources.length}</strong><span>fuentes</span></div>
  </section>
  <h3>Piezas</h3>
  ${rows}
  <h3>Vínculos</h3>
  <ul>${relationships || '<li>Sin vínculos registrados.</li>'}</ul>
  <h3>Fuentes</h3>
  <ul>${sources || '<li>Sin fuentes registradas.</li>'}</ul>
</body>
</html>`;
};

const exportPdf = (db, language = 'es') => {
  const layout = buildAllPeopleLayout(db, '', language);
  downloadTreeCanvasPdf({
    db,
    layout,
    filename: 'raices-lienzo.pdf',
    title: db.settings.treeName,
    temporalScale: false,
    canvasBackground: '',
    language
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

const drawTreeExportCanvas = async ({ db, layout, title, temporalScale, canvasBackground, language = 'es' }) => {
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
  ctx.fillText(`${layout.allPeopleCount || layout.nodes.length} piezas visibles · Exportado desde Root Puzzle`, padding, 58);

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
      ctx.fillText(translate(language, 'tree.unknownDate'), 18, y - 4);
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
    drawCenteredText(ctx, node.relationLabel || (node.generation === 0 ? kinTerm(language, 'central') : treeNodeLabel(node, language)), node.x + TREE_CARD_WIDTH / 2, node.y + 19, TREE_CARD_WIDTH - 18);
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
    drawCenteredText(ctx, node.person.birthDate || translate(language, 'tree.noDate'), node.x + TREE_CARD_WIDTH / 2, node.y + 106, TREE_CARD_WIDTH - 22);
  });
  ctx.restore();
  return canvas;
};

const downloadTreeCanvasPdf = async ({ db, layout, filename, title, temporalScale, canvasBackground, language = 'es' }) => {
  const canvas = await drawTreeExportCanvas({ db, layout, title, temporalScale, canvasBackground, language });
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

const positionTreeNodes = (nodes, edgesByKey, cardMetrics = TREE_CARD_DEFAULT) => {
  if (!nodes.length) return { nodes: [], edges: [], width: 0, height: 0, generationCount: 0 };
  const cardWidth = cardMetrics.width;
  const cardHeight = cardMetrics.height;

  const minSlot = Math.min(...nodes.map((node) => node.slot));
  const maxSlot = Math.max(...nodes.map((node) => node.slot));
  const orderedGenerations = [...new Set(nodes.map((node) => node.generation))].sort((a, b) => a - b);
  const generationPosition = new Map(orderedGenerations.map((generation, index) => [generation, index]));
  const paddingX = 42;
  const paddingY = 46;
  const slotSize = cardWidth + cardMetrics.columnGap;
  const rowSize = cardHeight + cardMetrics.rowGap;
  let width = Math.max(760, (maxSlot - minSlot) * slotSize + cardWidth + paddingX * 2);
  const height = Math.max(460, (orderedGenerations.length - 1) * rowSize + cardHeight + paddingY * 2);

  const positionedNodes = nodes.map((node) => ({
    ...node,
    x: paddingX + (node.slot - minSlot) * slotSize,
    y: paddingY + generationPosition.get(node.generation) * rowSize,
    depth: Math.abs(node.generation)
  }));
  const rowsByGeneration = new Map();
  positionedNodes.forEach((node) => {
    if (!rowsByGeneration.has(node.generation)) rowsByGeneration.set(node.generation, []);
    rowsByGeneration.get(node.generation).push(node);
  });

  [...rowsByGeneration.keys()].sort((a, b) => a - b).forEach((generation) => {
    const row = rowsByGeneration.get(generation);
    const rowConnectionCount = edgesByKey.filter((edge) => {
      if (edge.kind === 'peer') return false;
      return row.some((node) => node.key === edge.fromKey || node.key === edge.toKey);
    }).length;
    // Dense generations get progressively more breathing room. The canvas is
    // intentionally allowed to grow horizontally; compressing these rows
    // makes the relationship lines impossible to follow.
    const rowCardGap = Math.min(
      cardMetrics.maxColumnGap || 56,
      Math.max(TREE_MIN_CARD_GAP, cardMetrics.columnGap + Math.ceil((row.length + rowConnectionCount) / 4) * 6)
    );
    const blocks = new Map();
    row.forEach((node) => {
      const parentKey = node.parentIds?.length ? [...node.parentIds].sort().join('|') : node.key;
      if (!blocks.has(parentKey)) blocks.set(parentKey, []);
      blocks.get(parentKey).push(node);
    });

    [...blocks.values()].forEach((block) => {
      block.sort((a, b) => a.x - b.x || comparePeopleByDate(a.person, b.person));
      const parentNodes = block[0].parentIds?.map((parentId) => positionedNodes.find((node) => node.id === parentId)).filter(Boolean) || [];
      if (parentNodes.length) {
        const parentCenter = parentNodes.reduce((sum, parent) => sum + parent.x + cardWidth / 2, 0) / parentNodes.length;
        const blockWidth = block.length * cardWidth + (block.length - 1) * rowCardGap;
        const start = parentCenter - blockWidth / 2;
        block.forEach((node, index) => { node.x = start + index * (cardWidth + rowCardGap); });
      }
    });

    // Partners are atomic visual blocks. Parent/sibling grouping may suggest
    // an initial position, but it must never split a couple apart.
    const partnerRoot = new Map(row.map((node) => [node.key, node.key]));
    const findPartnerRoot = (key) => {
      let current = key;
      while (partnerRoot.get(current) !== current) {
        partnerRoot.set(current, partnerRoot.get(partnerRoot.get(current)));
        current = partnerRoot.get(current);
      }
      return current;
    };
    edgesByKey
      .filter((edge) => edge.kind === 'peer' && partnerRoot.has(edge.fromKey) && partnerRoot.has(edge.toKey))
      .forEach((edge) => {
        const first = findPartnerRoot(edge.fromKey);
        const second = findPartnerRoot(edge.toKey);
        if (first !== second) partnerRoot.set(second, first);
      });

    const atomicBlocks = new Map();
    row.forEach((node) => {
      const root = findPartnerRoot(node.key);
      if (!atomicBlocks.has(root)) atomicBlocks.set(root, []);
      atomicBlocks.get(root).push(node);
    });
    [...atomicBlocks.values()].forEach((block) => {
      if (block.length < 2) return;
      block.sort((a, b) => a.x - b.x || comparePeopleByDate(a.person, b.person));
      const currentCenter = (Math.min(...block.map((node) => node.x)) + Math.max(...block.map((node) => node.x + cardWidth))) / 2;
      const blockWidth = block.length * cardWidth + (block.length - 1) * TREE_MIN_CARD_GAP;
      const start = currentCenter - blockWidth / 2;
      block.forEach((node, index) => { node.x = start + index * (cardWidth + TREE_MIN_CARD_GAP); });
    });

    const orderedBlocks = [...atomicBlocks.values()].sort((a, b) => Math.min(...a.map((node) => node.x)) - Math.min(...b.map((node) => node.x)));
    let nextAvailableX = Number.NEGATIVE_INFINITY;
    orderedBlocks.forEach((block) => {
      const minX = Math.min(...block.map((node) => node.x));
      const shift = Math.max(0, nextAvailableX - minX);
      block.forEach((node) => { node.x += shift; });
      nextAvailableX = Math.max(...block.map((node) => node.x + cardWidth + rowCardGap));
    });
  });

  width = Math.max(width, ...positionedNodes.map((node) => node.x + cardWidth + paddingX));
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
          from: { x: from.x + (fromLeft ? cardWidth : 0), y: from.y + cardHeight / 2 },
          to: { x: to.x + (fromLeft ? 0 : cardWidth), y: to.y + cardHeight / 2 }
        };
      }
      return {
        id: edge.id,
        kind: edge.kind || 'parentChild',
        fromKey: edge.fromKey,
        toKey: edge.toKey,
        from: { x: from.x + cardWidth / 2, y: from.y + cardHeight },
        to: { x: to.x + cardWidth / 2, y: to.y }
      };
    });

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    width,
    height,
    generationCount: orderedGenerations.length,
    cardMetrics
  };
};

const makeNodeGroups = (positionedNodes, groupNames = {}, cardMetrics = TREE_CARD_DEFAULT) => {
  const cardWidth = cardMetrics.width;
  const cardHeight = cardMetrics.height;
  const grouped = new Map();
  positionedNodes.forEach((node) => {
    if (!node.familyGroupId) return;
    if (!grouped.has(node.familyGroupId)) grouped.set(node.familyGroupId, []);
    grouped.get(node.familyGroupId).push(node);
  });
  return [...grouped.entries()]
    .map(([id, groupNodes]) => {
      const minX = Math.min(...groupNodes.map((node) => node.x));
      const maxX = Math.max(...groupNodes.map((node) => node.x + cardWidth));
      const minY = Math.min(...groupNodes.map((node) => node.y));
      const maxY = Math.max(...groupNodes.map((node) => node.y + cardHeight));
      const kind = groupNodes[0]?.relationGroup || 'family';
      return {
        id,
        kind,
        label: groupNames[id] || groupNodes[0]?.familyGroupLabel || 'Grupo familiar',
        x: minX - 16,
        y: minY - 20,
        width: maxX - minX + 32,
        height: maxY - minY + 36
      };
    })
    .filter((group) => group.width > cardWidth + 20 || ['sibling', 'partner', 'collateral'].includes(group.kind));
};

const relationGroupFromLabel = (label) => {
  if (!label) return 'family';
  const normalized = label.toLowerCase();
  if (normalized.includes('central')) return 'central';
  if (normalized.includes('pareja') || normalized.includes('partner')) return 'partner';
  if (normalized.includes('herman') || normalized.includes('sibling') || normalized.includes('brother') || normalized.includes('sister')) return 'sibling';
  if (normalized.includes('tío') || normalized.includes('tía') || normalized.includes('primo') || normalized.includes('prima') || normalized.includes('sobrino') || normalized.includes('sobrina') || normalized.includes('aunt') || normalized.includes('uncle') || normalized.includes('cousin') || normalized.includes('nephew') || normalized.includes('niece')) return 'collateral';
  if (normalized.includes('padre') || normalized.includes('madre') || normalized.includes('abuelo') || normalized.includes('abuela') || normalized.includes('ancestro') || normalized.includes('father') || normalized.includes('mother') || normalized.includes('parent') || normalized.includes('grand')) return 'ancestor';
  if (normalized.includes('hijo') || normalized.includes('hija') || normalized.includes('nieto') || normalized.includes('nieta') || normalized.includes('descendiente') || normalized.includes('son') || normalized.includes('daughter') || normalized.includes('child') || normalized.includes('descendant')) return 'descendant';
  return 'family';
};

const buildAncestorLayout = (db, rootId, options = {}, language = 'es', cardMetrics = TREE_CARD_DEFAULT) => {
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
    const rootSlot = ancestors.rootX;
    siblingIds.forEach((id, index) => {
      const key = `generation_${id}`;
      nodes.push({
        key,
        id,
        person: peopleById.get(id),
        generation: 0,
        slot: rootSlot - siblingIds.length + index,
        relationLabel: kinTerm(language, 'sibling', peopleById.get(id)),
        relationGroup: 'sibling',
        familyGroupId: 'focus_siblings',
        familyGroupLabel: translate(language, 'tree.siblings')
      });
      existingNodeIds.add(id);
      parentIds.forEach((parentId) => {
        const parentNode = nodes.find((node) => node.id === parentId);
        if (parentNode) edgeById.set(`${parentNode.key}_${key}`, { id: `${parentNode.key}_${key}`, kind: 'sibling', fromKey: parentNode.key, toKey: key });
      });
    });
    partnerIds.filter((id) => !siblingIds.includes(id)).forEach((id, index) => {
      const key = `generation_${id}`;
      nodes.push({
        key,
        id,
        person: peopleById.get(id),
        generation: 0,
        slot: rootSlot + index + 1,
        relationLabel: kinTerms[language]?.partner || kinTerms.es.partner,
        relationGroup: 'partner',
        familyGroupId: 'focus_partners',
        familyGroupLabel: translate(language, 'tree.partners')
      });
      existingNodeIds.add(id);
      if (partnerIds.includes(id)) edgeById.set(`${rootKey}_${key}_partner`, { id: `${rootKey}_${key}_partner`, kind: 'peer', fromKey: rootKey, toKey: key });
    });
  }

  const positioned = positionTreeNodes(nodes, [...edgeById.values()], cardMetrics);
  const uniqueAncestors = new Set(positioned.nodes.filter((node) => node.generation < 0).map((node) => node.id));
  const uniqueDescendants = new Set(positioned.nodes.filter((node) => node.generation > 0).map((node) => node.id));

  return {
    ...positioned,
    ancestorCount: uniqueAncestors.size,
    descendantCount: uniqueDescendants.size,
    allPeopleCount: positioned.nodes.length,
    groups: makeNodeGroups(positioned.nodes, {
      focus_siblings: translate(language, 'tree.siblings'),
      focus_partners: translate(language, 'tree.partners')
    }, cardMetrics)
  };
};

const sexKey = (person) => person?.sex === 'M' ? 'male' : person?.sex === 'F' ? 'female' : 'neutral';

const kinTerms = {
  es: {
    ancestor: {
      1: { male: 'Padre', female: 'Madre', neutral: 'Padre / madre' },
      2: { male: 'Abuelo', female: 'Abuela', neutral: 'Abuelo/a' },
      3: { male: 'Bisabuelo', female: 'Bisabuela', neutral: 'Bisabuelo/a' },
      4: { male: 'Tatarabuelo', female: 'Tatarabuela', neutral: 'Tatarabuelo/a' },
      5: { male: 'Trastatarabuelo', female: 'Trastatarabuela', neutral: 'Trastatarabuelo/a' },
      6: { male: 'Pentabuelo', female: 'Pentabuela', neutral: 'Pentabuelo/a' },
      7: { male: 'Hexabuelo', female: 'Hexabuela', neutral: 'Hexabuelo/a' },
      8: { male: 'Heptabuelo', female: 'Heptabuela', neutral: 'Heptabuelo/a' }
    },
    descendant: {
      1: { male: 'Hijo', female: 'Hija', neutral: 'Hijo / hija' },
      2: { male: 'Nieto', female: 'Nieta', neutral: 'Nieto/a' },
      3: { male: 'Bisnieto', female: 'Bisnieta', neutral: 'Bisnieto/a' },
      4: { male: 'Tataranieto', female: 'Tataranieta', neutral: 'Tataranieto/a' },
      5: { male: 'Trastataranieto', female: 'Trastataranieta', neutral: 'Trastataranieto/a' }
    },
    sibling: { male: 'Hermano', female: 'Hermana', neutral: 'Hermano/a' },
    auntUncle: { male: 'Tío', female: 'Tía', neutral: 'Tío/a' },
    cousin: { male: 'Primo', female: 'Prima', neutral: 'Primo/a' },
    nephew: { male: 'Sobrino', female: 'Sobrina', neutral: 'Sobrino/a' },
    partner: 'Pareja',
    central: 'Persona central',
    relative: 'Pariente',
    origin: 'Origen / sin padres',
    generation: (distance) => `Generación ${distance}`,
    ancestorFallback: (distance) => `Ancestro/a ${distance} generaciones`,
    descendantFallback: (distance) => `Descendiente ${distance} generaciones`
  },
  en: {
    ancestor: {
      1: { male: 'Father', female: 'Mother', neutral: 'Parent' },
      2: { male: 'Grandfather', female: 'Grandmother', neutral: 'Grandparent' },
      3: { male: 'Great-grandfather', female: 'Great-grandmother', neutral: 'Great-grandparent' }
    },
    descendant: {
      1: { male: 'Son', female: 'Daughter', neutral: 'Child' },
      2: { male: 'Grandson', female: 'Granddaughter', neutral: 'Grandchild' },
      3: { male: 'Great-grandson', female: 'Great-granddaughter', neutral: 'Great-grandchild' }
    },
    sibling: { male: 'Brother', female: 'Sister', neutral: 'Sibling' },
    auntUncle: { male: 'Uncle', female: 'Aunt', neutral: 'Aunt / uncle' },
    cousin: { male: 'Cousin', female: 'Cousin', neutral: 'Cousin' },
    nephew: { male: 'Nephew', female: 'Niece', neutral: 'Niece / nephew' },
    partner: 'Partner',
    central: 'Central person',
    relative: 'Relative',
    origin: 'Origin / no parents',
    generation: (distance) => `Generation ${distance}`,
    ancestorFallback: (distance) => `Ancestor ${distance} generations back`,
    descendantFallback: (distance) => `Descendant ${distance} generations down`
  }
};

const kinTerm = (language, key, person) => {
  const entry = kinTerms[language]?.[key] || kinTerms.es[key];
  if (typeof entry === 'string') return entry;
  return entry?.[sexKey(person)] || entry?.neutral || '';
};

const ancestorGenerationLabel = (distance, person, language = 'es') => {
  const entry = kinTerms[language]?.ancestor?.[distance] || kinTerms.es.ancestor[distance];
  return entry?.[sexKey(person)] || entry?.neutral || kinTerms[language]?.ancestorFallback(distance) || kinTerms.es.ancestorFallback(distance);
};

const descendantGenerationLabel = (distance, person, language = 'es') => {
  const entry = kinTerms[language]?.descendant?.[distance] || kinTerms.es.descendant[distance];
  return entry?.[sexKey(person)] || entry?.neutral || kinTerms[language]?.descendantFallback(distance) || kinTerms.es.descendantFallback(distance);
};

const relationshipMaps = (db, peopleById) => {
  const parentsByChild = new Map();
  const childrenByParent = new Map();
  const partnersById = new Map();
  db.parentChild.forEach((rel) => {
    if (!peopleById.has(rel.parentId) || !peopleById.has(rel.childId)) return;
    if (!parentsByChild.has(rel.childId)) parentsByChild.set(rel.childId, []);
    if (!childrenByParent.has(rel.parentId)) childrenByParent.set(rel.parentId, []);
    parentsByChild.get(rel.childId).push(rel.parentId);
    childrenByParent.get(rel.parentId).push(rel.childId);
  });
  db.partnerships.forEach((rel) => {
    if (!peopleById.has(rel.personAId) || !peopleById.has(rel.personBId)) return;
    if (!partnersById.has(rel.personAId)) partnersById.set(rel.personAId, []);
    if (!partnersById.has(rel.personBId)) partnersById.set(rel.personBId, []);
    partnersById.get(rel.personAId).push(rel.personBId);
    partnersById.get(rel.personBId).push(rel.personAId);
  });
  return { parentsByChild, childrenByParent, partnersById };
};

const distanceThrough = (startId, targetId, nextIds) => {
  if (!startId || !targetId) return null;
  const queue = [{ id: startId, distance: 0 }];
  const seen = new Set([startId]);
  while (queue.length) {
    const item = queue.shift();
    if (item.id === targetId && item.distance > 0) return item.distance;
    (nextIds(item.id) || []).forEach((id) => {
      if (seen.has(id)) return;
      seen.add(id);
      queue.push({ id, distance: item.distance + 1 });
    });
  }
  return null;
};

const kinshipLabel = ({ focusId, targetId, parentsByChild, childrenByParent, partnersById, peopleById, language = 'es' }) => {
  const target = peopleById?.get(targetId);
  if (!focusId || focusId === targetId) return focusId === targetId ? (kinTerms[language]?.central || kinTerms.es.central) : '';
  if ((partnersById.get(focusId) || []).includes(targetId)) return kinTerms[language]?.partner || kinTerms.es.partner;

  const ancestorDistance = distanceThrough(focusId, targetId, (id) => parentsByChild.get(id) || []);
  if (ancestorDistance) return ancestorGenerationLabel(ancestorDistance, target, language);
  const descendantDistance = distanceThrough(focusId, targetId, (id) => childrenByParent.get(id) || []);
  if (descendantDistance) return descendantGenerationLabel(descendantDistance, target, language);

  const focusParents = parentsByChild.get(focusId) || [];
  const targetParents = parentsByChild.get(targetId) || [];
  const sharesParent = focusParents.some((id) => targetParents.includes(id));
  if (sharesParent) return kinTerm(language, 'sibling', target);

  const siblingIds = [...new Set(focusParents.flatMap((parentId) => childrenByParent.get(parentId) || []))]
    .filter((id) => id !== focusId);
  const nephewIds = new Set(siblingIds.flatMap((id) => childrenByParent.get(id) || []));
  if (nephewIds.has(targetId)) return kinTerm(language, 'nephew', target);

  const auntUncleIds = new Set(focusParents.flatMap((parentId) => {
    const grandparents = parentsByChild.get(parentId) || [];
    return grandparents.flatMap((grandparentId) => childrenByParent.get(grandparentId) || []).filter((id) => id !== parentId);
  }));
  if (auntUncleIds.has(targetId)) return kinTerm(language, 'auntUncle', target);
  const cousinIds = new Set([...auntUncleIds].flatMap((id) => childrenByParent.get(id) || []));
  if (cousinIds.has(targetId)) return kinTerm(language, 'cousin', target);

  return kinTerms[language]?.relative || kinTerms.es.relative;
};

const buildAllPeopleLayout = (db, focusId, language = 'es', cardMetrics = TREE_CARD_DEFAULT) => {
  const peopleById = new Map(db.people.map((person) => [person.id, person]));
  const { parentsByChild, childrenByParent, partnersById } = relationshipMaps(db, peopleById);
  const graph = new Map(db.people.map((person) => [person.id, new Set()]));
  db.parentChild.forEach((rel) => {
    if (!peopleById.has(rel.parentId) || !peopleById.has(rel.childId)) return;
    graph.get(rel.parentId).add(rel.childId);
    graph.get(rel.childId).add(rel.parentId);
  });
  db.partnerships.forEach((rel) => {
    if (!peopleById.has(rel.personAId) || !peopleById.has(rel.personBId)) return;
    graph.get(rel.personAId).add(rel.personBId);
    graph.get(rel.personBId).add(rel.personAId);
  });

  const components = [];
  const seen = new Set();
  [...db.people].sort(comparePeopleByDate).forEach((person) => {
    if (seen.has(person.id)) return;
    const ids = [];
    const queue = [person.id];
    seen.add(person.id);
    while (queue.length) {
      const id = queue.shift();
      ids.push(id);
      [...(graph.get(id) || [])].sort((a, b) => comparePeopleByDate(peopleById.get(a), peopleById.get(b))).forEach((nextId) => {
        if (seen.has(nextId)) return;
        seen.add(nextId);
        queue.push(nextId);
      });
    }
    components.push(ids);
  });

  const nodes = [];
  const familyGroupNames = {};
  let componentOffset = 0;

  components
    .sort((a, b) => comparePeopleByDate(peopleById.get(a[0]), peopleById.get(b[0])))
    .forEach((componentIds, componentIndex) => {
      const componentSet = new Set(componentIds);
      const roots = componentIds
        .filter((id) => !(parentsByChild.get(id) || []).some((parentId) => componentSet.has(parentId)))
        .sort((a, b) => comparePeopleByDate(peopleById.get(a), peopleById.get(b)));
      const startIds = roots.length ? roots : [...componentIds].sort((a, b) => comparePeopleByDate(peopleById.get(a), peopleById.get(b))).slice(0, 1);
      const generationById = new Map(startIds.map((id) => [id, 0]));
      const queue = [...startIds];

      for (let index = 0; index < queue.length; index += 1) {
        const parentId = queue[index];
        const nextGeneration = (generationById.get(parentId) || 0) + 1;
        (childrenByParent.get(parentId) || [])
          .filter((id) => componentSet.has(id))
          .sort((a, b) => comparePeopleByDate(peopleById.get(a), peopleById.get(b)))
          .forEach((childId) => {
            if (!generationById.has(childId) || generationById.get(childId) < nextGeneration) generationById.set(childId, nextGeneration);
            if (!queue.includes(childId)) queue.push(childId);
          });
      }
      componentIds.forEach((id) => {
        if (!generationById.has(id)) generationById.set(id, 0);
      });

      // Collapse partners into the same generation group. From this point on,
      // only parent-child edges are allowed to change the generation level.
      const unionParent = new Map(componentIds.map((id) => [id, id]));
      const findGroup = (id) => {
        let current = id;
        while (unionParent.get(current) !== current) {
          unionParent.set(current, unionParent.get(unionParent.get(current)));
          current = unionParent.get(current);
        }
        return current;
      };
      const unionGroups = (firstId, secondId) => {
        const firstGroup = findGroup(firstId);
        const secondGroup = findGroup(secondId);
        if (firstGroup !== secondGroup) unionParent.set(secondGroup, firstGroup);
      };
      db.partnerships
        .filter((rel) => componentSet.has(rel.personAId) && componentSet.has(rel.personBId))
        .forEach((rel) => unionGroups(rel.personAId, rel.personBId));

      const groupChildren = new Map();
      const groupIncoming = new Map();
      componentIds.forEach((id) => {
        const group = findGroup(id);
        if (!groupChildren.has(group)) groupChildren.set(group, new Set());
        if (!groupIncoming.has(group)) groupIncoming.set(group, new Set());
      });
      db.parentChild
        .filter((rel) => componentSet.has(rel.parentId) && componentSet.has(rel.childId))
        .forEach((rel) => {
          const parentGroup = findGroup(rel.parentId);
          const childGroup = findGroup(rel.childId);
          if (parentGroup === childGroup) return;
          groupChildren.get(parentGroup).add(childGroup);
          groupIncoming.get(childGroup).add(parentGroup);
        });

      // Build levels outward from the focused person whenever possible. This
      // makes every parent-child hop exactly one generation, including when a
      // component has several roots. The previous root-first fallback could
      // leave stale depth values on intermediate groups and create visual gaps.
      const groupGeneration = new Map();
      const generationQueue = [];
      const focusedGroup = focusId && componentSet.has(focusId) ? findGroup(focusId) : null;
      if (focusedGroup) {
        groupGeneration.set(focusedGroup, 0);
        generationQueue.push(focusedGroup);
      } else {
        groupIncoming.forEach((incoming, group) => {
          if (!incoming.size) {
            groupGeneration.set(group, 0);
            generationQueue.push(group);
          }
        });
      }

      while (generationQueue.length) {
        const group = generationQueue.shift();
        const generation = groupGeneration.get(group);
        const neighbours = [
          ...[...(groupIncoming.get(group) || [])].map((parentGroup) => [parentGroup, generation - 1]),
          ...[...(groupChildren.get(group) || [])].map((childGroup) => [childGroup, generation + 1])
        ];
        neighbours.forEach(([nextGroup, nextGeneration]) => {
          if (groupGeneration.has(nextGroup)) return;
          groupGeneration.set(nextGroup, nextGeneration);
          generationQueue.push(nextGroup);
        });
      }

      // Cyclic or incomplete data is rare, but it should still render without
      // collapsing partner groups. Use the original graph depth only for
      // groups that were unreachable during the directed traversal.
      componentIds.forEach((id) => {
        const group = findGroup(id);
        if (!groupGeneration.has(group)) groupGeneration.set(group, generationById.get(id) || 0);
      });
      componentIds.forEach((id) => generationById.set(id, groupGeneration.get(findGroup(id)) || 0));

      const levels = new Map();
      componentIds.forEach((id) => {
        const generation = generationById.get(id) || 0;
        if (!levels.has(generation)) levels.set(generation, []);
        levels.get(generation).push(id);
      });

      const localSlotById = new Map();
      let componentWidth = 1;
      [...levels.entries()].sort((a, b) => a[0] - b[0]).forEach(([generation, ids]) => {
        const groups = new Map();
        ids.forEach((id) => {
          const parents = (parentsByChild.get(id) || []).filter((parentId) => componentSet.has(parentId) && generationById.get(parentId) < generation);
          const key = parents.length ? parents.sort().join('|') : `origin_${componentIndex}`;
          if (!groups.has(key)) groups.set(key, { key, parentIds: parents, ids: [] });
          groups.get(key).ids.push(id);
        });

        let cursor = 0;
        [...groups.values()]
          .map((group) => {
            group.ids.sort((a, b) => comparePeopleByDate(peopleById.get(a), peopleById.get(b)));
            const parentSlots = group.parentIds.map((id) => localSlotById.get(id)).filter((slot) => Number.isFinite(slot));
            const desiredCenter = parentSlots.length ? parentSlots.reduce((sum, slot) => sum + slot, 0) / parentSlots.length : cursor + (group.ids.length - 1) / 2;
            return { ...group, desiredCenter };
          })
          .sort((a, b) => a.desiredCenter - b.desiredCenter || comparePeopleByDate(peopleById.get(a.ids[0]), peopleById.get(b.ids[0])))
          .forEach((group) => {
            const groupWidth = Math.max(1, group.ids.length);
            const start = Math.max(cursor, group.desiredCenter - (groupWidth - 1) / 2);
            const familyGroupId = group.parentIds.length && group.ids.length > 1 ? `all_family_${componentIndex}_${group.key}` : '';
            if (familyGroupId) familyGroupNames[familyGroupId] = translate(language, 'tree.siblings');
            group.ids.forEach((id, index) => {
              localSlotById.set(id, start + index);
              const relationLabel = kinshipLabel({ focusId, targetId: id, parentsByChild, childrenByParent, partnersById, peopleById, language });
              const relationGroup = relationGroupFromLabel(relationLabel);
              nodes.push({
                key: `all_${id}`,
                id,
                person: peopleById.get(id),
                generation,
                slot: componentOffset + start + index,
                relationLabel: relationLabel || (generation === 0 ? translate(language, 'tree.familyGroup') : kinTerms[language]?.generation(generation + 1)),
                relationGroup: relationGroup === 'family' && group.parentIds.length ? 'sibling' : relationGroup,
                parentIds: group.parentIds,
                familyGroupId,
                familyGroupLabel: familyGroupId ? translate(language, 'tree.siblings') : ''
              });
            });
            cursor = start + groupWidth + TREE_GROUP_GAP_SLOTS;
            componentWidth = Math.max(componentWidth, cursor);
          });
      });

      const componentNodes = nodes.filter((node) => componentSet.has(node.id));
      db.partnerships
        .filter((rel) => componentSet.has(rel.personAId) && componentSet.has(rel.personBId))
        .forEach((rel) => {
          const first = componentNodes.find((node) => node.id === rel.personAId);
          const second = componentNodes.find((node) => node.id === rel.personBId);
          if (!first || !second || first.generation !== second.generation) return;
          const left = first.slot <= second.slot ? first : second;
          const right = left === first ? second : first;
          right.slot = left.slot + 0.92;
        });

      componentOffset += componentWidth + TREE_COMPONENT_GAP_SLOTS;
    });

  const simplifiedParentEdges = new Set();
  db.partnerships.forEach((partnership) => {
    const sharedChildren = db.parentChild
      .filter((rel) => rel.parentId === partnership.personAId && rel.childId && db.parentChild.some((other) => other.parentId === partnership.personBId && other.childId === rel.childId))
      .map((rel) => rel.childId);
    if (sharedChildren.length < 2) return;
    sharedChildren.forEach((childId) => simplifiedParentEdges.add(`${partnership.personBId}|${childId}`));
  });

  const edgesByKey = [
    ...db.parentChild
      .filter((rel) => peopleById.has(rel.parentId) && peopleById.has(rel.childId) && !simplifiedParentEdges.has(`${rel.parentId}|${rel.childId}`))
      .map((rel) => ({ id: `all_${rel.parentId}_${rel.childId}`, fromKey: `all_${rel.parentId}`, toKey: `all_${rel.childId}` })),
    ...db.partnerships
      .filter((rel) => peopleById.has(rel.personAId) && peopleById.has(rel.personBId))
      .map((rel) => ({ id: `all_${rel.personAId}_${rel.personBId}_partner`, kind: 'peer', fromKey: `all_${rel.personAId}`, toKey: `all_${rel.personBId}` }))
  ];

  const positioned = positionTreeNodes(nodes, edgesByKey, cardMetrics);
  return {
    ...positioned,
    ancestorCount: 0,
    descendantCount: 0,
    allPeopleCount: db.people.length,
    groups: makeNodeGroups(positioned.nodes, familyGroupNames, cardMetrics)
  };
};

const treeNodeLabel = (node, language = 'es') => {
  if (node.relationLabel) return node.relationLabel;
  if (node.generation === 0) return kinTerms[language]?.central || kinTerms.es.central;
  if (node.generation < 0) return ancestorGenerationLabel(Math.abs(node.generation), node.person, language);
  return descendantGenerationLabel(node.generation, node.person, language);
};

const cardToneFromLabel = (label = '') => {
  const normalized = String(label).toLowerCase();
  if (normalized.includes('central')) return 'central';
  if (normalized.includes('madre') || normalized.includes('mother')) return 'mother';
  if (normalized.includes('padre') || normalized.includes('father')) return 'father';
  if (normalized.includes('abuela') || normalized.includes('grandmother')) return 'grandmother';
  if (normalized.includes('abuelo') || normalized.includes('grandfather')) return 'grandfather';
  if (normalized.includes('bisabuela') || normalized.includes('great-grandmother')) return 'great-grandmother';
  if (normalized.includes('bisabuelo') || normalized.includes('great-grandfather')) return 'great-grandfather';
  if (normalized.includes('hija') || normalized.includes('daughter')) return 'daughter';
  if (normalized.includes('hijo') || normalized.includes('son')) return 'son';
  return 'family';
};

const allPeopleNodeLabel = (node, language = 'es') => {
  if (node.relationLabel) return node.relationLabel;
  if (node.generation === 0) return kinTerms[language]?.origin || kinTerms.es.origin;
  return kinTerms[language]?.generation(node.generation + 1) || kinTerms.es.generation(node.generation + 1);
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

const resolveTemporalCollisions = (nodes, cardMetrics = TREE_CARD_DEFAULT) => {
  const cardWidth = cardMetrics.width;
  const cardHeight = cardMetrics.height;
  const gap = Math.max(TREE_MIN_CARD_GAP, cardMetrics.columnGap * 0.35);
  const placed = [];

  // Place older/unknown rows first. Each card keeps its preferred x until it
  // intersects a card already placed in an overlapping temporal band.
  const ordered = [...nodes].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x || comparePeopleByDate(a.person, b.person);
  });

  ordered.forEach((node) => {
    let x = node.x;
    let conflict;
    do {
      conflict = placed.find((other) => {
        const verticalOverlap = node.y < other.y + cardHeight && node.y + cardHeight > other.y;
        const horizontalOverlap = x < other.x + cardWidth + gap && x + cardWidth + gap > other.x;
        return verticalOverlap && horizontalOverlap;
      });
      if (conflict) x = conflict.x + cardWidth + gap;
    } while (conflict);

    const positioned = { ...node, x };
    placed.push(positioned);
  });

  return nodes.map((node) => placed.find((placedNode) => placedNode.key === node.key) || node);
};

const routeTemporalEdges = (edges, nodes, cardMetrics = TREE_CARD_DEFAULT) => {
  const cardHeight = cardMetrics.height;
  const nodeByKey = new Map(nodes.map((node) => [node.key, node]));
  const parentGroups = new Map();
  edges.filter((edge) => edge.kind !== 'peer').forEach((edge) => {
    if (!parentGroups.has(edge.fromKey)) parentGroups.set(edge.fromKey, []);
    parentGroups.get(edge.fromKey).push(edge);
  });

  const groupLaneByBand = new Map();
  const busYByFromKey = new Map();
  parentGroups.forEach((group, fromKey) => {
    const from = nodeByKey.get(fromKey);
    const targets = group.map((edge) => nodeByKey.get(edge.toKey)).filter(Boolean);
    if (!from || !targets.length) return;
    const nearestTargetY = Math.min(...targets.map((target) => target.y));
    const availableGap = nearestTargetY - (from.y + cardHeight);
    const baseY = from.y + cardHeight + Math.max(12, Math.min(28, availableGap / 2));
    const band = Math.round(baseY / 20);
    const lane = groupLaneByBand.get(band) || 0;
    groupLaneByBand.set(band, lane + 1);
    busYByFromKey.set(fromKey, baseY + lane * 8);
  });

  return edges.map((edge) => {
    if (edge.kind === 'peer') return edge;
    const from = nodeByKey.get(edge.fromKey);
    const to = nodeByKey.get(edge.toKey);
    const busY = busYByFromKey.get(edge.fromKey);
    if (!from || !to || !Number.isFinite(busY)) return edge;
    return {
      ...edge,
      path: `M ${edge.from.x} ${edge.from.y} V ${busY} H ${edge.to.x} V ${edge.to.y}`
    };
  });
};

const buildTemporalLayout = (layout, cardMetrics = layout.cardMetrics || TREE_CARD_DEFAULT) => {
  const cardWidth = cardMetrics.width;
  const cardHeight = cardMetrics.height;
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
  const temporalNodes = layout.nodes.map((node) => {
    const birthYear = birthYearFor(node.person);
    return {
      ...node,
      birthYear,
      y: birthYear === null ? unknownY : TEMPORAL_TOP_PADDING + (birthYear - axisStartYear) * TEMPORAL_PIXELS_PER_YEAR
    };
  });
  const nodes = resolveTemporalCollisions(temporalNodes, cardMetrics);
  const nodeByKey = new Map(nodes.map((node) => [node.key, node]));
  const edges = layout.edges
    .filter((edge) => nodeByKey.has(edge.fromKey) && nodeByKey.has(edge.toKey))
    .map((edge) => {
      const from = nodeByKey.get(edge.fromKey);
      const to = nodeByKey.get(edge.toKey);
      return {
        ...edge,
        from: { x: from.x + cardWidth / 2, y: from.y + cardHeight },
        to: { x: to.x + cardWidth / 2, y: to.y }
      };
    });
  const routedEdges = routeTemporalEdges(edges, nodes, cardMetrics);

  const step = temporalTickStep(minYear, maxYear);
  const tickYears = new Set([minYear, maxYear]);
  for (let year = Math.ceil(minYear / step) * step; year <= maxYear; year += step) {
    tickYears.add(year);
  }
  const ticks = [...tickYears]
    .sort((a, b) => a - b)
    .map((year) => ({ year, y: TEMPORAL_TOP_PADDING + (year - axisStartYear) * TEMPORAL_PIXELS_PER_YEAR }));
  const width = Math.max(layout.width, ...nodes.map((node) => node.x + cardWidth + 42));
  const height = Math.max(layout.height, TEMPORAL_TOP_PADDING + rangeHeight + cardHeight + TEMPORAL_BOTTOM_PADDING);

  return {
    ...layout,
    nodes,
    edges: routedEdges,
    width,
    height,
    groups: [],
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

function AppLoader({ message = 'Abriendo tu árbol', animated = true }) {
  return (
    <main className={`loading ${animated ? 'loadingAnimated' : ''}`}>
      <div className="loadingCard" role={animated ? 'status' : 'alert'} aria-live="polite">
        <div className="loadingLogoWrap" aria-hidden="true">
          <span className="loadingRing" />
          <img className="loadingLogo" src="/raices-logo.png" alt="" />
        </div>
        <span>{message}</span>
      </div>
    </main>
  );
}

function PersonForm({ initial, people = [], showRelation = false, onCancel, onSave }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ ...blankPerson(), ...(initial || {}) });
  const [relationKind, setRelationKind] = useState('');
  const [relationPersonId, setRelationPersonId] = useState('');
  const imageInputRef = useRef(null);
  const relationOptions = people.filter((person) => person.id !== initial?.id).sort(comparePeopleByName);
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const setProfileImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const profileImage = await readProfileImage(file);
      setForm((prev) => ({ ...prev, profileImage }));
    } catch (error) {
      alert(error.message || t('errors.imageLoad'));
    } finally {
      event.target.value = '';
    }
  };
  const submit = (event) => {
    event.preventDefault();
    onSave(form, showRelation ? { kind: relationKind, personId: relationPersonId } : null);
  };
  return (
    <form onSubmit={submit} className="formStack">
      <div className="formGrid two">
        <label>{t('forms.names')}<input value={form.givenNames} onChange={set('givenNames')} autoFocus /></label>
        <label>{t('forms.surnames')}<input value={form.surnames} onChange={set('surnames')} /></label>
      </div>
      <div className="formGrid two">
        <label>{t('forms.birthYear')}<input value={form.birthDate} onChange={set('birthDate')} inputMode="numeric" placeholder={t('placeholders.birthYear')} /></label>
        {showRelation ? (
          relationOptions.length ? <label>{t('forms.relationship')}<select value={relationKind} onChange={(event) => setRelationKind(event.target.value)}><option value="">{t('forms.noLinkYet')}</option><option value="parent_of">{t('forms.parentOf')}</option><option value="child_of">{t('forms.childOf')}</option><option value="partner_of">{t('forms.partnerOf')}</option></select></label> : <label>{t('forms.relationship')}<input disabled placeholder={t('forms.noPiecesToLink')} /></label>
        ) : (
          <label>{t('forms.nickname')}<input value={form.nickname} onChange={set('nickname')} /></label>
        )}
      </div>
      {showRelation && relationOptions.length > 0 && <label>{t('forms.linkWith')}<select value={relationPersonId} onChange={(event) => setRelationPersonId(event.target.value)}><option value="">{t('forms.choosePiece')}</option>{relationOptions.map((person) => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></label>}
      <details className="moreData">
        <summary>{t('forms.moreData')}</summary>
        <div className="moreDataBody">
          <div className="profileImageField">
            <PersonAvatar person={form} large />
            <div>
              <span>{t('forms.profileImage')}</span>
              <div className="buttonRow compact">
                <button type="button" className="secondaryButton" onClick={() => imageInputRef.current?.click()}>{t('actions.uploadImage')}</button>
                {form.profileImage && <button type="button" className="textButton" onClick={() => setForm((prev) => ({ ...prev, profileImage: '' }))}>{t('actions.remove')}</button>}
              </div>
              <input ref={imageInputRef} hidden type="file" accept="image/*" onChange={setProfileImage} />
            </div>
          </div>
          {showRelation && <label>{t('forms.nickname')}<input value={form.nickname} onChange={set('nickname')} /></label>}
          <label>{t('forms.email')}<input type="email" value={form.email} onChange={set('email')} placeholder={t('placeholders.email')} /></label>
          <div className="formGrid two">
            <label>{t('forms.sex')}<select value={form.sex} onChange={set('sex')}><option value="">{t('forms.unspecified')}</option><option value="M">{t('forms.male')}</option><option value="F">{t('forms.female')}</option><option value="X">{t('forms.otherGender')}</option></select></label>
            <label>{t('forms.birthPlace')}<input value={form.birthPlace} onChange={set('birthPlace')} placeholder={t('placeholders.birthPlace')} /></label>
          </div>
          <div className="formGrid two">
            <label>{t('forms.death')}<input type="date" value={form.deathDate} onChange={set('deathDate')} /></label>
            <label>{t('forms.deathPlace')}<input value={form.deathPlace} onChange={set('deathPlace')} /></label>
          </div>
          <label>{t('forms.occupation')}<input value={form.occupation} onChange={set('occupation')} /></label>
          <label>{t('forms.notes')}<textarea rows="5" value={form.notes} onChange={set('notes')} placeholder={t('placeholders.notes')} /></label>
        </div>
      </details>
      <div className="modalActions"><button type="button" className="secondaryButton" onClick={onCancel}>{t('actions.cancel')}</button><button className="primaryButton">{t('actions.savePiece')}</button></div>
    </form>
  );
}

function EmptyState({ onAdd }) {
  const { t } = useI18n();
  return (
    <div className="emptyState">
      <div className="emptyMark"><img src="/raices-logo.png" alt="" /></div>
      <h2>{t('empty.title')}</h2>
      <p>{t('empty.body')}</p>
      {onAdd && <button className="primaryButton" onClick={onAdd}>{t('empty.firstPiece')}</button>}
    </div>
  );
}

function PersonPicker({ people, excludeId, onPick, label }) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const options = people.filter((p) => p.id !== excludeId).sort(comparePeopleByName);
  return (
    <div className="pickerRow">
      <select value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">{t('drawer.choosePerson')}</option>
        {options.map((p) => <option key={p.id} value={p.id}>{displayName(p)}</option>)}
      </select>
      <button className="secondaryButton" disabled={!value} onClick={() => { onPick(value); setValue(''); }}>{label}</button>
    </div>
  );
}

function PersonDrawer({ db, person, mode, onModeChange, onClose, onSave, onFocus, onLink, onDelete, onRemoveRelation, onAddEvent, canEdit = true }) {
  const { language, t } = useI18n();
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
      <aside className={`personDrawer ${personStatusClass(person)}`} onMouseDown={(event) => event.stopPropagation()} aria-label={t('drawer.personalFile')}>
        <div className="drawerHeader">
          <div>
            <p className="eyebrow">{isEditing ? t('drawer.editMode') : t('drawer.viewMode')}</p>
            <h2>{isEditing ? t('drawer.editPerson') : t('drawer.personalFile')}</h2>
          </div>
          <div className="drawerHeaderActions">
            <span className={`modePill ${isEditing ? 'editing' : 'viewing'}`}>{isEditing ? t('drawer.editing') : t('drawer.view')}</span>
            {canEdit && <button className="iconButton dangerIcon" type="button" onClick={onDelete} title={t('drawer.deletePerson')} aria-label={t('drawer.deletePerson')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 6h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 6v14a2 2 0 002 2h4a2 2 0 002-2V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>}
            <button className="iconButton" onClick={onClose}>×</button>
          </div>
        </div>

        {isEditing ? <div className="drawerEdit">
          <div className="modeNotice editing">{t('drawer.editingNotice')}</div>
          <PersonForm initial={person} onCancel={() => onModeChange('view')} onSave={(form) => onSave(person.id, form)} />
        </div> : <div className="drawerView">
          <div className="modeNotice viewing">{t('drawer.viewingNotice')}</div>
          <div className="detailTop">
            <PersonAvatar person={person} large />
            <div><p className="eyebrow">{t('drawer.person')}</p><h2>{displayName(person)}</h2><p className="muted">{life || t('drawer.datesToResearch')}</p><span className={`statusPill ${personStatusClass(person)}`}>{personStatusLabel(person, language)}</span></div>
          </div>
          <div className="detailActions">{canEdit && <button className="secondaryButton" onClick={() => onModeChange('edit')}>{t('actions.edit')}</button>}<button className="secondaryButton" onClick={() => openInTree()}>{t('actions.viewInTree')}</button></div>
          <dl className="factList">
            <div><dt>{t('facts.nickname')}</dt><dd>{displayField(person.nickname)}</dd></div>
            <div><dt>{t('facts.email')}</dt><dd>{person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : '-'}</dd></div>
            <div><dt>{t('facts.birth')}</dt><dd>{[person.birthDate, person.birthPlace].filter(Boolean).join(' · ') || '-'}</dd></div>
            <div><dt>{t('facts.death')}</dt><dd>{[person.deathDate, person.deathPlace].filter(Boolean).join(' · ') || '-'}</dd></div>
            <div><dt>{t('facts.occupation')}</dt><dd>{displayField(person.occupation)}</dd></div>
            <div><dt>{t('facts.notes')}</dt><dd>{displayField(person.notes)}</dd></div>
          </dl>
          <section className="detailSection"><div className="sectionTitle"><h3>{t('drawer.family')}</h3></div>
            <RelationList title={t('drawer.parents')} kind="parent" people={[...rel.parents].sort(comparePeopleByDate)} onOpen={openInTree} onRemove={canEdit ? onRemoveRelation : undefined} />
            {canEdit && <PersonPicker people={db.people} excludeId={person.id} onPick={(id) => onLink('parent', id)} label={t('drawer.addParent')} />}
            <RelationList title={t('drawer.partners')} kind="partner" people={[...rel.partners].sort(comparePeopleByDate)} onOpen={openInTree} onRemove={canEdit ? onRemoveRelation : undefined} />
            {canEdit && <PersonPicker people={db.people} excludeId={person.id} onPick={(id) => onLink('partner', id)} label={t('drawer.addPartner')} />}
            <RelationList title={t('drawer.children')} kind="child" people={[...rel.children].sort(comparePeopleByDate)} onOpen={openInTree} onRemove={canEdit ? onRemoveRelation : undefined} />
            {canEdit && <PersonPicker people={db.people} excludeId={person.id} onPick={(id) => onLink('child', id)} label={t('drawer.addChild')} />}
          </section>
          <section className="detailSection"><div className="sectionTitle"><h3>{t('drawer.timeline')}</h3>{canEdit && <button className="textButton" onClick={onAddEvent}>{t('actions.add')}</button>}</div>
            {timeline.length ? <ol className="timelineList">{timeline.map((event) => <li key={event.id} className="timelineItem"><span className="timelineDot" /><div><strong>{event.type}</strong><span>{[event.date, event.place].filter(Boolean).join(' · ') || t('tree.noDate')}</span>{event.description && <p>{event.description}</p>}</div></li>)}</ol> : <p className="muted small">{t('drawer.noEvents')}</p>}
          </section>
        </div>}
      </aside>
    </div>
  );
}

function RelationList({ title, people, onOpen, onRemove, kind }) {
  const { t } = useI18n();
  if (!people.length) return <div className="relationBlock"><span>{title}</span><em>{t('drawer.noData')}</em></div>;
  return (
    <div className="relationBlock">
      <span>{title}</span>
      <div>
        {people.map((p) => (
          <div key={p.id} className={`relationChip ${personStatusClass(p)}`}>
            <button type="button" className="relationChipName" onClick={() => onOpen(p.id)}>{displayName(p)}</button>
            {onRemove && <button type="button" className="relationChipRemove" onClick={(event) => { event.stopPropagation(); onRemove(kind, p.id); }} title={t('drawer.removeLink')} aria-label={t('drawer.removeLink')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 6h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 6v14a2 2 0 002 2h4a2 2 0 002-2V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
          </div>
        ))}
      </div>
    </div>
  );
}

const currentTreeCardMetrics = () => {
  if (typeof window === 'undefined') return TREE_CARD_DEFAULT;
  return window.matchMedia('(max-width: 760px) and (orientation: portrait)').matches
    ? TREE_CARD_VARIANTS.portrait
    : TREE_CARD_VARIANTS.landscape;
};

function useTreeCardMetrics() {
  const [metrics, setMetrics] = useState(TREE_CARD_DEFAULT);

  useEffect(() => {
    const update = () => setMetrics(currentTreeCardMetrics());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return metrics;
}

function TreeCard({ person, label, relationGroup = 'family', sourceCount = 0, cardVariant = 'landscape', onOpen, onFocus, focal = false, style }) {
  const { language, t } = useI18n();
  const clickTimerRef = useRef(null);

  useEffect(() => () => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
  }, []);

  if (!person) return null;
  const hasName = Boolean(String(person.givenNames || person.surnames || person.nickname || '').trim());
  const hasBirthDate = Boolean(String(person.birthDate || '').trim());
  const familyBranch = String(person.surnames || '').trim().split(/\s+/)[0] || '';
  const hasBranch = Boolean(familyBranch);
  const hasImage = Boolean(person.profileImage);
  const cardTone = cardToneFromLabel(label);

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
    <button className={`treeCard treeNode treeCard-${cardVariant} cardTone-${cardTone} ${hasImage ? 'hasImage' : 'isEmpty'} ${personStatusClass(person)} ${relationGroup} ${focal ? 'focal' : ''}`} style={style} onPointerDown={(e) => e.stopPropagation()} onClick={handleClick} onDoubleClick={handleDoubleClick} title={t('tree.cardTitle')}>
      <span className={`lifeDot ${personStatusClass(person)}`} aria-label={personStatusLabel(person, language)} title={personStatusLabel(person, language)} />
      <span className="treeCardMenu" aria-hidden="true"><MoreHorizontal size={18} strokeWidth={2.4} /></span>
      <span className="treePortraitFrame">
        {hasImage ? <img src={person.profileImage} alt="" /> : <span className="treePortraitPlaceholder"><UserCircle size={42} strokeWidth={1.35} aria-hidden="true" /></span>}
      </span>

      <span className="treeCardBody">
        <span className="treeCardTopline">
          <span className="treeLabel"><UsersRound size={12} strokeWidth={2.25} aria-hidden="true" />{label}</span>
          {sourceCount > 0 && <span className="treeCardSourceBadge" title={t('card.sources')}><BookOpen size={11} strokeWidth={2.2} aria-hidden="true" />{sourceCount}</span>}
        </span>
        <strong className="treeCardName">{hasName ? displayName(person) : t('card.missingName')}</strong>
        <span className="treeCardDetails">
          <span className="treeCardFact">
            <CalendarDays size={13} strokeWidth={2.2} aria-hidden="true" />
            <span><em>{t('card.birthDate')}</em><b>{hasBirthDate ? person.birthDate : t('tree.noDate')}</b></span>
          </span>
          <span className="treeCardMetaItem branchMeta">
            <Sprout size={13} strokeWidth={2.2} aria-hidden="true" />
            <span><em>{t('card.familyBranch')}</em><b>{hasBranch ? familyBranch : t('card.noBranch')}</b></span>
          </span>
        </span>
      </span>
    </button>
  );
}

function TreeView({ db, focusedId, setFocusedId, onOpenPerson, onAdd }) {
  const { language, t } = useI18n();
  const cardMetrics = useTreeCardMetrics();
  const person = db.people.find((p) => p.id === focusedId) || db.people[0];
  const [viewport, setViewport] = useState({ x: 24, y: 18, scale: 0.92 });
  const [showAllPeople, setShowAllPeople] = useState(false);
  const [showAncestors, setShowAncestors] = useState(true);
  const [showDescendants, setShowDescendants] = useState(true);
  const [showGeneration, setShowGeneration] = useState(false);
  const [temporalScale, setTemporalScale] = useState(false);
  const [isCanvasMaximized, setCanvasMaximized] = useState(false);
  const [canvasBackground, setCanvasBackground] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const dragRef = useRef(null);
  const canvasRef = useRef(null);
  const backgroundInputRef = useRef(null);
  const baseLayout = useMemo(() => showAllPeople ? buildAllPeopleLayout(db, person?.id, language, cardMetrics) : buildAncestorLayout(db, person?.id, { showAncestors, showDescendants, showGeneration }, language, cardMetrics), [db, person?.id, showAllPeople, showAncestors, showDescendants, showGeneration, language, cardMetrics]);
  const layout = useMemo(() => temporalScale ? buildTemporalLayout(baseLayout, cardMetrics) : baseLayout, [baseLayout, temporalScale, cardMetrics]);
  const sourceCountByPerson = useMemo(() => {
    const counts = new Map();
    db.citations.forEach((citation) => {
      if (!citation.personId) return;
      counts.set(citation.personId, (counts.get(citation.personId) || 0) + 1);
    });
    return counts;
  }, [db.citations]);

  const fitActiveCards = () => {
    const canvas = canvasRef.current;
    if (!canvas || !layout.nodes.length) {
      setViewport({ x: 24, y: 18, scale: 0.92 });
      return;
    }

    const xOffset = temporalScale && layout.temporal ? TEMPORAL_AXIS_WIDTH + TEMPORAL_AXIS_GAP : 0;
    const bounds = layout.nodes.reduce((acc, node) => ({
      minX: Math.min(acc.minX, node.x),
      minY: Math.min(acc.minY, node.y),
      maxX: Math.max(acc.maxX, node.x + cardMetrics.width),
      maxY: Math.max(acc.maxY, node.y + cardMetrics.height)
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    const canvasWidth = Math.max(1, canvas.clientWidth - xOffset);
    const canvasHeight = Math.max(1, canvas.clientHeight);
    const padding = Math.max(14, Math.min(42, Math.min(canvasWidth, canvasHeight) * 0.045));
    const availableWidth = Math.max(1, canvasWidth - padding * 2);
    const availableHeight = Math.max(1, canvasHeight - padding * 2);
    const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
    const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(
      1.08,
      availableWidth / contentWidth,
      availableHeight / contentHeight
    );
    const nextScale = Number.isFinite(scale) && scale > 0 ? scale : 0.92;
    const contentCenterX = bounds.minX + contentWidth / 2;
    const contentCenterY = bounds.minY + contentHeight / 2;

    setViewport({
      x: canvasWidth / 2 - contentCenterX * nextScale,
      y: canvasHeight / 2 - contentCenterY * nextScale,
      scale: nextScale
    });
  };

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
    const frame = requestAnimationFrame(fitActiveCards);
    return () => cancelAnimationFrame(frame);
  }, [layout, temporalScale]);

  useEffect(() => {
    if (!isCanvasMaximized) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') setCanvasMaximized(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow || '';
    };
  }, [isCanvasMaximized]);

  if (!person) return <EmptyState onAdd={onAdd} />;

  // Remove hard zoom limits: allow free scaling
  const setZoom = (nextScale) => {
    setViewport((prev) => ({ ...prev, scale: nextScale }));
  };

  // Enhanced pointer handling to support pan and pinch-to-zoom
  const onPointerDown = (event) => {
    // initialize pointers map if not present
    if (!dragRef.current) dragRef.current = { pointers: new Map(), pinch: null };
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    dragRef.current.pointers.set(event.pointerId, { x, y, clientX: event.clientX, clientY: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);

    if (dragRef.current.pointers.size === 1) {
      // start pan
      const point = dragRef.current.pointers.values().next().value;
      dragRef.current.pan = { startX: point.clientX, startY: point.clientY, originX: viewport.x, originY: viewport.y };
    } else if (dragRef.current.pointers.size === 2) {
      // start pinch
      const iter = dragRef.current.pointers.values();
      const a = iter.next().value;
      const b = iter.next().value;
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const distance = Math.hypot(dx, dy) || 1;
      const centerClientX = (a.clientX + b.clientX) / 2;
      const centerClientY = (a.clientY + b.clientY) / 2;
      // compute center in canvas coordinates
      const rectLocal = event.currentTarget.getBoundingClientRect();
      const centerX = centerClientX - rectLocal.left;
      const centerY = centerClientY - rectLocal.top;
      dragRef.current.pinch = { distance, centerX, centerY, startScale: viewport.scale };
    }
  };

  const onPointerMove = (event) => {
    if (!dragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const entry = dragRef.current.pointers.get(event.pointerId);
    if (entry) {
      entry.clientX = event.clientX;
      entry.clientY = event.clientY;
      entry.x = event.clientX - rect.left;
      entry.y = event.clientY - rect.top;
    }

    if (dragRef.current.pinch) {
      // update pinch
      const vals = Array.from(dragRef.current.pointers.values());
      if (vals.length < 2) return;
      const a = vals[0];
      const b = vals[1];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const distance = Math.hypot(dx, dy) || 1;
      const factor = distance / dragRef.current.pinch.distance;
      const newScale = dragRef.current.pinch.startScale * factor;

      // Compute world coordinate of pinch center and adjust x/y so center stays under fingers
      const centerClientX = (a.clientX + b.clientX) / 2;
      const centerClientY = (a.clientY + b.clientY) / 2;
      const containerRect = event.currentTarget.getBoundingClientRect();
      const containerX = centerClientX - containerRect.left;
      const containerY = centerClientY - containerRect.top;

      const worldX = (containerX - viewport.x) / viewport.scale;
      const worldY = (containerY - viewport.y) / viewport.scale;
      const newX = containerX - worldX * newScale;
      const newY = containerY - worldY * newScale;

      setViewport((prev) => ({ ...prev, scale: newScale, x: newX, y: newY }));
      return;
    }

    // pan if single pointer
    if (dragRef.current.pan && dragRef.current.pointers.size === 1) {
      const p = dragRef.current.pointers.values().next().value;
      const pan = dragRef.current.pan;
      setViewport((prev) => ({ ...prev, x: pan.originX + (p.clientX - pan.startX), y: pan.originY + (p.clientY - pan.startY) }));
    }
  };

  const onPointerUp = (event) => {
    if (!dragRef.current) return;
    dragRef.current.pointers.delete(event.pointerId);
    if (dragRef.current.pointers.size < 2) dragRef.current.pinch = null;
    if (dragRef.current.pointers.size === 0) dragRef.current = null;
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
      title: showAllPeople ? `${db.settings.treeName} · ${t('actions.allPieces')}` : `${db.settings.treeName} · ${displayName(person)}`,
      temporalScale,
      canvasBackground,
      language
    });
  };

  return (
    <div className={`treeWorkspace ${isCanvasMaximized ? 'canvasMaximized' : ''} ${toolsOpen ? 'toolsOpen' : 'toolsCollapsed'}`}>
      <div className={`treeToolbar ${toolsOpen ? 'toolsOpen' : 'toolsCollapsed'}`}>
        <button className="canvasToolsToggle secondaryButton iconTextButton" type="button" onClick={() => setToolsOpen((value) => !value)} aria-expanded={toolsOpen} aria-controls="treeCanvasTools">
          <SlidersHorizontal size={16} strokeWidth={2} aria-hidden="true" />
          <span>{toolsOpen ? t('actions.hideTools') : t('actions.tools')}</span>
        </button>
        <div className="treeScope">
          <label>
            <span>{t('tree.branch')}</span>
            <select value={person.id} onChange={(e) => { setShowAllPeople(false); setFocusedId(e.target.value); }}>{[...db.people].sort(comparePeopleByName).map((p) => <option key={p.id} value={p.id}>{displayName(p)}</option>)}</select>
          </label>
          <button className={`secondaryButton iconTextButton ${showAllPeople ? 'activeToggle' : ''}`} type="button" onClick={() => setShowAllPeople((value) => !value)}>
            <UsersRound size={16} strokeWidth={2} aria-hidden="true" />
            <span>{showAllPeople ? t('actions.focusedBranch') : t('actions.allPieces')}</span>
          </button>
        </div>
        <div className="treeControls" id="treeCanvasTools">
          {!showAllPeople && <div className="treeFilterChecks" aria-label={t('tree.filters')}>
            <label data-short="Asc."><input type="checkbox" checked={showAncestors} onChange={(event) => setShowAncestors(event.target.checked)} /> {t('tree.ancestry')}</label>
            <label data-short="Desc."><input type="checkbox" checked={showDescendants} onChange={(event) => setShowDescendants(event.target.checked)} /> {t('tree.descendants')}</label>
            <label data-short="Gen."><input type="checkbox" checked={showGeneration} onChange={(event) => setShowGeneration(event.target.checked)} /> {t('tree.generation')}</label>
          </div>}
          <div className="zoomControls" aria-label={t('tree.tools')}>
            <button className={`secondaryButton iconTextButton ${temporalScale ? 'activeToggle' : ''}`} type="button" onClick={() => setTemporalScale((value) => !value)} title={t('tree.temporalScale')}>
              <Hourglass size={16} strokeWidth={2} aria-hidden="true" />
              <span>{t('tree.scale')}</span>
            </button>
            <button className={`iconButton ${isCanvasMaximized ? 'activeToggle' : ''}`} type="button" onClick={() => setCanvasMaximized((value) => !value)} title={isCanvasMaximized ? t('tree.restore') : t('tree.maximize')} aria-label={isCanvasMaximized ? t('tree.restore') : t('tree.maximize')}>
              {isCanvasMaximized ? <Minimize2 size={18} strokeWidth={2} aria-hidden="true" /> : <Maximize2 size={18} strokeWidth={2} aria-hidden="true" />}
            </button>
            <button className={`iconButton ${canvasBackground ? 'activeToggle' : ''}`} type="button" onClick={() => backgroundInputRef.current?.click()} title={t('tree.background')} aria-label={t('tree.changeBackground')}>
              <ImageIcon size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            {canvasBackground && <button className="textButton compactTextButton" type="button" onClick={() => setCanvasBackground('')}>{t('actions.remove')}</button>}
            <input ref={backgroundInputRef} hidden type="file" accept="image/*" onChange={loadCanvasBackground} />
            <button className="iconButton" type="button" onClick={exportCurrentCanvasPdf} title={t('actions.exportPdf')} aria-label={t('actions.exportPdf')}>
              <FileDown size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button className="iconButton" type="button" onClick={() => setZoom(viewport.scale - 0.12)} title={t('tree.zoomOut')} aria-label={t('tree.zoomOut')}>
              <ZoomOut size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <span>{Math.round(viewport.scale * 100)}%</span>
            <button className="iconButton" type="button" onClick={() => setZoom(viewport.scale + 0.12)} title={t('tree.zoomIn')} aria-label={t('tree.zoomIn')}>
              <ZoomIn size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button className="iconButton" type="button" onClick={fitActiveCards} title={t('tree.center')} aria-label={t('tree.center')}>
              <LocateFixed size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <div ref={canvasRef} className={`treeCanvas ${temporalScale ? 'temporalCanvas' : ''} ${canvasBackground ? 'hasCanvasBackground' : ''}`} style={canvasBackground ? { '--canvas-bg-image': `url(${canvasBackground})` } : undefined} onWheel={(event) => { event.preventDefault(); setZoom(viewport.scale + (event.deltaY > 0 ? -0.08 : 0.08)); }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        {temporalScale && layout.temporal && <div className="temporalGuideLayer" aria-hidden="true">
          {layout.temporal.ticks.map((tick, index) => <div key={tick.year} className={`temporalGuideLine ${index % 2 ? 'alternate' : ''}`} style={{ top: viewport.y + tick.y * viewport.scale }} />)}
          {layout.temporal.hasUnknownDates && <div className="temporalGuideLine unknown" style={{ top: viewport.y + layout.temporal.unknownY * viewport.scale }} />}
        </div>}
        {temporalScale && layout.temporal && <div className="temporalAxis" aria-hidden="true">
          <div className="temporalAxisTitle">{t('tree.birthAxis')}</div>
          <div className="temporalAxisLine" />
          {layout.temporal.ticks.map((tick) => <div key={tick.year} className="temporalTick" style={{ top: viewport.y + tick.y * viewport.scale }}><span>{tick.year}</span></div>)}
          {layout.temporal.hasUnknownDates && <div className="temporalTick unknown" style={{ top: viewport.y + layout.temporal.unknownY * viewport.scale }}><span>{t('tree.unknownDate')}</span></div>}
        </div>}
        <div className="canvasFloatingControls">
          {onAdd && <button className="primaryButton canvasNewPieceButton" type="button" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onClick={onAdd}>
            {t('actions.newPiece')}
          </button>}
          <button className={`iconButton canvasMaximizeButton ${isCanvasMaximized ? 'activeToggle' : ''}`} type="button" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onClick={() => setCanvasMaximized((value) => !value)} title={isCanvasMaximized ? t('tree.restore') : t('tree.maximize')} aria-label={isCanvasMaximized ? t('tree.restore') : t('tree.maximize')}>
            {isCanvasMaximized ? <Minimize2 size={18} strokeWidth={2} aria-hidden="true" /> : <Maximize2 size={18} strokeWidth={2} aria-hidden="true" />}
          </button>
        </div>
        <div className="treePanLayer" style={{ transform: `translate(${viewport.x + (temporalScale && layout.temporal ? TEMPORAL_AXIS_WIDTH + TEMPORAL_AXIS_GAP : 0)}px, ${viewport.y}px) scale(${viewport.scale})` }}>
          <div className="treeContent" style={{ width: layout.width, height: layout.height, '--tree-card-width': `${cardMetrics.width}px`, '--tree-card-height': `${cardMetrics.height}px` }}>
            {(layout.groups || []).map((group) => <div key={group.id} className={`familyGroupBand ${group.kind}`} style={{ left: group.x, top: group.y, width: group.width, height: group.height }}><span>{group.label}</span></div>)}
            <svg className="treeLines" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
              {layout.edges.map((edge) => {
                if (edge.path) return <path key={edge.id} className="familyLine temporalRoutedLine" d={edge.path} />;
                if (edge.kind === 'peer') {
                  return <path key={edge.id} className="peerLine" d={`M ${edge.from.x} ${edge.from.y} C ${edge.from.x + (edge.to.x - edge.from.x) / 2} ${edge.from.y}, ${edge.from.x + (edge.to.x - edge.from.x) / 2} ${edge.to.y}, ${edge.to.x} ${edge.to.y}`} />;
                }
                const middleY = edge.from.y + (edge.to.y - edge.from.y) / 2;
                return <path key={edge.id} className={edge.kind === 'sibling' ? 'siblingLine' : 'familyLine'} d={`M ${edge.from.x} ${edge.from.y} C ${edge.from.x} ${middleY}, ${edge.to.x} ${middleY}, ${edge.to.x} ${edge.to.y}`} />;
              })}
            </svg>
            {layout.nodes.map((node) => {
              const label = showAllPeople ? allPeopleNodeLabel(node, language) : treeNodeLabel(node, language);
              return <TreeCard key={node.key} person={node.person} label={label} relationGroup={node.relationGroup || relationGroupFromLabel(label)} sourceCount={sourceCountByPerson.get(node.id) || 0} cardVariant={cardMetrics.variant} focal={!showAllPeople && node.id === person.id} onOpen={onOpenPerson} onFocus={(id) => { setShowAllPeople(false); setFocusedId(id); }} style={{ left: node.x, top: node.y }} />;
            })}
          </div>
        </div>
      </div>
      <p className="treeHint">{t('tree.hint')}</p>
    </div>
  );
}

function PublicContributionForm({ db, initialPersonId = '', onClose }) {
  const { t } = useI18n();
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
    <Modal title={t('public.contribute')} onClose={onClose}>
      <form className="formStack puzzleForm" onSubmit={submit}>
        <div className="modeNotice viewing">{t('public.contributionIntro')}</div>
        <label>{t('public.yourContact')}<input value={contributor} onChange={(event) => setContributor(event.target.value)} placeholder={t('public.optional')} /></label>
        <div className="segmentedControl">
          <button type="button" className={kind === 'edit_person' ? 'active' : ''} onClick={() => setKind('edit_person')}>{t('public.suggestEdit')}</button>
          <button type="button" className={kind === 'add_person' ? 'active' : ''} onClick={() => setKind('add_person')}>{t('public.addPiece')}</button>
        </div>
        {kind === 'edit_person' && <label>{t('public.personToEdit')}<select value={targetPersonId} onChange={(event) => setTargetPersonId(event.target.value)}><option value="">{t('forms.choosePiece')}</option>{[...db.people].sort(comparePeopleByName).map((person) => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></label>}
        {kind === 'add_person' && <div className="formGrid two">
          <label>{t('public.suggestedRelation')}<select value={relationKind} onChange={(event) => setRelationKind(event.target.value)}><option value="">{t('forms.noLinkYet')}</option><option value="parent_of">{t('forms.parentOf')}</option><option value="child_of">{t('forms.childOf')}</option><option value="partner_of">{t('forms.partnerOf')}</option></select></label>
          <label>{t('public.relatedPerson')}<select value={relationPersonId} onChange={(event) => setRelationPersonId(event.target.value)}><option value="">{t('forms.choosePiece')}</option>{[...db.people].sort(comparePeopleByName).map((person) => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></label>
        </div>}
        <div className="formGrid two">
          <label>{t('forms.names')}<input value={form.givenNames} onChange={set('givenNames')} /></label>
          <label>{t('forms.surnames')}<input value={form.surnames} onChange={set('surnames')} /></label>
        </div>
        <div className="formGrid two">
          <label>{t('forms.birthYear')}<input value={form.birthDate} onChange={set('birthDate')} inputMode="numeric" placeholder={t('placeholders.birthYear')} /></label>
        </div>
        <details className="moreData">
          <summary>{t('forms.moreData')}</summary>
          <div className="moreDataBody">
            <label>{t('forms.birthPlace')}<input value={form.birthPlace} onChange={set('birthPlace')} /></label>
            <div className="formGrid two">
              <label>{t('forms.death')}<input type="date" value={form.deathDate} onChange={set('deathDate')} /></label>
              <label>{t('forms.deathPlace')}<input value={form.deathPlace} onChange={set('deathPlace')} /></label>
            </div>
            <label>{t('public.sourceExplanation')}<textarea rows="4" value={form.notes} onChange={set('notes')} placeholder={t('placeholders.sourceExplanation')} /></label>
          </div>
        </details>
        <div className="modalActions"><button type="button" className="secondaryButton" onClick={onClose}>{t('actions.cancel')}</button><button className="primaryButton">{t('public.generatePiece')}</button></div>
        {pieceText && <div className="pieceOutput">
          <strong>{t('public.pieceReady')}</strong>
          <p>{t('public.pieceReadyBody')}</p>
          <textarea rows="7" readOnly value={pieceText} />
          <div className="buttonRow compact"><button type="button" className="primaryButton" onClick={downloadPiece}>{t('public.downloadPiece')}</button><button type="button" className="secondaryButton" onClick={() => navigator.clipboard?.writeText(pieceText)}>{t('public.copy')}</button></div>
        </div>}
      </form>
    </Modal>
  );
}

function PublicTreePage({ db }) {
  const { language, t } = useI18n();
  const cardMetrics = useTreeCardMetrics();
  const [viewport, setViewport] = useState({ x: 24, y: 18, scale: 0.82 });
  const [contributionPersonId, setContributionPersonId] = useState(null);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const dragRef = useRef(null);
  const canvasRef = useRef(null);
  const layout = useMemo(() => buildAllPeopleLayout(db, '', language, cardMetrics), [db, language, cardMetrics]);

  // Allow free scaling in public view as well
  const setZoom = (nextScale) => setViewport((prev) => ({ ...prev, scale: nextScale }));
  const fitActiveCards = () => {
    const canvas = canvasRef.current;
    if (!canvas || !layout.nodes.length) {
      setViewport({ x: 24, y: 18, scale: 0.82 });
      return;
    }

    const bounds = layout.nodes.reduce((acc, node) => ({
      minX: Math.min(acc.minX, node.x),
      minY: Math.min(acc.minY, node.y),
      maxX: Math.max(acc.maxX, node.x + cardMetrics.width),
      maxY: Math.max(acc.maxY, node.y + cardMetrics.height)
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    const canvasWidth = Math.max(1, canvas.clientWidth);
    const canvasHeight = Math.max(1, canvas.clientHeight);
    const padding = Math.max(14, Math.min(42, Math.min(canvasWidth, canvasHeight) * 0.045));
    const availableWidth = Math.max(1, canvasWidth - padding * 2);
    const availableHeight = Math.max(1, canvasHeight - padding * 2);
    const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
    const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(
      1.08,
      availableWidth / contentWidth,
      availableHeight / contentHeight
    );
    const nextScale = Number.isFinite(scale) && scale > 0 ? scale : 0.82;
    const contentCenterX = bounds.minX + contentWidth / 2;
    const contentCenterY = bounds.minY + contentHeight / 2;

    setViewport({
      x: canvasWidth / 2 - contentCenterX * nextScale,
      y: canvasHeight / 2 - contentCenterY * nextScale,
      scale: nextScale
    });
  };

  useEffect(() => {
    const frame = requestAnimationFrame(fitActiveCards);
    return () => cancelAnimationFrame(frame);
  }, [layout]);

  const openContribution = (personId = '') => {
    setContributionPersonId(personId);
    setShowContributionForm(true);
  };

  // Pointer handling for public canvas: support pan and pinch-to-zoom
  const onPointerDown = (event) => {
    if (!dragRef.current) dragRef.current = { pointers: new Map(), pinch: null };
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    dragRef.current.pointers.set(event.pointerId, { x, y, clientX: event.clientX, clientY: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);

    if (dragRef.current.pointers.size === 1) {
      const point = dragRef.current.pointers.values().next().value;
      dragRef.current.pan = { startX: point.clientX, startY: point.clientY, originX: viewport.x, originY: viewport.y };
    } else if (dragRef.current.pointers.size === 2) {
      const iter = dragRef.current.pointers.values();
      const a = iter.next().value;
      const b = iter.next().value;
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const distance = Math.hypot(dx, dy) || 1;
      const centerClientX = (a.clientX + b.clientX) / 2;
      const centerClientY = (a.clientY + b.clientY) / 2;
      const rectLocal = event.currentTarget.getBoundingClientRect();
      const centerX = centerClientX - rectLocal.left;
      const centerY = centerClientY - rectLocal.top;
      dragRef.current.pinch = { distance, centerX, centerY, startScale: viewport.scale };
    }
  };
  const onPointerMove = (event) => {
    if (!dragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const entry = dragRef.current.pointers.get(event.pointerId);
    if (entry) {
      entry.clientX = event.clientX;
      entry.clientY = event.clientY;
      entry.x = event.clientX - rect.left;
      entry.y = event.clientY - rect.top;
    }

    if (dragRef.current.pinch) {
      const vals = Array.from(dragRef.current.pointers.values());
      if (vals.length < 2) return;
      const a = vals[0];
      const b = vals[1];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const distance = Math.hypot(dx, dy) || 1;
      const factor = distance / dragRef.current.pinch.distance;
      const newScale = dragRef.current.pinch.startScale * factor;

      const centerClientX = (a.clientX + b.clientX) / 2;
      const centerClientY = (a.clientY + b.clientY) / 2;
      const containerRect = event.currentTarget.getBoundingClientRect();
      const containerX = centerClientX - containerRect.left;
      const containerY = centerClientY - containerRect.top;

      const worldX = (containerX - viewport.x) / viewport.scale;
      const worldY = (containerY - viewport.y) / viewport.scale;
      const newX = containerX - worldX * newScale;
      const newY = containerY - worldY * newScale;

      setViewport((prev) => ({ ...prev, scale: newScale, x: newX, y: newY }));
      return;
    }

    if (dragRef.current.pan && dragRef.current.pointers.size === 1) {
      const p = dragRef.current.pointers.values().next().value;
      const pan = dragRef.current.pan;
      setViewport((prev) => ({ ...prev, x: pan.originX + (p.clientX - pan.startX), y: pan.originY + (p.clientY - pan.startY) }));
    }
  };
  const onPointerUp = (event) => {
    if (!dragRef.current) return;
    dragRef.current.pointers.delete(event.pointerId);
    if (dragRef.current.pointers.size < 2) dragRef.current.pinch = null;
    if (dragRef.current.pointers.size === 0) dragRef.current = null;
  };

  return (
    <main className="publicShell">
      <header className="publicHeader">
        <div><p className="eyebrow">{t('public.publicTree')}</p><h1>{db.settings.treeName}</h1><p>{db.people.length} {t('public.readOnly')}</p></div>
        <div className="topbarActions"><button className="primaryButton puzzleButton" onClick={() => openContribution('')}>{t('public.contribute')}</button></div>
      </header>
      <section className="treeWorkspace publicTreeWorkspace">
        <div className="treeToolbar">
          <div><p className="eyebrow">{t('public.publicView')}</p><h2>{t('public.familyTree')}</h2><p>{t('public.clickToContribute')}</p></div>
          <div className="zoomControls">
            <button className="iconButton" type="button" onClick={() => setZoom(viewport.scale - 0.12)} title={t('tree.zoomOut')}>-</button>
            <span>{Math.round(viewport.scale * 100)}%</span>
            <button className="iconButton" type="button" onClick={() => setZoom(viewport.scale + 0.12)} title={t('tree.zoomIn')}>+</button>
          </div>
        </div>
        <div ref={canvasRef} className="treeCanvas publicCanvas" onWheel={(event) => { event.preventDefault(); setZoom(viewport.scale + (event.deltaY > 0 ? -0.08 : 0.08)); }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <div className="treePanLayer" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}>
            <div className="treeContent" style={{ width: layout.width, height: layout.height, '--tree-card-width': `${cardMetrics.width}px`, '--tree-card-height': `${cardMetrics.height}px` }}>
              {(layout.groups || []).map((group) => <div key={group.id} className={`familyGroupBand ${group.kind}`} style={{ left: group.x, top: group.y, width: group.width, height: group.height }}><span>{group.label}</span></div>)}
              <svg className="treeLines" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
                {layout.edges.map((edge) => {
                  if (edge.kind === 'peer') {
                    return <path key={edge.id} className="peerLine" d={`M ${edge.from.x} ${edge.from.y} C ${edge.from.x + (edge.to.x - edge.from.x) / 2} ${edge.from.y}, ${edge.from.x + (edge.to.x - edge.from.x) / 2} ${edge.to.y}, ${edge.to.x} ${edge.to.y}`} />;
                  }
                  const middleY = edge.from.y + (edge.to.y - edge.from.y) / 2;
                  return <path key={edge.id} className="familyLine" d={`M ${edge.from.x} ${edge.from.y} C ${edge.from.x} ${middleY}, ${edge.to.x} ${middleY}, ${edge.to.x} ${edge.to.y}`} />;
                })}
              </svg>
              {layout.nodes.map((node) => {
                const label = allPeopleNodeLabel(node, language);
                return <TreeCard key={node.key} person={node.person} label={label} relationGroup={node.relationGroup || relationGroupFromLabel(label)} cardVariant={cardMetrics.variant} onOpen={openContribution} onFocus={openContribution} style={{ left: node.x, top: node.y }} />;
              })}
            </div>
          </div>
        </div>
      </section>
      {showContributionForm && <PublicContributionForm db={db} initialPersonId={contributionPersonId || ''} onClose={() => setShowContributionForm(false)} />}
    </main>
  );
}

function TimelineView({ db, onOpenPerson }) {
  const { t } = useI18n();
  const [typeFilter, setTypeFilter] = useState('all');
  const timeline = useMemo(() => buildGlobalTimeline(db), [db]);
  const eventTypes = useMemo(() => [...new Set(timeline.map((event) => event.type))].sort((a, b) => a.localeCompare(b, 'es')), [timeline]);
  const visibleEvents = typeFilter === 'all' ? timeline : timeline.filter((event) => event.type === typeFilter);
  const datedCount = timeline.filter((event) => Number.isFinite(event.sortRank)).length;

  return (
    <section className="contentPanel globalTimelinePanel">
      <div className="sectionIntro"><p>{t('timeline.intro')}</p></div>
      <div className="timelineSummary">
        <strong>{timeline.length}</strong><span>{t('stats.events')}</span>
        <strong>{datedCount}</strong><span>{t('stats.dated')}</span>
      </div>
      <div className="timelineFilters">
        <label>{t('forms.type')}<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">{t('timeline.all')}</option>{eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
      </div>
      {visibleEvents.length ? <ol className="globalTimelineList">{visibleEvents.map((event) => <li key={`${event.person.id}_${event.id}`} className="globalTimelineItem">
        <div className="globalTimelineDate">{event.date || t('tree.unknownDate')}</div>
        <div className="globalTimelineDot" />
        <article>
          <div className="globalTimelineTop"><span>{event.type}</span><button className="textButton" onClick={() => onOpenPerson(event.person.id)}>{displayName(event.person)}</button></div>
          {[event.place, event.description].filter(Boolean).length ? <p>{[event.place, event.description].filter(Boolean).join(' · ')}</p> : <p className="muted small">{t('timeline.noPlaceDescription')}</p>}
        </article>
      </li>)}</ol> : <div className="softEmpty"><h3>{t('timeline.noEventsTitle')}</h3><p>{t('timeline.noEventsBody')}</p></div>}
    </section>
  );
}
function EventForm({ person, onClose, onSave }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ type: 'Residencia', date: '', place: '', description: '' });
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  return <Modal title={t('modalTitles.newEvent', { name: displayName(person) })} onClose={onClose}><form className="formStack" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
    <div className="formGrid two"><label>{t('forms.type')}<select value={form.type} onChange={set('type')}><option>Nacimiento</option><option>Bautismo</option><option>Residencia</option><option>Inmigración</option><option>Emigración</option><option>Matrimonio</option><option>Educación</option><option>Ocupación</option><option>Entierro</option><option>Otro</option></select></label><label>{t('forms.date')}<input type="date" value={form.date} onChange={set('date')} /></label></div>
    <label>{t('forms.place')}<input value={form.place} onChange={set('place')} /></label><label>{t('forms.description')}<textarea rows="4" value={form.description} onChange={set('description')} /></label>
    <div className="modalActions"><button type="button" className="secondaryButton" onClick={onClose}>{t('actions.cancel')}</button><button className="primaryButton">{t('actions.saveEvent')}</button></div>
  </form></Modal>;
}

function SourceForm({ onClose, onSave }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ title: '', type: 'Acta', repository: '', url: '', notes: '' });
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  return <Modal title={t('modalTitles.newSource')} onClose={onClose}><form className="formStack" onSubmit={(e) => { e.preventDefault(); if (form.title.trim()) onSave(form); }}>
    <div className="formGrid two"><label>{t('forms.title')}<input autoFocus value={form.title} onChange={set('title')} /></label><label>{t('forms.type')}<select value={form.type} onChange={set('type')}><option>Acta</option><option>Censo</option><option>Libro parroquial</option><option>Registro civil</option><option>Fotografía</option><option>Entrevista</option><option>Web</option><option>Otro</option></select></label></div>
    <label>{t('forms.repository')}<input value={form.repository} onChange={set('repository')} placeholder={t('placeholders.repository')} /></label><label>{t('forms.url')}<input value={form.url} onChange={set('url')} /></label><label>{t('forms.notes')}<textarea rows="4" value={form.notes} onChange={set('notes')} /></label>
    <div className="modalActions"><button type="button" className="secondaryButton" onClick={onClose}>{t('actions.cancel')}</button><button className="primaryButton">{t('actions.saveSource')}</button></div>
  </form></Modal>;
}

function DetectivePanel({ suggestions, db, running, onRun, onAccept, onReject }) {
  const { t } = useI18n();
  const pending = suggestions.filter((suggestion) => suggestion.status === 'pending');
  const reviewed = suggestions.filter((suggestion) => suggestion.status !== 'pending');

  return (
    <section className="detectivePanel">
      <div className="panelHeader detectiveHeader">
        <div>
          <p className="eyebrow">{t('detective.eyebrow')}</p>
          <h2>{t('detective.title')}</h2>
          <p>{t('detective.body')}</p>
        </div>
        <button className="primaryButton" onClick={onRun} disabled={running}>{running ? t('data.investigating') : t('actions.activateDetective')}</button>
      </div>
      <div className="detectiveSummary">
        <span><strong>{pending.length}</strong> {t('detective.pending')}</span>
        <span><strong>{reviewed.filter((item) => item.status === 'accepted').length}</strong> {t('detective.accepted')}</span>
        <span><strong>{reviewed.filter((item) => item.status === 'rejected').length}</strong> {t('detective.rejected')}</span>
      </div>
      {suggestions.length ? <div className="detectiveList">
        {suggestions.map((suggestion) => <article key={suggestion.id} className={`detectiveSuggestion ${suggestion.status}`}>
          <div className="suggestionTop">
            <span className="sourceType">{suggestion.confidence}</span>
            <span className={`suggestionStatus ${suggestion.status}`}>{suggestion.status === 'pending' ? t('detective.pendingOne') : suggestion.status === 'accepted' ? t('detective.acceptedOne') : t('detective.rejectedOne')}</span>
          </div>
          <h3>{suggestion.title}</h3>
          <p>{suggestion.summary}</p>
          <div className="suggestionSource">
            <strong>{t('detective.source')}</strong> {suggestion.source?.title || t('detective.untitled')} · {suggestion.source?.type || t('detective.noType')}
            {suggestion.source?.url && <a href={suggestion.source.url} target="_blank" rel="noreferrer">{t('detective.openSearch')}</a>}
            {suggestion.source?.notes && <small>{suggestion.source.notes}</small>}
          </div>
          <ul className="suggestionChanges">
            {(suggestion.proposedChanges || []).map((change, index) => <li key={`${suggestion.id}_${index}`}>{describeSuggestionChange(change, db)}</li>)}
          </ul>
          {suggestion.status === 'pending' && <div className="buttonRow compact">
            <button className="primaryButton" onClick={() => onAccept(suggestion.id)}>{t('actions.accept')}</button>
            <button className="secondaryButton" onClick={() => onReject(suggestion.id)}>{t('actions.reject')}</button>
          </div>}
        </article>)}
      </div> : <div className="softEmpty"><h3>{t('detective.emptyTitle')}</h3><p>{t('detective.emptyBody')}</p></div>}
    </section>
  );
}

function PuzzleSuggestionsPanel({ suggestions, db, onAccept, onReject }) {
  const { t } = useI18n();
  const pending = suggestions.filter((suggestion) => suggestion.status === 'pending');
  if (!suggestions.length) return null;
  return (
    <section className="detectivePanel puzzlePanel">
      <div className="panelHeader detectiveHeader">
        <div>
          <p className="eyebrow">{t('puzzle.eyebrow')}</p>
          <h2>{t('puzzle.title')}</h2>
          <p>{t('puzzle.body')}</p>
        </div>
        <div className="timelineSummary"><strong>{pending.length}</strong><span>{t('stats.pending')}</span></div>
      </div>
      <div className="detectiveList">
        {suggestions.map((suggestion) => {
          const person = db.people.find((item) => item.id === suggestion.personId);
          const related = db.people.find((item) => item.id === suggestion.relation?.personId);
          return <article key={suggestion.id} className={`detectiveSuggestion ${suggestion.status}`}>
            <div className="suggestionTop"><span className="sourceType">🧩 {t('puzzle.piece')}</span><span className={`suggestionStatus ${suggestion.status}`}>{suggestion.status === 'pending' ? t('detective.pendingOne') : suggestion.status === 'accepted' ? t('detective.acceptedOne') : t('detective.rejectedOne')}</span></div>
            <h3>{suggestion.kind === 'edit_person' ? t('puzzle.edit', { name: displayName(person) }) : t('puzzle.add', { name: displayName(suggestion.person) })}</h3>
            <p>{suggestion.contributor ? t('puzzle.contributor', { name: suggestion.contributor }) : t('puzzle.anonymous')}</p>
            <div className="suggestionSource">
              <strong>{t('puzzle.source')}</strong>
              <small>{suggestion.person?.notes || t('puzzle.noSource')}</small>
            </div>
            <ul className="suggestionChanges">
              {suggestion.kind === 'edit_person' && <li>{t('puzzle.updatePublicData', { name: displayName(person) })}</li>}
              {suggestion.kind === 'add_person' && <li>{t('puzzle.addPerson', { name: displayName(suggestion.person) })}</li>}
              {suggestion.kind === 'add_person' && suggestion.relation?.kind && related && <li>{t('puzzle.linkAs', { name: displayName(related), relation: suggestion.relation.kind === 'parent_of' ? t('puzzle.relationParent') : suggestion.relation.kind === 'child_of' ? t('puzzle.relationChild') : t('puzzle.relationPartner') })}</li>}
            </ul>
            {suggestion.status === 'pending' && <div className="buttonRow compact"><button className="primaryButton" onClick={() => onAccept(suggestion.id)}>{t('actions.acceptPiece')}</button><button className="secondaryButton" onClick={() => onReject(suggestion.id)}>{t('actions.rejectPiece')}</button></div>}
          </article>;
        })}
      </div>
    </section>
  );
}

function AuthScreen({ language, onLanguageChange }) {
  const t = (key) => translate(language, key);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage('');
    if (!supabase) return;
    if (mode === 'register' && password !== confirmPassword) { setError(t('auth.passwordMismatch')); return; }
    setBusy(true);
    const result = mode === 'reset'
      ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      : mode === 'login' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) setError(result.error.message);
    else if (mode === 'reset') setMessage(t('auth.successReset'));
    else if (mode === 'register' && !result.data.session) setMessage(t('auth.successRegister'));
  };
  const reset = () => { setError(''); setMessage(''); setMode('login'); };
  return <main className="authShell"><section className="authCard">
    <div className="authBrand"><div className="authBrandMark"><img src="/raices-logo.png" alt="" /></div><span>Root Puzzle</span></div>
    <div className="authIntro"><p className="eyebrow">{t('sections.tree')}</p><h1>{t('auth.welcome')}</h1><p>{t('auth.subtitle')}</p></div>
    {mode !== 'reset' && <div className="authTabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { reset(); setMode('login'); }}>{t('auth.login')}</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { reset(); setMode('register'); }}>{t('auth.register')}</button></div>}
    <form className="authForm" onSubmit={submit}>
      <label>{t('auth.email')}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
      {mode !== 'reset' && <label>{t('auth.password')}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required /></label>}
      {mode === 'register' && <label>{t('auth.confirmPassword')}<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} required /></label>}
      {error && <p className="authMessage error">{error}</p>}{message && <p className="authMessage success">{message}</p>}
      <button className="primaryButton authSubmit" type="submit" disabled={busy}>{busy ? '…' : mode === 'reset' ? t('auth.reset') : mode === 'login' ? t('auth.submitLogin') : t('auth.submitRegister')}</button>
    </form>
    {mode === 'login' && <button type="button" className="textButton authLink" onClick={() => { setMode('reset'); setError(''); setMessage(''); }}>{t('auth.forgot')}</button>}
    {mode === 'reset' && <button type="button" className="textButton authLink" onClick={reset}>{t('auth.backToLogin')}</button>}
    {mode !== 'reset' && <p className="authSwitch">{mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setMessage(''); }}>{mode === 'login' ? t('auth.signup') : t('auth.signin')}</button></p>}
    <div className="authFooter"><span>{t('auth.configured')}</span><button type="button" onClick={() => onLanguageChange(language === 'es' ? 'en' : 'es')}>{language === 'es' ? 'EN' : 'ES'}</button></div>
  </section></main>;
}

function CollaboratorsPanel({ invitations, inviteLink, onInvite, onRevoke, isOwner = false }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onInvite({ email, role, message });
      setEmail('');
      setMessage('');
    } catch (inviteError) {
      setError(inviteError.message || 'No se pudo crear la invitación.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return <section className="collaboratorsPanel">
    <div className="panelHeader">
      <div><p className="eyebrow">Colaboración</p><h2><UsersRound size={21} /> Personas con acceso</h2><p className="muted">Invitá colaboradores y viewers a este árbol. El enlace funciona una sola vez y vence en 7 días.</p></div>
    </div>
    {!isOwner && <div className="collaboratorNotice"><ShieldCheck size={19} /><span>La administración de colaboradores está reservada al owner de este árbol.</span></div>}
    {isOwner && <form className="inviteForm" onSubmit={submit}>
      <div className="formField"><label htmlFor="invite-email">Email</label><input id="invite-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@dominio.com" /></div>
      <div className="formField"><label htmlFor="invite-role">Permiso</label><select id="invite-role" value={role} onChange={(event) => setRole(event.target.value)}><option value="editor">Editor · puede modificar datos</option><option value="viewer">Viewer · solo lectura</option></select></div>
      <div className="formField inviteMessage"><label htmlFor="invite-message">Mensaje opcional</label><input id="invite-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Te invito a colaborar en este árbol…" /></div>
      <button className="primaryButton inviteSubmit" type="submit" disabled={busy}><UserPlus size={16} />{busy ? 'Generando…' : 'Generar invitación'}</button>
    </form>}
    {isOwner && error && <p className="formError">{error}</p>}
    {isOwner && inviteLink && <div className="inviteLinkBox"><strong>Enlace listo para enviar</strong><div><input readOnly value={inviteLink} onFocus={(event) => event.target.select()} /><button className="secondaryButton" type="button" onClick={copy}><Copy size={15} />{copied ? 'Copiado' : 'Copiar'}</button></div><small>Copialo y envialo por email o mensajería. El destinatario debe registrarse con ese mismo email.</small></div>}
    {isOwner && <div className="membersList">
      {invitations.length === 0 ? <div className="softEmpty compact"><ShieldCheck size={24} /><p>Todavía no hay invitaciones.</p></div> : invitations.map((invitation) => <div className="memberRow" key={invitation.id}><div><strong>{invitation.email}</strong><small>{invitation.status === 'pending' ? `Pendiente · vence ${new Date(invitation.expires_at).toLocaleDateString('es-AR')}` : invitation.status === 'accepted' ? 'Aceptada' : invitation.status === 'revoked' ? 'Revocada' : 'Vencida'}</small></div><span className={`roleBadge ${invitation.role}`}>{invitation.role}</span>{invitation.status === 'pending' && <button className="iconButton" type="button" title="Revocar invitación" onClick={() => onRevoke(invitation.id)}><RotateCcw size={15} /></button>}</div>)}
    </div>}
  </section>;
}

const hallazgosAssets = {
  emblem: '/hallazgos/01_emblema_hallazgos.png',
  specialConquest: '/hallazgos/02_conquista_especial.png',
  heroes: {
    construccion_del_arbol: '/hallazgos/03_hero_construccion_del_arbol.png',
    generaciones_descubiertas: '/hallazgos/04_hero_generaciones_descubiertas.png',
    viaje_en_el_tiempo: '/hallazgos/05_hero_viaje_en_el_tiempo.png',
    generaciones_completas: '/hallazgos/06_hero_generaciones_completas.png',
    linaje_sin_fronteras: '/hallazgos/07_hero_linaje_sin_fronteras.png'
  },
  overlays: {
    halo: '/hallazgos/08_overlay_halo_desbloqueo.png',
    laurels: '/hallazgos/09_overlay_corona_laureles.png',
    ribbon: '/hallazgos/10_overlay_cinta_pergamino.png'
  }
};

function AchievementBadge({ category, level, state = 'inactive', size = 'medium', className = '' }) {
  const badge = category?.badgeCategory?.badges?.find((item) => item.level === level);
  if (!badge) return null;
  const path = badge[state] || badge.inactive;
  return <img className={`achievementBadge achievementBadge-${size} ${className}`} src={`/hallazgos/${path}`} alt={`${category.title} · ${badge.name}`} />;
}

function HallazgosCelebration({ category, badge, special = false, unlocked = true }) {
  return <div className={`hallazgosCelebration ${special ? 'special' : ''}`}>
    <img className="celebrationHalo" src={hallazgosAssets.overlays.halo} alt="" aria-hidden="true" />
    <img className="celebrationLaurels" src={hallazgosAssets.overlays.laurels} alt="" aria-hidden="true" />
    {special ? <img className="celebrationBadge" src={hallazgosAssets.specialConquest} alt="Conquista especial" /> : <AchievementBadge category={category} level={badge.level} state="active" size="celebration" className="celebrationBadge" />}
    <div className="celebrationRibbon"><img src={hallazgosAssets.overlays.ribbon} alt="" aria-hidden="true" /><div><strong>{special ? 'CONQUISTA ESPECIAL' : 'NUEVO HALLAZGO'}</strong><span>{special ? 'Ocho raíces reunidas' : badge.name}</span><small>{special ? (unlocked ? 'Conquista obtenida' : 'Desafío especial') : `Nivel ${badge.level} · ${category.title}`}</small></div></div>
  </div>;
}

function FindingsView({ db }) {
  const [activeId, setActiveId] = useState('construccion_del_arbol');
  const people = db.people || [];
  const oldestYear = calculateOldestYear(people);
  const yearsBack = oldestYear ? Math.max(0, new Date().getFullYear() - oldestYear) : 0;
  const currentValues = { construccion_del_arbol: people.length, generaciones_descubiertas: calculateGenerations(db), viaje_en_el_tiempo: yearsBack, generaciones_completas: calculateCompleteAncestors(db), linaje_sin_fronteras: calculateCountries(people) };
  const iconByCategory = { construccion_del_arbol: TreePine, generaciones_descubiertas: Layers3, viaje_en_el_tiempo: Clock3, generaciones_completas: Waypoints, linaje_sin_fronteras: Globe2 };
  const configuredCategories = achievementCategories.map((category) => {
    const resolved = resolveAchievementProgress(category, currentValues[category.id]);
    return { ...category, title: category.name, current: resolved.currentValue, icon: iconByCategory[category.id], badgeCategory: category, resolved, currentLevel: resolved.currentLevel?.level || 0, currentName: resolved.currentLevel?.name || 'Aún por descubrir', next: resolved.nextTarget, nextName: resolved.nextLevel?.name || 'Nivel máximo alcanzado' };
  });
  const totalUnlocked = getTotalUnlockedAchievements(configuredCategories.map((category) => category.resolved));
  const conquestUnlocked = currentValues.generaciones_completas >= 8;
  const active = configuredCategories.find((category) => category.id === activeId) || configuredCategories[0];
  const progress = active.resolved.progress;
  return <div className="findingsPage">
    <div className="findingsIntro">
      <div className="findingsIdentity"><img src={hallazgosAssets.emblem} alt="" /><div><p className="eyebrow">Tu mapa de descubrimientos</p><h2>Hallazgos</h2><p>Descubrí hasta dónde te llevó tu historia.</p></div></div>
      <div className="findingsScore"><span><Award size={17} /></span><strong>{totalUnlocked}</strong><small>hallazgos desbloqueados</small></div>
    </div>
    <section className="findingsHero"><div className="heroCopy"><span className="heroKicker"><Compass size={15} /> Tu recorrido hasta hoy</span><h3>Cada nombre abre<br /><em>una nueva pista.</em></h3><p>Seguí las ramas, cruzá fronteras y viajá hacia atrás en el tiempo. Tu próximo hallazgo está más cerca de lo que parece.</p><div className="heroStats"><div><strong>{currentValues.construccion_del_arbol}</strong><span>personas</span></div><div><strong>{currentValues.generaciones_descubiertas}</strong><span>generaciones</span></div><div><strong>{currentValues.linaje_sin_fronteras}</strong><span>países</span></div></div></div><div className="heroIllustration"><div className="orbit orbitOne" /><div className="orbit orbitTwo" /><img src={hallazgosAssets.emblem} alt="" /><span className="heroYear">{oldestYear || '—'}</span><small>{oldestYear ? 'antepasado más antiguo' : 'pista más antigua'}</small></div></section>
    <div className="findingsGrid">{configuredCategories.map((category) => { const badgeLevel = category.currentLevel || category.resolved.nextLevel?.level || 1; return <button type="button" key={category.id} className={`findingCard ${activeId === category.id ? 'selected' : ''} tone-${category.tone}`} onClick={() => setActiveId(category.id)}><div className="findingCardTop"><span className="findingIcon"><AchievementBadge category={category} level={badgeLevel} state={category.currentLevel ? 'active' : 'inactive'} size="card" /></span><span className="findingArrow">↗</span></div><span className="findingTitle">{category.title}</span><strong className="findingName">Nivel {category.currentLevel || '—'} · {category.currentName}</strong><div className="findingMetric"><b>{category.current}</b><span>{category.metric}</span></div><div className="findingProgress"><span style={{ width: `${category.resolved.progress}%` }} /></div><small><span>{category.resolved.isComplete ? 'Recorrido completado' : `${category.current} / ${category.next}`}</span><b>{category.resolved.isComplete ? 'Nivel máximo alcanzado' : `Próximo Hallazgo · ${category.nextName}`}</b></small></button>; })}</div>
    <section className={`findingDetail tone-${active.tone}`}><div className="detailHero"><img src={hallazgosAssets.heroes[active.id]} alt="" loading="lazy" /></div><div className="detailHeading"><span className="findingIcon detailBadge"><AchievementBadge category={active} level={active.currentLevel || active.resolved.nextLevel?.level || 1} state={active.currentLevel ? 'active' : 'inactive'} size="detail" /></span><div><p className="eyebrow">Explorá este recorrido</p><h3>{active.title}</h3><p>Nivel {active.currentLevel || '—'} · {active.currentName}</p></div></div><div className="detailProgress"><div className="detailProgressLabel"><span>{active.resolved.isComplete ? 'Nivel máximo alcanzado' : `${active.current} / ${active.next}`}</span><b>{active.resolved.isComplete ? '100%' : `${active.resolved.progress}%`}</b></div><div className="largeProgress"><span style={{ width: `${progress}%` }} /></div><small>{active.resolved.isComplete ? 'Recorrido completado' : <>Próximo Hallazgo: <strong>{active.nextName}</strong></>}</small></div><div className="levelsRail">{active.badgeCategory.badges.map((badge) => { const unlocked = active.resolved.badgeState(badge) === 'active'; const current = active.currentLevel === badge.level; return <div className={`levelNode ${unlocked ? 'unlocked' : ''} ${current ? 'current' : ''}`} key={badge.name}><span className="levelBadge"><AchievementBadge category={active} level={badge.level} state={unlocked ? 'active' : 'inactive'} size="timeline" /></span><small>Nivel {badge.level}</small><b>{badge.name}</b><em>{badge.target}</em>{current && <i>Actual</i>}</div>; })}</div></section>
    <section className="recentFindings"><div className="recentHeading"><div><p className="eyebrow">Tu historia sigue creciendo</p><h3>Recientemente desbloqueados</h3></div><span>{totalUnlocked} hallazgos obtenidos</span></div><div className="recentList">{configuredCategories.flatMap((category) => category.resolved.unlockedLevels.slice(-1).map((badge) => ({ category, badge }))).map(({ category, badge }) => <button type="button" className="recentItem" key={`${category.id}-${badge.level}`} onClick={() => setActiveId(category.id)}><AchievementBadge category={category} level={badge.level} state="active" size="recent" /><span><strong>{badge.name}</strong><small>{category.title} · {badge.target}</small></span></button>)}</div></section>
    <section className="specialConquest"><HallazgosCelebration special unlocked={conquestUnlocked} category={configuredCategories[3]} badge={{ level: 3, name: 'Ocho raíces' }} /><div className="conquestCopy"><span className="eyebrow">Conquista especial</span><h3>Ocho raíces reunidas</h3><p>{conquestUnlocked ? 'Completaste tus 8 bisabuelos directos.' : 'Completá los 8 bisabuelos directos para desbloquear una insignia reservada para búsquedas excepcionales.'}</p></div><span className="conquestStatus"><Award size={14} /> {conquestUnlocked ? 'Conquista obtenida' : 'Bloqueada'}</span></section>
  </div>;
}

export default function GenealogyApp() {
  const [db, setDb] = useState(emptyDatabase);
  const [publicDb, setPublicDb] = useState(null);
  const [publicLoadError, setPublicLoadError] = useState('');
  const [remoteTreeId, setRemoteTreeId] = useState(null);
  const [remoteTreeDataReadyId, setRemoteTreeDataReadyId] = useState(null);
  const [accessibleTrees, setAccessibleTrees] = useState([]);
  const [currentTreeRole, setCurrentTreeRole] = useState(null);
  const [remoteSyncError, setRemoteSyncError] = useState('');
  const [treeInvitations, setTreeInvitations] = useState([]);
  const [inviteLink, setInviteLink] = useState('');
  const [treeMenuOpen, setTreeMenuOpen] = useState(false);
  const [newTreeModalOpen, setNewTreeModalOpen] = useState(false);
  const [newTreeName, setNewTreeName] = useState('');
  const [treeNameModalMode, setTreeNameModalMode] = useState('create');
  const [treeDeleteModalOpen, setTreeDeleteModalOpen] = useState(false);
  const [treeDeleteName, setTreeDeleteName] = useState('');
  const [personDeleteModalOpen, setPersonDeleteModalOpen] = useState(false);
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
  const [language, setLanguage] = useState('es');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [detectiveRunning, setDetectiveRunning] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [publicTreeUrl, setPublicTreeUrl] = useState('');
  const importRef = useRef(null);
  const gedcomRef = useRef(null);
  const pieceImportRef = useRef(null);
  const i18n = useMemo(() => ({ language, t: (key, vars) => translate(language, key, vars) }), [language]);
  const t = i18n.t;

  useEffect(() => {
    if (!supabase) return undefined;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthUser(data.session?.user || null);
      setAuthReady(true);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null);
      setAuthReady(true);
    });
    return () => { mounted = false; authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('invite');
    if (!authUser || !token || !supabase) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    acceptTreeInvitation(token).then(({ data, error }) => {
      if (error) {
        window.alert(error.message || 'No se pudo aceptar la invitación.');
        return;
      }
      if (data?.tree_id) {
        localStorage.setItem(remoteTreeStorageKey, data.tree_id);
        window.location.reload();
      }
    });
  }, [authUser]);

  useEffect(() => {
    const initialize = async () => {
      if (isSupabaseConfigured && !authUser && !window.location.hash.startsWith(PUBLIC_TREE_HASH_PREFIX)) return;
      setRemoteTreeDataReadyId(null);
      let savedLanguage = 'es';
      try {
        setDarkMode(localStorage.getItem(THEME_STORAGE_KEY) === 'dark');
        savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'es';
        setLanguage(savedLanguage);
        if (window.location.hash.startsWith(PUBLIC_TREE_HASH_PREFIX)) {
          const payload = window.location.hash.slice(PUBLIC_TREE_HASH_PREFIX.length);
          setPublicDb(normalizeDatabase(decodeSharePayload(payload)));
          setHydrated(true);
          return;
        }
        let remoteTreeId = localStorage.getItem(remoteTreeStorageKey);
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? normalizeDatabase(JSON.parse(saved)) : defaultDatabase();
        const nextDb = parsed.people.length ? parsed : defaultDatabase();
        setDb(nextDb);
        setSelectedId(nextDb.settings.rootPersonId || nextDb.people[0]?.id || null);
        setFocusedId(nextDb.settings.rootPersonId || nextDb.people[0]?.id || null);

        if (isSupabaseConfigured) {
          const { data: trees, error: treesError } = await listAccessibleTrees();
          if (treesError) throw treesError;
          setAccessibleTrees(trees || []);
          const selectedTree = (trees || []).find((tree) => tree.id === remoteTreeId) || trees?.[0];
          if (!selectedTree) {
            const { data: createdTree, error: createError } = await createRemoteTree({ name: nextDb.settings.treeName });
            if (createError) throw createError;
            remoteTreeId = createdTree?.id;
            if (createdTree) {
              setAccessibleTrees([createdTree]);
              setCurrentTreeRole(createdTree.role || 'owner');
            }
          } else {
            remoteTreeId = selectedTree.id;
            setCurrentTreeRole(selectedTree.role);
          }
          setRemoteTreeId(remoteTreeId || null);
          if (remoteTreeId) localStorage.setItem(remoteTreeStorageKey, remoteTreeId);
          const { data, error } = await getRemoteTree(remoteTreeId);
          if (error) {
            setRemoteTreeDataReadyId(null);
            setRemoteSyncError(translate(savedLanguage, 'errors.supabaseConnect', { message: error.message || 'Revisa tus credenciales.' }));
          } else if (data?.data) {
            const remoteDb = normalizeDatabase(data.data);
            setDb(remoteDb);
            setSelectedId(remoteDb.settings.rootPersonId || remoteDb.people[0]?.id || null);
            setFocusedId(remoteDb.settings.rootPersonId || remoteDb.people[0]?.id || null);
            setRemoteTreeId(data.id);
            setRemoteTreeDataReadyId(data.id);
            localStorage.setItem(remoteTreeStorageKey, data.id);
          } else {
            setRemoteTreeDataReadyId(null);
            setRemoteSyncError(translate(savedLanguage, 'errors.supabaseConnect', { message: 'No se pudo cargar el árbol seleccionado.' }));
          }
        }
      } catch {
        setRemoteTreeDataReadyId(null);
        if (window.location.hash.startsWith(PUBLIC_TREE_HASH_PREFIX)) setPublicLoadError(translate(savedLanguage, 'errors.publicLoad'));
        else setDb(defaultDatabase());
      } finally {
        setHydrated(true);
      }
    };

    initialize();
  }, [authUser]);

  useEffect(() => {
    if (!hydrated || publicDb) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }, [db, hydrated, publicDb]);

  useEffect(() => {
    if (!hydrated || publicDb) return;
    localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode, hydrated, publicDb]);

  useEffect(() => {
    if (!hydrated || publicDb) return;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language, hydrated, publicDb]);

  useEffect(() => {
    const parseSectionHash = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith(PUBLIC_TREE_HASH_PREFIX)) return null;
      const key = hash.startsWith('#') ? hash.slice(1) : hash;
      return sectionHashMap[key] || null;
    };

    const applyHashSection = () => {
      const next = parseSectionHash();
      if (next) setSection(next);
      else if (!window.location.hash || window.location.hash === '#') {
        window.history.replaceState(null, '', '#canvas');
      }
    };

    const onHashChange = () => {
      const next = parseSectionHash();
      if (next) setSection(next);
    };

    applyHashSection();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [publicDb]);

  useEffect(() => {
    if (publicDb) return;
    const nextHash = `#${section === 'tree' ? 'canvas' : section}`;
    if (window.location.hash === nextHash || window.location.hash.startsWith(PUBLIC_TREE_HASH_PREFIX)) return;
    window.history.replaceState(null, '', nextHash);
  }, [section, publicDb]);

  useEffect(() => {
    if (!hydrated || publicDb || !isSupabaseConfigured || !remoteTreeId || remoteTreeDataReadyId !== remoteTreeId) return;
    const syncRemote = async () => {
      const { data, error } = await saveRemoteTree({ id: remoteTreeId, data: db });
      if (error) {
        setRemoteSyncError(t('errors.supabaseSave', { message: error.message || error.details || 'Error desconocido' }));
        return;
      }
      if (data?.id) {
        setRemoteTreeId(data.id);
        localStorage.setItem(remoteTreeStorageKey, data.id);
      }
      setRemoteSyncError('');
    };
    syncRemote();
  }, [db, hydrated, publicDb, remoteTreeId, remoteTreeDataReadyId, t]);

  const selected = db.people.find((p) => p.id === selectedId) || null;
  const filteredPeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...db.people].sort((a, b) => displayName(a).localeCompare(displayName(b), 'es'));
    return db.people.filter((p) => [p.givenNames, p.nickname, p.surnames, p.email, p.birthPlace, p.occupation].join(' ').toLowerCase().includes(q));
  }, [db.people, query]);

  const updateDb = (fn) => setDb((prev) => normalizeDatabase(fn(prev)));

  const canEdit = !isSupabaseConfigured || currentTreeRole === 'owner' || currentTreeRole === 'editor';
  const isOwner = !isSupabaseConfigured || currentTreeRole === 'owner';
  const canCreateTree = !isSupabaseConfigured || Boolean(authUser && (!remoteTreeId || currentTreeRole === 'owner'));

  useEffect(() => {
    if (!remoteTreeId || !isOwner || !isSupabaseConfigured) {
      setTreeInvitations([]);
      return;
    }
    listTreeInvitations(remoteTreeId).then(({ data, error }) => {
      if (!error) setTreeInvitations(data || []);
    });
  }, [remoteTreeId, isOwner]);

  const inviteCollaborator = async ({ email, role, message }) => {
    const { data, error } = await createTreeInvitation({ treeId: remoteTreeId, email, role, message });
    if (error) throw error;
    const url = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(data.token)}`;
    setInviteLink(url);
    const { data: refreshed } = await listTreeInvitations(remoteTreeId);
    setTreeInvitations(refreshed || []);
    return url;
  };

  const revokeInvitation = async (invitationId) => {
    const { error } = await revokeTreeInvitation(invitationId);
    if (error) {
      window.alert(error.message || 'No se pudo revocar la invitación.');
      return;
    }
    setTreeInvitations((items) => items.map((item) => item.id === invitationId ? { ...item, status: 'revoked', revoked_at: new Date().toISOString() } : item));
  };

  const selectRemoteTree = (treeId) => {
    const tree = accessibleTrees.find((item) => item.id === treeId);
    if (!tree || tree.id === remoteTreeId) return;
    localStorage.setItem(remoteTreeStorageKey, tree.id);
    window.location.reload();
  };

  const createTree = async (name) => {
    if (!name?.trim()) return false;
    const { data, error } = await createRemoteTree({ name: name.trim() });
    if (error || !data?.id) {
      setRemoteSyncError(error?.message || t('errors.supabaseConnect', { message: 'No se pudo crear el árbol.' }));
      return false;
    }
    setNewTreeModalOpen(false);
    setNewTreeName('');
    localStorage.setItem(remoteTreeStorageKey, data.id);
    window.location.reload();
    return true;
  };

  const openNewTreeModal = () => {
    setTreeMenuOpen(false);
    setTreeNameModalMode('create');
    setNewTreeName(language === 'es' ? 'Mi árbol familiar' : 'My family tree');
    setNewTreeModalOpen(true);
  };

  const openRenameTreeModal = () => {
    setTreeMenuOpen(false);
    setTreeNameModalMode('rename');
    setNewTreeName(activeTree?.name || db.settings.treeName || '');
    setNewTreeModalOpen(true);
  };

  const openDeleteTreeModal = () => {
    setTreeMenuOpen(false);
    setTreeDeleteName('');
    setTreeDeleteModalOpen(true);
  };

  const confirmDeleteTree = async () => {
    if (!activeTree || treeDeleteName !== activeTree.name) return;
    const { error } = await deleteRemoteTree({ treeId: remoteTreeId });
    if (error) {
      const detail = [error.message, error.details, error.hint, error.code && `(${error.code})`].filter(Boolean).join(' · ');
      setRemoteSyncError(detail || 'No se pudo eliminar el árbol.');
      return;
    }
    setTreeDeleteModalOpen(false);
    localStorage.removeItem(remoteTreeStorageKey);
    window.location.reload();
  };

  const saveTreeName = async (name) => {
    if (!name?.trim() || !remoteTreeId) return;
    if (treeNameModalMode === 'create') {
      await createTree(name);
      return;
    }
    const { data, error } = await renameRemoteTree({ treeId: remoteTreeId, name: name.trim() });
    if (error || !data?.id) {
      setRemoteSyncError(error?.message || 'No se pudo renombrar el árbol.');
      return;
    }
    setAccessibleTrees((trees) => trees.map((tree) => tree.id === remoteTreeId ? { ...tree, name: data.name } : tree));
    setDb((previous) => normalizeDatabase({ ...previous, settings: { ...previous.settings, treeName: data.name } }));
    setNewTreeModalOpen(false);
    setNewTreeName('');
  };

  const savePerson = (form, relation) => {
    const now = new Date().toISOString();
    const person = { id: newId('person'), ...form, createdAt: now, updatedAt: now };
    updateDb((prev) => {
      let next = { ...prev, people: [...prev.people, person], settings: { ...prev.settings, rootPersonId: prev.settings.rootPersonId || person.id } };
      if (relation?.kind && relation?.personId) {
        if (relation.kind === 'parent_of') next = { ...next, parentChild: [...next.parentChild, { id: newId('pc'), parentId: person.id, childId: relation.personId }] };
        if (relation.kind === 'child_of') next = { ...next, parentChild: [...next.parentChild, { id: newId('pc'), parentId: relation.personId, childId: person.id }] };
        if (relation.kind === 'partner_of') next = { ...next, partnerships: [...next.partnerships, { id: newId('partner'), personAId: person.id, personBId: relation.personId, status: '' }] };
      }
      return next;
    });
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

  const removeRelation = (personId, kind, otherId) => {
    if (!personId || !otherId) return;
    updateDb((prev) => {
      if (kind === 'parent') {
        return { ...prev, parentChild: prev.parentChild.filter((rel) => !(rel.parentId === otherId && rel.childId === personId)) };
      }
      if (kind === 'child') {
        return { ...prev, parentChild: prev.parentChild.filter((rel) => !(rel.parentId === personId && rel.childId === otherId)) };
      }
      if (kind === 'partner') {
        return { ...prev, partnerships: prev.partnerships.filter((rel) => !((rel.personAId === personId && rel.personBId === otherId) || (rel.personAId === otherId && rel.personBId === personId))) };
      }
      return prev;
    });
  };

  const deleteSelected = () => {
    if (!selected) return;
    setPersonDeleteModalOpen(true);
  };

  const confirmDeleteSelected = () => {
    if (!selected) return;
    setPersonDeleteModalOpen(false);
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
      if (!confirm(t('confirms.replaceData'))) return;
      setDb(parsed);
      setSelectedId(parsed.people[0]?.id || null);
      setFocusedId(parsed.settings.rootPersonId || parsed.people[0]?.id || null);
    } catch {
      alert(t('errors.jsonRead'));
    }
  };

  const importGed = async (file) => {
    try {
      const imported = importGedcom(await file.text());
      if (!imported.people.length) throw new Error('No people');
      if (!confirm(t('confirms.importGedcom', { count: imported.people.length }))) return;
      const next = { ...emptyDatabase(), ...imported, settings: { ...emptyDatabase().settings, rootPersonId: imported.people[0]?.id || null } };
      setDb(next);
      setSelectedId(imported.people[0]?.id || null);
      setFocusedId(imported.people[0]?.id || null);
    } catch {
      alert(t('errors.gedcomRead'));
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
      alert(t('errors.pieceRead'));
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

  if (!authReady) return <LanguageContext.Provider value={i18n}><AppLoader message={t('loading.openingTree')} /></LanguageContext.Provider>;
  if (isSupabaseConfigured && !authUser && !publicDb) return <LanguageContext.Provider value={i18n}><AuthScreen language={language} onLanguageChange={setLanguage} /></LanguageContext.Provider>;
  if (!hydrated) return <LanguageContext.Provider value={i18n}><AppLoader message={t('loading.openingTree')} /></LanguageContext.Provider>;
  if (publicLoadError) return <LanguageContext.Provider value={i18n}><AppLoader message={publicLoadError} animated={false} /></LanguageContext.Provider>;

  const remoteSyncNotice = isSupabaseConfigured
    ? remoteSyncError ? t('sync.failing', { message: remoteSyncError }) : t('sync.synced', { suffix: remoteTreeId ? '' : t('sync.creating') })
    : t('sync.local');
  if (publicDb) return <LanguageContext.Provider value={i18n}><PublicTreePage db={publicDb} /></LanguageContext.Provider>;
  const accountMetadata = authUser?.user_metadata || {};
  const accountEmail = authUser?.email || '';
  const accountName = accountMetadata.full_name || accountMetadata.name || accountEmail.split('@')[0] || (language === 'es' ? 'Mi cuenta' : 'My account');
  const accountProfile = {
    id: authUser?.id || 'local-account',
    givenNames: accountName,
    surnames: '',
    email: accountEmail,
    profileImage: accountMetadata.avatar_url || accountMetadata.picture || ''
  };
  const activeTree = accessibleTrees.find((tree) => tree.id === remoteTreeId);
  const topbarAction = !canEdit ? null : section === 'sources'
    ? <button className="primaryButton" onClick={() => setSourceModal(true)}>{t('actions.newSource')}</button>
    : section === 'people'
      ? <button className="primaryButton" onClick={() => setPersonModal({ mode: 'new' })}>{t('actions.newPiece')}</button>
      : null;
  const showTopbarStats = section === 'tree';

  return (
    <LanguageContext.Provider value={i18n}>
    <main className={`appShell ${darkMode ? 'darkMode' : ''} ${sidebarCollapsed ? 'sidebarCollapsed' : ''}`}>
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <div className="brandMark"><img src="/raices-logo.png" alt="" /></div>
          <div className="brandText"><strong>Root Puzzle</strong><span>{t('appSubtitle')}</span></div>
          <button className="sidebarCollapseButton" type="button" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? t('nav.expand') : t('nav.collapse')} title={sidebarCollapsed ? t('nav.expand') : t('nav.collapse')}>
            {sidebarCollapsed ? <ChevronsRight size={18} strokeWidth={1.9} aria-hidden="true" /> : <ChevronsLeft size={18} strokeWidth={1.9} aria-hidden="true" />}
          </button>
        </div>
        {isSupabaseConfigured && (remoteTreeId || accessibleTrees.length === 0) && <div className="sidebarTreeContext">
          <span className="sidebarContextLabel">ÁRBOL ACTIVO</span>
          {remoteTreeId ? <>
            <button type="button" className={`activeTreeButton ${treeMenuOpen ? 'open' : ''}`} aria-expanded={treeMenuOpen} onClick={() => setTreeMenuOpen((value) => !value)}>
              <span className="activeTreeIcon"><Sprout size={15} strokeWidth={2} /></span><span className="activeTreeName">{activeTree?.name || db.settings.treeName}</span><ChevronDown className="activeTreeChevron" size={15} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <small>{currentTreeRole || 'viewer'}</small>
          </> : <>
            <span className="activeTreeEmpty">No hay un árbol activo</span>
            {canCreateTree && <button type="button" className="treeMenuCreate standaloneTreeCreate" onClick={openNewTreeModal}><span>+</span> Crear nuevo árbol</button>}
          </>}
          {remoteTreeId && treeMenuOpen && <div className="treeMenu" role="menu">
            <span className="treeMenuLabel">Tus árboles</span>
            {accessibleTrees.map((tree) => <button key={tree.id} type="button" className={tree.id === remoteTreeId ? 'selected' : ''} onClick={() => { setTreeMenuOpen(false); selectRemoteTree(tree.id); }}><span>{tree.id === remoteTreeId ? '✓' : ''}</span>{tree.name}</button>)}
            {isOwner && <button type="button" className="treeMenuRename" onClick={openRenameTreeModal}><span>✎</span> Editar nombre</button>}
            {isOwner && <button type="button" className="treeMenuCreate" onClick={openNewTreeModal}><span>+</span> Crear nuevo árbol</button>}
            {isOwner && <button type="button" className="treeMenuDelete" onClick={openDeleteTreeModal}><Trash2 size={13} /> Eliminar árbol</button>}
          </div>}
        </div>}
        <nav>{sections.filter(([id]) => id !== 'collaborators').map(([id, label, icon]) => {
          const sectionLabel = id === 'collaborators' ? 'Colaboradores' : t(label);
          return <button key={id} title={sectionLabel} className={section === id ? 'active' : ''} onClick={() => { setSection(id); }}><span className="navIcon">{icon}</span><span className="navLabel">{sectionLabel}</span></button>;
        })}</nav>
        <div className="sidebarSectionLabel">ADMINISTRACIÓN</div>
        <nav className="sidebarAdminNav">{sections.filter(([id]) => id === 'collaborators').map(([id, label, icon]) => {
          const sectionLabel = 'Colaboradores';
          return <button key={id} title={sectionLabel} className={section === id ? 'active' : ''} onClick={() => setSection(id)}><span className="navIcon">{icon}</span><span className="navLabel">{sectionLabel}</span></button>;
        })}</nav>
        <div className="sidebarBottom">
          <div className="sidebarProfile">
            <button type="button" title={t('profile.title')} className={`sidebarProfileButton ${section === 'profile' ? 'active' : ''}`} onClick={() => setSection('profile')}>
              <PersonAvatar person={accountProfile} />
              <div className="sidebarProfileText">
                <strong>{t('profile.title')}</strong>
                <span>{displayName(accountProfile)}</span>
                <small>{accountProfile.email || t('profile.localAccount')}</small>
              </div>
            </button>
            {isSupabaseConfigured && <button type="button" className="textButton sidebarSignOut" onClick={() => supabase?.auth.signOut()}>{language === 'es' ? 'Cerrar sesión' : 'Sign out'}</button>}
          </div>
        </div>
      </aside>

      <section className={`mainArea section-${section}`}>
        <header className="topbar">
          <div className="topbarTitle">
            <p className="eyebrow">{db.settings.treeName}</p>
            {section !== 'tree' && section !== 'findings' && <h1>{section === 'collaborators' ? 'Colaboradores' : t(`sections.${section}`)}</h1>}
            {section !== 'findings' && <p className="topbarSubtitle">{section === 'collaborators' ? 'Administrá el acceso al árbol activo.' : t(`subtitles.${section}`)}</p>}
          </div>
          <div className="topbarActions">
            {showTopbarStats && <div className="topbarStats">
              <Stat value={db.people.length} label={t('stats.pieces')} />
              <Stat value={db.parentChild.length + db.partnerships.length} label={t('stats.links')} />
              <Stat value={db.events.length} label={t('stats.events')} />
              <Stat value={db.sources.length} label={t('stats.sources')} />
            </div>}
            {topbarAction}
          </div>
        </header>

        {section === 'tree' && <TreeView db={db} focusedId={focusedId} setFocusedId={(id) => { setFocusedId(id); setSelectedId(id); }} onOpenPerson={(id) => openPersonDrawer(id, 'view')} onAdd={canEdit ? () => setPersonModal({ mode: 'new' }) : undefined} />}

        {section === 'findings' && <FindingsView db={db} />}

        {section === 'timeline' && <TimelineView db={db} onOpenPerson={(id) => { setSelectedId(id); setFocusedId(id); setSection('people'); }} />}

        {section === 'people' && <div className="peopleLayout peopleListOnly">
          <section className="peoplePane">
            <div className="paneToolbar"><input className="searchInput" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('placeholders.search')} /><span>{filteredPeople.length} {t('stats.results')}</span></div>
            {db.people.length === 0 ? <EmptyState onAdd={canEdit ? () => setPersonModal({ mode: 'new' }) : undefined} /> : <div className="personList">{filteredPeople.map((person) => <button key={person.id} className={`personRow ${personStatusClass(person)} ${selectedId === person.id ? 'selected' : ''}`} onClick={() => openPersonDrawer(person.id, 'view')}><PersonAvatar person={person} /><div><strong>{displayName(person)}</strong><span>{[person.birthDate, person.birthPlace].filter(Boolean).join(' · ') || t('people.bioPending')}</span></div><span className="chevron">›</span></button>)}</div>}
          </section>
        </div>}

        {section === 'sources' && <section className="contentPanel">
          {db.sources.length ? <div className="sourceGrid">{db.sources.map((source) => <article key={source.id} className="sourceCard"><span className="sourceType">{source.type}</span><h3>{source.title}</h3><p>{source.repository || t('sources.noRepository')}</p>{source.url && <a href={source.url} target="_blank" rel="noreferrer">{t('sources.openReference')}</a>}<small>{source.notes}</small></article>)}</div> : <div className="softEmpty"><h3>{t('sources.emptyTitle')}</h3><p>{t('sources.emptyBody')}</p></div>}
        </section>}

        {section === 'data' && <section className="contentPanel dataPanel">
          <div className="dataGrid">
            <article className="dataCard"><div className="dataIcon">{`{ }`}</div><h3>{t('data.jsonTitle')}</h3><p>{t('data.jsonBody')}</p><div className="buttonRow"><button className="secondaryButton" onClick={() => downloadText('raices-backup.json', JSON.stringify(db, null, 2), 'application/json')}>{t('actions.exportJson')}</button><button className="textButton" onClick={() => importRef.current?.click()}>{t('actions.import')}</button></div><input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} /></article>
            <article className="dataCard"><div className="dataIcon">GED</div><h3>GEDCOM 5.5.1</h3><p>{t('data.gedcomBody')}</p><div className="buttonRow"><button className="secondaryButton" onClick={() => downloadText('raices.ged', exportGedcom(db), 'text/plain')}>{t('actions.exportGedcom')}</button><button className="textButton" onClick={() => gedcomRef.current?.click()}>{t('actions.import')}</button></div><input ref={gedcomRef} hidden type="file" accept=".ged,text/plain" onChange={(e) => e.target.files?.[0] && importGed(e.target.files[0])} /></article>
            <article className="dataCard"><div className="dataIcon">PDF</div><h3>{t('data.pdfTitle')}</h3><p>{t('data.pdfBody')}</p><div className="buttonRow"><button className="secondaryButton" onClick={() => exportPdf(db, language)}>{t('actions.exportPdf')}</button></div></article>
            <article className="dataCard publishCard"><div className="dataIcon puzzleIcon">🧩</div><h3>{t('data.publishTitle')}</h3><p>{t('data.publishBody')}</p><div className="buttonRow"><button className="secondaryButton" onClick={publishTree}>{t('actions.generateLink')}</button></div>{publicTreeUrl && <div className="shareBox"><input readOnly value={publicTreeUrl} onFocus={(event) => event.target.select()} /><small>{t('data.linkCopied')}</small></div>}</article>
            <article className="dataCard accent"><div className="dataIcon">☁</div><h3>{t('data.syncTitle')}</h3><p>{remoteSyncNotice}</p></article>
            <article className="dataCard detectiveCard"><div className="dataIcon detectiveIcon">🕵</div><h3>{t('data.detectiveTitle')}</h3><p>{t('data.detectiveBody')}</p><div className="buttonRow"><button className="secondaryButton" onClick={runDetective} disabled={detectiveRunning}>{detectiveRunning ? t('data.investigating') : t('actions.activateDetective')}</button></div></article>
            <article className="dataCard puzzleCard"><div className="dataIcon puzzleIcon">🧩</div><h3>{t('data.importPieceTitle')}</h3><p>{t('data.importPieceBody')}</p><div className="buttonRow"><button className="secondaryButton" onClick={() => pieceImportRef.current?.click()}>{t('actions.importPiece')}</button></div><input ref={pieceImportRef} hidden type="file" accept="application/json,.json" onChange={(e) => e.target.files?.[0] && importPuzzlePiece(e.target.files[0])} /></article>
          </div>
          <PuzzleSuggestionsPanel suggestions={db.puzzleSuggestions || []} db={db} onAccept={acceptPuzzleSuggestion} onReject={rejectPuzzleSuggestion} />
          <DetectivePanel suggestions={db.detectiveSuggestions || []} db={db} running={detectiveRunning} onRun={runDetective} onAccept={acceptDetectiveSuggestion} onReject={(id) => updateDetectiveSuggestionStatus(id, 'rejected')} />
          <div className="warningBox"><strong>{t('data.warningTitle')}</strong> {t('warning.localStorage')}</div>
        </section>}

        {section === 'profile' && <section className="contentPanel profilePanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{t('profile.account')}</p>
              <h2>{t('profile.title')}</h2>
              <p className="muted">{t('profile.subtitle')}</p>
            </div>
          </div>
          <div className="profileAccount">
            <div className="profileCard">
              <PersonAvatar person={accountProfile} large />
              <div>
                <strong>{displayName(accountProfile)}</strong>
                <div className="muted small">{accountProfile.email || t('profile.localNoEmail')}</div>
              </div>
            </div>
            <div className="profileSettings">
              <div className="profileSetting">
                <div><strong>{t('profile.visualPreference')}</strong><span>{darkMode ? t('profile.darkActive') : t('profile.lightActive')}</span></div>
                <button className={`toggleSwitch iconOnly ${darkMode ? 'on' : 'off'}`} type="button" onClick={() => setDarkMode((v) => !v)} aria-label={darkMode ? t('profile.darkToLight') : t('profile.lightToDark')} aria-pressed={darkMode}>
                  <Sun size={16} strokeWidth={2} aria-hidden="true" />
                  <span className="toggleSwitchTrack" aria-hidden="true"><span /></span>
                  <Moon size={16} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
              <div className="profileSetting">
                <div><strong>{t('profile.language')}</strong><span>{language === 'es' ? t('profile.esSelected') : t('profile.enSelected')}</span></div>
                <button className={`toggleSwitch languageSwitch ${language === 'en' ? 'on' : 'off'}`} type="button" onClick={() => setLanguage((value) => value === 'es' ? 'en' : 'es')} aria-label={language === 'es' ? t('profile.changeToEnglish') : t('profile.changeToSpanish')} aria-pressed={language === 'en'}>
                  <span>ES</span>
                  <span className="toggleSwitchTrack" aria-hidden="true"><span /></span>
                  <span>EN</span>
                </button>
              </div>
              <div className="profileNotice"><small>{t('profile.notice')}</small></div>
            </div>
          </div>
          <div className="profileTools">
            <button className="secondaryButton iconTextButton" type="button" onClick={() => setSection('sources')}>
              {IconSources}
              <span>{t('sections.sources')}</span>
            </button>
            <button className="secondaryButton iconTextButton" type="button" onClick={() => setSection('data')}>
              {IconData}
              <span>{t('sections.data')}</span>
            </button>
          </div>
        </section>}

        {section === 'collaborators' && <section className="contentPanel collaboratorsPage">
          <CollaboratorsPanel invitations={treeInvitations} inviteLink={inviteLink} onInvite={inviteCollaborator} onRevoke={revokeInvitation} isOwner={isOwner} />
        </section>}

      </section>

      {/* Mobile bottom navigation (visible on small screens) */}
      <nav className="mobileBottomNav" role="navigation" aria-label={t('nav.navigation')}>
        <button className={section === 'tree' ? 'active' : ''} onClick={() => setSection('tree')} aria-label={t('sections.tree')} title={t('sections.tree')}>
          {IconHome}
          <small>{t('nav.rootsShort')}</small>
        </button>
        <button className={section === 'people' ? 'active' : ''} onClick={() => setSection('people')} aria-label={t('sections.people')} title={t('sections.people')}>
          {IconPieces}
          <small>{t('sections.people')}</small>
        </button>
        <button className={section === 'timeline' ? 'active' : ''} onClick={() => setSection('timeline')} aria-label={t('sections.timeline')} title={t('sections.timeline')}>
          {IconTimeline}
          <small>{t('nav.timelineShort')}</small>
        </button>
        <button className={section === 'findings' ? 'active' : ''} onClick={() => setSection('findings')} aria-label={t('sections.findings')} title={t('sections.findings')}>
          {IconFindings}
          <small>{t('sections.findings')}</small>
        </button>
        <button className={section === 'profile' ? 'active' : ''} onClick={() => setSection('profile')} aria-label={t('profile.title')} title={t('profile.title')}>
          {IconProfile}
          <small>{t('nav.profileShort')}</small>
        </button>
      </nav>

      {drawerPersonId && <PersonDrawer db={db} person={db.people.find((p) => p.id === drawerPersonId)} mode={drawerMode} onModeChange={setDrawerMode} onClose={() => { setDrawerPersonId(null); setDrawerMode('view'); }} onSave={saveExistingPerson} onFocus={openInTree} onLink={linkPerson} onRemoveRelation={(kind, otherId) => removeRelation(drawerPersonId, kind, otherId)} onDelete={deleteSelected} onAddEvent={() => setEventModal(true)} canEdit={canEdit} />}
      {personModal && <Modal title={t('modalTitles.newPiece')} onClose={() => setPersonModal(null)}><PersonForm initial={personModal.person} people={db.people} showRelation onCancel={() => setPersonModal(null)} onSave={savePerson} /></Modal>}
      {eventModal && selected && <EventForm person={selected} onClose={() => setEventModal(false)} onSave={addEvent} />}
      {sourceModal && <SourceForm onClose={() => setSourceModal(false)} onSave={(source) => { updateDb((prev) => ({ ...prev, sources: [...prev.sources, { id: newId('source'), ...source }] })); setSourceModal(false); }} />}
      {personDeleteModalOpen && selected && <Modal title={t('deletion.personTitle')} onClose={() => setPersonDeleteModalOpen(false)}>
        <div className="destructiveModal">
          <div className="destructiveModalIcon"><AlertTriangle size={24} /></div>
          <p className="destructiveModalLead">{t('deletion.personLead')}</p>
          <p className="destructiveModalQuestion">{translate(language, 'deletion.personConfirm', { name: displayName(selected) })}</p>
          <div className="modalActions"><button className="secondaryButton" type="button" onClick={() => setPersonDeleteModalOpen(false)}>{t('actions.cancel')}</button><button className="dangerButton" type="button" onClick={confirmDeleteSelected}><Trash2 size={15} /> {t('drawer.deletePerson')}</button></div>
        </div>
      </Modal>}
      {treeDeleteModalOpen && activeTree && <Modal title={t('deletion.treeTitle')} onClose={() => setTreeDeleteModalOpen(false)}>
        <form className="formStack destructiveModal" onSubmit={(event) => { event.preventDefault(); confirmDeleteTree(); }}>
          <div className="destructiveModalIcon"><AlertTriangle size={24} /></div>
          <p className="destructiveModalLead">{t('deletion.treeLead')}</p>
          <p className="destructiveModalQuestion">{t('deletion.treeConfirm')}</p>
          <div className="treeDeleteTarget"><span>{t('deletion.treeNameToDelete')}</span><strong>{activeTree.name}</strong></div>
          <label htmlFor="delete-tree-name">{t('deletion.typeName')}<input id="delete-tree-name" autoFocus value={treeDeleteName} onChange={(event) => setTreeDeleteName(event.target.value)} /></label>
          {treeDeleteName && treeDeleteName !== activeTree.name && <small className="destructiveModalError">{t('deletion.mismatch')}</small>}
          <div className="modalActions"><button className="secondaryButton" type="button" onClick={() => setTreeDeleteModalOpen(false)}>{t('deletion.cancel')}</button><button className="dangerButton" type="submit" disabled={treeDeleteName !== activeTree.name}><Trash2 size={15} /> {t('deletion.treeAction')}</button></div>
        </form>
      </Modal>}
      {newTreeModalOpen && <Modal title={treeNameModalMode === 'rename' ? (language === 'es' ? 'Editar nombre del árbol' : 'Edit tree name') : (language === 'es' ? 'Crear nuevo árbol' : 'Create new tree')} onClose={() => setNewTreeModalOpen(false)}>
        <form className="formStack newTreeForm" onSubmit={(event) => { event.preventDefault(); saveTreeName(newTreeName); }}>
          <div className="newTreeIntro"><span className="newTreeIntroIcon"><Sprout size={22} strokeWidth={1.8} /></span><div><strong>{treeNameModalMode === 'rename' ? (language === 'es' ? 'Elegí un nombre claro para identificarlo' : 'Choose a clear name to identify it') : (language === 'es' ? 'Un nuevo espacio para tu historia familiar' : 'A new space for your family story')}</strong><p>{treeNameModalMode === 'rename' ? (language === 'es' ? 'El cambio se aplica solo a este árbol y no modifica sus registros.' : 'This only changes this tree name and does not modify its records.') : (language === 'es' ? 'Podrás invitar colaboradores y administrar este árbol por separado.' : 'You can invite collaborators and manage this tree separately.')}</p></div></div>
          <label htmlFor="new-tree-name">{language === 'es' ? 'Nombre del árbol' : 'Tree name'}<input id="new-tree-name" autoFocus required maxLength={80} value={newTreeName} onChange={(event) => setNewTreeName(event.target.value)} placeholder={language === 'es' ? 'Ej. Familia Benítez' : 'Ex. Benitez family'} /></label>
          <div className="modalActions"><button className="secondaryButton" type="button" onClick={() => setNewTreeModalOpen(false)}>{t('actions.cancel')}</button><button className="primaryButton" type="submit">{treeNameModalMode === 'rename' ? (language === 'es' ? 'Guardar nombre' : 'Save name') : (language === 'es' ? 'Crear árbol' : 'Create tree')}</button></div>
        </form>
      </Modal>}
    </main>
    </LanguageContext.Provider>
  );
}
