# 天外来客 Cloudflare Pages 部署脚本分析

> 文件位置: `tianwailaike-site-public/deploy-cloudflare.sh`  
> 最后修改: 2026-06-21  
> 大小: 1,685 字节 / 44 行

---

## 一、脚本定位

这是《天外来客》小说网站的 **一键部署脚本**，负责将本地构建好的静态站点发布到 Cloudflare Pages 线上环境。

```
┌─────────────────────────────────────────────────┐
│           天外来客 部署架构总览                    │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────┐                                │
│  │  本地开发机    │                                │
│  │              │                                │
│  │  tianwailaike │                                │
│  │  -site-public│                                │
│  │  (静态站点)   │                                │
│  └──────┬───────┘                                │
│         │                                       │
│    git push                               wrangler│
│         │                                  pages  │
│         ▼                                       ▼   │
│  ┌──────────────┐                         ┌──────────┐│
│  │ GitHub Pages  │                         │Cloudflare││
│  │  (备份镜像)    │                         │ Pages    ││
│  │              │                         │(主站)     ││
│  │ 原始仓库       │                         │          ││
│  └──────────────┘                         └────┬─────┘│
│                                                │      │
│                                         CDN +  │      │
│                                         HTTPS  │      │
│                                                ▼      │
│                                          ┌──────────┐│
│                                          │  全球用户  ││
│                                          └──────────┘│
│                                                   │
└─────────────────────────────────────────────────┘
```

---

## 二、站点文件结构

```
tianwailaike-site-public/
├── index.html          ← 主页面（424行，24KB）
├── assets/
│   └── style.css       ← 样式表（47KB）
├── data/               ← 站点数据源
│   ├── novel_texts.json   ← 小说正文（346KB，最大文件）
│   ├── chapters.json      ← 章节元数据
│   ├── audio.json         ← 音频/TTS 信息
│   ├── logs.json          ← 监督日志
│   ├── tasks.json         ← 任务状态
│   ├── supervision.json   ← 监督配置
│   ├── assets.json        ← 资产索引
│   ├── highlights.json    ← 高光片段
│   ├── output_files.json  ← 产出文件列表
│   ├── site_manifest.json ← 站点清单
│   └── logs.json          ← 运行日志
├── media/              ← 媒体资源
├── assets/             ← 静态资源
├── .git/               ← Git 仓库
├── .wrangler/          ← Wrangler 本地缓存
├── wrangler.toml       ← Cloudflare Pages 配置
├── deploy-cloudflare.sh← 部署脚本（本文件）
├── sw.js               ← Service Worker（离线缓存）
├── manifest.json       ← PWA 清单
├── .nojekyll           ← 禁用 Jekyll 处理
└── .gitignore
```

### 站点功能模块

```
┌──────────────────────────────────────────────────────────────┐
│                    天外来客 · 项目生产中枢                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 总览    │ │ 小说    │ │ 短剧    │ │ 听书    │           │
│  │ Dashboard│ │ 正文阅读│ │ AI生成  │ │ TTS播放 │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 多语言  │ │ 进度    │ │ 资料    │ │ 写作系统 │           │
│  │ 翻译    │ │ 追踪    │ │ 下载    │ │ 管理    │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                              │
│  ┌─────────┐                                                │
│  │ 日志    │ ← 监督巡检记录                                  │
│  └─────────┘                                                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 三、部署脚本逐行解析

### 第 1-2 行：安全模式

```bash
#!/bin/bash
set -e
```

- `set -e`：任何命令返回非零退出码立即终止脚本，防止错误累积

### 第 4 行：获取脚本所在目录

```bash
cd "$(dirname "$0")"
```

确保后续所有路径都基于脚本自身所在位置，不受执行目录影响

### 第 6-8 行：生成时间戳

```bash
BUILD_TIME=$(TZ='Asia/Shanghai' date '+%Y-%m-%dT%H:%M:%S+08:00')
BUILD_READABLE=$(TZ='Asia/Shanghai' date '+%Y-%m-%d %H:%M')
HASH=$(date +%s | md5sum | head -c 8)
```

| 变量 | 示例值 | 用途 |
|------|--------|------|
| `BUILD_TIME` | `2026-06-22T20:45:00+08:00` | 页脚精确时间 |
| `BUILD_READABLE` | `2026-06-22 20:45` | 页脚可读时间 |
| `HASH` | `5a985b6d` | 缓存破坏版本号 |

### 第 13-14 行：更新页脚时间戳

```bash
sed -i "s/datetime=\"[0-9T:-]*+08:00\"/datetime=\"$BUILD_TIME\"/" index.html
sed -i "s/>20[0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9][0-9]:[0-9][0-9]<\/time>/>$BUILD_READABLE<\/time>/" index.html
```

**替换目标**：
1. `datetime` 属性中的 ISO 时间戳
2. `<time>` 标签中的可读日期

### 第 17-18 行：缓存破坏

```bash
sed -i "s/app\.js?v=[^\"&]*/app.js?v=$HASH/" index.html
sed -i "s/style\.css?v=[^\"&]*/style.css?v=$HASH/" index.html
```

**为什么需要缓存破坏？**
```
浏览器行为：
┌─────────────┐    缓存命中     ┌─────────────┐
│  style.css?v=abc  │ ────────→ │  使用本地缓存  │  ← 旧版本！
└─────────────┘               └─────────────┘

