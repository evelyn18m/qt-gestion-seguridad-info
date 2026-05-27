const XLSX = require('xlsx');

const BASE = 'http://localhost:3001/catalogos';

async function post(tipo, data) {
  const res = await fetch(`${BASE}/${tipo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${tipo}: ${data.nombre}`);
  return res.json();
}

async function main() {
  const wb = XLSX.readFile('C:\\Users\\pasantetic\\Desktop\\qt-gestionseguridadinformacion\\documentos\\funcionarios.xlsx');
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Hoja1']);

  const seenFunc = new Set();
  const seenArea = new Set();

  for (const row of rows) {
    const func = (row['__EMPTY_1'] || '').trim();
    const area = (row['__EMPTY_2'] || '').trim();

    if (func && func !== 'FUNCIONARIO' && !seenFunc.has(func)) {
      await post('funcionarios', { nombre: func });
      seenFunc.add(func);
    }
    if (area && area !== 'ÁREA' && !seenArea.has(area)) {
      await post('areas', { nombre: area });
      seenArea.add(area);
    }
  }

  console.log(`Seeded ${seenFunc.size} funcionarios and ${seenArea.size} areas`);
}

main().catch(e => { console.error(e); process.exit(1); });
