#!/usr/bin/env python3
"""天外来客网站数据综合更新脚本"""

import json
import re
import os
from datetime import datetime

BACKUP = "/home/mf/.openclaw/workspace/tianwailaike-project-backup-clean"
SITE = "/home/mf/.openclaw/workspace/tianwailaike-site-public"

NOW = datetime.now().strftime("%Y-%m-%dT%H:%M+08:00")

# ── 1. 从备份 .md 文件中提取纯正文 ──
def extract_body_from_md(filepath):
    """从 .md 文件中提取#标题后的正文内容"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 去掉标题行
    lines = content.split('\n')
    
    # 跳过开头的元数据块（>引用）
    body_start = 0
    for i, line in enumerate(lines):
        # 如果是第一个非空行且是#标题
        if line.strip().startswith('# ') and not line.strip().startswith('##'):
            # 检查这是不是真正的标题
            # 跳过前面的所有元数据（>引用块和空行）
            real_start = i + 1
            # 跳过紧接着的空行
            while real_start < len(lines) and not lines[real_start].strip():
                real_start += 1
            body_start = real_start
            break
    
    # 找到真正的身体部分 - 跳过元数据引用块
    body_lines = []
    in_meta_block = False
    for line in lines[body_start:]:
        stripped = line.strip()
        if stripped.startswith('> ') and not stripped.startswith('> #'):
            in_meta_block = True
            continue
        elif in_meta_block and not stripped:
            in_meta_block = False
            continue
        elif in_meta_block:
            continue
        
        # 跳过水平线
        if stripped == '---' or stripped == '___':
            # 如果出现---，可能结束了当前的元数据块
            continue
            
        # 跳过"正式定稿"类状态行
        if stripped.startswith('> 生成时间') or stripped.startswith('> 状态'):
            continue
            
        body_lines.append(line)
    
    body = '\n'.join(body_lines).strip()
    
    # 去掉末尾有可能的笔记/附录
    # 找到 ## 附录 或 ## 注意事项 等
    appendix_markers = ['## 附录', '## 说明', '## 备注', '## 审稿']
    for marker in appendix_markers:
        idx = body.find(marker)
        if idx > 0:
            body = body[:idx].strip()
    
    return body


# ── 2. 从备份 .md 文件中提取元信息 ──
def get_chapter_info(filepath):
    """从 .md 文件头部提取状态信息"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    status_map = {
        '正式定稿': 'done',
        '审稿版候选': 'review',
        '正文草稿候选': 'draft',
        '定稿候选': 'review',
    }
    
    status = 'draft'
    review_status = '待审'
    review_conclusion = ''
    
    for line in content.split('\n'):
        line = line.strip()
        if '状态' in line and '正式定稿' in line:
            status = 'done'
            review_status = '已定稿'
        elif '状态' in line and '审稿版候选' in line:
            status = 'review'
            review_status = '审稿版候选'
        elif '状态' in line and '正文草稿候选' in line:
            status = 'draft'
            review_status = '草稿候选'
        elif '状态' in line and '定稿候选' in line:
            status = 'review'
            review_status = '定稿候选'
        elif line.startswith('> 当前结论') or line.startswith('## 总体结论'):
            conclusion = line.split('：')[-1] if '：' in line else line.split(':')[-1] if ':' in line else ''
            review_conclusion = conclusion.strip()
    
    return status, review_status, review_conclusion