┌─────────────┐    缓存失效     ┌─────────────┐
│  style.css?v=xyz  │ ────────→ │  重新下载文件  │  ← 新版本 ✓
└─────────────┘               └─────────────┘
```

### 第 22-27 行：推送到 GitHub（备份镜像）

```bash
git add -A
git commit -m "deploy: $BUILD_READABLE" --allow-empty
git push origin main
```

- `--allow-empty`：允许没有文件变更的空提交（保证每次部署都有记录）
- 推送到 `https://github.com/marinerfan123/tianwailaike-site-public.git`
- 作用：GitHub Pages 可作为 Cloudflare 故障时的备用访问

### 第 30-32 行：尝试进入备份仓库（当前未启用）

```bash
cd "$(dirname "$0")/../tianwailaike-project-backup-clean" 2>/dev/null || {
    echo "备份仓库目录不存在，跳过"
    cd "$(dirname "$0")"
}
```

这段代码意图进入项目备份仓库做操作，但被注释掉了（缺少 `echo` 等实际命令），目前只是一个空壳。

### 第 35-40 行：部署到 Cloudflare Pages

```bash
export CLOUDFLARE_API_TOKEN="$(grep oauth_token ~/.config/.wrangler/config/default.toml 2>/dev/null | head -1 | cut -d'"' -f2)"
npx wrangler pages deploy . --project-name=tianwailaike --branch main
```

**关键细节**：
- 从 wrangler 配置文件自动提取 OAuth Token
- 部署当前目录 `.`（即 `tianwailaike-site-public/`）
- 目标项目：`tianwailaike`
- 目标分支：`main`
- `wrangler.toml` 配置：
  ```toml
  name = "tianwailaike"
  compatibility_date = "2026-06-17"
  pages_build_output_dir = "."
  ```

---

## 四、完整部署流程图

