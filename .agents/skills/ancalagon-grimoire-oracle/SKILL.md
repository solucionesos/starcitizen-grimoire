---
name: ancalagon-grimoire-oracle
description: >-
  Guía técnica y protocolo de ejecución para crear e insertar en caliente
  Votaciones del Cónclave (Polls), Designios Sagrados (Objectives), Edictos de
  Cruzada / Calendario Abisal (Crusades) y Crónicas Sagradas del Lectitio
  Divinitatus (Chronicles) en Star Grimoire (Ancalagon Oblivion Fleet).
  Consultar SIEMPRE que el usuario pida crear, proclamar o agendar una
  Votación, un Designio, una Cruzada/Edicto o una Crónica.
---

# Oráculo del Star Grimoire — Protocolo Técnico de Proclamación en Caliente

Esta skill define la arquitectura técnica, esquemas de datos, endpoints de inserción en caliente y comandos exactos que debes utilizar **siempre** que el usuario te pida crear o proclamar:
1. **Una Votación / Deliberación en el Cónclave** (`/api/polls/agent`)
2. **Un Designio Sagrado / Objetivo de la Flota o Individual** (`/api/objectives/agent`)
3. **Un Edicto de Cruzada / Operación Militar en el Calendario** (`/api/crusades/agent`)
4. **Una Crónica Sagrada en el Lectitio Divinitatus** (`/api/chronicles/agent`)

> **REGLA DE ORO NARRATIVA:** Antes de redactar el contenido de cualquier Votación, Designio o Cruzada, debes aplicar estrictamente las directrices del **Codex Oblivionis** (`ancalagon-oblivion-fleet`):
> - **Tono:** Grimdark litúrgico, solemne, implacable.
> - **Cierre obligatorio en descripciones/briefings:** `IN NOMINI OBLIVIONIS.`
> - **Fechas en textos vs. Fechas ISO:**
>   - En cualquier texto visible (`title`, `description`, `briefing`, `label`), **JAMÁS** escribas años del siglo XXI (`2026`); escribe siempre **`Ciclo 2956`** (+930 años).
>   - En los campos de fecha técnica (`closes_at`, `due_date`, `operation_date`), envía formato **ISO 8601 real** (ej. `"2026-11-25T21:00:00Z"`), ya que el backend evalúa expiraciones contra el reloj del servidor y el frontend (`formatAbyssalDate`) suma automáticamente `+930` años al renderizar.

---

## 1. Conexión y Autenticación del Oráculo

El proyecto corre en contenedores Docker (`ancalagon_backend` en puerto `3001` y `ancalagon_frontend` en puerto `5173`):
- **URL Base (Backend directo):** `http://localhost:3001/api`
- **URL Base (Proxy Nginx):** `http://localhost:5173/api`
- **Autenticación del Agente:**
  - Header requerido: `X-Agent-Token: ancalagon-sync-secret` (o el valor definido en `SYNC_SECRET_TOKEN` dentro de `r:\starcitizen\backend\.env`).
  - Alternativamente, puedes enviar `"agent_token": "ancalagon-sync-secret"` dentro del cuerpo JSON.

---

## 2. Registro Oficial de Miembros y Rangos (Para `creator_handle` y `assigned_to_handle`)

Usa siempre los nombres canónicos del **Roster Oficial (Ciclo 2956)**:

| Handle (`display_name`) | ID en SQLite | Nivel (`rank_level`) | Rango en La Escala del Abismo | Rol / Uso Recomendado |
| :--- | :--- | :---: | :--- | :--- |
| **`Quaker`** | `usr-quaker-heraldo` | `6` | Heraldo de Ancalagon | Solo proclamaciones supremas de toda la flota |
| **`Enanimus`** | `usr-enanimus-profeta` | `5` | Profetas de la Ruina | Concilio del Vacío (Emisor por defecto de Edictos y Votaciones) |
| **`Denoxx`** | `usr-denoxx-profeta` | `5` | Profetas de la Ruina | Concilio del Vacío (Doctrina bélica, Pyro y Nyx) |
| **`Longhinus`** | `usr-longhinus-profeta` | `5` | Profetas de la Ruina | Concilio del Vacío (Asedio capital, Bóvedas y Forja) |
| **`Afol86`** | `usr-afol86-voz` | `4` | Voces del Abismo | Comandante de escuadrón y mentor de combate |
| **`Unknown-t20`** | `usr-unknown-portador` | `3` | Portadores de Ceniza | Veterano silencioso; ideal para encomiendas de vanguardia |
| **`Kannabistian420`** | `usr-kannabistian-iniciado` | `2` | Iniciados del Vacío | Operativo consagrado; ideal para recolección/escolta |

---

## 3. Especificación de Endpoints en Caliente

### A. Crear Votación en el Cónclave (`POST /api/polls/agent`)

