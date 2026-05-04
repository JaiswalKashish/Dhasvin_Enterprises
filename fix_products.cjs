const fs = require('fs');
const path = require('path');
let p = path.join(__dirname, 'src/pages/Products.tsx');
let content = fs.readFileSync(p, 'utf8');
let norm = content.replace(/\r\n/g, '\n');
let target = `//   const { data: products, isLoading } = useGetProducts({
    const products = [] as any, isLoading = false; // TEMP ADDED
    search: debouncedSearch || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined
  });`;
if (norm.includes(target)) {
    norm = norm.replace(target, `    const products = [] as any, isLoading = false; // TEMP ADDED`);
    fs.writeFileSync(p, norm, 'utf8');
    console.log('Fixed Products.tsx');
} else {
    console.log('Target not found in Products.tsx');
}
