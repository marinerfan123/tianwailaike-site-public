#!/bin/bash
set -e

cd "$(dirname "$0")"

# ---- 时间戳 ----
BUILD_TIME=$(TZ='Asia/Shanghai' date '+%Y-%m-%dT%H:%M:%S+08:00')
BUILD_READABLE=$(TZ='Asia/Shanghai' date '+%Y-%m-%d %H:%M')
HASH=$(date +%s | md5sum | head -c 8)

echo "== 天外来客部署脚本 =="
echo "时间: $BUILD_READABLE"

# ---- 更新页脚时间戳 ----
sed -i "s/datetime=\"[0-9T:-]*+08:00\"/datetime=\"$BUILD_TIME\"/" index.html
sed -i "s/>20[0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9][0-9]:[0-9][0-9]<\/time>/>$BUILD_READABLE<\/time>/" index.html

# ---- 更新缓存破坏版本号 ----
sed -i "s/app\.js?v=[^\"&]*/app.js?v=$HASH/" index.html
sed -i "s/style\.css?v=[^\"&]*/style.css?v=$HASH/" index.html

echo "hash: $HASH"

# ---- 1. 推送到 GitHub 站点仓库 ----
echo ""
echo "== 推送到 GitHub (站点仓库) =="
git add -A
git commit -m "deploy: $BUILD_READABLE" --allow-empty
git push origin main
echo "GitHub 推送完成"

# ---- 2. 推送到项目备份仓库 ----
echo ""
echo "== 推送到 GitHub (备份仓库) =="
cd "$(dirname "$0")/../tianwailaike-project-backup-clean" 2>/dev/null || {
  echo "备份仓库目录不存在，跳过"
  cd "$(dirname "$0")"
}

# ---- 3. 部署到 Cloudflare Pages ----
echo ""
echo "== 部署到 Cloudflare Pages =="
cd "$(dirname "$0")"
npx wrangler pages deploy . --project-name=tianwailaike --branch main

echo ""
echo "== 全部完成 =="
echo "站点: https://tianwailaike.pages.dev"
echo "GitHub: https://github.com/marinerfan123/tianwailaike-site-public"
