# photoFix — تشخيص وحل مشكلة رفع الصور (Upload 405)

## ملخص المشكلة
عند محاولة رفع صورة بروفايل أو صورة منشور في التطبيق المنشور على Cloudflare Pages، كان يظهر خطأ:
```
Upload failed (405)
```
مع أن التطبيق يعمل بشكل طبيعي في بيئة التطوير (Replit dev).

---

## البنية المعنية

```
المتصفح
  └── silver-stream.pages.dev   (Cloudflare Pages — الـ Frontend)
        └── /api/*              (يجب أن يُوجَّه إلى الـ Worker)
              └── silver-stream-api (Cloudflare Worker — الـ Backend)
                    └── POST /api/storage/uploads
                          └── FORGE Storage API (تخزين الملفات)
```

---

## المشكلة الأولى — `_redirects` يبتلع طلبات POST

### السبب
ملف `artifacts/silver-stream/public/_redirects` يحتوي على:
```
/* /index.html 200
```
هذه القاعدة تجعل Cloudflare Pages يعيد توجيه **كل** الطلبات إلى `index.html` بما فيها
`POST /api/storage/uploads`. لكن خادم الملفات الثابتة لا يدعم POST، فيرجع:
```
405 Method Not Allowed
```

### الحل المحاول (ناقص)
إنشاء Cloudflare Pages Function في:
```
artifacts/silver-stream/functions/api/[[path]].ts
```
لاعتراض `/api/*` وتمريره إلى الـ Worker عبر Service Binding.

**لكن** الملف لم ينشر لأن عند استخدام `wrangler pages deploy` (رفع مباشر)
يجب نسخ مجلد `functions/` داخل مجلد البناء قبل الرفع:
```bash
cp -r artifacts/silver-stream/functions artifacts/silver-stream/dist/public/functions
```
هذه الخطوة كانت مفقودة، لذا بقيت المشكلة.

---

## المشكلة الثانية — Pages Functions لا تُفعَّل في الرفع المباشر

### السبب
بعد إضافة خطوة النسخ، تبيّن أن ملفات `.ts` في `functions/` لا تُعالَج دائماً
بشكل صحيح في وضع الرفع المباشر (`wrangler pages deploy`)، مما يعني أن الـ Function
لم تكن تُشغَّل.

### الحل الصحيح — استخدام `_worker.js` (Advanced Mode)
بدلاً من Pages Functions، أُنشئ ملف:
```
artifacts/silver-stream/public/_worker.js
```
هذا الملف هو Worker يتولى **كل** الطلبات الواردة لـ Pages، ويوجّهها:

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // توجيه /api/* إلى الـ Worker عبر Service Binding
    if (url.pathname.startsWith('/api/')) {
      if (env.API) return env.API.fetch(request);
      // Fallback إذا لم يكن Service Binding
      if (env.WORKER_URL) { /* fetch مباشر */ }
      return new Response(JSON.stringify({ error: 'API not configured' }), { status: 503 });
    }

    // خدمة الملفات الثابتة مع SPA fallback
    const asset = await env.ASSETS.fetch(request);
    if (asset.status === 404) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
    }
    return asset;
  }
};
```

عند نشر هذا الملف، يظهر في الـ output:
```
✨ Compiled Worker successfully
✨ Uploading Worker bundle
```
وهو دليل على أن الـ Worker نشط فعلاً.

---

## المشكلة الثالثة — غياب `Authorization: Bearer` في طلب الرفع

### السبب
حتى بعد حل مشكلة التوجيه، كانت طلبات الرفع تصل للـ Worker لكنها ترفض بـ 401.

**السبب الجذري:** دالة `uploadFile` في `artifacts/silver-stream/src/lib/upload.ts`
تستخدم `fetch` مباشراً بدون رأس `Authorization`:

```typescript
// الكود القديم — لا يرسل التوكن
const res = await fetch("/api/storage/uploads", {
  method: "POST",
  headers: { "Content-Type": file.type },
  body: file,
  credentials: "include",  // يرسل cookies فقط
});
```

في بيئة التطوير (Express + `@clerk/express`) كانت الكوكيز تكفي لأن Clerk يقرأها.
لكن الـ Cloudflare Worker يتحقق فقط من:
```typescript
const authHeader = c.req.header("Authorization");
const clerkId = await getClerkIdFromHeader(authHeader, c.env.CLERK_SECRET_KEY);
if (!clerkId) return c.json({ error: "Unauthorized" }, 401);
```

### الحل
**الخطوة 1:** إضافة دالة `getAuthToken()` إلى `lib/api-client-react/src/custom-fetch.ts`:

```typescript
export async function getAuthToken(): Promise<string | null> {
  if (!_authTokenGetter) return null;
  return _authTokenGetter();
}
```

وتصديرها من `src/index.ts`:
```typescript
export { setBaseUrl, setAuthTokenGetter, getAuthToken } from "./custom-fetch";
```

**الخطوة 2:** استخدامها في `upload.ts`:

```typescript
import { getAuthToken } from "@workspace/api-client-react";

export async function uploadFile(file: File): Promise<string> {
  const token = await getAuthToken();
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const res = await fetch("/api/storage/uploads", {
    method: "POST",
    headers: { "Content-Type": file.type, ...authHeaders },
    body: file,
    credentials: "include",
  });
  // ...
}
```

`getAuthToken()` تستدعي الـ getter الذي سجّله `App.tsx` عبر `setAuthTokenGetter(() => getToken())`
حيث `getToken` مأخوذة من `useAuth()` الخاص بـ Clerk.

---

## سبب عمل dev وفشل production

| | بيئة التطوير (Replit) | Cloudflare Pages |
|---|---|---|
| Backend | Express + `@clerk/express` | Hono Worker |
| Auth | يقرأ session cookie تلقائياً | يحتاج `Authorization: Bearer` |
| Storage API | GCS / Object Storage | FORGE via Worker |
| Routing | Express middleware | `_worker.js` → Service Binding |

---

## سكريبت النشر الصحيح

```bash
# 1. بناء الـ frontend (PORT مطلوب لـ vite.config.ts)
PORT=3000 BASE_PATH="/" pnpm --filter @workspace/silver-stream run build

# 2. نشر على Cloudflare Pages
npx wrangler pages deploy artifacts/silver-stream/dist/public \
  --project-name silver-stream \
  --branch=main \
  --commit-dirty=true
```

> ملاحظة: `_worker.js` موجود في `public/` لذا Vite ينسخه تلقائياً إلى `dist/public/`
> ولا حاجة لنسخ يدوي.

---

## الملفات المعدّلة

| الملف | التغيير |
|---|---|
| `artifacts/silver-stream/public/_worker.js` | **جديد** — يوجّه `/api/*` للـ Worker ويخدم SPA |
| `lib/api-client-react/src/custom-fetch.ts` | إضافة `getAuthToken()` |
| `lib/api-client-react/src/index.ts` | تصدير `getAuthToken` |
| `artifacts/silver-stream/src/lib/upload.ts` | إرفاق `Authorization: Bearer` في طلب الرفع |