- **Endpoint:** `POST http://localhost:3001/api/polls/agent` (alias: `/api/polls/proclaim`)
- **Efecto:** Abre inmediatamente una deliberación en `/conclave` y la agenda en el Calendario Abisal. Cuando se cierra (manualmente o al vencer `closes_at`), publica un Veredicto en la portada (`/`) y ejecuta automáticamente su acción vinculante (crea la Cruzada, Convocatoria o Designio ganador).
- **Esquema JSON:**
  ```json
  {
    "title": "Deliberación del Concilio: [Título solemne]",
    "description": "Contexto estratégico en tono grimdark... IN NOMINI OBLIVIONIS.",
    "poll_type": "cruzada",
    "closes_at": "2026-11-30T23:59:59Z",
    "min_rank_level": 1,
    "creator_handle": "Enanimus",
    "options": [
      {
        "label": "Senda I: Nombre de la opción",
        "description": "Detalle táctico o sector estelar",
        "metadata": { "location": "Pyro VI — Ruin Station" }
      },
      {
        "label": "Senda II: Nombre de la segunda opción",
        "description": "Detalle táctico alternativo"
      }
    ]
  }
  ```
- **Valores válidos para `poll_type`:**
  - `"cruzada"` — Elegir misión u operación militar de la flota (al cerrar crea automáticamente un Edicto de Cruzada).
  - `"convocatoria"` — Elegir fecha/hora de operación (al cerrar agenda automáticamente la convocatoria en Cruzadas y Calendario).
  - `"designio"` — Elegir objetivo estratégico de la flota (al cerrar crea automáticamente un Designio activo).
  - `"libre"` — Deliberación doctrinal general.
- **Valores válidos para `min_rank_level`:** `1` (Sombras del Umbral / todos), `2` (Iniciados), `3` (Portadores), `4` (Voces), `5` (Solo Concilio del Vacío).

---

### B. Crear Designio Sagrado (`POST /api/objectives/agent`)

- **Endpoint:** `POST http://localhost:3001/api/objectives/agent` (alias: `/api/objectives/proclaim`)
- **Efecto:** Inserta en caliente un objetivo persistente en `/edictos` (pestaña *Designios de la Flota*) y, si tiene `assigned_to_handle`, aparece también en el expediente personal (`/hermano`) del hermano asignado.
- **Esquema JSON:**
  ```json
  {
    "title": "Nombre del Designio Sagrado",
    "description": "Por decreto de los Profetas de la Ruina, se ordena [acción] en [lugar]. El incumplimiento es una ofensa contra el Abismo. La recompensa: la Marca del Abismo. El costo del fracaso: el silencio. IN NOMINI OBLIVIONIS.",
    "scope": "org",
    "category": "combate",
    "status": "activo",
    "progress": 0,
    "due_date": "2026-11-25T22:00:00Z",
    "creator_handle": "Enanimus",
    "assigned_to_handle": "Unknown-t20"
  }
  ```
- **Valores válidos:**
  - `scope`: `"org"` (Toda la Flota), `"cargo"` (Escuadrón/Rango), `"individual"` (Encomienda personal).
  - `category`: `"recoleccion"` (Acopio de Ofrendas), `"combate"` (Purga de Los Custodios), `"forja"` (Tecnomilagros), `"ascenso"` (Ritual de Ascenso), `"general"` (Campaña del Vacío).
  - `status`: `"activo"`, `"en_progreso"`, `"marca_del_abismo"` (completado), `"ceniza_fria"` (abandonado).

---

### C. Crear Edicto de Cruzada y Calendario (`POST /api/crusades/agent`)

- **Endpoint:** `POST http://localhost:3001/api/crusades/agent` (alias: `/api/crusades/proclaim`)
- **Efecto:** Publica en caliente una operación militar en `/edictos` (pestaña *Edictos de Cruzada*) y la registra automáticamente en el *Calendario Abisal (Ciclo 2956)*, permitiendo además inscribir un contingente inicial de hermanos.
- **Esquema JSON:**
  ```json
  {
    "title": "Edicto de Sangre: [Nombre de la Operación]",
    "location": "Pyro III — Contested Zone",
    "operation_date": "2026-11-22T21:00:00Z",
    "description": "Resumen ejecutivo de la operación.",
    "briefing": "Por decreto de los Profetas de la Ruina, se ordena [acción] en [lugar]. El incumplimiento es una ofensa contra el Abismo. La recompensa: la Marca del Abismo. El costo del fracaso: el silencio. IN NOMINI OBLIVIONIS.",
    "ships_required": ["Polaris", "Hammerhead", "Redeemer", "Eclipse"],
    "max_brothers": 24,
    "creator_handle": "Enanimus",
    "initial_signups": [
      { "handle": "Enanimus", "ship_brought": "RSI Polaris", "role_assigned": "Profeta al Mando" },
      { "handle": "Afol86", "ship_brought": "Aegis Eclipse", "role_assigned": "Voz de Escuadrón" },
      { "handle": "Unknown-t20", "ship_brought": "Aegis Redeemer", "role_assigned": "Vanguardia de Ceniza" }
    ]
  }
  ```

