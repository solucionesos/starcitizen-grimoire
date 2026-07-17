#!/usr/bin/env python3
"""
ai_sync_manifestations.py
=========================
Actualiza automáticamente la tabla de manifestaciones del vacío utilizando la API de Gemini (versión 3.5).
Compara el JSON actual con un reporte de parches, notas de CIG o publicaciones de Reddit
para agregar nuevos bugs, actualizar workarounds y marcar como "Resueltos" aquellos que
hayan sido corregidos.
"""

import os
import json
import urllib.request
import urllib.error
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
JSON_PATH = SCRIPT_DIR.parent / "sc-frontend" / "public" / "data" / "manifestaciones.json"

def load_env():
    # Intenta cargar variables desde .env en tools o raíz del proyecto
    for env_path in [SCRIPT_DIR / ".env", SCRIPT_DIR.parent / ".env"]:
        if env_path.exists():
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ[k.strip()] = v.strip()
            except Exception:
                pass

def get_current_version():
    try:
        with urllib.request.urlopen("http://localhost:3001/api/version", timeout=3) as r:
            data = json.loads(r.read().decode("utf-8"))
            return data.get("version") or "4.9.0-LIVE"
    except Exception:
        return "4.9.0-LIVE"

def load_json():
    if not JSON_PATH.exists():
        return []
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[ERROR] No se pudo leer el JSON: {e}")
        return []

