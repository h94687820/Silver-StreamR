# مشكلة رفع الملفات على Cloudflare — التشخيص والحل الدائم

## المشكلة

رفع الصور والفيديو وتغيير صورة البروفايل يعمل بشكل طبيعي على **Replit** لكنه يفشل دائماً على **Cloudflare**.

---

## السبب الجذري

### الطبقة الأولى — خطأ 1042: Worker لا يستطيع استدعاء Worker آخر بـ HTTP

Cloudflare يمنع صراحةً أي Worker من استدعاء Worker آخر عبر HTTP fetch عادي:

```
silver-stream-api Worker
  → fetch("https://baas-server-model-a.mcfoxy.workers.dev/api/storage/upload")
  ← 404 error code: 1042   ❌ محظور
```

هذا القيد يُطبَّق على **جميع** Workers حتى لو كانت على نفس الحساب.  
المرجع: [Cloudflare Docs — Subrequest restrictions](https://developers.cloudflare.com/workers/platform/limits/#subrequest-limits)

### الطبقة الثانية — مسار FORGE المعطوب

المسار القديم الذي كان يستخدمه الكود:
```
POST /api/v1/storage/upload  (JSON body)
→ {"error": "The \"key\" argument must be of type string..."}  ❌ خطأ داخلي في FORGE
```

المسار الصحيح الذي يعمل:
```
POST /api/storage/upload  (multipart/form-data + حقل file)
→ {"url": "...", "fileId": 42, "objectPath": "/objects/uuid"}  ✅
```

### لماذا يعمل على Replit؟

Replit ليس Cloudflare Worker — يستخدم Google Cloud Storage عبر Replit Sidecar مباشرةً، ولا يمر عبر FORGE أصلاً. لذلك لا يتأثر بقيد 1042.

---

## الحل المطبَّق

### Service Binding بدلاً من HTTP Fetch

Service Binding هو اتصال **داخلي مباشر** بين Worker وآخر دون المرور بالشبكة — Cloudflare يسمح به صراحةً ولا يخضع لقيد 1042.

**`wrangler.toml`:**
```toml
[[services]]
binding = "FORGE_SERVICE"
service = "baas-server-model-a"
```

**`storage.ts`:**
```typescript
// بدل fetch("https://baas-server-model-a.mcfoxy.workers.dev/...")
// استخدم:
env.FORGE_SERVICE.fetch(new Request(url, init))
```

### تغيير مسار الرفع

```typescript
// ❌ المسار القديم — معطوب من طرف FORGE
POST /api/v1/storage/upload  { name, size, contentType }

// ✅ المسار الصحيح — multipart/form-data
POST /api/storage/upload  (FormData + file field)
```

---

## كيفية التعرف على المشكلة مستقبلاً

| العَرَض | السبب المحتمل |
|---|---|
| رفع يعمل على Replit لكن يفشل على Cloudflare | قيد Worker-to-Worker HTTP (1042) |
| الخطأ يحتوي `error code: 1042` في body الاستجابة | نفس القيد — تأكد من استخدام Service Binding |
| الخطأ `key argument must be of type string` من FORGE | مسار `/api/v1/storage/upload` معطوب — استخدم `/api/storage/upload` |
| `FORGE upload failed 404` | تحقق من: (1) صحة FORGE_API_KEY، (2) استخدام Service Binding |

---

## قائمة التحقق عند تكرار المشكلة

```bash
# 1. اختبر FORGE مباشرةً من Replit (خارج Cloudflare)
echo "test" > /tmp/p.txt
curl -s -X POST "https://baas-server-model-a.mcfoxy.workers.dev/api/storage/upload" \
  -H "X-API-Key: $FORGE_API_KEY" \
  -F "file=@/tmp/p.txt;type=text/plain"
# النتيجة المتوقعة: {"url":"...","fileId":...,"objectPath":"/objects/..."}

# 2. تحقق من أن FORGE_SERVICE binding موجود في وضع التشغيل
npx wrangler deploy --dry-run 2>&1 | grep FORGE_SERVICE
# المتوقع: env.FORGE_SERVICE  Worker  baas-server-model-a

# 3. اختبر الرفع عبر Worker
curl -s -X POST "https://silver-stream-api.mcfoxy.workers.dev/api/storage/uploads" \
  -H "Content-Type: text/plain" \
  --data-binary @/tmp/p.txt
# المتوقع: {"objectPath":"/objects/..."}
```

---

## الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `cloudflare/worker/wrangler.toml` | إضافة `[[services]]` لـ FORGE_SERVICE |
| `cloudflare/worker/src/types.ts` | إضافة `FORGE_SERVICE` لنوع `Bindings` |
| `cloudflare/worker/src/storage.ts` | دعم Service Binding + تغيير مسار الرفع |
| `cloudflare/worker/src/routes/storage-route.ts` | تمرير `env.FORGE_SERVICE` لـ uploadFile |

---

## ملاحظة مهمة عند تغيير حساب Cloudflare

إذا انتقل FORGE (`baas-server-model-a`) لحساب Cloudflare آخر، فإن Service Binding لن يعمل لأنه يعمل فقط بين Workers على **نفس الحساب**. في هذه الحالة الحل البديل هو:
- تفعيل Cloudflare R2 من Dashboard وإعادة كتابة `storage.ts` لاستخدام `env.STORAGE.put()`
- أو إضافة custom domain لـ FORGE (ليس على `workers.dev`) مما يسمح بـ HTTP عادي
