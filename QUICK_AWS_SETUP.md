# ⚡ Quick AWS S3 Setup (5 Minutes)

## 🎯 What We Changed
✅ **Replaced Cloudinary with AWS S3**  
✅ **Created S3 upload API** (`/api/s3-upload`)  
✅ **Updated FileUpload component** to use S3  
✅ **Installed AWS SDK**  

---

## 🚀 Quick Start (Do This Now!)

### 1️⃣ **Create S3 Bucket** (2 min)
1. Go to: https://s3.console.aws.amazon.com/
2. Click **"Create bucket"**
3. Name: `alkadyy-products`
4. Region: `us-east-1`
5. **UNCHECK** "Block all public access"
6. Create bucket

### 2️⃣ **Set Bucket Policy** (1 min)
1. Open your bucket → **Permissions** tab
2. **Bucket policy** → Edit → Paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::alkadyy-products/*"
  }]
}
```

### 3️⃣ **Enable CORS** (1 min)
1. Still in **Permissions** → **CORS** → Edit → Paste:

```json
[{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "PUT", "POST"],
  "AllowedOrigins": ["*"]
}]
```

### 4️⃣ **Create IAM User** (1 min)
1. Go to: https://console.aws.amazon.com/iam/
2. **Users** → **Create user** → Name: `alkadyy-uploader`
3. **Attach policies** → Select: `AmazonS3FullAccess`
4. **Create user**
5. Click user → **Security credentials** → **Create access key**
6. Choose: "Application outside AWS"
7. **⚠️ SAVE THESE:**
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

### 5️⃣ **Add to .env.local** (30 sec)

Add these 4 lines to your `my-app/.env.local` file:

```env
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=alkadyy-products
```

### 6️⃣ **Restart Server**
```bash
cd my-app
npm run dev
```

---

## ✅ Test It!

1. Go to: `http://localhost:3000/admin/add-product`
2. Upload a test image
3. You should see: "✅ File uploaded successfully to AWS S3!"
4. Image URL should start with: `https://alkadyy-products.s3...`

---

## 🎉 Done!

Your admin panel now uploads directly to AWS S3!

### What This Fixes:
- ✅ No more Cloudinary errors
- ✅ Unlimited uploads (AWS free tier: 5GB, 20K requests/month)
- ✅ Faster uploads
- ✅ Better control over your data
- ✅ Much cheaper ($2-3/month after free tier)

---

## 📚 Need More Details?

See the full guide: `AWS_S3_SETUP.md`

---

## 🔧 Current Product Status

**Products with Local Images** (Updated):
1. ✅ Wall-mounted pull-up bar (`68c0cdd2ee583648917b6a29`)
2. ✅ Wall-parallel bar (`68c10b711fd7ae728a98bdbd`)
3. ✅ All Black (`68c10e561fd7ae728a98bde3`)

**New Products** (Going Forward):
- Will automatically upload to AWS S3
- No manual intervention needed!

---

**Questions?** Check `AWS_S3_SETUP.md` for troubleshooting!

