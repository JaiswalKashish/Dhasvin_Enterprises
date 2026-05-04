const fs = require('fs');
const path = require('path');

function replaceBlock(file, searchBlock, replaceBlock) {
    let p = path.join(__dirname, file);
    let content = fs.readFileSync(p, 'utf8');
    
    // Convert all to \n for easier replacement
    let normalizedContent = content.replace(/\r\n/g, '\n');
    let normalizedSearch = searchBlock.replace(/\r\n/g, '\n');
    
    if (normalizedContent.includes(normalizedSearch)) {
        normalizedContent = normalizedContent.replace(normalizedSearch, replaceBlock);
        fs.writeFileSync(p, normalizedContent, 'utf8');
        console.log('Fixed ' + file);
    } else {
        console.log('Could not find block in ' + file);
    }
}

replaceBlock('src/components/layout/AppLayout.tsx', 
`//   const { data: lowStockData } = useGetLowStockProducts({
    const lowStockData = [] as any; // TEMP ADDED
    query: {
      queryKey: ["lowStockProducts"],
      enabled: !!user,
      refetchInterval: 60000,
    }
  });`,
`    const lowStockData = [] as any; // TEMP ADDED`);

replaceBlock('src/components/layout/AppLayout.tsx', 
`//   const { data: companySettings } = useGetCompanySettings({
    const companySettings = [] as any; // TEMP ADDED
    query: {
      queryKey: ["companySettings"],
      enabled: !!user,
    }
  });`,
`    const companySettings = [] as any; // TEMP ADDED`);

replaceBlock('src/lib/auth.tsx',
`//   const { data: meData, isLoading, error } = useGetMe({
    const meData = [] as any, isLoading = false, error = null; // TEMP ADDED
    query: {
      queryKey: ["me"],
      enabled: !!token,
      retry: false,
    }
  });`,
`    const meData = [] as any, isLoading = false, error = null; // TEMP ADDED`);

replaceBlock('src/pages/Products.tsx',
`//   const { data: products, isLoading } = useGetProducts({
    const products = [] as any, isLoading = false; // TEMP ADDED
    category: categoryFilter !== "all" ? categoryFilter : undefined
  });`,
`    const products = [] as any, isLoading = false; // TEMP ADDED`);