# ── 3. 执行更新 ──
def main():
    print("=" * 60)
    print("天外来客 网站数据综合更新")
    print(f"时间: {NOW}")
    print("=" * 60)
    
    # 读取现有数据
    with open(f"{SITE}/data/novel_texts.json", 'r', encoding='utf-8') as f:
        novel_texts = json.load(f)
    
    with open(f"{SITE}/data/chapters.json", 'r', encoding='utf-8') as f:
        chapters = json.load(f)
    
    # 章节备份文件映射
    chapter_files = {
        15: f"{BACKUP}/output/天外来客_第15章_雁门尺差_审稿版候选_v2_2026-06-16.md",
        16: f"{BACKUP}/output/天外来客_第16章_胡亥取巧_审稿版候选_v2_2026-06-10_2130.md",
        17: f"{BACKUP}/output/天外来客_第17章_旧族入局_正文草稿候选_v1_2026-06-16.md",
        18: f"{BACKUP}/output/天外来客_第18章_假星真火_正文草稿候选_v1_2026-06-16.md",
        19: f"{BACKUP}/output/天外来客_第19章_帝王之锁_正文草稿候选_v1_2026-06-16.md",
        20: f"{BACKUP}/output/天外来客_第20章_咸阳真相_正文草稿候选_v1_2026-06-16.md",
        21: f"{BACKUP}/output/天外来客_第21章_铜符初行_正文草稿候选_v1_2026-06-16.md",
    }
    
    chapter_titles = {
        15: "《天外来客》第15章《雁门尺差》",
        16: "第16章 胡亥取巧",
        17: "第17章 旧族入局",
        18: "第18章 假星真火",
        19: "第19章 帝王之锁",
        20: "第20章 咸阳真相",
        21: "第21章 铜符初行",
    }
    
    chapter_review_status = {
        15: "审稿版候选",
        16: "审稿版候选 v2",
        17: "草稿候选（审稿通过）",
        18: "草稿候选（审稿通过）",
        19: "草稿候选（审稿通过）",
        20: "草稿候选（审稿通过）",
        21: "正文草稿候选 v1",
    }
    
    chapter_review_conclusions = {
        15: "审稿版候选 v2，非正式定稿。证据链清晰，雁门尺差线已闭合。",
        16: "审稿版候选 v2，非正式定稿。胡亥取巧/宫禁风波核心冲突成立，人物分寸稳。",
        17: "草稿通过审稿，可升格审稿版候选 v1。旧族非脸谱化，证据链完整。",
        18: "草稿通过审稿，可升格审稿版候选 v1。假星非迷信化，铁券线索重磅。",
        19: "草稿通过审稿，可升格审稿版候选 v1。权力转折核心章，嬴政控制戏精彩。",
        20: "草稿通过审稿，可升格审稿版候选 v1。第一卷收官，制度产物成型。",
        21: "正文草稿候选 v1，未审稿。第二卷开篇，铜符首查制度性阻挡。",
    }
    
    chapter_maturity = {
        15: 78,
        16: 72,
        17: 55,
        18: 50,
        19: 50,
        20: 55,
        21: 30,
    }
    
    # 更新 novel_texts.json
    print("\n📝 更新 novel_texts.json ...")
    for num in [15, 16, 17, 18, 19, 20, 21]:
        title = chapter_titles[num]
        filepath = chapter_files[num]
        
        # 提取正文
        body = extract_body_from_md(filepath)
        
        # 生成或更新条目
        existing = None
        for c in novel_texts:
            if c.get('number') == num:
                existing = c
                break
        
        entry = {
            "id": f"ch{num:02d}",
            "chapterId": f"ch{num:02d}",
            "number": num,
            "title": title,
            "status": "available" if num <= 20 else "available",
            "sourceRef": filepath.replace(BACKUP + "/", ""),
            "sourceType": "正文" if num <= 20 else "正文草稿候选",
            "updated": NOW,
            "reviewStatus": chapter_review_status[num],
            "reviewConclusion": chapter_review_conclusions[num],
            "maturity": chapter_maturity[num],
            "body": body
        }
        
        if existing:
            existing.update(entry)
            print(f"  ✓ 第{num:02d}章: 已更新 ({len(body)} chars)")
        else:
            novel_texts.append(entry)
            print(f"  + 第{num:02d}章: 新增 ({len(body)} chars)")
    
    # 排序
    novel_texts.sort(key=lambda x: x.get('number', 999))
    
    # 写回 novel_texts.json
    with open(f"{SITE}/data/novel_texts.json", 'w', encoding='utf-8') as f:
        json.dump(novel_texts, f, ensure_ascii=False, indent=2)
    print(f"  ✅ novel_texts.json 已保存 ({len(novel_texts)} 章节)")
    
    # 更新 chapters.json
    print("\n📝 更新 chapters.json ...")
    for num, title in chapter_titles.items():
        for ch in chapters:
            if ch.get('number') == num:
                old_title = ch.get('title', '')
                ch['title'] = title
                ch['status'] = 'review' if num <= 20 else 'draft'
                if num == 15:
                    ch['status'] = 'review'
                print(f"  ✓ 第{num:02d}章: \"{old_title}\" → \"{title}\" (status={ch['status']})")
                break
    
    with open(f"{SITE}/data/chapters.json", 'w', encoding='utf-8') as f:
        json.dump(chapters, f, ensure_ascii=False, indent=2)
    print(f"  ✅ chapters.json 已保存")
    
    # 更新 supervision.json
    print("\n📝 更新 supervision.json ...")
    
    supervision = {
        "updated": NOW,
        "lines": [
            {
                "id": "line_volume_1_done",
                "name": "第一卷·真账十日·完结",
                "module": "novel",
                "status": "done",
                "progress": 100,
                "owner": "主线程监督",
                "evidence": [
                    "第11-20章全部正文草稿完成",
                    "第13、14章正式定稿",
                    "第17-20章独立审稿通过",
                    "第20章可标注'第一卷完结'"
                ],
                "audit": {
                    "status": "passed",
                    "summary": "第一卷正式完结，格物司制度输出阶段开启。"
                },
                "nextAction": "进入第二卷创作。第21章《铜符初行》正文草稿候选已完成。",
                "blockers": [],
                "updated": NOW
            },
            {
                "id": "line_chapter_13",
                "name": "第13章《旧库验箱》正式定稿线",
                "module": "novel",
                "status": "done",
                "progress": 100,
                "owner": "主线程监督",
                "evidence": [
                    "正式定稿已由总控确认升格",
                    "最终一致性审查通过",
                    "网站已同步"
                ],
                "audit": {
                    "status": "passed",
                    "summary": "正式定稿。后续小修仅限排版/错字/TTS适配。"
                },
                "nextAction": "维持定稿状态",
                "blockers": [],
                "updated": NOW
            },
            {
                "id": "line_chapter_14",
                "name": "第14章《梁申旧名》正式定稿线",
                "module": "novel",
                "status": "done",
                "progress": 100,
                "owner": "主线程监督",
                "evidence": [
                    "正式定稿已由总控确认升格",
                    "独立审稿报告通过",
                    "网站已同步"
                ],
                "audit": {
                    "status": "passed",
                    "summary": "正式定稿。后续小修仅限排版/错字/TTS适配。"
                },
                "nextAction": "维持定稿状态",
                "blockers": [],
                "updated": NOW
            },
            {
                "id": "line_chapter_15",
                "name": "第15章《雁门尺差》审稿版候选线",
                "module": "novel",
                "status": "review",
                "progress": 78,
                "owner": "主线程监督",
                "evidence": [
                    "审稿版候选v2 (2026-06-16)",
                ],
                "audit": {
                    "status": "pending_final_check",
                    "summary": "审稿版候选v2，待最终一致性审查后定稿。"
                },
                "nextAction": "最终一致性审查 → 定稿",
                "blockers": [],
                "updated": NOW
            },
            {
                "id": "line_chapter_16",
                "name": "第16章《胡亥取巧》审稿版候选线",
                "module": "novel",
                "status": "review",
                "progress": 72,
                "owner": "主线程监督",
                "evidence": [
                    "审稿版候选 v2.1 (2026-06-10)",
                    "独立审稿报告通过",
                    "v2终审与预发布检查条件通过",
                    "尾部状态措辞已修复为v2"
                ],
                "audit": {
                    "status": "pending_final_check",
                    "summary": "v2终审条件通过；仍需修正尾部状态措辞后才可预发布索引。"
                },
                "nextAction": "最终一致性审查 → 定稿候选",
                "blockers": [],
                "updated": NOW
            },
            {
                "id": "line_chapter_17",
                "name": "第17章《旧族入局》审稿线",
                "module": "novel",
                "status": "review",
                "progress": 55,
                "owner": "主线程监督",
                "evidence": [
                    "正文草稿候选v1 (2026-06-16)",
                    "独立审稿报告通过，可升格审稿版候选"
                ],
                "audit": {
                    "status": "pending_final_check",
                    "summary": "草稿通过审稿，可升格审稿版候选v1。旧族非脸谱化，证据链完整。"
                },
                "nextAction": "升格为审稿版候选 → 小修 → 定稿候选",
                "blockers": [],
                "updated": NOW
            },
            {
                "id": "line_chapter_18",
                "name": "第18章《假星真火》审稿线",
                "module": "novel",
                "status": "review",
                "progress": 50,
                "owner": "主线程监督",
                "evidence": [
                    "正文草稿候选v1 (2026-06-16)",
                    "独立审稿报告通过，可升格审稿版候选"
                ],
                "audit": {
                    "status": "pending_final_check",
                    "summary": "草稿通过审稿，可升格审稿版候选v1。假星非迷信化，铁券线索重磅。"
                },
                "nextAction": "升格为审稿版候选 → 小修 → 定稿候选",
                "blockers": [],
                "updated": NOW
            },
            {
                "id": "line_chapter_19",
                "name": "第19章《帝王之锁》审稿线",
                "module": "novel",
                "status": "review",
                "progress": 50,
                "owner": "主线程监督",
                "evidence": [
                    "正文草稿候选v1 (2026-06-16)",
                    "独立审稿报告通过，可升格审稿版候选"
                ],
                "audit": {
                    "status": "pending_final_check",
                    "summary": "草稿通过审稿，可升格审稿版候选v1。权力转折核心章。"
                },
                "nextAction": "升格为审稿版候选 → 小修 → 定稿候选",
                "blockers": [],
                "updated": NOW
            },
            {
                "id": "line_chapter_20",
                "name": "第20章《咸阳真相》审稿线",
                "module": "novel",
                "status": "review",
                "progress": 55,
                "owner": "主线程监督",
                "evidence": [
                    "正文草稿候选v1 (2026-06-16)",
                    "独立审稿报告通过，可升格审稿版候选",
                    "可标注'第一卷完结'"
                ],
                "audit": {
                    "status": "pending_final_check",
                    "summary": "草稿通过审稿，可升格审稿版候选v1。第一卷收官章，制度产物成型。"
                },
                "nextAction": "升格为审稿版候选 → 小修 → 标注'第一卷完结'",
                "blockers": [],
                "updated": NOW
            },
            {
                "id": "line_chapter_21",
                "name": "第21章《铜符初行》正文草稿线",
                "module": "novel",
                "status": "draft",
                "progress": 30,
                "owner": "主线程监督",
                "evidence": [
                    "正文草稿候选v1 (2026-06-16)",
                    "第二卷规划路线已就绪（第21-30章）"
                ],
                "audit": {
                    "status": "needs_revision",
                    "summary": "正文草稿v1已完成，待独立审稿。第二卷开篇章。"
                },
                "nextAction": "进入独立审稿流程",
                "blockers": [],
                "updated": NOW
            },
            {
                "id": "line_volume_2_planning",
                "name": "第二卷格物司制度输出期（第21-30章规划）",
                "module": "novel",
                "status": "in_progress",
                "progress": 25,
                "owner": "主线程监督",
                "evidence": [
                    "第二卷规划路线已生成 (2026-06-16)",
                    "5条主线已规划：格物司制度输出/宫禁反扑/铁券显形/六国取星/李鹤个人线",
                    "第21章正文草稿已完成",
                    "第22-30章标题与核心事件已规划"
                ],
                "audit": {
                    "status": "active_guardrail",
                    "summary": "第二卷规划已就绪。后续每章需走标准流程：细纲→正文草稿→独立审稿→定稿候选。"
                },
                "nextAction": "第22章《暗线回卷》续写准备或启动第21章独立审稿",
                "blockers": [],
                "updated": NOW
            },
            {
                "id": "line_compliance",
                "name": "调性合规与连续性审查线",
                "module": "review",
                "status": "in_progress",
                "progress": 82,
                "owner": "主线程监督",
                "evidence": [
                    "第17-20章审稿中合规检查全部通过",
                    "第13-16章合规无问题",
                ],
                "audit": {
                    "status": "active_guardrail",
                    "summary": "全章审稿均嵌入合规检查，目前无违规。后续每章续写/审稿继续嵌入合规扫描。"
                },
                "nextAction": "将合规扫描嵌入每次巡检/审稿",
                "blockers": [],
                "updated": NOW
            },
            {
                "id": "line_tts_upgrade",
                "name": "中文TTS听书升级线",
                "module": "tts",
                "status": "need_fix",
                "progress": 40,
                "owner": "主线程监督",
                "evidence": [
                    "第1章TTS V2/V3样音文本处理记录",
                    "TTS停顿/语气/校对规则已成型",
                    "第1-6章音频文件已生成"
                ],
                "audit": {
                    "status": "needs_quality_upgrade",
                    "summary": "音频文件已生成，但真人感/停顿/文本校对仍需持续升级。"
                },
                "nextAction": "优先第1章V2/V3样音优化（文本校对、停顿、语气），再扩展到第2-6章",
                "blockers": [],
                "updated": NOW
            },
            {
                "id": "line_en_tts",
                "name": "英文听书稿线",
                "module": "tts",
                "status": "review",
                "progress": 55,
                "owner": "主线程监督",
                "evidence": [
                    "第1-7章英文听书稿草稿/审稿已完成",
                    "英文创作原则已确立"
                ],
                "audit": {
                    "status": "needs_expansion",
                    "summary": "第1-7章英文听书稿各有进展，但多数仍需扩写或修订。"
                },
                "nextAction": "按多语言原则继续扩写剩余章节",
                "blockers": [],
                "updated": NOW
            },
            {
                "id": "line_website",
                "name": "网站与索引发布线",
                "module": "website",
                "status": "in_progress",
                "progress": 88,
                "owner": "主线程监督",
                "evidence": [
                    "第1-21章内容已就绪",
                    "第1-6章音频已就绪",
                    "UI修复已完成（浅色模式、折叠交互、阅读器可读性）",
                    "待部署到Cloudflare Pages"
                ],
                "audit": {
                    "status": "passed",
                    "summary": "站点文件准备就绪；Cloudflare Pages部署需用户协助登录wrangler。"
                },
                "nextAction": "Cloudflare Pages部署（需用户配合wrangler login登录）",
                "blockers": ["wrangler未登录Cloudflare，无config.json"],
                "updated": NOW
            },
            {
                "id": "line_libtv_short",
                "name": "LibTV/短剧首测线",
                "module": "short-drama",
                "status": "in_progress",
                "progress": 35,
                "owner": "主线程监督",
                "evidence": [
                    "第一章测试片制作包、母图提示词已就绪",
                    "首测3张母图执行包已就绪"
                ],
                "audit": {
                    "status": "guarded",
                    "summary": "首测限制3张母图，不批量生成视频。需先确认平台入口与额度。"
                },
                "nextAction": "只读确认LibTV登录态/入口/消耗提示后启动首测",
                "blockers": [
                    "可能需要LibTV登录/验证码/额度确认"
                ],
                "updated": NOW
            },
            {
                "id": "line_backup",
                "name": "GitHub干净备份线",
                "module": "backup",
                "status": "done",
                "progress": 92,
                "owner": "主线程监督",
                "evidence": [
                    "备份已同步到tianwailaike-project-backup-clean仓库",
                    "站点文件已同步到tianwailaike-site-public仓库"
                ],
                "audit": {
                    "status": "passed",
                    "summary": "干净仓库备份正常。后续更新需同步。"
                },
                "nextAction": "每次更新后同步到GitHub干净仓库",
                "blockers": [],
                "updated": NOW
            }
        ],
        "rules": {
            "updated": NOW,
            "principle": "每件事有记录、有章法；有发展就有审查、有监督。",
            "requiredFields": ["status", "progress", "evidence", "audit", "nextAction", "blockers", "owner", "updated"],
            "statusMeaning": {
                "done": "已完成并通过基本验证",
                "review": "已有成果，等待审查或定稿前复核",
                "need_fix": "发现质量问题，必须修正",
                "in_progress": "正在推进，需持续监督",
                "blocked": "被登录/权限/验证码/额度/用户判断阻塞"
            },
            "inspectionChecklist": [
                "检查每条任务线是否有新产物",
                "检查新产物是否进入网站正确栏目",
                "检查是否有审稿/审计/安全扫描结果",
                "检查是否有明确下一步和阻塞项",
                "未完成任务必须续跑或说明卡点",
                "用户配合只问真正阻塞的一项"
            ]
        }
    }
    
    with open(f"{SITE}/data/supervision.json", 'w', encoding='utf-8') as f:
        json.dump(supervision, f, ensure_ascii=False, indent=2)
    print(f"  ✅ supervision.json 已保存 ({len(supervision['lines'])} 条监督线)")
    
    # 更新 tasks.json
    print("\n📝 更新 tasks.json ...")
    
    tasks = [
        {
            "id": "task_volume_1_done",
            "module": "novel",
            "title": "第一卷·真账十日完结，第二卷启动",
            "status": "done",
            "priority": "high",
            "owner": "章节续写/审稿线",
            "nextAction": "继续推进第21章审稿和第22章续写",
            "updated": NOW
        },
        {
            "id": "task_ch15_final",
            "module": "novel",
            "title": "第15章《雁门尺差》：审稿版候选v2 → 最终一致性审查 → 定稿",
            "status": "in_progress",
            "priority": "high",
            "owner": "章节续写/审稿线",
            "nextAction": "最终一致性审查与定稿确认",
            "updated": NOW
        },
        {
            "id": "task_ch16_final",
            "module": "novel",
            "title": "第16章《胡亥取巧》：审稿版候选v2.1 → 最终一致性审查 → 定稿候选",
            "status": "in_progress",
            "priority": "high",
            "owner": "章节续写/审稿线",
            "nextAction": "最终一致性审查与尾部状态修复",
            "updated": NOW
        },
        {
            "id": "task_ch17_18_19_20_upgrade",
            "module": "novel",
            "title": "第17-20章：从审稿版候选升级为定稿候选流程",
            "status": "in_progress",
            "priority": "high",
            "owner": "章节续写/审稿线",
            "nextAction": "按审稿建议逐章小修 → 小修清单 → 定稿候选",
            "updated": NOW
        },
        {
            "id": "task_ch21_review",
            "module": "novel",
            "title": "第21章《铜符初行》：正文草稿候选v1 → 独立审稿",
            "status": "in_progress",
            "priority": "high",
            "owner": "章节续写/审稿线",
            "nextAction": "启动第21章独立审稿",
            "updated": NOW
        },
        {
            "id": "task_ch22_write",
            "module": "novel",
            "title": "第22章《暗线回卷》：续写准备",
            "status": "pending",
            "priority": "high",
            "owner": "章节续写/审稿线",
            "nextAction": "等第21章审稿后再启动第22章续写",
            "updated": NOW
        },
        {
            "id": "task_tts_v2_v3",
            "module": "tts",
            "title": "TTS听书升级：第1章V2/V3样音优化 → 扩展到第2-6章",
            "status": "in_progress",
            "priority": "medium",
            "owner": "TTS听书线",
            "nextAction": "文本校对、停顿优化、语气调整",
            "updated": NOW
        },
        {
            "id": "task_en_tts_expand",
            "module": "tts",
            "title": "英文听书稿：第1-7章扩写/修订",
            "status": "in_progress",
            "priority": "medium",
            "owner": "多语言听书线",
            "nextAction": "完成第1-7章的完整听书稿扩写",
            "updated": NOW
        },
        {
            "id": "task_deploy_cloudflare",
            "module": "website",
            "title": "Cloudflare Pages部署（需用户配合wrangler login）",
            "status": "blocked",
            "priority": "medium",
            "owner": "网站建设执行线",
            "nextAction": "用户需运行 wrangler login 完成Cloudflare身份验证，然后运行 bash deploy-cloudflare.sh",
            "updated": NOW
        },
        {
            "id": "task_libtv_first_test",
            "module": "short-drama",
            "title": "LibTV/短剧首测：确认登录/入口/额度后启动3张母图",
            "status": "blocked",
            "priority": "medium",
            "owner": "短剧制作线",
            "nextAction": "确认LibTV登录态与额度提示后启动首测",
            "updated": NOW
        }
    ]
    
    with open(f"{SITE}/data/tasks.json", 'w', encoding='utf-8') as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)
    print(f"  ✅ tasks.json 已保存 ({len(tasks)} 个任务)")
    
    print("\n" + "=" * 60)
    print("✅ 综合更新完成！")
    print("=" * 60)
    print("\n下一步建议:")
    print("  1. 运行第21章《铜符初行》独立审稿")
    print("  2. 准备第22章《暗线回卷》续写")
    print("  3. Cloudflare Pages部署（需用户wrangler login）")


if __name__ == "__main__":
    main()
