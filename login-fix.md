# مشكلة تسجيل Clerk على Cloudflare Pages — التشخيص والحل

## ملخص المشكلة

التطبيق يعمل على Replit dev بشكل طبيعي، لكن على Cloudflare Pages تظهر أحد هذين الخطأين عند التسجيل:
- شاشة بيضاء/مجمّدة بعد إدخال الإيميل
- `authorization_invalid` — "You are not authorized to perform this request"

---

## السبب الجذري — ثلاث طبقات من المشاكل

### الطبقة الأولى: خطأ `routerPush` مع service worker

**ما حدث:**
Clerk عند الانتقال بين خطوات التسجيل (مثلاً من إدخال الإيميل إلى التحقق) يستدعي دالة `routerPush` لتغيير الصفحة. الكود القديم كان يتعامل مع أي رابط يبدأ بـ `https://` كرابط خارجي ويستخدم `window.location.href = url` (إعادة تحميل كاملة للصفحة).

على Replit dev: لا يوجد service worker → إعادة التحميل تنجح.

على Cloudflare Pages: يوجد service worker (PWA/Workbox) يعترض إعادة التحميل ويُعيد الـ cached app shell بدون إتمام عملية Clerk → **شاشة مجمّدة**.

**الحل:**
```typescript
// في App.tsx — دالة routerPush وrouterReplace
const routerPush = useCallback((to: string) => {
  // إذا كان الرابط على نفس الـ origin → استخدم wouter (SPA navigation)
  if (to.startsWith("http") && new URL(to).origin === window.location.origin) {
    setLocation(stripBase(new URL(to).pathname));
  } else if (to.startsWith("http")) {
    // رابط خارجي حقيقي (مثل Clerk's dev-browser domain)
    window.location.href = to;
  } else {
    setLocation(stripBase(to));
  }
}, [setLocation]);
```

---

### الطبقة الثانية: مفاتيح Clerk في Cloudflare Pages قديمة

**ما حدث:**
`CLERK_SECRET_KEY` و`VITE_CLERK_PUBLISHABLE_KEY` في بيئة Cloudflare Pages كانت تشير إلى Clerk instance قديم (`boss-chipmunk-19`) بينما مفاتيح Replit تشير إلى instance جديد (`deep-goblin-56`). النتيجة: كل طلب من الـ proxy يُرفض بـ `authorization_invalid`.

**الحل:**
تحديث مفاتيح Cloudflare Pages عبر الـ API لتطابق مفاتيح Replit:
```bash
# تحديث env vars في Cloudflare Pages
curl -X PATCH \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/silver-stream" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deployment_configs": {
      "production": {
        "env_vars": {
          "VITE_CLERK_PUBLISHABLE_KEY": {"value": "pk_test_..."},
          "CLERK_SECRET_KEY": {"value": "sk_test_...", "type": "secret_text"},
          "CLERK_FAPI": {"value": "https://deep-goblin-56.clerk.accounts.dev"}
        }
      }
    }
  }'

# تحديث سر Worker أيضاً
echo "$CLERK_SECRET_KEY" | wrangler secret put CLERK_SECRET_KEY --name silver-stream-api
```

> **تنبيه:** `VITE_*` env vars في Cloudflare Pages **لا تُضمَّن** في الـ JS تلقائياً إذا البناء يتم على Replit. يجب أن تكون القيمة موجودة في بيئة Replit وقت البناء (أي في Replit Secrets)، وليس فقط في Cloudflare Pages.

---

### الطبقة الثالثة: الـ Proxy يكسر Clerk v6

**ما حدث:**
محاولة تفعيل الـ Clerk FAPI proxy (Pages Function على `/api/__clerk/`) لحل مشكلة `dev_browser_unauthenticated`. لكن **Clerk v6 غيّر آلية تهيئة الـ dev browser** — الإصدار الجديد لا يستخدم `GET /v1/dev_browser` بعد الآن (يرجع 405). بدلاً من ذلك يستخدم "handshake" mechanism مختلف يعمل عبر redirect مباشر للـ FAPI بدون proxy.

**محاولات فاشلة:**
1. `clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL` ← القيمة لا تُضمَّن في البناء
2. `clerkProxyUrl = window.location.origin + '/api/__clerk'` ← الـ FAPI يرفض `GET /v1/dev_browser` بـ 405
3. `redirect: "manual"` في الـ Pages Function ← لا يحل المشكلة لأن Clerk v6 لا يمر بهذا المسار

**الحل الصحيح:**
```typescript
// App.tsx
// لا تستخدم proxy مع dev instances (pk_test_*)
// Clerk v6 يُهيّئ dev browser عبر redirect مباشر
const clerkProxyUrl = undefined;
```

إضافةً لذلك، يجب تعديل Workbox لاستثناء Clerk handshake URLs من الـ cache:
```typescript
// vite.config.ts
workbox: {
  navigateFallbackDenylist: [/\/__clerk/, /\/api\/__clerk/],
  // ...
}
```

---

## قائمة التحقق عند تكرار المشكلة

| السيناريو | التحقق |
|---|---|
| شاشة بيضاء بعد إدخال الإيميل | تحقق من `routerPush` في App.tsx — هل يُميّز بين same-origin وcross-origin؟ |
| `authorization_invalid` عند التسجيل | تحقق من تطابق `VITE_CLERK_PUBLISHABLE_KEY` في Replit مع `CLERK_SECRET_KEY` في Worker و Pages |
| `dev_browser_unauthenticated` مستمر | تحقق من عدم وجود `clerkProxyUrl` مع dev instances (pk_test_*) في Clerk v6+ |
| المشكلة فقط على Cloudflare وليس Replit | تحقق من service worker — هل يعترض Clerk redirects؟ أضف `navigateFallbackDenylist` |

