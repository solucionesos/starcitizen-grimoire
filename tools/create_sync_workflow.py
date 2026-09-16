import json
import os
import urllib.request
from urllib.error import URLError

N8N_URL = "http://localhost:5678"
N8N_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NDBmYjBiZS04MzAxLTQxMDctYjQ0ZC04MDA5ZjRiNzg2NzYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZjcyZGQxMWItZjVkNS00ZjE1LTlkMGMtMGI3YjkwMDIzMjUyIiwiaWF0IjoxNzg5NTYyOTA4LCJleHAiOjE3OTIwNDA0MDB9.Ydq3MqZy5Qc_KZ1dyjj3OXON_2sdTzdUZwbeozM7_0c"

workflow_json = {
    "name": "Sync Game Data (SCMDB + API)",
    "nodes": [
        {
            "id": "trigger",
            "name": "Webhook Sync",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1,
            "position": [0, 200],
            "parameters": {
                "httpMethod": "POST",
                "path": "sync-game-data",
                "responseMode": "lastNode"
            }
        },
        {
            "id": "http-naves",
            "name": "Naves (Wiki)",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4,
            "position": [200, 200],
            "parameters": {
                "url": "https://api.star-citizen.wiki/api/v2/vehicles?limit=100&include=components",
                "method": "GET",
                "options": {
                    "paginate": True,
                    "pagination": {
                        "paginationMode": "updateParameter",
                        "paginationParameterType": "query",
                        "paginationParameterName": "page",
                        "paginationParameterValue": "={{$pageCount + 1}}",
                        "paginationCompleteWhen": "propertyEmpty",
                        "paginationPropertyName": "data"
                    }
                }
            }
        },
        {
            "id": "http-armas",
            "name": "Armas (Wiki)",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4,
            "position": [400, 200],
            "parameters": {
                "url": "https://api.star-citizen.wiki/api/v2/items?filter[type]=WeaponGun&limit=100",
                "method": "GET",
                "options": {
                    "paginate": True,
                    "pagination": {
                        "paginationMode": "updateParameter",
                        "paginationParameterType": "query",
                        "paginationParameterName": "page",
                        "paginationParameterValue": "={{$pageCount + 1}}",
                        "paginationCompleteWhen": "propertyEmpty",
                        "paginationPropertyName": "data"
                    }
                }
            }
        },
        {
            "id": "http-comp",
            "name": "Componentes (Wiki)",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4,
            "position": [600, 200],
            "parameters": {
                "url": "https://api.star-citizen.wiki/api/v2/items?filter[type]=QuantumDrive,Shield,PowerPlant,Cooler&limit=100",
                "method": "GET",
                "options": {
                    "paginate": True,
                    "pagination": {
                        "paginationMode": "updateParameter",
                        "paginationParameterType": "query",
                        "paginationParameterName": "page",
                        "paginationParameterValue": "={{$pageCount + 1}}",
                        "paginationCompleteWhen": "propertyEmpty",
                        "paginationPropertyName": "data"
                    }
                }
            }
        },
        {
            "id": "http-precios",
            "name": "Precios (UEX)",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4,
            "position": [800, 200],
            "parameters": {
                "url": "https://api.uexcorp.uk/2.0/items_prices_all",
                "method": "GET"
            }
        },
        {
            "id": "code-process",
            "name": "Consolidar Datos SCMDB",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1000, 200],
            "parameters": {
                "jsCode": """
const webhookData = $("Webhook Sync").all();
const scmdb = webhookData && webhookData[0] ? webhookData[0].json.body || {} : {};

const navesPages = $("Naves (Wiki)").all();
let naves = [];
for (const p of navesPages) { 
    if (p.json && Array.isArray(p.json.data)) naves = naves.concat(p.json.data); 
    else if (p.json && p.json.name) naves.push(p.json); 
}

const armasPages = $("Armas (Wiki)").all();
let armas = [];
for (const p of armasPages) { 
    if (p.json && Array.isArray(p.json.data)) armas = armas.concat(p.json.data); 
    else if (p.json && p.json.name) armas.push(p.json); 
}

const compPages = $("Componentes (Wiki)").all();
let componentes = [];
for (const p of compPages) { 
    if (p.json && Array.isArray(p.json.data)) componentes = componentes.concat(p.json.data); 
    else if (p.json && p.json.name) componentes.push(p.json); 
}

const preciosItem = $("Precios (UEX)").all();
let precios = [];
if (preciosItem && preciosItem[0] && Array.isArray(preciosItem[0].json.data)) {
    precios = preciosItem[0].json.data;
} else {
    for (const p of preciosItem) {
        if (p.json && p.json.item_uuid) precios.push(p.json);
    }
}

const preciosMap = new Map();
for(const p of precios) {
    if (p.item_uuid) {
        if(!preciosMap.has(p.item_uuid)) preciosMap.set(p.item_uuid, []);
        preciosMap.get(p.item_uuid).push(p);
    }
}

for(const nave of naves) { nave.uex_prices = preciosMap.get(nave.uuid) || []; }
for(const arma of armas) { arma.uex_prices = preciosMap.get(arma.uuid) || []; }
for(const comp of componentes) { comp.uex_prices = preciosMap.get(comp.uuid) || []; }

return [{
    json: {
        env: scmdb.env || "dev",
        db_json: {
            version: scmdb.version || "unknown",
            ships: naves,
            vehicleWeapons: armas,
            vehicleComponents: componentes,
            missions: scmdb.missions || [],
            blueprints: scmdb.blueprints || [],
            resources: scmdb.resources || [],
            summary: {
                navesEnriquecidas: naves.length,
                preciosUEX: precios.length
            }
        }
    }
}];
"""
            }
        },
        {
            "id": "if-env",
            "name": "Es Producción?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 1,
            "position": [1200, 200],
            "parameters": {
                "conditions": {
                    "string": [
                        {
                            "value1": "={{$json.env}}",
                            "value2": "prod"
                        }
                    ]
                }
            }
        },
        {
            "id": "http-dev",
            "name": "Delivery (Local)",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4,
            "position": [1400, 300],
            "parameters": {
                "url": "http://host.docker.internal:3001/api/sync/update",
                "method": "POST",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Authorization",
                            "value": "Bearer star-grimoire-sync-token"
                        }
                    ]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ $json.db_json }}"
            }
        },
        {
            "id": "http-prod",
            "name": "Delivery (Producción)",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4,
            "position": [1400, 100],
            "parameters": {
                "url": "https://api.tu-servidor-starcitizen.com/api/sync/update",
                "method": "POST",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Authorization",
                            "value": "Bearer star-grimoire-sync-token"
                        }
                    ]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ $json.db_json }}"
            }
        }
    ],
    "connections": {
        "Webhook Sync": { "main": [ [ {"node": "Naves (Wiki)", "type": "main", "index": 0} ] ] },
        "Naves (Wiki)": { "main": [ [ {"node": "Armas (Wiki)", "type": "main", "index": 0} ] ] },
        "Armas (Wiki)": { "main": [ [ {"node": "Componentes (Wiki)", "type": "main", "index": 0} ] ] },
        "Componentes (Wiki)": { "main": [ [ {"node": "Precios (UEX)", "type": "main", "index": 0} ] ] },
        "Precios (UEX)": { "main": [ [ {"node": "Consolidar Datos SCMDB", "type": "main", "index": 0} ] ] },
        "Consolidar Datos SCMDB": { "main": [ [ {"node": "Es Producción?", "type": "main", "index": 0} ] ] },
        "Es Producción?": {
            "main": [
                [ {"node": "Delivery (Producción)", "type": "main", "index": 0} ],
                [ {"node": "Delivery (Local)", "type": "main", "index": 0} ]
            ]
        }
    },
    "settings": {}
}

def create_workflow():
    url = f"{N8N_URL}/api/v1/workflows"
    data = json.dumps(workflow_json).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_KEY
    })
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read())
        print(f"Workflow creado exitosamente. ID: {result.get('id')}")
    except URLError as e:
        print(f"Error conectando a n8n: {e}")

if __name__ == "__main__":
    create_workflow()