---

### D. Crear o Actualizar Crónica Sagrada en el Lectitio Divinitatus (`POST /api/chronicles/agent`)

- **Endpoint:** `POST http://localhost:3001/api/chronicles/agent` (alias: `/api/chronicles/proclaim`)
- **Efecto:** Inserta en caliente (o actualiza si se envía un `id` existente) una Crónica Sagrada en `/divinitatus` (`Lore.tsx`), persistiendo en `data/chronicles.json` dentro del volumen Docker y actualizando la caché en memoria del servidor de forma inmediata.
- **Esquema JSON completo:**
  ```json
  {
    "title": "CRÓNICA XIV",
    "subtitle": "EL DESPERTAR EN LAS CENIZAS DE PYRO",
    "date": "18 Nov 2956",
    "classification": "Crónica de Guerra",
    "icon": "dragon",
    "color": "var(--secondary)",
    "blocks": [
      {
        "type": "p",
        "text": "En el <strong style=\"color: var(--secondary)\">Ciclo 2956</strong>, cuando las flotas de Los Ciegos creyeron haber sellado las rutas de salto..."
      },
      {
        "type": "header",
        "icon": "⚔️",
        "title": "I. El Decreto del Concilio del Vacío"
      },
      {
        "type": "p",
        "text": "El Profeta <strong style=\"color: var(--secondary)\">Enanimus</strong> y las Voces del Abismo lideradas por <strong style=\"color: var(--primary)\">Afol86</strong> trazaron la maniobra...",
        "muted": true
      },
      {
        "type": "grid",
        "items": [
          {
            "icon": "🔥",
            "title": "La Ruptura",
            "text": "Las defensas orbitales cayeron en silencio absoluto."
          },
          {
            "icon": "☩",
            "title": "La Marca del Abismo",
            "text": "Los Portadores de Ceniza reclamaron el núcleo del artefacto."
          }
        ]
      },
      {
        "type": "quote",
        "text": "Donde los Ciegos ven el fin, nosotros contemplamos el principio.<br /><br /><span style=\"color: var(--text-main); font-size: 0.9rem;\">☩ IN NOMINI OBLIVIONIS 🐉 ☩</span>"
      }
    ]
  }
  ```
- **Tipos de bloques soportados en `blocks`:**
  1. `{"type": "p", "text": "HTML/texto permitido", "muted": false}` — Párrafo narrativo (admite `<strong>` y `<em>` con estilos `var(--secondary)` o `var(--primary)`).
  2. `{"type": "header", "icon": "⚔️", "title": "I. Subtítulo de Sección"}` — Encabezado divisor de capítulos dentro de la crónica.
  3. `{"type": "quote", "text": "Cita solemne..."}` — Bloque de cita litúrgica centrada con borde dorado.
  4. `{"type": "grid", "items": [{"icon": "🌑", "title": "...", "text": "..."}]}` — Cuadrícula de conceptos o hitos de la crónica.
- **Atajo rápido (`paragraphs`):** Si envías `"paragraphs": ["Párrafo 1...", "Párrafo 2..."]` en lugar de `blocks`, el endpoint los convierte automáticamente en bloques `p` y añade al final el bloque `quote` con `☩ IN NOMINI OBLIVIONIS 🐉 ☩`.
- **Valores recomendados para `icon` y `color`:**
  - `icon`: `"dragon"` (renderiza el `DragonIcon` oficial), `"☩"`, `"🐉"`, `"⚔"`, `"🌑"`, `"🔥"`.
  - `color`: `"var(--secondary)"` (oro imperial) o `"var(--primary)"` (carmesí sangre).
  - `classification`: `"Registro Fundacional"`, `"Edicto Sagrado"`, `"Crónica de Guerra"`, `"Profecía del Vacío"`.

---

## 4. Cómo Ejecutar la Inserción desde el Agente

Dado que el proyecto se ejecuta dentro de Docker en Windows, puedes invocar los endpoints directamente ejecutando `node -e` dentro del contenedor `ancalagon_backend` (mediante `docker exec ancalagon_backend node -e ...`) o desde PowerShell con `Invoke-RestMethod` hacia `http://localhost:3001/api/...`.

### Método Recomendado (Vía `docker exec` — No depende de puertos externos ni de codificación de consola Windows):

```powershell
docker exec ancalagon_backend node -e "fetch('http://localhost:3001/api/objectives/agent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Agent-Token': 'ancalagon-sync-secret' }, body: JSON.stringify({ title: '...', scope: 'org', category: 'combate', creator_handle: 'Enanimus' }) }).then(r => r.json()).then(console.log)"
```