---

## التشخيص السريع

```bash
# 1. هل الـ Pages Function تعمل؟
curl -s "https://silver-stream.pages.dev/api/__clerk/v1/environment"
# يجب أن يُرجع JSON فيه auth_config

# 2. هل المفاتيح متطابقة؟
curl -s "https://api.clerk.com/v1/users?limit=1" \
  -H "Authorization: Bearer $CLERK_SECRET_KEY"
# يجب أن يُرجع بيانات بدون errors

# 3. من أي instance هو الـ publishable key؟
node -e "
  const key = process.env.VITE_CLERK_PUBLISHABLE_KEY;
  const enc = key.replace(/^pk_(test|live)_/, '');
  const pad = enc + '='.repeat((4 - enc.length % 4) % 4);
  console.log(Buffer.from(pad, 'base64').toString().replace(/\$+$/, ''));
"

# 4. تحقق من env vars في Cloudflare Pages
curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/silver-stream" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | \
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const e=JSON.parse(d).result.deployment_configs?.production?.env_vars||{};
    Object.entries(e).forEach(([k,v])=>console.log(k,'=',v?.value||'[secret]'));
  })"
```

---

## لماذا تتكرر المشكلة (جذر التكرار)

مفاتيح Clerk في Replit **تُضمَّن في الـ JS bundle وقت البناء** (VITE_* vars مخبوزة داخل الكود).
لكن مفاتيح Cloudflare Pages والWorker تُحدَّث **يدوياً** ولا تتزامن تلقائياً مع Replit.

كلما تغيّر Clerk instance في Replit (أو جُدِّدت المفاتيح)، يصبح الـ bundle يستخدم instance مختلف عمّا تتوقعه الـ Pages Function والWorker → شاشة بيضاء عند تسجيل الدخول.

**الحل الدائم — عند أي تغيير في مفاتيح Clerk على Replit، شغّل هذا الأمر فوراً:**

```bash
# مزامنة كاملة: Pages + Worker
CLERK_FAPI=$(node -e "
  const key = process.env.VITE_CLERK_PUBLISHABLE_KEY || '';
  const enc = key.replace(/^pk_(test|live)_/, '');
  const pad = enc + '='.repeat((4 - enc.length % 4) % 4);
  console.log('https://' + Buffer.from(pad,'base64').toString().replace(/\$+$/,''));
")

# 1. Cloudflare Pages
curl -s -X PATCH \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/silver-stream" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"deployment_configs\":{\"production\":{\"env_vars\":{\"VITE_CLERK_PUBLISHABLE_KEY\":{\"value\":\"$VITE_CLERK_PUBLISHABLE_KEY\"},\"CLERK_PUBLISHABLE_KEY\":{\"value\":\"$VITE_CLERK_PUBLISHABLE_KEY\"},\"CLERK_FAPI\":{\"value\":\"$CLERK_FAPI\"},\"CLERK_SECRET_KEY\":{\"value\":\"$CLERK_SECRET_KEY\",\"type\":\"secret_text\"}}},\"preview\":{\"env_vars\":{\"VITE_CLERK_PUBLISHABLE_KEY\":{\"value\":\"$VITE_CLERK_PUBLISHABLE_KEY\"},\"CLERK_PUBLISHABLE_KEY\":{\"value\":\"$VITE_CLERK_PUBLISHABLE_KEY\"},\"CLERK_FAPI\":{\"value\":\"$CLERK_FAPI\"},\"CLERK_SECRET_KEY\":{\"value\":\"$CLERK_SECRET_KEY\",\"type\":\"secret_text\"}}}}}" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).success?'✓ Pages updated':'✗',JSON.parse(d).errors||''))"

# 2. Worker
echo "$CLERK_SECRET_KEY" | npx wrangler secret put CLERK_SECRET_KEY --name silver-stream-api
# ثم عدّل cloudflare/worker/wrangler.toml: CLERK_FAPI = "$CLERK_FAPI" ونشر: cd cloudflare/worker && npx wrangler deploy

# 3. أعد البناء والنشر
PORT=3000 BASE_PATH="/" pnpm --filter @workspace/silver-stream run build
cp -r artifacts/silver-stream/functions artifacts/silver-stream/dist/public/functions
npx wrangler pages deploy artifacts/silver-stream/dist/public --project-name silver-stream --branch=main --commit-dirty=true
```

---

## الدرس المستفاد

- **Clerk proxy** مناسب فقط لـ **production instances** (`pk_live_*`) مع domain مُتحقَّق
- **Dev instances** (`pk_test_*`) على Cloudflare Pages تعمل **بدون proxy** تماماً — Clerk يُهيّئ الـ dev browser عبر redirect مباشر
- **Service worker** (Workbox) يجب أن يستثني `/__clerk*` من الـ navigation cache دائماً
- **`VITE_*` env vars** يجب أن تكون في بيئة Replit Secrets (وقت البناء)، لا فقط في Cloudflare Pages env
- **Clerk v6** غيّر آلية تهيئة الـ dev browser — لا تفترض سلوك الإصدارات القديمة
