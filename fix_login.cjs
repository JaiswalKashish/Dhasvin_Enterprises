const fs = require('fs');
const path = require('path');
let p = path.join(__dirname, 'src/pages/Login.tsx');
let content = fs.readFileSync(p, 'utf8');
content = content.replace(
    /const loginMutation = \{ mutate: \(\) => \{\}, isPending: false \} as any; \/\/ TEMP ADDED/,
    `const loginMutation = { 
      mutate: (data, options) => {
        const role = data?.data?.email?.split('@')[0] || 'admin';
        const user = { name: role.charAt(0).toUpperCase() + role.slice(1), role: role };
        options?.onSuccess?.({ token: "dummy-token", user });
      }, 
      isPending: false 
    } as any; // TEMP ADDED`
);
fs.writeFileSync(p, content, 'utf8');
console.log('Fixed Login.tsx');
