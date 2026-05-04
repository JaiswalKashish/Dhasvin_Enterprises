const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Remove imports
    content = content.replace(/import\s*\{[^}]*\}\s*from\s*["']@workspace\/api-client-react["'];?/g, '');
    content = content.replace(/.*from "@workspace\/api-client-react".*\n?/g, '');

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        // Handle usages
        if (line.match(/use(Get|Create|Update|Delete|Clear|Login)/)) {
            // comment it out
            lines[i] = '// ' + line;
            
            let constMatch = line.match(/const\s+\{([^}]+)\}\s*=/);
            if (constMatch) {
                let vars = constMatch[1].split(',').map(s => s.trim());
                let dummyDeclarations = [];
                for (let v of vars) {
                    if (!v) continue;
                    let actualVar = v;
                    if (v.includes(':')) {
                        let parts = v.split(':').map(s => s.trim());
                        actualVar = parts[1];
                    }
                    if (actualVar === 'isLoading' || actualVar === 'trendLoading' || actualVar === 'topLoading' || actualVar === 'categoryLoading' || actualVar === 'statsLoading' || actualVar === 'lowStockLoading') {
                        dummyDeclarations.push(`${actualVar} = false`);
                    } else if (actualVar === 'error') {
                        dummyDeclarations.push(`${actualVar} = null`);
                    } else if (actualVar === 'refetch') {
                        dummyDeclarations.push(`${actualVar} = () => {}`);
                    } else {
                        dummyDeclarations.push(`${actualVar} = [] as any`);
                    }
                }
                if (dummyDeclarations.length > 0) {
                     lines[i] += '\n    const ' + dummyDeclarations.join(', ') + '; // TEMP ADDED';
                }
            } else {
                let simpleVarMatch = line.match(/const\s+([a-zA-Z0-9_]+)\s*=/);
                if (simpleVarMatch) {
                     let v = simpleVarMatch[1];
                     lines[i] += `\n    const ${v} = { mutate: () => {}, isPending: false } as any; // TEMP ADDED`;
                }
            }
        }
    }
    
    content = lines.join('\n');
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated ' + filePath);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

walk(srcDir);
