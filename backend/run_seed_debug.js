const { exec } = require('child_process');
const fs = require('fs');
exec('npx ts-node --transpile-only prisma/seed.ts', (error, stdout, stderr) => {
    const log = `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n\nERROR:\n${error ? error.message : 'None'}`;
    fs.writeFileSync('seed_debug_log.txt', log, 'utf8');
    console.log('Log written to seed_debug_log.txt');
});
