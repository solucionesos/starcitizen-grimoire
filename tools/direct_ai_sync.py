#!/usr/bin/env python3
"""
direct_ai_sync.py
=================
Ejecuta la sincronización de IA directamente usando los datos recién extraídos
del Issue Council por el navegador del subagente.
"""

import os
import json
import urllib.request
import urllib.error
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
JSON_PATH = SCRIPT_DIR.parent / "sc-frontend" / "public" / "data" / "manifestaciones.json"
SCRAPED_PATH = SCRIPT_DIR / "scraped_data.json"
ENV_PATH = SCRIPT_DIR / ".env"

def load_env():
    if ENV_PATH.exists():
        try:
            with open(ENV_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip()
        except Exception:
            pass

def load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[ERROR] No se pudo leer el archivo: {e}")
        return []

def save_json(path, data):
    try:
        data = sorted(data, key=lambda x: x["id"])
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[ERROR] No se pudo guardar el archivo: {e}")

def call_gemini_update(api_key, current_json, version, scraped_data):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    prompt = f"""
    Eres un analista de aseguramiento de calidad (QA) y sistemas de Star Citizen para la org de juego 'Ancalagon Oblivion Fleet'.
    Tu tarea es procesar el contenido de texto extraído directamente de múltiples incidencias del Issue Council para actualizar una base de datos JSON de 'Manifestaciones del Vacío' (regresiones y fallos de la versión {version} de Star Citizen).

    Datos de entrada:
    1. Base de datos JSON actual:
    {json.dumps(current_json, ensure_ascii=False, indent=2)}

    2. Compilación del juego analizada: {version}

    3. Incidencias extraídas (Issue Council):
    {json.dumps(scraped_data, ensure_ascii=False, indent=2)}

    Instrucciones de procesamiento:
    1. Lee cada incidencia provista en los datos extraídos (que contiene el ID de Issue Council y el texto de la página).
    2. Compara cada una con la Base de datos JSON actual:
       - Si identificas que la incidencia ya existe en el JSON (coincide con el código de "issue_council"):
         - Si del texto se infiere que ya fue solucionada/corregida ("Fixed", "Resolved" o notas de parches), cambia su "estado" a "Resuelto".
         - Si sigue activa, mantén su estado como "Activo", pero enriquece o corrige la "descripcion", "efecto_jugabilidad" o "workaround" basándote en la información real extraída.
       - Si identificas una incidencia que NO existe en el JSON actual y es relevante para la versión {version} o superior:
         - Añádela a la lista con un nuevo ID consecutivo (comenzando después del ID más alto del JSON actual).
         - Asígnale un "titulo" claro y formal en español.
         - Escribe una "descripcion" técnica de la causa en el motor/servidor.
         - Escribe su "efecto_jugabilidad" (el impacto para los operadores).
         - Escribe un "workaround" detallado si hay soluciones temporales mencionadas en la página (consejos de usuarios, etc.). Si no hay solución viable, escribe null.
         - Asígnale su código de "issue_council" real (ej. STARC-XXXXXX).
         - Asígnale el estado "Activo".
    3. Revisa la lista de bugs en el JSON actual: si el texto extraído indica que alguna de ellas ha cambiado su estado a corregido o cerrado, actualízalo a "Resuelto".
    4. Para aquellos bugs del JSON actual que no tengan correspondencia en el reporte extraído, manténlos exactamente igual en la lista (no los elimines ni alteres).
    5. Genera el resultado final como una lista JSON válida de objetos que respeten la estructura:
       - id (entero)
       - titulo (cadena)
       - issue_council (cadena o null)
       - descripcion (cadena)
       - efecto_jugabilidad (cadena)
       - workaround (cadena o null)
       - estado (cadena: "Activo" o "Resuelto")

    Genera ÚNICAMENTE la estructura JSON. No agregues explicaciones fuera de ella, ni formateo con bloques de código markdown.
    """

    data = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        print("[AI] Procesando incidencias con Gemini 3.5...")
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(raw_text.strip())
    except urllib.error.HTTPError as e:
        print(f"[ERROR] Error HTTP al llamar a la API de Gemini (Código {e.code})")
        return None
    except Exception as e:
        print(f"[ERROR] Error de procesamiento: {e}")
        return None

def main():
    print("=== SINCRONIZADOR IA DIRECTO (GEMINI 3.5) ===")
    
    load_env()
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[ERROR] No se encontró la API Key en tools/.env. Por favor, regístrela primero.")
        return

    if not SCRAPED_PATH.exists():
        print("[ERROR] No se encontraron datos scrapeados temporales en scraped_data.json.")
        return

    print("[Info] Cargando base de datos manifestaciones.json...")
    current_json = load_json(JSON_PATH)
    
    print("[Info] Cargando incidencias extraídas...")
    scraped_data = load_json(SCRAPED_PATH)
    
    print(f"[AI] Iniciando integración de {len(scraped_data)} nuevas incidencias...")
    updated_data = call_gemini_update(api_key, current_json, "4.9.0-live.12232306", scraped_data)
    
    if updated_data and isinstance(updated_data, list):
        valid_items = []
        for item in updated_data:
            if all(k in item for k in ("id", "titulo", "descripcion", "efecto_jugabilidad", "workaround", "estado")):
                valid_items.append(item)
        
        if valid_items:
            save_json(JSON_PATH, valid_items)
            print("[OK] Sincronización finalizada e integrada en manifestaciones.json.")
            
            # Limpiar archivo temporal
            try:
                SCRAPED_PATH.unlink()
                print("[Info] Limpieza de archivos temporales completada.")
            except Exception:
                pass
        else:
            print("[ERROR] Formato JSON retornado no es válido.")
    else:
        print("[ERROR] Falló la llamada a Gemini.")

if __name__ == "__main__":
    main()
