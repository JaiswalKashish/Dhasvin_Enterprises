const fs = require('fs');
const path = require('path');

let p = path.join(__dirname, 'vite.config.ts');
let content = fs.readFileSync(p, 'utf8');

// remove replit plugin
content = content.replace(/import runtimeErrorOverlay from "@replit\/vite-plugin-runtime-error-modal";\n/, '');
content = content.replace(/runtimeErrorOverlay\(\),?\n/g, '');

// default PORT and BASE_PATH
content = content.replace(/if \(!rawPort\) \{[\s\S]*?\}/, 'if (!rawPort) { process.env.PORT = "5173"; }');
content = content.replace(/if \(!basePath\) \{[\s\S]*?\}/, 'if (!basePath) { process.env.BASE_PATH = "/"; }');

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed vite.config.ts');
