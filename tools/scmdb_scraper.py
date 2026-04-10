#!/usr/bin/env python3
"""
scmdb_scraper.py
================
Raspa SCMDB.net en segundo plano y actualiza db.json con los nombres
exactos de misiones tal como aparecen en la plataforma.

Selectores verificados (SCMDB v4.7.1):
  - Contenedor filas : .contract-table-body
  - Fila individual  : .table-row
  - Título del modal : h2.detail-title  (texto = nombre legible)
  - ID técnico       : h2.detail-title[title]  (atributo = nombre técnico)
  - Cerrar modal     : tecla Escape

Requisitos:
    pip install playwright
    python -m playwright install chromium

Uso:
    # Scraping completo + actualizar db.json (recomendado):
    python scmdb_scraper.py

    # Solo scraping, guardar mapping sin tocar db.json:
    python scmdb_scraper.py --no-apply

    # Solo aplicar un mapping ya guardado:
    python scmdb_scraper.py --skip-scrape --apply

    # Modo visible para depurar:
    python scmdb_scraper.py --headless false

    # Reanudar desde checkpoint parcial:
    python scmdb_scraper.py --resume
"""

import asyncio
import json
import argparse
import sys
from pathlib import Path
from datetime import datetime

# Forzar UTF-8 en la consola de Windows para evitar UnicodeEncodeError
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    from playwright.async_api import async_playwright, Page, TimeoutError as PWTimeout
except ImportError:
    print("[ERROR] Playwright no esta instalado.")
    print("        Ejecuta:  pip install playwright")
    print("                  python -m playwright install chromium")
    sys.exit(1)

# ─── Rutas por defecto ────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
DB_PATH      = SCRIPT_DIR.parent / "backend" / "data" / "db.json"
MAPPING_PATH = SCRIPT_DIR / "scmdb_mission_mapping.json"
SCMDB_URL    = "https://scmdb.net/"   # la tabla de misiones carga en la raíz

# ─── Constantes de scraping ───────────────────────────────────────────────────
ROW_SELECTOR   = ".table-row"           # filas individuales en el contenedor
TITLE_SELECTOR = "h2.detail-title"      # título en el panel de detalle lateral
CONTAINER_SEL  = ".contract-table-body" # contenedor scrollable de misiones
CLOSE_KEY      = "Escape"
SCROLL_STEP    = 400          # px por scroll (paso pequeño para no saltarse filas)
PAUSE_MS       = 500          # espera tras click (ms)
SCROLL_PAUSE   = 1_000        # espera tras scroll para renderizado de virtual-list
INIT_WAIT_MS   = 4_000        # espera inicial tras carga de página
CONTAINER_TIMEOUT = 20_000    # tiempo máximo esperando el contenedor (ms)


def ts() -> str:
    return datetime.now().strftime("%H:%M:%S")


def log(msg: str) -> None:
    # Reemplazar emojis por ASCII si el terminal no los soporta
    safe = msg.encode("ascii", "replace").decode("ascii") if sys.stdout.encoding and "utf" not in sys.stdout.encoding.lower() else msg
    print(f"[{ts()}] {safe}", flush=True)


# ─── Extrae ({técnico: legible}) de UNA lista de filas visible ───────────────
async def extract_visible_rows(page: Page) -> dict:
    """Hace clic en cada .table-row visible, lee h2.detail-title y cierra el panel."""
    batch: dict = {}
    rows = await page.query_selector_all(ROW_SELECTOR)

    for row in rows:
        try:
            # Scroll al elemento
            await row.scroll_into_view_if_needed(timeout=3_000)
            await row.click(timeout=4_000)
            await page.wait_for_timeout(PAUSE_MS)

            # Esperar panel de detalle
            try:
                await page.wait_for_selector(TITLE_SELECTOR, timeout=5_000)
            except PWTimeout:
                await page.keyboard.press(CLOSE_KEY)
                continue

            title_el = await page.query_selector(TITLE_SELECTOR)
            if title_el:
                # innerText del h2 incluye texto de spans anidados (e.g. "[DESTINATION] Errand")
                friendly  = (await title_el.inner_text()).strip()
                technical = (await title_el.get_attribute("title") or "").strip()
                if technical and friendly and technical not in batch:
                    batch[technical] = friendly

            # Cerrar el panel lateral
            await page.keyboard.press(CLOSE_KEY)
            await page.wait_for_timeout(200)

        except Exception:
            try:
                await page.keyboard.press(CLOSE_KEY)
            except Exception:
                pass

    return batch


