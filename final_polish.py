import re

def process_use_product():
    filepath = '/Users/hatemrihan/Desktop/Unlimited-sw/hooks/useProduct.ts'
    with open(filepath, 'r') as f:
        content = f.read()

    # Extract types
    content = content.replace(
        'export const useProduct = (productId: string) => {\n  const router = useRouter();',
        'export type ProductVariant = Product[\'variants\'][number];\nexport type ProductFaq = Product[\'faqs\'][number];\n\nexport const useProduct = (productId: string) => {\n  const router = useRouter();'
    )

    # Remove router from deps
    content = content.replace(
        '}, [productId, router]);',
        '}, [productId]);'
    )

    # Replace any in fetch
    content = content.replace(
        'fetchedProduct.variants?.map((v: any) => ({',
        'fetchedProduct.variants?.map((v: ProductVariant & { _id?: string }) => ({'
    )
    content = content.replace(
        'fetchedProduct.faqs?.map((f: any) => ({',
        'fetchedProduct.faqs?.map((f: ProductFaq & { _id?: string }) => ({'
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

def process_jsx(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove dev comment
    content = content.replace(
        '{/* THE KEY DIFFERENCE: ONE UNIFIED MEDIA UPLOAD PER VARIANT */}',
        ''
    )

    # Fix variant/faq UUID fallback keys -> always use the id
    content = content.replace(
        'key={variant.id || `var-${index}`}',
        'key={variant.id}'
    )
    content = re.sub(
        r'key=\{variant\.id \|\| crypto\.randomUUID\(\)\}',
        r'key={variant.id}',
        content
    )
    content = content.replace(
        'key={faq.id || `faq-${index}`}',
        'key={faq.id}'
    )
    content = re.sub(
        r'key=\{faq\.id \|\| crypto\.randomUUID\(\)\}',
        r'key={faq.id}',
        content
    )

    # Fix media index keys -> use the source url itself
    content = re.sub(
        r'key=\{`img-\$\{imgIndex\}`\}',
        r'key={img}',
        content
    )
    content = re.sub(
        r'key=\{`vid-\$\{vidIndex\}`\}',
        r'key={vid}',
        content
    )

    with open(filepath, 'w') as f:
        f.write(content)


process_use_product()
process_jsx('/Users/hatemrihan/Desktop/Unlimited-sw/app/admin/add-product/page.tsx')
process_jsx('/Users/hatemrihan/Desktop/Unlimited-sw/app/admin/edit-product/[id]/page.tsx')

print("Final polish done.")
