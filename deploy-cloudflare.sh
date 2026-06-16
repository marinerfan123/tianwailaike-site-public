#!/bin/bash
# Cloudflare Pages 部署脚本
# 使用方法: bash deploy-cloudflare.sh
# 前置条件: 已安装 wrangler (`npm install -g wrangler`)
#           已登录 Cloudflare (`wrangler login`)

set -e

echo "🚀 部署天外来客站点到 Cloudflare Pages..."
cd "$(dirname "$0")"

# 构建
echo "📦 准备站点文件..."

# 部署
echo "☁️ 部署中..."
npx wrangler pages deploy . --project-name=tianwailaike

echo "✅ 部署完成"
echo "🌐 https://tianwailaike.pages.dev"
