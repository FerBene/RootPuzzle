# Raíces — Árbol Genealógico Web

MVP de una aplicación genealógica web inspirada en el flujo de trabajo de herramientas como MacFamilyTree, construida con **Next.js + React**.

## Qué cambia respecto de la versión Python

Esta versión corre como aplicación web moderna. No necesitás Python. Para desarrollar o ejecutarla localmente sólo necesitás **Node.js**. También puede publicarse en Vercel o en cualquier hosting compatible con un sitio estático.

La primera iteración es **offline-first**: los datos se guardan en `localStorage` del navegador. Esto permite probar y desarrollar el producto sin configurar una base de datos ni una cuenta. El siguiente paso recomendado es conectar un backend Postgres/Supabase para sincronización entre dispositivos, usuarios y archivos.

## Funciones incluidas

- Alta, edición y eliminación de personas.
- Búsqueda de personas.
- Vínculos padre/madre → hijo/a y parejas.
- Vista visual de familia inmediata, navegable.
- Ficha biográfica con nacimiento, fallecimiento, lugares, ocupación y notas.
- Eventos adicionales (bautismo, residencia, inmigración, matrimonio, etc.).
- Registro de fuentes documentales.
- Backup completo en JSON.
- Importación y exportación GEDCOM 5.5/5.5.1 básica.
- Diseño responsive para escritorio y móvil.
- Sin login ni servicios externos en este MVP.

## Ejecutar en Windows

1. Instalá Node.js LTS desde https://nodejs.org/
2. Descomprimí este proyecto.
3. Abrí una terminal dentro de la carpeta.
4. Ejecutá:

```bat
npm install
npm run dev
```

5. Abrí http://localhost:3000

No cierres la terminal mientras el servidor de desarrollo está funcionando.

## Publicar en Vercel

La aplicación tiene `output: 'export'`, por lo que no requiere backend en esta etapa.

Opción recomendada:

1. Subí la carpeta a un repositorio de GitHub.
2. En Vercel, elegí **Add New Project** e importá el repositorio.
3. Vercel detectará Next.js automáticamente.
4. Hacé Deploy.

También podés generar el sitio estático con:

```bash
npm run build
```

El resultado queda en la carpeta `out/`.

> Importante: publicar la app NO sincroniza los datos entre navegadores. Cada navegador mantiene su propio árbol hasta que agreguemos una base de datos remota.

## Backups

En la sección **Importar / Exportar** usá “Exportar JSON” para crear copias completas. Si limpiás los datos del navegador sin tener un backup, el contenido local se pierde.

## Próxima arquitectura recomendada

Para convertir este MVP en una alternativa web más cercana a MacFamilyTree:

- Next.js para interfaz y rutas.
- Supabase/Postgres para personas, familias, eventos, fuentes y citas.
- Supabase Storage o S3 para actas, fotografías y documentos.
- Autenticación opcional por correo/passkey.
- Row Level Security para privacidad.
- Motor de árbol de varias generaciones con zoom/pan.
- Evidencia por afirmación, nivel de confianza y conflictos entre fuentes.
- Mapas de lugares y migraciones.
- Detección de duplicados e inconsistencias de fechas/parentescos.
- Informes PDF y gráficos de ascendencia/descendencia.

## Modelo de datos del MVP

El backup JSON contiene:

- `people`
- `parentChild`
- `partnerships`
- `events`
- `sources`
- `citations`
- `settings`

El formato está versionado (`version: 1`) para permitir migraciones futuras.

## Verificación rápida del GEDCOM

El proyecto incluye una prueba autocontenida que no requiere Next.js:

```bash
npm run verify
```

## Licencia

Uso personal / prototipo. Adaptalo libremente para tu proyecto familiar.
