import { SCMDBAdapter } from './infrastructure/adapters/SCMDBAdapter.js';
import axios from 'axios';

async function runN8NSync() {
    try {
        console.log('Obteniendo datos base locales (SCMDB) exclusivamente...');
        
        // 1. Instanciar el fetcher de SCMDB
        const fetcher = new SCMDBAdapter();
        
        // 2. Extraer data directamente del fetcher sin guardarla localmente (n8n lo hara)
        const liveVersion = await fetcher.fetchLatestLiveVersion();
        console.log(`Versión detectada: ${liveVersion}. Extrayendo data de SCMDB...`);
        
        const scmdbData = await fetcher.fetchGameData(liveVersion);
        
        console.log(`Enviando base de datos inicial SCMDB (${scmdbData.missions?.length || 0} misiones) al Webhook de n8n para enriquecimiento...`);
        const n8nWebhookUrl = 'http://localhost:5678/webhook/sync-game-data';
        
        const payload = {
            env: process.env.TARGET_ENV || 'dev',
            version: scmdbData.version || "1.0",
            missions: scmdbData.missions || [],
            blueprints: scmdbData.blueprints || [],
            resources: scmdbData.resources || []
        };

        const response = await axios.post(n8nWebhookUrl, payload, {
            timeout: 300000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        console.log('n8n recibió los datos. Sincronización delegada completamente a n8n.');
    } catch (error: any) {
        console.error('Error durante la orquestación con n8n:', error.message);
        if (error.response) {
            console.error(error.response.data);
        }
    }
}

runN8NSync().then(() => process.exit(0));
