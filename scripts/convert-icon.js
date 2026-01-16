const pngToIcoMod = require('png-to-ico');
const pngToIco = pngToIcoMod.default || pngToIcoMod;
const path = require('path');
const fs = require('fs');

const inPath = path.join(__dirname, '..', 'assets', 'icon.png');
const outPath = path.join(__dirname, '..', 'assets', 'icon.ico');

pngToIco(inPath)
  .then(buf => fs.writeFileSync(outPath, buf))
  .then(() => console.log('Wrote', outPath))
  .catch(err => { console.error(err); process.exit(1); });
