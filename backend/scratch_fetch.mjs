import axios from 'axios';

async function test() {
    const res = await axios.get('https://scmdb.net/data/crafting_blueprints-4.7.0-live.11576750.json');
    const bps = res.data.blueprints || res.data;
    const sample = bps.find(b => b.productName && b.productName.includes('SMG'));
    console.log(JSON.stringify(sample, null, 2));
}
test();
