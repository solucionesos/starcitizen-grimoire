import json
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Configuración de Archivos
RAW_LOCATIONS_FILE = "tools/raw_locations.json"
STARMAP_FILE = "sc-frontend/src/data/starmap.json"
KNOWLEDGE_ITEM = "C:/Users/ancal/.gemini/antigravity-ide/knowledge/star_grimoire_ancalagon/artifacts/ancalagon_narrative_guide.md"

def load_codex():
    if os.path.exists(KNOWLEDGE_ITEM):
        with open(KNOWLEDGE_ITEM, 'r', encoding='utf-8') as f:
            return f.read()
    return "Tono: Grimdark, cuasi-religioso, filosófico. La UEE es la gran mentira. Usa términos como 'Ofrendas', 'Edictos', 'Custodios del Orden'."

def generate_lore(gemini_client, codex, location_data):
    print(f"Generando lore para: {location_data.get('nombre')}...")
    
    prompt = f"""
Eres el Heraldo de la Ancalagon Oblivion Fleet. Tu tarea es redactar la descripción oficial para el registro cartográfico del Star Grimoire.
Debes seguir estrictamente las reglas narrativas del Codex Oblivionis.

Información original de la ubicación:
- Nombre: {location_data.get('nombre')}
- Tipo: {location_data.get('tipo')}
- Facción: {location_data.get('faction')}
- Amenaza: {location_data.get('threat')}
- Descripción mundana: {location_data.get('raw_description')}

Reglas:
1. Reescribe la descripción mundana convirtiéndola en una descripción solemne, oscura, filosófica y cuasi-religiosa, alineada con la visión de la Ancalagon Oblivion Fleet (donde el orden corporativo/imperial es una mentira).
2. Genera también un "visual" (una frase muy corta que describa el aspecto físico, máximo 10 palabras).
3. Devuelve el resultado ESTRICTAMENTE en formato JSON plano sin markdown code blocks (solo las llaves), con dos campos: "descripcion" y "visual".
Ejemplo de salida esperada:
{{
  "descripcion": "Instalación subterránea construida en una mina abandonada. Un refugio para exiliados donde el orden de la UEE se quiebra. Es un laberinto de sombras ideal para ofrendas no registradas.",
  "visual": "Cavernas oscuras iluminadas por neón oxidado"
}}
"""
    
    try:
        response = gemini_client.models.generate_content(
            model='gemini-3.1-pro-preview',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=codex,
                temperature=0.7,
                response_mime_type="application/json"
            )
        )
        # Parse the JSON response
        result = json.loads(response.text)
        return result
    except Exception as e:
        print(f"Error generando lore para {location_data.get('nombre')}: {e}")
        return {
            "descripcion": f"FALLO DE CONEXIÓN CON EL VACÍO: {location_data.get('raw_description')}",
            "visual": "Desconocido"
        }

def inject_location(starmap_data, system_id, parent, location):
    # Find system
    system = next((s for s in starmap_data.get("sistemas", []) if s["id"] == system_id), None)
    if not system:
        print(f"Advertencia: Sistema {system_id} no encontrado. Creando uno nuevo.")
        system = {
            "id": system_id,
            "nombre": system_id.capitalize(),
            "estrella": system_id,
            "afiliacion": "Desconocida",
            "descripcion": "Sistema registrado recientemente en los archivos.",
            "color_estrella": "#FFFFFF",
            "planetas": [],
            "jump_points": []
        }
        starmap_data["sistemas"].append(system)
    
    if parent == f"{system_id}_SYSTEM":
        # It's a planet
        if "planetas" not in system:
            system["planetas"] = []
        
        # Check if exists
        existing = next((p for p in system["planetas"] if p["id"] == location["nombre"].lower()), None)
        if existing:
            existing.update(location)
        else:
            location["id"] = location["nombre"].lower()
            if "color" not in location: location["color"] = "#888888"
            if "orbitRadius" not in location: location["orbitRadius"] = 150
            if "orbitAngle" not in location: location["orbitAngle"] = 0
            if "lunas" not in location: location["lunas"] = []
            if "estaciones" not in location: location["estaciones"] = []
            if "hijos" not in location: location["hijos"] = []
            system["planetas"].append(location)
        print(f"Inyectado planeta {location['nombre']} en {system_id}")
    else:
        # Find parent planet
        planet = next((p for p in system.get("planetas", []) if p["nombre"].lower() == parent.lower()), None)
        if planet:
            tipo = location.get("tipo", "moon")
            lista = "lunas" if tipo == "moon" else "estaciones" if tipo == "station" else "hijos"
            
            if lista not in planet:
                planet[lista] = []
                
            existing = next((l for l in planet[lista] if l["nombre"].lower() == location["nombre"].lower()), None)
            if existing:
                existing.update(location)
            else:
                planet[lista].append(location)
            print(f"Inyectado {location['nombre']} en el planeta {parent}")
        else:
            print(f"Error: Padre {parent} no encontrado para {location['nombre']}")

def main():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY no encontrada en las variables de entorno.")
        return
        
    try:
        with open(RAW_LOCATIONS_FILE, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
    except Exception as e:
        print(f"ERROR leyendo {RAW_LOCATIONS_FILE}: {e}")
        return

    try:
        with open(STARMAP_FILE, 'r', encoding='utf-8') as f:
            starmap_data = json.load(f)
    except Exception as e:
        print(f"ERROR leyendo {STARMAP_FILE}: {e}")
        return

    codex = load_codex()
    client = genai.Client(api_key=api_key)

    system_id = raw_data.get("system_id", "UNKNOWN")
    locations = raw_data.get("locations", [])

    for loc in locations:
        parent = loc.pop("parent", None)
        raw_desc = loc.pop("raw_description", "")
        
        # Call Gemini
        lore_data = generate_lore(client, codex, {**loc, "raw_description": raw_desc})
        
        # Merge data
        loc["descripcion"] = lore_data.get("descripcion", raw_desc)
        loc["visual"] = lore_data.get("visual", "Desconocido")
        
        inject_location(starmap_data, system_id, parent, loc)
        
    # Save back
    with open(STARMAP_FILE, 'w', encoding='utf-8') as f:
        json.dump(starmap_data, f, indent=2, ensure_ascii=False)
        
    print(f"\n¡Actualización completada! Se guardaron los cambios en {STARMAP_FILE}")

if __name__ == "__main__":
    main()
