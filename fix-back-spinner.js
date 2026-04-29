const fs = require('fs');
const path = require('path');

function updateFile(relativePath) {
  const filePath = path.join(__dirname, relativePath);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Add useState import if not present
  if (content.includes("import React, { useMemo }") && !content.includes("useState")) {
    content = content.replace("import React, { useMemo }", "import React, { useMemo, useState }");
  } else if (!content.includes("useState")) {
    content = content.replace("import React", "import React, { useState }");
  }

  // Add state variable
  if (!content.includes("const [isNavigatingBack, setIsNavigatingBack]")) {
    content = content.replace(/const {[\s\S]*?} = useProduct\(.*?\);|const \{ data: session \} = useSession\(\);/, match => `${match}\n  const [isNavigatingBack, setIsNavigatingBack] = useState(false);`);
  }

  // Top Back Button
  content = content.replace(
    /<button\s+onClick=\{\(\) => router\.push\('\/admin#products'\)\}\s+className="flex items-center gap-2 text-white\/50 hover:text-white transition-colors text-sm"\s*>\s*<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">\s*<path fillRule="evenodd" d="M12\.707 5\.293a1 1 0 010 1\.414L9\.414 10l3\.293 3\.293a1 1 0 01-1\.414 1\.414l-4-4a1 1 0 010-1\.414l4-4a1 1 0 011\.414 0z" clipRule="evenodd" \/>\s*<\/svg>\s*Back to Products\s*<\/button>/g,
    `<button
              onClick={() => {
                setIsNavigatingBack(true);
                router.push('/admin#products');
              }}
              disabled={isNavigatingBack}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm disabled:opacity-50"
            >
              {isNavigatingBack ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              Back to Products
            </button>`
  );

  // Bottom Cancel Button
  content = content.replace(
    /<button\s+type="button"\s+onClick=\{\(\) => router\.push\('\/admin#products'\)\}\s+className="flex-1 bg-white text-white px-5 py-2 rounded-lg font-medium border border-white\/\[0\.12\] hover:bg-stone-900 transition-all duration-300 text-sm"\s*>\s*Cancel\s*<\/button>/g,
    `<button
                  type="button"
                  onClick={() => {
                    setIsNavigatingBack(true);
                    router.push('/admin#products');
                  }}
                  disabled={isNavigatingBack}
                  className="flex-1 bg-white/[0.05] text-white px-5 py-2 rounded-lg font-medium border border-white/[0.12] hover:bg-white/[0.1] transition-all duration-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isNavigatingBack ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Returning...
                    </>
                  ) : (
                    'Cancel'
                  )}
                </button>`
  );

  fs.writeFileSync(filePath, content, 'utf8');
}

updateFile('app/admin/edit-product/[id]/page.tsx');
updateFile('app/admin/add-product/page.tsx');
console.log('Spinner logic added.');
