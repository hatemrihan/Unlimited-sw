# 🚀 COMPLETE SETUP GUIDE

## ⚠️ CRITICAL: Video uploads & Email notifications need configuration!

### **Step 1: Create Cloudinary Account**
1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. Get your credentials from the Dashboard

### **Step 2: Create Brevo Account (for emails)**
1. Go to [brevo.com](https://brevo.com)
2. Sign up for a free account
3. Go to SMTP & API → SMTP settings
4. Get your SMTP credentials

### **Step 3: Create Environment File**
Create a `.env.local` file in the `my-app` directory:

```env
# Cloudinary Configuration (Required for video/image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here  
CLOUDINARY_API_SECRET=your_api_secret_here

# Public Cloudinary settings (for direct uploads - RECOMMENDED for videos)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset_here
NEXT_PUBLIC_CLOUDINARY_FOLDER=alkadyy-uploads

# Brevo Email Configuration (Required for order confirmation emails)
BREVO_SMTP_USER=your_brevo_email@domain.com
BREVO_SMTP_PASSWORD=your_brevo_smtp_password
```

### **Step 4: Create Upload Preset in Cloudinary**
1. Go to Cloudinary Dashboard
2. Settings → Upload → Upload presets
3. Click "Add upload preset"
4. Set:
   - **Preset name**: `alkadyy_unsigned`
   - **Signing mode**: `Unsigned`
   - **Folder**: `alkadyy-uploads`
   - **Resource type**: `Auto`
   - **Max file size**: `100 MB` (for videos)
5. Save the preset

### **Step 5: Update Environment Variables**
Replace the values in `.env.local`:
- `your_cloud_name_here` → Your Cloudinary cloud name
- `your_api_key_here` → Your API key
- `your_api_secret_here` → Your API secret
- `your_unsigned_upload_preset_here` → `alkadyy_unsigned`
- `your_brevo_email@domain.com` → Your Brevo account email
- `your_brevo_smtp_password` → Your Brevo SMTP password

### **Step 6: Restart Development Server**
```bash
npm run dev
```

## ✅ **After Setup:**
- ✅ Video uploads will work for products
- ✅ Video uploads will work for intro items  
- ✅ Large files up to 100MB supported
- ✅ Direct uploads (faster, no server limits)
- ✅ Automatic video optimization
- ✅ Order confirmation emails will be sent
- ✅ Admin notification emails will work

## 🚨 **Without Setup:**
- ❌ Video uploads will fail
- ❌ Only small images work via server upload
- ❌ Order confirmation emails won't be sent
- ❌ Customers won't receive order confirmations
- ❌ Error messages in console

## 🔧 **Check Configuration:**
- Visit **Admin → 🎥 Video Setup** to check Cloudinary
- Visit **Admin → 📧 Email Setup** to check Brevo emails
