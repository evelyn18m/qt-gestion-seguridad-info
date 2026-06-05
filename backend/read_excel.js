const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = './documentos/catalogos.xlsx';

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const result = {};

workbook.SheetNames.forEach((sheetName) => {
  const worksheet = workbook.Sheets[sheetName];
  result[sheetName] = XLSX.utils.sheet_to_json(worksheet);
});

console.log(JSON.stringify(result, null, 2));
fs.writeFile('catalogos.json', JSON.stringify(result, null, 2), (err) => {
  if (err) {
    console.error('Error writing file:', err);
  }
  console.log('Data successfully written to catalogos.json');
});
