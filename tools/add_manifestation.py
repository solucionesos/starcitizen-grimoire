#!/usr/bin/env python3
"""
add_manifestation.py
===================
Script interactivo para gestionar la base de datos de Manifestaciones del Vacío
(sc-frontend/public/data/manifestaciones.json).

Permite agregar, editar, eliminar y marcar casos como resueltos.
"""

import os
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
JSON_PATH = SCRIPT_DIR.parent / "sc-frontend" / "public" / "data" / "manifestaciones.json"

def load_data():
    if not JSON_PATH.exists():
        print(f"[WARN] No se encontró el archivo en {JSON_PATH}. Creando una base de datos vacía.")
        return []
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[ERROR] No se pudo leer el archivo JSON: {e}")
        sys.exit(1)

def save_data(data):
    try:
        # Ordenar por ID para consistencia
        data = sorted(data, key=lambda x: x["id"])
        with open(JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[OK] Datos guardados exitosamente en {JSON_PATH.name}")
    except Exception as e:
        print(f"[ERROR] No se pudo escribir en el archivo JSON: {e}")

def list_manifestations(data):
    if not data:
        print("\n--- No hay anomalías registradas ---")
        return
    print("\n" + "="*80)
    print(f"{'ID':<4} | {'ISSUE COUNCIL':<14} | {'TÍTULO':<50}")
    print("="*80)
    for item in data:
        ic = item.get("issue_council") or "N/A"
        titulo = item.get("titulo", "")
        # Recortar título si es muy largo
        if len(titulo) > 47:
            titulo = titulo[:44] + "..."
        print(f"{item['id']:<4} | {ic:<14} | {titulo:<50}")
    print("="*80)

def add_manifestation(data):
    print("\n--- REGISTRAR NUEVA ANOMALÍA ---")
    
    # Auto-generar ID
    next_id = max([item["id"] for item in data]) + 1 if data else 1
    print(f"Asignando ID: {next_id}")

    titulo = input("Título de la anomalía: ").strip()
    while not titulo:
        titulo = input("El título es obligatorio. Título: ").strip()

    ic_input = input("Código de Issue Council (ej: STARC-188610, Enter si es N/A): ").strip()
    issue_council = ic_input if ic_input else None

    descripcion = input("Descripción del fallo técnico (servidor/motor): ").strip()
    while not descripcion:
        descripcion = input("La descripción es obligatoria: ").strip()

    efecto = input("Efecto en la jugabilidad (impacto para los jugadores): ").strip()
    while not efecto:
        efecto = input("El efecto es obligatorio: ").strip()

    work_input = input("Workaround / Mitigación (Enter si no hay solución): ").strip()
    workaround = work_input if work_input else None

    new_item = {
        "id": next_id,
        "titulo": titulo,
        "issue_council": issue_council,
        "descripcion": descripcion,
        "efecto_jugabilidad": efecto,
        "workaround": workaround
    }

    data.append(new_item)
    save_data(data)
    print(f"[OK] Anomalía '{titulo}' agregada con éxito.")

def edit_manifestation(data):
    print("\n--- EDITAR ANOMALÍA EXISTENTE ---")
    list_manifestations(data)
    
    id_input = input("\nIngrese el ID de la anomalía a editar (o Enter para cancelar): ").strip()
    if not id_input:
        return

    try:
        target_id = int(id_input)
    except ValueError:
        print("[ERROR] ID no válido.")
        return

    target_item = next((item for item in data if item["id"] == target_id), None)
    if not target_item:
        print(f"[ERROR] No se encontró ninguna anomalía con ID {target_id}.")
        return

    print("\nPresione Enter en cualquier campo para mantener el valor actual.")
    
    # Editar Título
    titulo = input(f"Título [{target_item['titulo']}]: ").strip()
    if titulo:
        target_item["titulo"] = titulo

    # Editar Issue Council
    current_ic = target_item.get("issue_council") or "N/A"
    ic_input = input(f"Issue Council [{current_ic}]: ").strip()
    if ic_input:
        target_item["issue_council"] = None if ic_input.upper() == "N/A" else ic_input

    # Editar Descripción
    desc = input(f"Descripción (larga): ").strip()
    if desc:
        target_item["descripcion"] = desc

    # Editar Efecto
    efecto = input(f"Efecto en jugabilidad: ").strip()
    if efecto:
        target_item["efecto_jugabilidad"] = efecto

    # Editar Workaround
    current_work = target_item.get("workaround") or "Ninguno"
    work_input = input(f"Workaround [{current_work}]: ").strip()
    if work_input:
        target_item["workaround"] = None if work_input.upper() in ["NINGUNO", "N/A"] else work_input

    save_data(data)
    print(f"[OK] Anomalía #{target_id} actualizada.")

def delete_manifestation(data):
    print("\n--- ELIMINAR/RESOLVER ANOMALÍA ---")
    list_manifestations(data)
    
    id_input = input("\nIngrese el ID de la anomalía a eliminar (o Enter para cancelar): ").strip()
    if not id_input:
        return

    try:
        target_id = int(id_input)
    except ValueError:
        print("[ERROR] ID no válido.")
        return

    target_item = next((item for item in data if item["id"] == target_id), None)
    if not target_item:
        print(f"[ERROR] No se encontró ninguna anomalía con ID {target_id}.")
        return

    confirm = input(f"¿Está seguro de eliminar '{target_item['titulo']}'? (s/n): ").strip().lower()
    if confirm == "s":
        data.remove(target_item)
        save_data(data)
        print(f"[OK] Anomalía #{target_id} eliminada de la base de datos.")
    else:
        print("Operación cancelada.")

def main():
    print("Gestor de Datos de Manifestaciones del Vacío — Star Grimoire")
    data = load_data()

    while True:
        print("\nMenú de Opciones:")
        print("1. Listar todas las anomalías activas")
        print("2. Registrar nueva anomalía")
        print("3. Editar anomalía existente")
        print("4. Eliminar/Resolver anomalía")
        print("5. Salir")
        
        choice = input("\nSeleccione una opción (1-5): ").strip()
        
        if choice == "1":
            list_manifestations(data)
        elif choice == "2":
            add_manifestation(data)
        elif choice == "3":
            edit_manifestation(data)
        elif choice == "4":
            delete_manifestation(data)
        elif choice == "5":
            print("Cerrando gestor.")
            break
        else:
            print("[ERROR] Opción no válida. Intente de nuevo.")

if __name__ == "__main__":
    main()