def save_json(data):
    try:
        # Ordenar por ID para consistencia
        data = sorted(data, key=lambda x: x["id"])
        with open(JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[OK] Base de datos JSON actualizada en {JSON_PATH.name}")
    except Exception as e:
        print(f"[ERROR] No se pudo guardar el JSON: {e}")

def call_gemini(api_key, current_json, version, source_text):
    # Usando el modelo Gemini 3.5 Flash solicitado
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    prompt = f"""
    Eres un analista de aseguramiento de calidad (QA) y sistemas de Star Citizen para la org de juego 'Ancalagon Oblivion Fleet'.
    Tu tarea es procesar un texto de reporte (patch notes, hilos de Reddit, reportes de bugs) para actualizar una base de datos JSON de 'Manifestaciones del Vacío' (regresiones y fallos de la versión {version} de Star Citizen).

    Datos de entrada:
    1. Base de datos JSON actual:
    {json.dumps(current_json, ensure_ascii=False, indent=2)}

    2. Compilación del juego analizada: {version}

    3. Texto del nuevo reporte / fuente:
    ---
    {source_text}
    ---

    Instrucciones de procesamiento:
    1. Analiza el Texto del nuevo reporte para identificar fallos técnicos, regresiones críticas, bugs o menciones de corrección de errores (fixes) que apliquen a la versión {version} o superiores.
    2. Compara los hallazgos con la Base de datos JSON actual:
       - Si identificas que un bug del reporte ya existe en el JSON (coincide por título, descripción o código STARC de Issue Council):
         - Si el reporte indica que fue CORREGIDO, SOLUCIONADO o ARREGLADO ("fixed", "resolved"), cambia su "estado" a "Resuelto".
         - Si sigue activo, mantén su estado como "Activo", pero enriquece o corrige la "descripcion", "efecto_jugabilidad" o "workaround" si el nuevo reporte aporta mejores contramedidas o detalles.
       - Si identificas un nuevo bug o regresión que NO existe en el JSON actual:
         - Añádelo a la lista con un nuevo ID consecutivo (comenzando después del ID más alto del JSON actual).
         - Asígnale un "titulo" claro y formal en español.
         - Escribe una "descripcion" técnica de la causa en el motor/servidor.
         - Escribe su "efecto_jugabilidad" (el impacto para los operadores).
         - Si hay pasos descritos para mitigar el error, redacta un "workaround" detallado. Si no hay solución viable, escribe null.
         - Asígnale el código "issue_council" de RSI (ej. STARC-XXXXXX) si el reporte lo menciona; si no, escribe null.
         - Asígnale el estado "Activo".
    3. Para aquellos bugs del JSON actual que NO se mencionen en el nuevo texto de reporte, manténlos exactamente igual en la lista (no los elimines ni alteres).
    4. Genera el resultado final como una lista JSON válida de objetos que respeten la estructura:
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
        print("[AI] Procesando reporte con Gemini 3.5 AI...")
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(raw_text.strip())
    except urllib.error.HTTPError as e:
        print(f"[ERROR] Error HTTP al llamar a la API de Gemini (Código {e.code})")
        try:
            print("Detalle:", e.read().decode("utf-8"))
        except Exception:
            pass
        return None
    except Exception as e:
        print(f"[ERROR] Error en el procesamiento del resultado: {e}")
        return None

def fetch_url(url):
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        print(f"[Descarga] Obteniendo contenido de {url}...")
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode("utf-8", errors="ignore")
            try:
                js = json.loads(html)
                return json.dumps(js, indent=2, ensure_ascii=False)
            except Exception:
                pass
            
            import re
            text = re.sub(r'<script.*?</script>', '', html, flags=re.DOTALL)
            text = re.sub(r'<style.*?</style>', '', text, flags=re.DOTALL)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\s+', ' ', text).strip()
            return text
    except Exception as e:
        print(f"[ERROR] No se pudo descargar la URL: {e}")
        return None

def run_ai_sync():
    print("\n=== SINCRONIZACIÓN INTELIGENTE DE ANOMALÍAS (GEMINI 3.5) ===")
    
    # Cargar API Key desde archivo .env si existe
    load_env()
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        api_key = input("Ingrese su API Key de Gemini: ").strip()
        if not api_key:
            print("[ERROR] Se requiere una API Key de Gemini para este proceso.")
            return
        
        # Registrar y guardar la API key para futuras ejecuciones
        save_key = input("¿Desea registrar/guardar esta API Key localmente en la app para futuras ejecuciones? (s/n): ").strip().lower()
        if save_key == "s":
            try:
                env_path = SCRIPT_DIR / ".env"
                with open(env_path, "w", encoding="utf-8") as f:
                    f.write(f"GEMINI_API_KEY={api_key}\n")
                print(f"[OK] API Key registrada y guardada en {env_path.name}")
            except Exception as e:
                print(f"[WARN] No se pudo guardar la API Key: {e}")

    # Cargar base de datos actual
    current_json = load_json()
    print(f"[Info] Base de datos cargada: {len(current_json)} anomalías registradas.")
    
    # Obtener versión
    version = get_current_version()
    print(f"[Info] Versión de compilación activa detectada: {version}")

    # Seleccionar fuente
    print("\nSeleccione la fuente del reporte:")
    print("1. Pegar texto manualmente (consola)")
    print("2. Descargar desde URL (Reddit, Patch notes, etc.)")
    op = input("Opción (1-2): ").strip()

    source_text = ""
    if op == "2":
        url = input("Ingrese la URL del reporte: ").strip()
        if url:
            source_text = fetch_url(url)
    else:
        print("\nPegue el contenido del reporte / patch notes / post. Ingrese una línea vacía al final para terminar:")
        lines = []
        while True:
            try:
                line = input()
                if line == "":
                    break
                lines.append(line)
            except EOFError:
                break
        source_text = "\n".join(lines)

    if not source_text or len(source_text.strip()) < 10:
        print("[ERROR] El texto del reporte está vacío o es muy corto.")
        return

    # Ejecutar AI con el modelo 3.5
    updated_data = call_gemini(api_key, current_json, version, source_text)
    
    if updated_data and isinstance(updated_data, list):
        print(f"\n[AI] Procesamiento completado. Total de anomalías generadas: {len(updated_data)}.")
        
        # Validar llaves de estructura básica
        valid_items = []
        for item in updated_data:
            if all(k in item for k in ("id", "titulo", "descripcion", "efecto_jugabilidad", "workaround", "estado")):
                valid_items.append(item)
            else:
                print(f"[WARN] Omitiendo item inválido devuelto por la IA: {item.get('titulo', 'Sin título')}")

        if valid_items:
            save_json(valid_items)
            print("[OK] Sincronización realizada con éxito.")
        else:
            print("[ERROR] La IA no devolvió ningún elemento con la estructura correcta.")
    else:
        print("[ERROR] No se pudo obtener una respuesta válida de la IA.")

if __name__ == "__main__":
    run_ai_sync()
