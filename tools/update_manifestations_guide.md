# Guía Operativa: Consulta y Sincronización Manual de Manifestaciones del Vacío

Esta guía establece el procedimiento estándar para auditar, buscar y actualizar de manera manual las anomalías de juego ("Manifestaciones del Vacío") en la plataforma **Star Grimoire** (dentro del módulo **Datavelo**).

---

## Flujo de Trabajo en 6 Pasos

### Paso 1: Determinar la Versión de Compilación Activa
Antes de buscar nuevos fallos o validar correcciones, debe conocer qué versión del juego está registrada en el backend.
1. Ejecute una consulta HTTP rápida al endpoint local del backend:
   ```bash
   curl http://localhost:3001/api/version
   ```
2. O revise la barra de navegación superior en la interfaz del Star Grimoire para identificar la versión (ej. `4.9.0-live.12232306`).
3. Anote la versión base (ej. `4.9.0` o `4.9.1`) para utilizarla como filtro en sus búsquedas.

---

### Paso 2: Consultar en el Issue Council (RSI)
El **Issue Council** es la fuente oficial y primaria. 
1. Acceda a: [Issue Council - Star Citizen](https://issue-council.robertsspaceindustries.com/projects/STAR-CITIZEN)
2. Utilice los siguientes operadores de búsqueda en la barra de consultas:
   * `version:4.9.0` (o la versión activa actual).
   * `version:4.9.1` (para comprobar si un fallo persiste en parches posteriores).
   * Palabras clave de sistemas críticos de persistencia: `cargo elevator`, `inventory desync`, `double helmet`, `spawn resolver`.
3. Verifique el estado de los reportes:
   * **Confirmed / Under Investigation:** El bug sigue presente. Debe listarse o mantenerse en el JSON.
   * **Fixed:** El bug ha sido solucionado. Si la versión activa del Star Grimoire es igual o superior a la versión del fix, el caso debe ser marcado como resuelto o retirado del JSON.

---

### Paso 3: Rastrear en Reddit y la Comunidad
Muchos fallos sistémicos complejos y soluciones temporales (*workarounds*) se documentan primero en foros comunitarios.
1. Visite la comunidad de Reddit: [r/starcitizen](https://www.reddit.com/r/starcitizen/)
2. Realice búsquedas focalizadas en la barra interna de Reddit:
   * `4.9.0 bugs list`
   * `4.9 workarounds`
   * `4.9.0-LIVE issue`
3. Revise los hilos fijados (*sticky posts*) semanales de preguntas y respuestas o las notas de parches comunitarias.
4. Identifique y documente los protocolos de mitigación técnica (*workarounds*) descritos por los jugadores para añadirlos a las fichas.

---

### Paso 4: Validar en Otras Fuentes de Datos
Utilice estas bases de datos mantenidas por la comunidad para contrastar y enriquecer las descripciones:
* **Star Citizen Wiki (API V2):** Para comprobar si hay naves de préstamo (*loaners*) oficiales asignadas para mitigar bugs (ej. la Prospector asignada por el bug del HUD de minería).
* **SCFocus / Star Citizen Tools:** Monitoree los registros de estabilidad de servidores y bases de datos.

---

### Paso 5: Actualizar la Base de Datos JSON
Una vez recopilada y filtrada la información, debe actualizar la base de datos local.

El archivo destino es:
`sc-frontend/public/data/manifestaciones.json`

#### Formato Estándar del JSON:
Cada entrada en la lista debe cumplir estrictamente con el siguiente esquema:
```json
  {
    "id": 12,
    "titulo": "Nombre Claro y Descriptivo de la Anomalía",
    "issue_council": "STARC-XXXXXX", // Código del caso o null si es un fallo generalizado sin ID unificado
    "descripcion": "Detalle técnico de qué ocurre a nivel de servidor o motor de persistencia.",
    "efecto_jugabilidad": "Cómo afecta esto a la experiencia de juego de los operadores de la org.",
    "workaround": "Pasos detallados para evadir o solucionar temporalmente el fallo en el entorno LIVE. Si no existe, escribir null."
  }
```

---

### Paso 6: Compilar y Desplegar
Una vez modificado el JSON:
1. Pruebe que la aplicación compile sin problemas de sintaxis:
   ```bash
   cd sc-frontend
   npm run build
   ```
2. Realice el commit de los datos actualizados y súbalos a producción:
   ```bash
   git add sc-frontend/public/data/manifestaciones.json
   git commit -m "data(datavelo): actualizar tabla de anomalías del vacío para la versión 4.9.X"
   git push origin main
   ```

---

## Herramientas de Apoyo
Para simplificar la adición de nuevos casos sin cometer errores de formato JSON, puede ejecutar la herramienta interactiva de consola ubicada en `tools/add_manifestation.py`:
```bash
python tools/add_manifestation.py
```
*(Esta herramienta te solicitará los campos uno por uno, validará el formato y los guardará directamente en el archivo JSON).*
