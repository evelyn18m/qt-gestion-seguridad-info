const fs = require('fs');
let content = fs.readFileSync('catalogos.json', 'utf8');
if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
const data = JSON.parse(content);

console.log('Amenazas (first 10):');
console.log(JSON.stringify(data['catalogo amenazas'].slice(0, 10), null, 2));

console.log('\nVulnerabilidades (first 10):');
console.log(
  JSON.stringify(data['catalogo de vulnerabilidades'].slice(0, 10), null, 2),
);

console.log('\nImpacto (first 10):');
console.log(JSON.stringify(data['catalogo de impacto'].slice(0, 10), null, 2));
