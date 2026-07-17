#!/usr/bin/env python3
"""
ai_sync_manifestations.py
=========================
Actualiza automáticamente la tabla de manifestaciones del vacío utilizando la API de Gemini (versión 3.5)
y Playwright para realizar el scraping del Issue Council de RSI (https://issue-council.robertsspaceindustries.com).

Se autentica usando una sesión persistente, navega, busca bugs de la versión activa, extrae los detalles
y usa IA para correlacionar, traducir y actualizar el JSON final.
"""

import os
import sys
import json
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

try:
    from playwright.async_api import async_playwright, Page, TimeoutError as PWTimeout
except ImportError:
    print("[Playwright] Instalando dependencia 'playwright'...")
    subprocess.run([sys.executable, "-m", "pip", "install", "playwright"], check=True)
    subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
    from playwright.async_api import async_playwright, Page, TimeoutError as PWTimeout

import asyncio

SCRIPT_DIR = Path(__file__).parent
JSON_PATH = SCRIPT_DIR.parent / "sc-frontend" / "public" / "data" / "manifestaciones.json"
AUTH_STATE_PATH = SCRIPT_DIR / "auth_state.json"

def load_env():
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
        data = sorted(data, key=lambda x: x["id"])
        with open(JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[OK] Base de datos JSON actualizada en {JSON_PATH.name}")
    except Exception as e:
        print(f"[ERROR] No se pudo guardar el JSON: {e}")

async def handle_authentication(playwright):
    browser = await playwright.chromium.launch(headless=False)
    context = await browser.new_context()
    page = await context.new_page()
    
    print("\n" + "="*80)
    print("INICIO DE SESIÓN EN ISSUE COUNCIL (REQUISITO ÚNICO)")
    print("="*80)
    print("Se abrirá una ventana de navegador.")
    print("1. Por favor, inicie sesión con su cuenta de RSI y complete el código MFA.")
    print("2. Permanezca en la página una vez que haya ingresado con éxito.")
    print("3. Vuelva a esta consola de comandos y presione Enter para registrar sus credenciales.")
    print("="*80 + "\n")
    
    await page.goto("https://issue-council.robertsspaceindustries.com/projects/STAR-CITIZEN/issues")
    
    input("Presione ENTER en esta consola después de haber iniciado sesión con éxito en el navegador...")
    
    # Guardar cookies y almacenamiento local
    await context.storage_state(path=str(AUTH_STATE_PATH))
    print(f"[OK] Credenciales registradas exitosamente en {AUTH_STATE_PATH.name}")
    await browser.close()

async def scrape_issue_council(version_query):
    async with async_playwright() as p:
        # Verificar si existe estado de autenticación
        if not AUTH_STATE_PATH.exists():
            await handle_authentication(p)
            
        print("[Scraper] Iniciando navegador en modo visible para evitar bloqueos...")
        # Usar headless=False para evitar bloqueos por Cloudflare u otras protecciones de CIG
        browser = await p.chromium.launch(headless=False)
        
        # Cargar contexto con sesión iniciada
        context = await browser.new_context(storage_state=str(AUTH_STATE_PATH))
        page = await context.new_page()
        
        # Buscar bugs activos filtrando por la versión actual
        search_url = f"https://issue-council.robertsspaceindustries.com/projects/STAR-CITIZEN/issues?search={version_query}&statuses=confirmed,investigating,under_investigation"
        print(f"[Scraper] Buscando incidencias activas en URL:\n          {search_url}")
        
        try:
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            # Esperar a que los elementos dinámicos de incidencias carguen en el DOM
            await page.wait_for_selector('.c-issue-card', timeout=15000)
        except Exception as e:
            print(f"[WARN] Error al esperar los elementos de la tabla: {e}")
            
        await page.wait_for_timeout(3000)
        
        # Extraer todos los enlaces de la página y filtrar aquellos con formato STARC-XXXXXX
        print("[Scraper] Escaneando enlaces de incidencias...")
        hrefs = await page.evaluate("""
            () => Array.from(document.querySelectorAll('a'))
                       .map(a => a.href)
                       .filter(href => href.includes('STARC-'))
        """)
        
        # Deduplicar enlaces
        unique_urls = list(set(hrefs))
        print(f"[Scraper] Encontrados {len(unique_urls)} reportes de bugs únicos.")
        
        scraped_bugs = []
        # Limitar la extracción a los primeros 10 bugs para optimizar tiempo y cuota de API
        target_urls = unique_urls[:10]
        
        for idx, bug_url in enumerate(target_urls):
            print(f"[Scraper] ({idx+1}/{len(target_urls)}) Extrayendo contenido de: {bug_url.split('/')[-1]}")
            try:
                await page.goto(bug_url, wait_until="domcontentloaded", timeout=15000)
                # Esperar a que el título o contenedor principal de la incidencia esté cargado
                await page.wait_for_selector('h1', timeout=10000)
                await page.wait_for_timeout(2000)
                
                # Obtener el texto completo de la página
                page_text = await page.evaluate("() => document.body.innerText")
                scraped_bugs.append({
                    "url": bug_url,
                    "id_ic": bug_url.split('/')[-1],
                    "content": page_text
                })
            except Exception as e:
                print(f"[WARN] Error al acceder a la incidencia {bug_url}: {e}")
                
        await browser.close()
        return scraped_bugs

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
        print("[AI] Procesando incidencias extraídas con Gemini 3.5...")
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

def run_ai_sync():
    print("\n=== SINCRONIZACIÓN AUTOMÁTICA INTELIGENTE (SCRAPING + GEMINI 3.5) ===")
    
    # Cargar API Key
    load_env()
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        api_key = input("Ingrese su API Key de Gemini: ").strip()
        if not api_key:
            print("[ERROR] Se requiere una API Key de Gemini para este proceso.")
            return
        
        save_key = input("¿Desea registrar/guardar esta API Key localmente en la app para futuras ejecuciones? (s/n): ").strip().lower()
        if save_key == "s":
            try:
                env_path = SCRIPT_DIR / ".env"
                with open(env_path, "w", encoding="utf-8") as f:
                    f.write(f"GEMINI_API_KEY={api_key}\n")
                print(f"[OK] API Key registrada y guardada en {env_path.name}")
            except Exception as e:
                print(f"[WARN] No se pudo guardar la API Key: {e}")

    # Obtener versión activa
    version = get_current_version()
    version_base = ".".join(version.split(".")[:2]) if "." in version else "4.9"
    
    print(f"[Info] Base de datos destino: {JSON_PATH.name}")
    print(f"[Info] Versión de compilación activa: {version} (Búsqueda en IC: {version_base})")
    
    # 1. Ejecutar scraping de Issue Council
    try:
        scraped_data = asyncio.run(scrape_issue_council(version_base))
    except Exception as e:
        print(f"[ERROR] Falló el proceso de scraping automatizado: {e}")
        return

    if not scraped_data:
        print("[INFO] No se extrajeron incidencias activas del Issue Council. Abortando actualización.")
        return

    print(f"[Scraper] Extracción finalizada. {len(scraped_data)} incidencias procesadas para análisis.")

    # Cargar base de datos actual
    current_json = load_json()

    # 2. Enviar a Gemini para análisis y actualización
    updated_data = call_gemini_update(api_key, current_json, version, scraped_data)
    
    if updated_data and isinstance(updated_data, list):
        # Validar estructura de los datos devueltos
        valid_items = []
        for item in updated_data:
            if all(k in item for k in ("id", "titulo", "descripcion", "efecto_jugabilidad", "workaround", "estado")):
                valid_items.append(item)
            else:
                print(f"[WARN] Omitiendo item inválido de la IA: {item.get('titulo', 'Sin título')}")

        if valid_items:
            save_json(valid_items)
            print("[OK] Sincronización e integración de incidencias finalizada con éxito.")
        else:
            print("[ERROR] La IA no retornó datos en el formato estructural correcto.")
    else:
        print("[ERROR] No se pudo obtener una respuesta válida del modelo de IA.")

if __name__ == "__main__":
    run_ai_sync()
