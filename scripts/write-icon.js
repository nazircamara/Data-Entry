const fs = require('fs');
const path = require('path');

// 1x1 transparent PNG base64 (valid binary PNG)
const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const outPath = path.join(__dirname, '..', 'assets', 'icon.png');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
console.log('Wrote', outPath);
