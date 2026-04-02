import re

filepath = '/Users/hatemrihan/Desktop/Unlimited-sw/app/admin/add-product/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Update Variant Fields (name, stock)
content = re.sub(
    r'const newVariants = \[\.\.\.product\.variants\];\s*newVariants\[index\] = \{ \.\.\.variant, ([a-zA-Z]+): ([^}]+) \};\s*updateField\("variants", newVariants\);',
    r'updateVariant(index, { ...variant, \1: \2 });',
    content
)

# 2. Update FAQ Fields (question, answer)
content = re.sub(
    r'const newFaqs = \[\.\.\.product\.faqs\];\s*newFaqs\[index\] = \{ \.\.\.faq, ([a-zA-Z]+): ([^}]+) \};\s*updateField\("faqs", newFaqs\);',
    r'updateFaq(index, { ...faq, \1: \2 });',
    content
)

# 3. Arrow Function Wrappers
content = content.replace('onClick={() => { addVariant(); }}', 'onClick={addVariant}')
content = content.replace('onClick={() => { addFaq(); }}', 'onClick={addFaq}')
content = content.replace('onClick={() => { addVariant() }}', 'onClick={addVariant}')
content = content.replace('onClick={() => { addFaq() }}', 'onClick={addFaq}')

# 4. Media Keys
content = content.replace('key={`img-${index}`}', 'key={img}')
content = content.replace('key={`vid-${index}`}', 'key={video}')

# 5. Remove Dev Comments
comments_to_remove = [
    '{/* ONE UNIFIED UPLOAD FIELD */}',
    '{/* ONE UNIFIED UPLOAD FOR MAIN PRODUCT */}',
    '// First image becomes main image',
    '// Add to videos array',
    '// Add to images array'
]
for comment in comments_to_remove:
    content = content.replace(comment, '')

# 6. Variant Remove
content = re.sub(
    r'onClick=\{\(\) => \{\s*const newVariants = product\.variants\.filter\(\(_, i\) => i !== index\);\s*updateField\("variants", newVariants\);\s*\}\}',
    r'onClick={() => removeVariant(index)}',
    content
)

# 7. FAQ Remove
content = re.sub(
    r'onClick=\{\(\) => \{\s*const newFaqs = product\.faqs\.filter\(\(_, i\) => i !== index\);\s*updateField\("faqs", newFaqs\);\s*\}\}',
    r'onClick={() => removeFaq(index)}',
    content
)

# 8. Variant Image Delete
# The code could be: const newImages = variant.images?.filter((_, i) => i !== imgIndex) || [];
# newVariants[index] = { ...variant, images: newImages }; ...
pattern_img_del = r'const newVariants = \[\.\.\.\(product\.variants \|\| \[\]\)\];\s*const newImages = variant\.images\?\.filter\(\(_, i\) => i !== imgIndex\) \|\| \[\];\s*newVariants\[index\] = \{ \.\.\.variant, images: newImages \};\s*updateField\("variants", newVariants\);'
content = re.sub(
    pattern_img_del,
    r'const newImages = variant.images?.filter((_, i) => i !== imgIndex) || [];\n                                    updateVariant(index, { ...variant, images: newImages });',
    content
)

# Fallback pattern for variant image delete without the explicit variables
pattern_img_del_2 = r'const newVariants = \[\.\.\.product\.variants\];\s*const newImages = variant\.images\?\.filter\(\(_, i\) => i !== imgIndex\) \|\| \[\];\s*newVariants\[index\] = \{ \.\.\.variant, images: newImages \};\s*updateField\("variants", newVariants\);'
content = re.sub(
    pattern_img_del_2,
    r'const newImages = variant.images?.filter((_, i) => i !== imgIndex) || [];\n                                    updateVariant(index, { ...variant, images: newImages });',
    content
)


# 9. Variant Video Branching onUpload (mirroring what we did for edit-product)
pattern_variant_upload = r'onUpload=\{\(url, isVideo = false\) => \{\s*updateVariant\(index, \{ \.\.\.variant, images: \[\.\.\.\(variant\.images \|\| \[\]\), url\] \}\);\s*\}\}'
replacement_variant_upload = r'''onUpload={(url, isVideo = false) => {
                            if (isVideo) {
                              updateVariant(index, { ...variant, videos: [...(variant.videos || []), url] });
                            } else {
                              updateVariant(index, { ...variant, images: [...(variant.images || []), url] });
                            }
                          }}'''
content = re.sub(pattern_variant_upload, replacement_variant_upload, content)

# 10. Clean up empty lines from removed dev comments
content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)

with open(filepath, 'w') as f:
    f.write(content)

print("Add Product polish applied.")
