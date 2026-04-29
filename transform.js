const fs = require('fs');

const addContent = fs.readFileSync('app/admin/add-product/page.tsx', 'utf8');

let editContent = addContent;

// 1. Imports
editContent = editContent.replace("import { useAddProduct } from '@/hooks/useAddProduct';", "import { useProduct } from '@/hooks/useProduct';\nimport { useParams } from 'next/navigation';");

// 2. Component Name
editContent = editContent.replace("export default function AddProductPage() {", "export default function EditProductPage() {");

// 3. Hooks
editContent = editContent.replace("const router = useRouter();", "const router = useRouter();\n  const params = useParams();\n  const productId = params.id as string;");
editContent = editContent.replace("const { \n    product, savingProduct, addProduct: handleAddProduct,\n    updateField, updateVariant, addVariant, removeVariant, updateFaq, addFaq, removeFaq \n  } = useAddProduct();", "const { \n    product, loading, savingProduct, updateProduct: handleUpdateProduct,\n    updateField, updateVariant, addVariant, removeVariant, updateFaq, addFaq, removeFaq \n  } = useProduct(productId);");
editContent = editContent.replace("const { product, savingProduct, addProduct: handleAddProduct,", "const { product, loading, savingProduct, updateProduct: handleUpdateProduct,");
editContent = editContent.replace("} = useAddProduct();", "} = useProduct(productId);");

// 4. Handlers
editContent = editContent.replace(/handleAddProduct/g, "handleUpdateProduct");

// 5. Texts
editContent = editContent.replace("إضافة منتج جديد", "تعديل المنتج");
editContent = editContent.replace("نشر المنتج", "حفظ التعديلات");

// 6. Loading state handling
// In AddProductPage we have:
//   <div className="md:mr-[220px] flex-1 flex flex-col min-h-screen bg-stone-900 text-white">
// We can inject the loading check right after SidebarNav.
// Wait, the layout has SidebarNav, then a div. We should just show a loader inside the div if loading is true.
editContent = editContent.replace(
  "<div className=\"md:mr-[220px] flex-1 flex flex-col min-h-screen bg-stone-900 text-white\">",
  `<div className="md:mr-[220px] flex-1 flex flex-col min-h-screen bg-stone-900 text-white">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-white/50 mx-auto mb-4" />
                <p className="text-white/50 text-sm">جاري تحميل بيانات المنتج...</p>
              </div>
            </div>
          ) : (`
);

// Close the loading ternary at the end
editContent = editContent.replace(
  "        </div>\n      </div>\n    </ProtectedAdminRoute>",
  "          )}\n        </div>\n      </div>\n    </ProtectedAdminRoute>"
);


fs.writeFileSync('app/admin/edit-product/[id]/page.tsx', editContent);
console.log('Done replacing!');