# ─── Scraping principal ───────────────────────────────────────────────────────
async def scrape_scmdb(
    headless: bool = True,
    existing = None,  # dict[str, str] | None
    save_path: Path | None = None,
    checkpoint_every: int = 100,
) -> dict:
    """
    Navega SCMDB y devuelve el mapping completo { técnico: legible }.
    existing  : mapping ya conocido (se combina, no se sobreescribe).
    save_path : si se pasa, guarda checkpoint cada `checkpoint_every` entradas.
    """
    mapping: dict[str, str] = dict(existing or {})
    total_before = len(mapping)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=headless, slow_mo=50)
        context = await browser.new_context(
            viewport={"width": 1360, "height": 900},
            locale="en-US",
        )
        page = await context.new_page()

        log(">> Abriendo SCMDB.net ...")
        await page.goto(SCMDB_URL, wait_until="networkidle", timeout=30_000)
        await page.wait_for_timeout(INIT_WAIT_MS)

        # Forzar vista de tabla, ya que por defecto en sesion limpia puede cargar en Tiles
        try:
            await page.get_by_text("Table", exact=True).click(timeout=3_000)
            log(">> Cambiado a vista de tabla.")
            await page.wait_for_timeout(1_000)
        except Exception:
            pass

        # Esperar a que cargue el contenedor de la tabla de misiones
        try:
            await page.wait_for_selector(CONTAINER_SEL, timeout=CONTAINER_TIMEOUT)
            log(">> Tabla de misiones cargada correctamente.")
        except PWTimeout:
            log(f"[ERROR] Timeout esperando {CONTAINER_SEL}. El sitio puede estar lento.")
            await browser.close()
            return mapping

        # Intentar leer el total de misiones
        try:
            count_el = await page.query_selector("text=/\\d+ of \\d+/")
            count_text = await count_el.inner_text() if count_el else ""
            total = int(count_text.split("of")[-1].strip().replace(",", ""))
        except Exception:
            total = 0
        log(f"[INFO] Total de misiones en SCMDB: {total}")

        scroll_container_sel = ".contract-table-body"
        scroll_attempts = 0
        max_scroll_attempts = 8   # reintentos antes de declarar fin
        new_since_checkpoint = 0

        while scroll_attempts < max_scroll_attempts:
            # Extraer filas actualmente visibles en el viewport del contenedor
            batch = await extract_visible_rows(page)
            added = 0
            for tech, title in batch.items():
                if tech not in mapping:
                    mapping[tech] = title
                    added += 1
                    new_since_checkpoint += 1

            current_total = len(mapping)
            log(f"+{added} nuevos | Total mapping: {current_total}")

            # Checkpoint periodico
            if save_path and new_since_checkpoint >= checkpoint_every:
                _save_mapping(mapping, save_path)
                log(f"[CHECKPOINT] Guardado ({current_total} entradas)")
                new_since_checkpoint = 0

            # Scroll hacia abajo dentro del contenedor
            container = await page.query_selector(CONTAINER_SEL)
            if container:
                rows_before = await page.query_selector_all(ROW_SELECTOR)
                count_before = len(rows_before)

                await container.evaluate(
                    f"(el) => el.scrollTop += {SCROLL_STEP}"
                )
                await page.wait_for_timeout(SCROLL_PAUSE)

                rows_after = await page.query_selector_all(ROW_SELECTOR)
                count_after = len(rows_after)

                if count_after <= count_before and added == 0:
                    scroll_attempts += 1
                    log(f"[WAIT] Sin cambios ({scroll_attempts}/{max_scroll_attempts})")
                else:
                    scroll_attempts = 0   # reiniciar contador si hay progreso
            else:
                log(f"[WARN] Contenedor {CONTAINER_SEL} no encontrado. Deteniendo.")
                break

        await browser.close()

    added_total = len(mapping) - total_before
    log(f"[DONE] Scraping completado: {added_total} nuevos mappings | Total: {len(mapping)}")
    return mapping


# ─── Persistencia del mapping ─────────────────────────────────────────────────
def _save_mapping(mapping: dict[str, str], path: Path) -> None:
    out = {
        "_meta": {
            "generated":  datetime.now().isoformat(),
            "source":     SCMDB_URL,
            "total_keys": len(mapping),
        },
        "mapping": mapping,
    }
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")


