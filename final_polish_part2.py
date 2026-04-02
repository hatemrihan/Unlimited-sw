import re

def process_use_add_product():
    filepath = '/Users/hatemrihan/Desktop/Unlimited-sw/hooks/useAddProduct.ts'
    with open(filepath, 'r') as f:
        content = f.read()

    # Extract types if not there
    if 'ProductVariant' not in content:
        content = content.replace(
            'export const useAddProduct = () => {',
            'export type ProductVariant = Product[\'variants\'][number];\nexport type ProductFaq = Product[\'faqs\'][number];\n\nexport const useAddProduct = () => {'
        )

    # Replace any in mutators
    content = content.replace(
        'const updateVariant = (index: number, variant: any) => {',
        'const updateVariant = (index: number, variant: ProductVariant) => {'
    )
    content = content.replace(
        'const updateFaq = (index: number, faq: any) => {',
        'const updateFaq = (index: number, faq: ProductFaq) => {'
    )

    with open(filepath, 'w') as f:
        f.write(content)

def process_edit_page():
    filepath = '/Users/hatemrihan/Desktop/Unlimited-sw/app/admin/edit-product/[id]/page.tsx'
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Remove inline getNavItems
    nav_pattern = r'const getNavItems = [^;]+;[^;]+;[^\]]+\];'
    content = re.sub(nav_pattern, '', content, count=1, flags=re.DOTALL)
    
    # Ensure imported
    if "import { getNavItems } from '@/utils/navItems';" not in content:
        content = content.replace(
            "import { useSession } from 'next-auth/react';",
            "import { useSession } from 'next-auth/react';\nimport { getNavItems } from '@/utils/navItems';"
        )

    # 2. Add FAQ missing ID
    content = re.sub(
        r'onClick=\{\(\) => \{\s*const newFaqs = \[\.\.\.\(product\.faqs \|\| \[\]\), \{ question: \'\', answer: \'\' \}\];\s*updateField\("faqs", newFaqs\);\s*\}\}',
        r'onClick={addFaq}',
        content
    )
    content = re.sub(
        r'onClick=\{\(\) => \{\s*const currentFaqs = product\.faqs \|\| \[\];\s*setProduct\(\{ \.\.\.product, faqs: \[\.\.\.currentFaqs, \{ question: \'\', answer: \'\' \}\] \}\);\s*\}\}',
        r'onClick={addFaq}',
        content
    )
    # Generic replacement if it is still there
    content = re.sub(
        r'onClick=\{\(\) => \{\s*const currentFaqs = product\.faqs \|\| \[\];\s*updateField\("faqs", \[\.\.\.currentFaqs, \{ [^}]+ \} \]\);\s*\}\}',
        r'onClick={addFaq}',
        content
    )

    # 3. Granular updaters (Variant remove)
    content = re.sub(
        r'onClick=\{\(\) => \{\s*const newVariants = product\.variants\?\.filter\(\(_, i\) => i !== index\) \|\| \[\];\s*updateField\("variants", newVariants\);\s*\}\}',
        r'onClick={() => removeVariant(index)}',
        content
    )

    # 4. Granular updaters (FAQ remove)
    content = re.sub(
        r'onClick=\{\(\) => \{\s*const newFaqs = product\.faqs\?\.filter\(\(_, i\) => i !== index\) \|\| \[\];\s*updateField\("faqs", newFaqs\);\s*\}\}',
        r'onClick={() => removeFaq(index)}',
        content
    )

    # Note: the updateVariant logic inside FileUpload
    content = re.sub(
        r'const newVariants = \[\.\.\.\(product\.variants \|\| \[\]\)\];\s*const currentVideos = variant\.videos \|\| \[\];\s*newVariants\[index\] = \{ \.\.\.variant, videos: \[\.\.\.currentVideos, url\] \};\s*updateField\("variants", newVariants\);',
        r'updateVariant(index, { ...variant, videos: [...(variant.videos || []), url] });',
        content
    )
    content = re.sub(
        r'const newVariants = \[\.\.\.\(product\.variants \|\| \[\]\)\];\s*const currentImages = variant\.images \|\| \[\];\s*newVariants\[index\] = \{ \.\.\.variant, images: \[\.\.\.currentImages, url\] \};\s*updateField\("variants", newVariants\);',
        r'updateVariant(index, { ...variant, images: [...(variant.images || []), url] });',
        content
    )

    content = re.sub(
        r'const newVariants = \[\.\.\.\(product\.variants \|\| \[\]\)\];\s*newVariants\[index\] = \{ \.\.\.variant, ([a-zA-Z]+): ([^}]+) \};\s*updateField\("variants", newVariants\);',
        r'updateVariant(index, { ...variant, \1: \2 });',
        content
    )
    
    content = re.sub(
        r'const newFaqs = \[\.\.\.\(product\.faqs \|\| \[\]\)\];\s*newFaqs\[index\] = \{ \.\.\.faq, ([a-zA-Z]+): ([^}]+) \};\s*updateField\("faqs", newFaqs\);',
        r'updateFaq(index, { ...faq, \1: \2 });',
        content
    )

    with open(filepath, 'w') as f:
        f.write(content)

def process_api_routes():
    # 1. /api/admin/products/[id]/route.ts
    filepath = '/Users/hatemrihan/Desktop/Unlimited-sw/app/api/admin/products/[id]/route.ts'
    with open(filepath, 'r') as f:
        content = f.read()

    auth_block = """  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }"""

    require_admin_fn = """async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
"""
    if 'requireAdmin()' not in content:
        content = content.replace(
            "import { withDb } from '../../../../../lib/withDb';",
            "import { withDb } from '../../../../../lib/withDb';\n\n" + require_admin_fn
        )

    content = content.replace(auth_block, "  const authError = await requireAdmin();\n  if (authError) return authError;")

    # Fix ctx any to ctx Ctx in this file
    content = content.replace('ctx?: any', 'ctx?: Ctx')

    # Fix comments in this file
    content = content.replace('  // Bust Next.js Data Cache by tag — instant invalidation, no path guessing\n', '')

    with open(filepath, 'w') as f:
        f.write(content)

    # 2. /api/admin/products/route.ts
    filepath_root = '/Users/hatemrihan/Desktop/Unlimited-sw/app/api/admin/products/route.ts'
    with open(filepath_root, 'r') as f:
        content_root = f.read()

    if 'requireAdmin()' not in content_root:
        content_root = content_root.replace(
            "import { withDb } from '../../../../lib/withDb';",
            "import { withDb } from '../../../../lib/withDb';\n\n" + require_admin_fn
        )
    content_root = content_root.replace(auth_block, "  const authError = await requireAdmin();\n  if (authError) return authError;")
    content_root = content_root.replace('ctx?: any', 'ctx?: Ctx')

    with open(filepath_root, 'w') as f:
        f.write(content_root)

process_use_add_product()
process_edit_page()
process_api_routes()
print("Phase 11 polish applied.")