```
┌──────────────────────────────────────────────────────────────────┐
│                     部署脚本执行流程                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  用户执行: bash deploy-cloudflare.sh                             │
│                      │                                           │
│                      ▼                                           │
│  ┌─────────────────────────────┐                                 │
│  │ ① 生成时间戳 + 缓存哈希       │                                 │
│  │    BUILD_TIME / HASH         │                                 │
│  └─────────────┬───────────────┘                                 │
│                │                                                 │
│                ▼                                                 │
│  ┌─────────────────────────────┐                                 │
│  │ ② sed 替换 index.html       │                                 │
│  │    • 页脚时间戳              │                                 │
│  │    • CSS/JS 缓存版本         │                                 │
│  └─────────────┬───────────────┘                                 │
│                │                                                 │
│                ▼                                                 │
│  ┌─────────────────────────────┐                                 │
│  │ ③ git add + commit + push   │                                 │
│  │    → GitHub (备份)           │                                 │
│  └─────────────┬───────────────┘                                 │
│                │                                                 │
│                ▼                                                 │
│  ┌─────────────────────────────┐                                 │
│  │ ④ wrangler pages deploy     │                                 │
│  │    → Cloudflare Pages       │                                 │
│  │      项目: tianwailaike       │                                 │
│  │      分支: main              │                                 │
│  └─────────────┬───────────────┘                                 │
│                │                                                 │
│                ▼                                                 │
│  ┌─────────────────────────────┐                                 │
│  │ ⑤ Cloudflare 自动构建       │                                 │
│  │    读取 wrangler.toml       │                                 │
│  │    静态文件 → CDN 分发       │                                 │
│  └─────────────┬───────────────┘                                 │
│                │                                                 │
│                ▼                                                 │
│  ┌─────────────────────────────┐                                 │
│  │ ✅ https://tianwailaike.    │                                 │
│  │    pages.dev 上线           │                                 │
│  └─────────────────────────────┘                                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 五、数据流向

```
┌────────────────────────────────────────────────────────────┐
│                    数据流全景图                              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  小说正文 (novel_texts.json 346KB)                          │
│  ┌─────────────┐                                           │
│  │ 天外来客小说  │ ── 嵌入 ──→  index.html                   │
│  │ 章节数据     │              ↓                           │
│  │ TTS 信息     │         浏览器渲染                        │
│  │ 监督日志     │              ↓                           │
│  │ 任务状态     │         用户访问                           │
│  └─────────────┘              ↓                           │
│                               Cloudflare CDN                │
│                               (全球边缘节点)                 │
│                                                            │
│  每次部署的数据变化:                                         │
│  • index.html 页脚时间戳更新                                │
│  • index.html CSS/JS 版本号更新                            │
│  • 其余文件不变（除非手动编辑 data/ 下文件后再部署）          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 六、依赖环境

| 依赖 | 版本/要求 | 说明 |
|------|----------|------|
| Bash | 4.0+ | 脚本解释器 |
| Git | 2.0+ | 版本控制 + GitHub 推送 |
| Wrangler CLI | 最新版 | Cloudflare Pages 部署工具 |
| md5sum | 预装 | 生成缓存哈希 |
| sed | GNU/BSD | 文本替换 |
| Cloudflare 账号 | 已登录 | `wrangler login` OAuth 认证 |
| wrangler.toml | 存在 | 站点配置 |

---

## 七、已知问题与建议

### 🔴 问题 1：Git 推送可能冲突

```bash
git add -A
git commit -m "deploy: $BUILD_READABLE" --allow-empty
git push origin main
```

如果在部署期间有人直接修改了远程仓库，`git push` 会失败。

**建议**：添加 `--force-with-lease` 或先 `git pull --rebase`

### 🔴 问题 2：wrangler.toml 中 name 字段冗余

```toml
name = "tianwailaike"
```

但部署命令已经指定了 `--project-name=tianwailaike`，`name` 字段实际上被忽略（Pages 部署以命令行参数为准）。

### 🟡 问题 3：备份仓库步骤是空壳

第 30-32 行的代码块没有实际命令，只是一个 `cd` 跳转。如果要利用 `tianwailaike-project-backup-clean` 做二次备份，需要补充完整。

### 🟡 问题 4：缺少错误处理

- 没有检查 `wrangler` 是否已登录
- 没有检查网络连通性
- 没有部署成功后的验证步骤

### ✅ 做得好的地方

1. **缓存破坏机制** — 用时间戳哈希替换 CSS/JS 版本号，确保用户拿到最新文件
2. **双保险部署** — GitHub 备份 + Cloudflare 主站
3. **自动时间戳** — 页脚显示每次部署的精确时间
4. **set -e 安全模式** — 出错即停，不会静默失败
5. **相对路径设计** — `$(dirname "$0")` 确保在任何位置执行都能正确定位

---

## 八、快速参考

| 操作 | 命令 |
|------|------|
| 部署站点 | `cd tianwailaike-site-public && bash deploy-cloudflare.sh` |
| 查看站点 | `https://tianwailaike.pages.dev` |
| 查看 GitHub 备份 | `https://github.com/marinerfan123/tianwailaike-site-public` |
| 手动更新数据后部署 | 编辑 `data/*.json` → 运行脚本 |
| 回滚到上次部署 | `git revert HEAD && bash deploy-cloudflare.sh` |

---

*生成时间: 2026-06-22 21:05 CST*  
*分析对象: tianwailaike-site-public/deploy-cloudflare.sh*
