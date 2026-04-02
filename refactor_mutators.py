import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Update hook destructurings
    content = re.sub(
        r'const { product, setProduct, savingProduct, addProduct: handleAddProduct } = useAddProduct\(\);',
        r'const { \n    product, savingProduct, addProduct: handleAddProduct,\n    updateField, updateVariant, addVariant, removeVariant, updateFaq, addFaq, removeFaq \n  } = useAddProduct();',
        content
    )
    content = re.sub(
        r'const { product, setProduct, loading, savingProduct, updateProduct } = useProduct\(productId as string\);',
        r'const { \n    product, loading, savingProduct, updateProduct,\n    updateField, updateVariant, addVariant, removeVariant, updateFaq, addFaq, removeFaq \n  } = useProduct(productId as string);',
        content
    )

    # 2. Simple updateField (e.target.value)
    content = re.sub(
        r'setProduct\(\{ \.\.\.product, ([a-zA-Z]+): ([^}]+) \}\)',
        r'updateField("\1", \2)',
        content
    )

    # 3. Simple updateField without e.target (e.g., images: newImages)
    content = re.sub(
        r'setProduct\(\{ \.\.\.product, ([a-zA-Z]+): ([^}]+) \}\)',
        r'updateField("\1", \2)',
        content
    )

    # 4. Variant Name/Stock Update
    content = re.sub(
        r'const newVariants = \[\.\.\.product\.variants\];\s*newVariants\[index\] = \{ \.\.\.variant, ([a-zA-Z]+): ([^}]+) \};\s*setProduct\(\{ \.\.\.product, variants: newVariants \}\);',
        r'updateVariant(index, { ...variant, \1: \2 });',
        content
    )

    # 5. Variant Images Delete
    content = re.sub(
        r'const newVariants = \[\.\.\.product\.variants\];\s*const newImages = variant\.images\?\.filter\(\(_, i\) => i !== imgIndex\) \|\| \[\];\s*newVariants\[index\] = \{ \.\.\.variant, images: newImages \};\s*setProduct\(\{ \.\.\.product, variants: newVariants \}\);',
        r'updateVariant(index, { ...variant, images: variant.images?.filter((_, i) => i !== imgIndex) || [] });',
        content
    )

    # 6. Variant Videos Delete
    content = re.sub(
        r'const newVariants = \[\.\.\.product\.variants\];\s*const newVideos = variant\.videos\?\.filter\(\(_, i\) => i !== vidIndex\) \|\| \[\];\s*newVariants\[index\] = \{ \.\.\.variant, videos: newVideos \};\s*setProduct\(\{ \.\.\.product, variants: newVariants \}\);',
        r'updateVariant(index, { ...variant, videos: variant.videos?.filter((_, i) => i !== vidIndex) || [] });',
        content
    )

    # 7. Delete Variant Button
    content = re.sub(
        r'const newVariants = product\.variants\.filter\(\(_, i\) => i !== index\);\s*setProduct\(\{ \.\.\.product, variants: newVariants \}\);',
        r'removeVariant(index);',
        content
    )

    # 8. Add Variant Button
    content = re.sub(
        r'setProduct\(\{\s*\.\.\.product,\s*variants: \[\.\.\.product\.variants, \{[^\}]+\}\]\s*\}\);',
        r'addVariant();',
        content
    )

    # 9. Variant FileUpload
    content = re.sub(
        r'const newVariants = \[\.\.\.product\.variants\];\s*if \(isVideo\) \{\s*const currentVideos = variant\.videos \|\| \[\];\s*newVariants\[index\] = \{ \.\.\.variant, videos: \[\.\.\.currentVideos, url\] \};\s*\} else \{\s*const currentImages = variant\.images \|\| \[\];\s*newVariants\[index\] = \{ \.\.\.variant, images: \[\.\.\.currentImages, url\] \};\s*\}\s*setProduct\(\{ \.\.\.product, variants: newVariants \}\);',
        r'if (isVideo) {\n                              updateVariant(index, { ...variant, videos: [...(variant.videos || []), url] });\n                            } else {\n                              updateVariant(index, { ...variant, images: [...(variant.images || []), url] });\n                            }',
        content
    )

    # 10. Product Media Delete
    content = re.sub(
        r'const newImages = product\.images\.filter\(\(_, i\) => i !== index\);\s*setProduct\(\{ \.\.\.product, images: newImages \}\);',
        r'updateField("images", product.images.filter((_, i) => i !== index));',
        content
    )
    content = re.sub(
        r'const newVideos = product\.videos\?\.filter\(\(_, i\) => i !== index\) \|\| \[\];\s*setProduct\(\{ \.\.\.product, videos: newVideos \}\);',
        r'updateField("videos", product.videos?.filter((_, i) => i !== index) || []);',
        content
    )

    # 11. Product Media Main Upload
    content = re.sub(
        r'if \(!product\.mainImage && !isVideo\) \{\s*// First image becomes main image\s*setProduct\(\{ \.\.\.product, mainImage: url \}\);\s*\} else if \(isVideo\) \{\s*// Add to videos array\s*const newVideos = \[\.\.\.\(product\.videos \|\| \[\]\), url\];\s*setProduct\(\{ \.\.\.product, videos: newVideos \}\);\s*\} else \{\s*// Add to images array\s*const newImages = \[\.\.\.product\.images, url\];\s*setProduct\(\{ \.\.\.product, images: newImages \}\);\s*\}',
        r'if (!product.mainImage && !isVideo) {\n                      updateField("mainImage", url);\n                    } else if (isVideo) {\n                      updateField("videos", [...(product.videos || []), url]);\n                    } else {\n                      updateField("images", [...product.images, url]);\n                    }',
        content
    )

    # 12. FAQ Name/Answer Update
    content = re.sub(
        r'const newFaqs = \[\.\.\.product\.faqs\];\s*newFaqs\[index\] = \{ \.\.\.faq, ([a-zA-Z]+): ([^}]+) \};\s*setProduct\(\{ \.\.\.product, faqs: newFaqs \}\);',
        r'updateFaq(index, { ...faq, \1: \2 });',
        content
    )

    # 13. Delete FAQ Button
    content = re.sub(
        r'const newFaqs = product\.faqs\.filter\(\(_, i\) => i !== index\);\s*setProduct\(\{ \.\.\.product, faqs: newFaqs \}\);',
        r'removeFaq(index);',
        content
    )

    # 14. Add FAQ Button
    content = re.sub(
        r'setProduct\(\{\s*\.\.\.product,\s*faqs: \[\.\.\.product\.faqs, \{ id: crypto\.randomUUID\(\), question: \'\', answer: \'\' \}\]\s*\}\);',
        r'addFaq();',
        content
    )
    # Generic generic Add FAQ catch
    content = re.sub(
        r'setProduct\(\{\s*\.\.\.product,\s*faqs: \[\.\.\.product\.faqs, \{[^\}]+\}\]\s*\}\);',
        r'addFaq();',
        content
    )
    
    # 15. Key stable keys (addressing user's earlier review note)
    content = re.sub(
        r'key=\{variant\.id \|\| crypto\.randomUUID\(\)\}',
        r'key={variant.id || `var-${index}`}',
        content
    )
    content = re.sub(
        r'key=\{faq\.id \|\| crypto\.randomUUID\(\)\}',
        r'key={faq.id || `faq-${index}`}',
        content
    )

    with open(filepath, 'w') as f:
        f.write(content)

# Run on both UI files
process_file('/Users/hatemrihan/Desktop/Unlimited-sw/app/admin/add-product/page.tsx')
process_file('/Users/hatemrihan/Desktop/Unlimited-sw/app/admin/edit-product/[id]/page.tsx')
print("Refactoring complete.")
