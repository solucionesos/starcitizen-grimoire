#!/usr/bin/env python3
"""
import_cookie.py
================
Crea un archivo auth_state.json compatible con Playwright a partir del token Rsi-Token
pegado por el usuario. Esto evita la necesidad de abrir una ventana física del navegador (Session 0).
"""

import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
AUTH_STATE_PATH = SCRIPT_DIR / "auth_state.json"

def main():
    print("="*80)
    print("REGISTRO MANUAL DE SESIÓN (Rsi-Token)")
    print("="*80)
    print("Para obtener su token de sesión de RSI:")
    print("1. Abra el Issue Council o robertsspaceindustries.com en su navegador habitual.")
    print("2. Asegúrese de haber iniciado sesión.")
    print("3. Presione F12 (Herramientas de Desarrollador) e ir a la pestaña 'Application' (o 'Storage').")
    print("4. En la sección 'Cookies', seleccione 'https://issue-council.robertsspaceindustries.com'.")
    print("5. Busque la cookie llamada 'Rsi-Token' y copie su valor.")
    print("="*80 + "\n")

    token = input("Pegue el valor del 'Rsi-Token' aquí: ").strip()
    if not token:
        print("[ERROR] El token no puede estar vacío.")
        return

    # Estructura del estado de autenticación de Playwright
    auth_state = {
        "cookies": [
            {
                "name": "Rsi-Token",
                "value": token,
                "domain": ".robertsspaceindustries.com",
                "path": "/",
                "expires": 1924896000, # Expiración lejana (año 2030+)
                "httpOnly": True,
                "secure": True,
                "sameSite": "Lax"
            },
            {
                "name": "Rsi-Token",
                "value": token,
                "domain": "issue-council.robertsspaceindustries.com",
                "path": "/",
                "expires": 1924896000,
                "httpOnly": True,
                "secure": True,
                "sameSite": "Lax"
            }
        ],
        "origins": []
    }

    try:
        with open(AUTH_STATE_PATH, "w", encoding="utf-8") as f:
            json.dump(auth_state, f, indent=2)
        print(f"\n[OK] Sesión registrada y guardada exitosamente en {AUTH_STATE_PATH.name}")
        print("Ahora puede ejecutar el actualizador en modo automático sin necesidad de inicio de sesión visual.")
    except Exception as e:
        print(f"[ERROR] No se pudo guardar el archivo: {e}")

if __name__ == "__main__":
    main()