def save_mapping(mapping: dict, path: Path) -> None:
    _save_mapping(mapping, path)
    log(f"[SAVE] Mapping final guardado: {path.name}  ({len(mapping)} entradas)")


def load_existing_mapping(path: Path) -> dict:
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        m = data.get("mapping", {})
        log(f"[LOAD] Mapping existente: {len(m)} entradas desde {path.name}")
        return m
    return {}


# ─── Aplicar mapping a db.json ────────────────────────────────────────────────
def apply_to_db(mapping: dict, db_path: Path) -> tuple:
    """
    Actualiza friendly_name en db.json.
    Retorna (misiones_actualizadas, total_misiones).
    """
    data = json.loads(db_path.read_text(encoding="utf-8-sig"))  # utf-8-sig maneja BOM de Windows
    missions = data.get("missions", [])
    updated = 0

    for m in missions:
        tech = m.get("name", "")
        if tech in mapping:
            m["friendly_name"] = mapping[tech]
            updated += 1

    db_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    pct = round(updated / len(missions) * 100, 1) if missions else 0
    log(f"[DB] db.json actualizado: {updated}/{len(missions)} misiones ({pct}% con nombre oficial)")
    return updated, len(missions)


# ─── CLI ─────────────────────────────────────────────────────────────────────
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description=(
            "Raspa SCMDB.net y mapea los nombres técnicos a los títulos "
            "oficiales. Luego actualiza db.json."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("Requisitos:")[0].strip(),
    )
    p.add_argument(
        "--headless",
        default="true",
        metavar="{true|false}",
        help="Modo headless del navegador (default: true)",
    )
    p.add_argument(
        "--no-apply",
        action="store_true",
        help="Guardar el mapping pero NO actualizar db.json",
    )
    p.add_argument(
        "--skip-scrape",
        action="store_true",
        help="Omitir el scraping; sólo aplicar el mapping existente a db.json",
    )
    p.add_argument(
        "--resume",
        action="store_true",
        help="Cargar el mapping guardado y continuar desde donde se dejó",
    )
    p.add_argument(
        "--apply",
        action="store_true",
        help="Forzar aplicación del mapping a db.json (útil con --skip-scrape)",
    )
    p.add_argument(
        "--mapping-out",
        default=str(MAPPING_PATH),
        metavar="PATH",
        help=f"Ruta del archivo de mapping JSON (default: {MAPPING_PATH.name})",
    )
    p.add_argument(
        "--db",
        default=str(DB_PATH),
        metavar="PATH",
        help=f"Ruta de db.json (default: relativa al script)",
    )
    p.add_argument(
        "--checkpoint",
        type=int,
        default=100,
        metavar="N",
        help="Guardar checkpoint cada N nuevas entradas (default: 100)",
    )
    return p.parse_args()


# ─── Entrypoint ──────────────────────────────────────────────────────────────
async def main() -> None:
    args = parse_args()
    mapping_path = Path(args.mapping_out)
    db_path      = Path(args.db)
    headless     = args.headless.lower() != "false"

    log("=" * 60)
    log("  SCMDB Mission Name Scraper - Star Grimoire")
    log("=" * 60)

    # 1. Cargar mapping existente
    existing = load_existing_mapping(mapping_path) if args.resume else {}

    # 2. Scraping
    if not args.skip_scrape:
        mapping = await scrape_scmdb(
            headless=headless,
            existing=existing,
            save_path=mapping_path,
            checkpoint_every=args.checkpoint,
        )
    else:
        mapping = existing
        log(f"[SKIP] Scraping omitido. Usando {len(mapping)} mappings existentes.")

    # 3. Guardar mapping final
    save_mapping(mapping, mapping_path)

    # 4. Aplicar a db.json
    should_apply = (not args.no_apply) or args.apply
    if should_apply:
        if not db_path.exists():
            log(f"[ERROR] db.json no encontrado: {db_path}")
            sys.exit(1)
        apply_to_db(mapping, db_path)
    else:
        log("[INFO] --no-apply activo: db.json no fue modificado.")
        log("       Usa --skip-scrape --apply para aplicarlo despues.")

    log("[DONE] Proceso completado.")


if __name__ == "__main__":
    asyncio.run(main())
