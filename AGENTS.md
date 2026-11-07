# Directrices del Agente — Star Grimoire (Ancalagon Oblivion Fleet)

1. **Narrativa Sagrada (`ancalagon-oblivion-fleet`):**
   - Toda redacción, interfaz o dato insertado en el proyecto debe cumplir estrictamente con el **Codex Oblivionis** (`C:\Users\ancal\.gemini\config\skills\ancalagon-oblivion-fleet\SKILL.md`).
   - Prohibido mostrar fechas del siglo XXI (`2026`) en textos visibles; usar siempre el desplazamiento de **+930 años** (`Ciclo 2956`).

2. **Creación en Caliente de Votaciones, Designios, Cruzadas y Crónicas (`ancalagon-grimoire-oracle`):**
   - **SIEMPRE** que el usuario pida crear, proclamar o agendar una **Votación** (Cónclave), un **Designio** (Objetivo), una **Cruzada / Edicto** (Calendario) o una **Crónica** (Lectitio Divinitatus), debes leer y seguir las instrucciones técnicas de la skill [`.agents/skills/ancalagon-grimoire-oracle/SKILL.md`](file:///r:/starcitizen/.agents/skills/ancalagon-grimoire-oracle/SKILL.md).
   - Utiliza los endpoints de inserción en caliente (`POST /api/polls/agent`, `POST /api/objectives/agent`, `POST /api/crusades/agent`, `POST /api/chronicles/agent`) autenticados con `X-Agent-Token: ancalagon-sync-secret` y los handles oficiales del Roster del Ciclo 2956 (`Quaker`, `Enanimus`, `Denoxx`, `Longhinus`, `Afol86`, `Unknown-t20`, `Kannabistian420`).
