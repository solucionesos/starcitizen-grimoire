# Star Citizen Crafting Backend (Hexagonal)

This backend implements a Hexagonal Architecture (Ports and Adapters) to maintain game data updated for Star Citizen Alpha 4.7.

## Structure
- `src/domain`: Entities and Port Interfaces.
- `src/application`: Use Cases (Sync logic).
- `src/infrastructure`: Adapters (SCMDB, Persistence, Scheduler, Server).

## Logic
- The `UpdateScheduler` runs every 6 hours.
- Calls `SyncGameDataUseCase` which checks for a new version at `scmdb.net/data/versions.json`.
- If a new build is detected, it fetches the full content (Missions, Blueprints, Mining Data) and updates the local repository.

## Running
```bash
cd backend
npm install
npm run dev
```

## Endpoints
- `GET /api/missions`
- `GET /api/blueprints`
- `GET /api/resources`
