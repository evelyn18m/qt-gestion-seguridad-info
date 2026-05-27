const fs = require('fs');
let content = fs.readFileSync('catalogos.json', 'utf8');

// Remove BOM if present
if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
}

const data = JSON.parse(content);

Object.keys(data).forEach(sheet => {
    console.log(`Sheet: ${sheet}`);
    if (data[sheet].length > 0) {
        console.log(`Headers: ${Object.keys(data[sheet][0]).join(', ')}`);
        console.log(`Count: ${data[sheet].length}`);
        console.log(`First row: ${JSON.stringify(data[sheet][0])}`);
    } else {
        console.log('Empty sheet');
    }
    console.log('---');
});
