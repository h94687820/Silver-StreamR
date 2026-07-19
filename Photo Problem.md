# Photo Problem — مشكلة رفع الصور على Cloudflare Pages

## ملخص المشكلة

رفع الصور (صورة البروفايل أو صور المنشورات) كان يفشل على النسخة المنشورة في Cloudflare Pages بينما يعمل بشكل طبيعي في بيئة التطوير على Replit.

---

## السبب الجذري

الـ **Service Binding** في إعدادات مشروع Cloudflare Pages كان يشير إلى Worker **خاطئ**:

| | القيمة |
|---|---|
| ❌ الخاطئة | `API → silver-stream-devportal` |
| ✓ الصحيحة | `API → silver-stream-api` |

### كيف يؤثر هذا على الرفع؟

```
المتصفح
  └── POST /api/storage/uploads
        └── _worker.js (على Cloudflare Pages)
              └── env.API.fetch(request)  ← هنا المشكلة
                    └── silver-stream-devportal  ❌ (Worker خاطئ)
                    └── silver-stream-api        ✓ (Worker الصحيح)
                          └── FORGE Storage API
```

لأن `env.API` يشير لـ Worker خاطئ، لا يوجد route يعالج `/api/storage/uploads` هناك، فيُرجع خطأ.

---

## البنية الصحيحة للتوجيه

```
المتصفح
  └── silver-stream.pages.dev/api/storage/uploads  (POST)
        └── _worker.js  ← يعترض كل الطلبات
              └── if pathname.startsWith('/api/')
                    └── env.API.fetch(request)  ← Service Binding
                          └── silver-stream-api Worker
                                └── POST /api/storage/uploads
                                      └── FORGE Storage API (تخزين الصور)
```

---

## الحل

تصحيح الـ Service Binding عبر Cloudflare API:

```bash
curl -s -X PATCH \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/silver-stream" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deployment_configs": {
      "production": {
        "services": {
          "API": {
            "service": "silver-stream-api",
            "environment": "production"
          }
        }
      },
      "preview": {
        "services": {
          "API": {
            "service": "silver-stream-api",
            "environment": "production"
          }
        }
      }
    }
  }'
```

ثم إعادة النشر لتفعيل الإعداد الجديد:

```bash
npx wrangler pages deploy artifacts/silver-stream/dist/public \
  --project-name silver-stream \
  --branch=main \
  --commit-dirty=true
```

---

## لماذا يعمل في Replit dev ويفشل في Cloudflare؟

| | Replit dev | Cloudflare Pages |
|---|---|---|
| التوجيه | Express middleware يعالج `/api/*` مباشرة | `_worker.js` يوجّه عبر Service Binding |
| التخزين | Object Storage / GCS | FORGE via Worker |
| Auth | Clerk session cookie | `Authorization: Bearer` |

في Replit، لا يوجد `_worker.js` ولا Service Binding — الـ Express server يعالج كل شيء مباشرة. لذلك حتى لو كان الـ binding خاطئاً في Cloudflare، لن يظهر الخطأ في التطوير.

---

## قائمة التحقق عند تكرار المشكلة

| العَرَض | التحقق |
|---|---|
| رفع الصور يفشل على Cloudflare فقط | تحقق من Service Binding في Pages: هل `API` يشير لـ `silver-stream-api`؟ |
| خطأ 503 "API not configured" | `env.API` غير موجود — الـ binding غير مضبوط أو خاطئ |
| خطأ 401 Unauthorized عند الرفع | `FORGE_API_KEY` غير موجود كـ secret في `silver-stream-api` Worker |
| خطأ 500 من FORGE | `FORGE_SERVICE` binding بين `silver-stream-api` والـ FORGE Worker مكسور |

---

## التشخيص السريع

```bash
# فحص الـ Service Binding الحالي
curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/silver-stream" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | \
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const s = JSON.parse(d).result?.deployment_configs?.production?.services;
    console.log('API binding:', JSON.stringify(s?.API));
  })"
# يجب أن يُرجع: { "service": "silver-stream-api", "environment": "production" }

# فحص secrets الـ Worker
curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/silver-stream-api/secrets" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | \
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    JSON.parse(d).result?.forEach(s => console.log(s.name));
  })"
# يجب أن يظهر: FORGE_API_KEY, CLERK_SECRET_KEY
```
