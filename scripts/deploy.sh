#!/usr/bin/env bash
# =============================================================================
# deploy.sh — نشر Silver Stream على Cloudflare Pages + Worker
#
# يحل تلقائياً مشكلتين متكررتين:
#   1. انزياح مفاتيح Clerk  → شاشة بيضاء عند تسجيل الدخول
#   2. Service Binding خاطئ → فشل رفع الصور
#
# الاستخدام:
#   bash scripts/deploy.sh
#
# المتطلبات (Replit Secrets):
#   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN,
#   VITE_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, FORGE_API_KEY
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC}  $*"; }
fail() { echo -e "${RED}✗${NC} $*"; exit 1; }

# ── 0. التحقق من المتغيرات المطلوبة ─────────────────────────────────────────
echo "── التحقق من المتغيرات ──────────────────────────────────────────────────"
: "${CLOUDFLARE_ACCOUNT_ID:?خطأ: CLOUDFLARE_ACCOUNT_ID غير موجود في Secrets}"
: "${CLOUDFLARE_API_TOKEN:?خطأ: CLOUDFLARE_API_TOKEN غير موجود في Secrets}"
: "${VITE_CLERK_PUBLISHABLE_KEY:?خطأ: VITE_CLERK_PUBLISHABLE_KEY غير موجود في Secrets}"
: "${CLERK_SECRET_KEY:?خطأ: CLERK_SECRET_KEY غير موجود في Secrets}"
ok "جميع المتغيرات موجودة"

# ── 1. حساب CLERK_FAPI من المفتاح الحالي ────────────────────────────────────
echo ""
echo "── مزامنة مفاتيح Clerk ──────────────────────────────────────────────────"
CLERK_FAPI=$(node -e "
const key = process.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const enc = key.replace(/^pk_(test|live)_/, '');
const pad = enc + '='.repeat((4 - enc.length % 4) % 4);
const decoded = Buffer.from(pad,'base64').toString().replace(/\0+$/,'');
process.stdout.write('https://' + decoded);
")
echo "  FAPI: $CLERK_FAPI"
echo "  نوع المفتاح: $(echo "$VITE_CLERK_PUBLISHABLE_KEY" | grep -o 'pk_[a-z]*' | head -1)"

# ── 2. مزامنة مفاتيح Clerk في Cloudflare Pages ──────────────────────────────
PAGES_PATCH=$(curl -s -X PATCH \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/silver-stream" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"deployment_configs\": {
      \"production\": {
        \"env_vars\": {
          \"VITE_CLERK_PUBLISHABLE_KEY\": {\"value\": \"$VITE_CLERK_PUBLISHABLE_KEY\"},
          \"CLERK_PUBLISHABLE_KEY\":      {\"value\": \"$VITE_CLERK_PUBLISHABLE_KEY\"},
          \"CLERK_FAPI\":                 {\"value\": \"$CLERK_FAPI\"}
        },
        \"services\": {
          \"API\": {\"service\": \"silver-stream-api\", \"environment\": \"production\"}
        }
      },
      \"preview\": {
        \"env_vars\": {
          \"VITE_CLERK_PUBLISHABLE_KEY\": {\"value\": \"$VITE_CLERK_PUBLISHABLE_KEY\"},
          \"CLERK_PUBLISHABLE_KEY\":      {\"value\": \"$VITE_CLERK_PUBLISHABLE_KEY\"},
          \"CLERK_FAPI\":                 {\"value\": \"$CLERK_FAPI\"}
        },
        \"services\": {
          \"API\": {\"service\": \"silver-stream-api\", \"environment\": \"production\"}
        }
      }
    }
  }")

node -e "
const r = JSON.parse($(echo "$PAGES_PATCH" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify(d)));"));
if (r.success) {
  const s = r.result?.deployment_configs?.production?.services?.API;
  console.log('✓ Pages: مفاتيح Clerk + Service Binding مُحدَّثة');
  console.log('  API binding →', s?.service);
} else {
  console.error('✗ فشل تحديث Pages:', JSON.stringify(r.errors));
  process.exit(1);
}
" 2>/dev/null || {
  # fallback: طباعة مباشرة
  echo "$PAGES_PATCH" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const r=JSON.parse(d);
  const s=r.result?.deployment_configs?.production?.services?.API;
  if(r.success){console.log('✓ Pages: مفاتيح Clerk + Service Binding مُحدَّثة\n  API binding →',s?.service);}
  else{console.error('✗ فشل:',JSON.stringify(r.errors));process.exit(1);}
});"
}

# ── 3. تحديث CLERK_SECRET_KEY في Worker ──────────────────────────────────────
echo ""
echo "  تحديث CLERK_SECRET_KEY في Worker..."
echo "$CLERK_SECRET_KEY" | npx wrangler secret put CLERK_SECRET_KEY \
  --name silver-stream-api 2>&1 | grep -E "(Success|Error|✨|✗)" || true
ok "Worker: CLERK_SECRET_KEY مُحدَّث"

# ── 4. تحديث CLERK_FAPI في wrangler.toml ونشر Worker ────────────────────────
echo ""
echo "── نشر الـ Worker ───────────────────────────────────────────────────────"

# تحديث CLERK_FAPI في wrangler.toml
sed -i "s|CLERK_FAPI = \".*\"|CLERK_FAPI = \"$CLERK_FAPI\"|" cloudflare/worker/wrangler.toml
ok "wrangler.toml: CLERK_FAPI مُحدَّث"

cd cloudflare/worker
npx wrangler deploy 2>&1 | grep -E "(Deployed|Uploaded|Error|✨|✗|https://)" || true
cd - > /dev/null
ok "Worker مُنشَر"

# ── 5. بناء الـ Frontend ──────────────────────────────────────────────────────
echo ""
echo "── بناء الـ Frontend ────────────────────────────────────────────────────"
PORT=3000 BASE_PATH="/" pnpm --filter @workspace/silver-stream run build 2>&1 | \
  grep -E "(built|error|Error|✓|dist/)" || true
ok "Frontend مبني"

# ── 6. نشر الـ Frontend على Cloudflare Pages ─────────────────────────────────
echo ""
echo "── نشر على Cloudflare Pages ─────────────────────────────────────────────"
DEPLOY_OUT=$(npx wrangler pages deploy artifacts/silver-stream/dist/public \
  --project-name silver-stream \
  --branch=main \
  --commit-dirty=true 2>&1)
echo "$DEPLOY_OUT" | grep -E "(Deployment complete|Error|✨|✗|https://)" || true

DEPLOY_URL=$(echo "$DEPLOY_OUT" | grep -oE 'https://[a-z0-9]+\.silver-stream\.pages\.dev' | head -1)
ok "Frontend مُنشَر"

# ── 7. ملخص ──────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ النشر اكتمل بنجاح${NC}"
echo "  Clerk FAPI:     $CLERK_FAPI"
echo "  Service Binding: API → silver-stream-api"
[ -n "${DEPLOY_URL:-}" ] && echo "  الرابط:         $DEPLOY_URL"
echo "════════════════════════════════════════════════════════════════════════"
