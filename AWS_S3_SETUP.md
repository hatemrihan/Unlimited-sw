# AWS S3 Setup Guide for Alkadyy Project

## 🎯 Overview
This guide will help you configure AWS S3 for product image and video uploads, replacing Cloudinary.

---

## 📋 Prerequisites
- AWS Account (Free tier available)
- Access to AWS Console
- Project already has AWS SDK installed

---

## 🚀 Step 1: Create S3 Bucket

1. **Go to AWS S3 Console**
   - Visit: https://s3.console.aws.amazon.com/

2. **Create New Bucket**
   - Click **"Create bucket"**
   - **Bucket name**: `alkadyy-products` (must be globally unique)
   - **AWS Region**: `us-east-1` (or closest to your users)
   - **Uncheck** "Block all public access" ⚠️ (We need public access for images)
   - Check the acknowledgment box
   - Click **"Create bucket"**

---

## 🔐 Step 2: Configure Bucket Permissions

### A. Set Bucket Policy (Make Images Public)

1. Go to your bucket → **Permissions** tab
2. Scroll to **Bucket policy** section
3. Click **Edit**
4. Paste this policy (replace `alkadyy-products` with your bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::alkadyy-products/*"
    }
  ]
}
```

5. Click **Save changes**

### B. Enable CORS (Allow Website Uploads)

1. Still in **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)** section
3. Click **Edit**
4. Paste this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

5. Click **Save changes**

---

## 👤 Step 3: Create IAM User for Uploads

1. **Go to IAM Console**
   - Visit: https://console.aws.amazon.com/iam/

2. **Create New User**
   - Click **Users** (left sidebar)
   - Click **Create user**
   - Username: `alkadyy-uploader`
   - Click **Next**

3. **Set Permissions**
   - Select **"Attach policies directly"**
   - Search and select: **"AmazonS3FullAccess"**
   - Click **Next**
   - Click **Create user**

4. **Create Access Keys**
   - Click on the user you just created
   - Go to **Security credentials** tab
   - Scroll to **Access keys**
   - Click **Create access key**
   - Choose: **"Application running outside AWS"**
   - Click **Next**
   - (Optional) Add description: "Alkadyy product uploads"
   - Click **Create access key**

5. **⚠️ IMPORTANT: Save Your Credentials**
   ```
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=wJalr...
   ```
   **These will only be shown once! Save them now!**

---

## ⚙️ Step 4: Configure Environment Variables

Add these to your `.env.local` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=alkadyy-products
```

**Replace with your actual values:**
- `AWS_ACCESS_KEY_ID`: From Step 3.5
- `AWS_SECRET_ACCESS_KEY`: From Step 3.5
- `AWS_REGION`: Your bucket's region (e.g., `us-east-1`)
- `AWS_S3_BUCKET_NAME`: Your bucket name (e.g., `alkadyy-products`)

---

## 🧪 Step 5: Test the Setup

1. **Restart your development server**
   ```bash
   npm run dev
   ```

2. **Go to Admin Panel**
   - Navigate to: `http://localhost:3000/admin/add-product`

3. **Try uploading an image**
   - Upload a test product image
   - Check console for success messages
   - Verify the image URL starts with: `https://alkadyy-products.s3...`

4. **Check S3 Bucket**
   - Go to AWS S3 Console
   - Open your bucket
   - You should see uploaded files in `images/` or `videos/` folder

---

## ✅ Verification Checklist

- [ ] S3 bucket created
- [ ] Bucket policy configured (public read access)
- [ ] CORS enabled
- [ ] IAM user created with S3 access
- [ ] Access keys generated and saved
- [ ] Environment variables added to `.env.local`
- [ ] Development server restarted
- [ ] Test upload successful
- [ ] Image accessible via public URL

---

## 🎨 Benefits Over Cloudinary

✅ **No Usage Limits** - Free tier includes 5GB storage, 20K GET requests/month  
✅ **Better Control** - Full control over your data  
✅ **Lower Costs** - Pay only for what you use (very cheap)  
✅ **Faster** - Direct uploads, no third-party API  
✅ **Reliable** - AWS infrastructure, 99.99% uptime  

---

## 💰 AWS S3 Pricing (Very Affordable!)

**Free Tier (First 12 months):**
- 5 GB storage
- 20,000 GET requests
- 2,000 PUT requests

**After Free Tier:**
- Storage: ~$0.023 per GB/month
- Requests: $0.0004 per 1,000 GET requests
- **Example**: 100GB storage + 100K requests = ~$2.50/month

---

## 🆘 Troubleshooting

### Upload fails with "Access Denied"
- Check IAM user has `AmazonS3FullAccess` policy
- Verify access keys are correct in `.env.local`

### Images not loading (403 Error)
- Ensure bucket policy allows public read (`s3:GetObject`)
- Verify bucket is NOT blocking public access

### CORS Error in Browser
- Double-check CORS configuration in bucket permissions
- Ensure `AllowedOrigins` includes `*` or your domain

### Environment variables not working
- Restart development server after adding `.env.local` variables
- Verify `.env.local` is in the root `my-app/` directory

---

## 🔒 Security Notes

- ✅ Access keys are stored in `.env.local` (NOT committed to Git)
- ✅ Bucket policy only allows `GetObject` (read-only public access)
- ✅ Write access requires authenticated IAM user
- ⚠️ Never commit `.env.local` to GitHub
- ⚠️ Regenerate access keys if they're ever exposed

---

## 📚 Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [IAM User Guide](https://docs.aws.amazon.com/IAM/latest/UserGuide/)
- [S3 Pricing Calculator](https://calculator.aws/)

---

## ✅ Setup Complete!

Your Alkadyy project now uses AWS S3 for all product media uploads! 🎉

**Next Steps:**
1. Upload a test product with images
2. Verify images load on product pages
3. (Optional) Migrate existing local images to S3

---

**Need Help?** Check the troubleshooting section or AWS documentation linked above.





