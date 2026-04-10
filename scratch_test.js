const fs = require('fs');

const db = JSON.parse(fs.readFileSync('r:/starcitizen/backend/data/db.json', 'utf8'));
const resources = db.resources || [];

function checkTags(tagString) {
    const searchTags = tagString.split(',').filter(Boolean);
    console.log("Searching tags:", searchTags);
    
    let rs = resources.filter(r => {
        return searchTags.some(tag => {
            let normTag = tag.toLowerCase().trim();
            if (normTag === 'aluminum') normTag = 'aluminium';
            if (normTag === 'titainum') normTag = 'titanium';
            const resName = (r.name || "").toLowerCase();
            return resName.includes(normTag) || normTag.includes(resName.split(' ')[0]);
        });
    });
    
    console.log(`Found ${rs.length} resources for ${tagString}`);
    rs.forEach(r => console.log(" -", r.name));
}

checkTags('Aluminum');
checkTags('Aluminum,Copper');
checkTags('CM (Composite Material)');
checkTags('CM (Composite Material),Aluminum');
