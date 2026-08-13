# Guía Operativa: Actualización de Cartografía Estelar y Lore (Nexo Estelar)

Esta guía establece el procedimiento estándar para auditar actualizaciones del juego (como la adición del sistema Nyx o nuevos planetas en Pyro/Stanton) e incorporarlas al `starmap.json` bajo las estrictas directrices narrativas de la **Ancalagon Oblivion Fleet**.

El proceso está semi-automatizado gracias al uso de Inteligencia Artificial (Gemini 3.1 Pro), la cual se encargará de transformar descripciones mundanas en lore "Grimdark" adecuado para la organización.

---

## Flujo de Trabajo en 4 Pasos

### Paso 1: Rastrear y Extraer Datos Originales (Raw Data)
Cuando se lanza un nuevo parche (ej. Alpha 4.0 - Sistema Nyx), debes recopilar las nuevas ubicaciones.
*Fuentes oficiales recomendadas para extraer los datos:*
1. **Star Citizen Wiki V2:** [starcitizen.tools](https://starcitizen.tools/) (Ideal para detalles de facciones, radio de órbita y amenazas).
2. **Patch Notes de RSI:** Revisa los comunicados oficiales para identificar nuevas estaciones, lunas o puntos de salto.
3. **SCFocus / SCMDB:** Para nombres técnicos exactos si fuesen necesarios.

No necesitas preocuparte por la redacción narrativa en este punto. Solo recopila los hechos crudos: nombre, tipo (planet, moon, station, etc.), a qué sistema/planeta pertenece, facción y una descripción genérica de lo que es (ej. "Levski es una antigua instalación minera abandonada ahora ocupada por la People's Alliance").

---

### Paso 2: Crear el Archivo de Lotes (`raw_locations.json`)
Dado que no utilizamos una entrada manual uno-a-uno por consola, procesaremos las ubicaciones en lote (*batch*).
1. Crea o edita el archivo `tools/raw_locations.json` en la raíz de herramientas.
2. Añade las nuevas ubicaciones estructuradas en el siguiente formato:

```json
{
  "system_id": "NYX",
  "locations": [
    {
      "parent": "NYX_SYSTEM", 
      "nombre": "Delamar",
      "tipo": "planet",
      "threat": "MEDIO",
      "faction": "People's Alliance",
      "raw_description": "Asteroide masivo del tamaño de una pequeña luna, oculto en el cinturón de asteroides de Nyx. Contiene la zona de aterrizaje Levski, un refugio para exiliados políticos y activistas anti-UEE."
    },
    {
      "parent": "Delamar",
      "nombre": "Levski",
      "tipo": "city",
      "threat": "ALTO",
      "faction": "People's Alliance",
      "raw_description": "Instalación subterránea construida en una mina abandonada en Delamar. Es un laberinto de túneles oscuros y mercado negro, ideal para quienes buscan operar fuera de la ley."
    }
  ]
}
```
*Nota: `parent` indica a qué entidad pertenece. Si es un planeta nuevo flotando libremente, el `parent` será `<ID_DEL_SISTEMA>_SYSTEM` (ej. `"NYX_SYSTEM"` o `"STANTON_SYSTEM"`). Si es una luna o ciudad, su `parent` será el nombre del planeta u objeto que orbita.*

---

### Paso 3: Ejecutar el Motor Narrativo de Ancalagon (starmap_lore_updater.py)
Este script tomará los datos crudos, se conectará a la API de **Gemini 3.1 Pro** suministrándole el *Codex Oblivionis* como contexto, y generará la descripción de Ancalagon. Luego, inyectará automáticamente los nodos creados dentro de `sc-frontend/src/data/starmap.json`.

1. Asegúrate de tener tu API Key de Gemini configurada como variable de entorno o en tu archivo `.env` en la carpeta `tools`:
   ```bash
   GEMINI_API_KEY="tu_clave_aqui"
   ```
2. Ejecuta el actualizador:
   ```bash
   python tools/starmap_lore_updater.py
   ```
3. El script leerá el archivo `raw_locations.json`, procesará cada ubicación, imprimirá en consola la descripción narrativa generada (para tu revisión) y reescribirá el `starmap.json`.

---

### Paso 4: Validar y Desplegar
Una vez inyectada la nueva cartografía:
1. Arranca el entorno frontend para validar que las nuevas ubicaciones aparecen en el Nexo Estelar:
   ```bash
   cd sc-frontend
   npm run dev
   ```
2. Revisa visualmente que los objetos orbitan correctamente y que el tono narrativo de Gemini haya respetado el léxico de la flota (Ofrendas, Custodios del Orden, Edictos, etc.).
3. Realiza el commit de los datos actualizados:
   ```bash
   git add sc-frontend/src/data/starmap.json
   git commit -m "data(starmap): expandir cartografía incorporando nuevas ubicaciones vía motor narrativo"
   git push origin main
   ```
