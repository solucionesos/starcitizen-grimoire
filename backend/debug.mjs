import fs from 'fs';
import axios from 'axios';

async function test() {
    console.log('Fetching blueprints...');
    const result = await axios.get('https://scmdb.net/data/crafting_blueprints-4.7.0-live.11576750.json');
    const blueprints = result.data;
    
    // Find a blueprint where option.resourceName is missing or undefined
    const bk = blueprints.find(bp => {
        return bp.tiers?.[0]?.slots?.some(slot => {
            const option = slot.options?.[0];
            return !option?.resourceName;
        });
    });

    if (bk) {
        fs.writeFileSync('r:/starcitizen/backend/data/debug_blueprint.json', JSON.stringify(bk, null, 2));
        console.log('Wrote blueprint to debug_blueprint.json');
    } else {
        console.log('No such blueprint found.');
    }
}
test();
