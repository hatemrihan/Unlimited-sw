const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/admin/add-product/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Container & RTL adjustments
content = content.replace(/bg-gray-50/g, 'bg-stone-900');
content = content.replace(/md:ml-64/g, 'md:mr-[220px]" dir="rtl');

// Cards and Borders
content = content.replace(/bg-white border border-gray-200/g, 'bg-white/[0.03] border border-white/[0.06]');
content = content.replace(/bg-gray-50 border border-gray-200/g, 'bg-white/[0.02] border border-white/[0.06]');
content = content.replace(/border-gray-200/g, 'border-white/[0.08]');
content = content.replace(/border-gray-300/g, 'border-white/[0.12]');
content = content.replace(/border-gray-400/g, 'border-white/[0.2]');
content = content.replace(/border-dashed border-gray-300/g, 'border-dashed border-white/[0.12]');

// Inputs and Textareas
content = content.replace(/bg-white border/g, 'bg-black/20 border');
content = content.replace(/focus:border-gray-400/g, 'focus:border-white/[0.3]');
content = content.replace(/bg-gray-50 p-3/g, 'bg-white/[0.02] p-3');

// Text Colors
content = content.replace(/text-gray-900/g, 'text-white');
content = content.replace(/text-gray-700/g, 'text-white/70');
content = content.replace(/text-gray-600/g, 'text-white/60');
content = content.replace(/text-gray-500/g, 'text-white/50');
content = content.replace(/text-gray-400/g, 'text-white/40');
content = content.replace(/text-gray-300/g, 'text-white/30');

// Hover Text Colors
content = content.replace(/hover:text-gray-900/g, 'hover:text-white');
content = content.replace(/hover:text-gray-700/g, 'hover:text-white/70');
content = content.replace(/hover:text-gray-600/g, 'hover:text-white/60');
content = content.replace(/hover:text-gray-500/g, 'hover:text-white/50');

// Hover Border
content = content.replace(/hover:border-gray-400/g, 'hover:border-white/[0.2]');

// Buttons
content = content.replace(/bg-gray-900 text-white/g, 'bg-white text-black');
content = content.replace(/hover:bg-gray-800/g, 'hover:bg-white/90');
content = content.replace(/bg-white text-gray-900/g, 'bg-white/[0.05] text-white hover:bg-white/[0.1]');
content = content.replace(/disabled:bg-gray-400 disabled:text-gray-600/g, 'disabled:bg-white/20 disabled:text-white/40');
content = content.replace(/bg-white border border-gray-300/g, 'bg-white/[0.05] border border-white/[0.1]');

// Specific fixes
content = content.replace(/bg-black\/70/g, 'bg-black/80'); // keep videos labels legible
content = content.replace(/border-2 border-yellow-500/g, 'border border-amber-500'); 
content = content.replace(/bg-yellow-500/g, 'bg-amber-500/20 text-amber-500'); 

// SidebarNav adjustments
content = content.replace(/<SidebarNav[\s\S]*?\/>/, `<SidebarNav
          activeSection="products"
          onSectionChange={() => router.push('/admin')}
          userName={session?.user?.name || "المدير"}
        />`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Styles updated.');
