# Silver Stream — Cloudflare Deployment Guide

## نظرة عامة على البنية

```
Cloudflare Pages  ──→  Cloudflare Worker (Hono API)
                              │
                    ┌─────────┴──────────┐
                    │                    │
              Cloudflare D1        Cloudflare R2
            (قاعدة البيانات)    (تخزين الملفات)
```

- **Frontend:** Vite + React → Cloudflare Pages
- **API:** Hono Worker → `cloudflare/worker/`
- **Database:** Cloudflare D1 (SQLite مدمج — مجاني)
- **Storage:** Cloudflare R2 (تخزين ملفات — 10 GB مجاناً)
- **Auth:** Clerk (JWT verification داخل الـ Worker)

---

## الإعداد الأولي (مرة واحدة)

### 1. تثبيت wrangler
```bash
npm install -g wrangler
wrangler login
```

### 2. إنشاء قاعدة البيانات D1
```bash
cd cloudflare/worker
wrangler d1 create silver-stream-db
```
انسخ الـ `database_id` الظاهر وضعه في `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "silver-stream-db"
database_id = "xxxx-xxxx-xxxx-xxxx"   # ← ضع هنا
```

### 3. إنشاء bucket التخزين R2
```bash
wrangler r2 bucket create silver-stream-storage
```
ثم فعّل **Public Access** على الـ bucket من لوحة Cloudflare:
- Dashboard → R2 → silver-stream-storage → Settings → Public Access → Enable
- انسخ الـ Public URL وضعه في `wrangler.toml` تحت `STORAGE_PUBLIC_URL`

### 4. إضافة الأسرار
```bash
wrangler secret put CLERK_SECRET_KEY
wrangler secret put CLERK_PUBLISHABLE_KEY
```

### 5. إنشاء جداول قاعدة البيانات
```bash
# أنشئ ملف migration أولاً
wrangler d1 execute silver-stream-db --file=./schema.sql
```

> **ملاحظة:** استخدم `wrangler d1 export` لإنشاء schema.sql من قاعدة بيانات موجودة، أو اكتب الجداول يدوياً. Schema موجودة في `src/schema/`.

---

## نشر الـ Worker

```bash
cd cloudflare/worker
npm install
wrangler deploy
```

سيظهر رابط الـ Worker مثل:
```
https://silver-stream-api.YOUR_SUBDOMAIN.workers.dev
```

---

## نشر الـ Frontend (Cloudflare Pages)

في لوحة Cloudflare Pages، أنشئ مشروع جديد:

| الإعداد | القيمة |
|---|---|
| Build command | `pnpm --filter @workspace/silver-stream run build` |
| Build output directory | `artifacts/silver-stream/dist` |
| Root directory | `/` (جذر المشروع) |

### متغيرات البيئة (Environment Variables):
| الاسم | القيمة |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_...` |
| `VITE_API_URL` | رابط الـ Worker أعلاه |

---

## التطوير المحلي

### Worker
```bash
cd cloudflare/worker
cp .dev.vars.example .dev.vars   # أضف القيم
wrangler dev
```

> D1 و R2 يعملان محلياً تلقائياً عبر `wrangler dev` بدون إعداد إضافي.

### Frontend
```bash
pnpm --filter @workspace/silver-stream run dev
```
اتركه يستخدم الـ `/api/...` المحلي عبر الـ Express API server الموجود للتطوير.

---

## ملفات .dev.vars.example

```
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
STORAGE_PUBLIC_URL=http://localhost:8787  # مؤقت للتطوير المحلي
```
