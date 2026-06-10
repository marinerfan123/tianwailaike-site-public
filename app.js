/* ============================================
   天外来客 · 项目总控台 — app.js
   ============================================ */
;(function(){
'use strict';

const DATA = './data/';
const DATA_VERSION = '20260610-1900-light-contrast';
const pages = ['home','novel','short-drama','tts','progress','files','logs'];

/* ---- Theme: system / light / dark ---- */
const THEME_KEY = 'twlk-theme';
const THEME_LABELS = {system:'跟随系统', light:'明亮模式', dark:'暗色模式'};
const THEME_TITLES = {system:'颜色模式：跟随系统', light:'颜色模式：明亮模式', dark:'颜色模式：暗色模式'};

function getStoredTheme(){
  try{
    const v = localStorage.getItem(THEME_KEY);
    return ['system','light','dark'].includes(v) ? v : 'system';
  }catch(e){
    return 'system';
  }
}

function resolveTheme(mode){
  if(mode === 'light' || mode === 'dark') return mode;
  if(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

function applyTheme(theme){
  const mode = ['system','light','dark'].includes(theme) ? theme : 'system';
  if(mode === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = mode;
  document.documentElement.dataset.themeResolved = resolveTheme(mode);
  const btn = document.getElementById('themeToggle');
  if(btn){
    btn.textContent = THEME_LABELS[mode];
    btn.title = THEME_TITLES[mode];
    btn.setAttribute('aria-label', THEME_TITLES[mode]);
    btn.dataset.themeMode = mode;
  }
}

function setTheme(theme){
  const mode = ['system','light','dark'].includes(theme) ? theme : 'system';
  try{ localStorage.setItem(THEME_KEY, mode); }catch(e){}
  applyTheme(mode);
}

function initTheme(){
  applyTheme(getStoredTheme());
  const btn = document.getElementById('themeToggle');
  if(!btn) return;
  btn.addEventListener('click',()=>{
    const current = getStoredTheme();
    const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
    setTheme(next);
  });
  if(window.matchMedia){
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const refresh = ()=>{ if(getStoredTheme() === 'system') applyTheme('system'); };
    if(mq.addEventListener) mq.addEventListener('change', refresh);
    else if(mq.addListener) mq.addListener(refresh);
  }
}

/* ---- Hash routing ---- */
function route(){
  const hash = location.hash.slice(1) || 'home';
  document.querySelectorAll('.section').forEach(s=>s.style.display='none');
  const target = document.getElementById(hash);
  if(target){target.style.display='block'}
  document.querySelectorAll('nav a').forEach(a=>{
    a.removeAttribute('aria-current');
    if(a.getAttribute('href')==='#'+hash) a.setAttribute('aria-current','page');
  });
}
window.addEventListener('hashchange',route);

function loaded(){
  document.addEventListener('click',function(e){
    const a=e.target.closest('a[href^="#"]');
    if(a && a.host===location.host){
      route();
    }
  });
}

/* ---- Load JSON helper ---- */
async function loadJSON(name){
  const r = await fetch(DATA + name + '?v=' + encodeURIComponent(DATA_VERSION), {cache:'no-store'});
  if(!r.ok) throw new Error(`Failed to load ${name}: ${r.status}`);
  return r.json();
}

async function loadOptionalJSON(name, fallback=null){
  try{
    return await loadJSON(name);
  }catch(e){
    console.info(`Optional data not loaded: ${name}`, e.message);
    return fallback;
  }
}

function formatDateTime(value){
  if(!value) return '待更新';
  return String(value).replace('T',' ').slice(0,16);
}

/* ---- Renderers ---- */
function statCard(label, num, cls=''){
  return `<div class="stat-card${cls}"><div class="num">${num}</div><div class="label">${label}</div></div>`;
}

function moduleCard(m){
  const pct = m.progress || 0;
  return `<a class="module-card" href="#${m.id}">
    <span class="icon">${m.icon}</span>
    <h3>${m.name}</h3>
    <p class="muted" style="font-size:.75rem;line-height:1.4">${m.summary}</p>
    <div class="pct">${pct}%</div>
    <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
  </a>`;
}

function badge(s){
  const map = {'done':'已完成','in_progress':'进行中','draft':'草稿','review':'待审','need_fix':'待修正','planning':'规划','indexed':'已索引'};
  return `<span class="badge ${s}">${map[s]||s}</span>`;
}

function chapterItem(ch){
  const hasText = ch.hasText !== false;
  const btnLabel = hasText ? '阅读正文' : '查看状态';
  const source = ch.textSourceType ? `<span class="source">${ch.textSourceType}</span>` : '<span class="source">待创作</span>';
  const maturity = Number(ch.maturity || 0);
  const tags = (ch.planningTags || []).slice(0,3).map(t=>`<span>${t}</span>`).join('');
  return `<button class="chapter-item chapter-open${hasText ? '' : ' pending-text'}" type="button" data-chapter="ch${String(ch.number).padStart(2,'0')}">
    <span class="chapter-glow"></span>
    <span class="no">CH${String(ch.number).padStart(2,'0')}</span>
    <span class="name"><strong>${ch.title}</strong><small>${escapeHtml(ch.reviewConclusion || ch.summary || '')}</small></span>
    ${badge(ch.status)}
    ${source}
    <span class="review-pill">审：${escapeHtml(ch.reviewStatus || '待审')}</span>
    <span class="maturity"><i style="width:${Math.max(4, maturity)}%"></i><em>${maturity}%</em></span>
    ${tags ? `<span class="planning-tags">${tags}</span>` : ''}
    <span class="count">${btnLabel} · ${(ch.files || []).length} 份资料 · 下一步：${escapeHtml(ch.nextAction || '待补充')}</span>
  </button>`;
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, ch=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}

function bodyToParagraphs(body){
  return String(body || '').split(/\n{2,}/).map(block=>block.trim()).filter(Boolean).map(block=>`<p>${escapeHtml(block).replace(/\n/g,'<br>')}</p>`).join('');
}

function buildNovelReader(){
  if(document.getElementById('novelReader')) return;
  const reader = document.createElement('aside');
  reader.id = 'novelReader';
  reader.className = 'novel-reader';
  reader.setAttribute('aria-hidden','true');
  reader.innerHTML = `<div class="reader-backdrop" data-close-reader></div>
    <article class="reader-panel" role="dialog" aria-modal="true" aria-labelledby="readerTitle">
      <button class="reader-close" type="button" data-close-reader aria-label="关闭正文">×</button>
      <div class="reader-meta" id="readerMeta"></div>
      <h2 id="readerTitle"></h2>
      <div class="reader-review" id="readerReview"></div>
      <div class="reader-source" id="readerSource"></div>
      <div class="reader-body" id="readerBody"></div>
      <div class="reader-next" id="readerNext"></div>
      <div class="reader-notice" id="readerNotice"></div>
    </article>`;
  document.body.appendChild(reader);
  reader.addEventListener('click', e=>{
    if(e.target.closest('[data-close-reader]')) closeNovelReader();
  });
  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape' && reader.classList.contains('open')) closeNovelReader();
  });
}

function closeNovelReader(){
  const reader = document.getElementById('novelReader');
  if(!reader) return;
  reader.classList.remove('open');
  reader.setAttribute('aria-hidden','true');
  document.body.classList.remove('reader-lock');
}

function openNovelReader(chapterId){
  const reader = document.getElementById('novelReader');
  const novel = (cache.novelTexts || []).find(item=>item.chapterId === chapterId || item.id === chapterId);
  if(!reader || !novel) return;
  reader.querySelector('#readerMeta').textContent = `第${String(novel.number).padStart(2,'0')}章 · ${novel.sourceType || '正文'} · ${formatDateTime(novel.updated)}`;
  reader.querySelector('#readerTitle').textContent = novel.title || `第${String(novel.number).padStart(2,'0')}章`;
  const maturity = Number(novel.maturity || 0);
  const tags = (novel.planningTags || []).map(t=>`<span>${escapeHtml(t)}</span>`).join('');
  reader.querySelector('#readerReview').innerHTML = `<div class="review-state"><strong>审核状态</strong><b>${escapeHtml(novel.reviewStatus || '待审')}</b></div><div class="review-progress"><i style="width:${Math.max(4,maturity)}%"></i><em>${maturity}% 完善度</em></div>${tags ? `<div class="reader-tags">${tags}</div>` : ''}<p>${escapeHtml(novel.reviewConclusion || '')}</p>`;
  reader.querySelector('#readerSource').innerHTML = `<strong>出处说明：</strong>${escapeHtml(novel.origin || '')}`;
  reader.querySelector('#readerBody').innerHTML = bodyToParagraphs(novel.body || '本章暂未形成可开放正文。');
  reader.querySelector('#readerNext').innerHTML = `<strong>下一步：</strong>${escapeHtml(novel.nextAction || '补充审稿和正文完善计划。')}`;
  reader.querySelector('#readerNotice').innerHTML = `<strong>转载说明：</strong>${escapeHtml(novel.copyrightNotice || '转载请注明出处：本站《天外来客》项目总控台。')}`;
  reader.classList.add('open');
  reader.setAttribute('aria-hidden','false');
  document.body.classList.add('reader-lock');
  const panel = reader.querySelector('.reader-panel');
  if(panel) panel.scrollTop = 0;
}

function bindChapterReader(container){
  container.querySelectorAll('.chapter-open').forEach(btn=>{
    btn.addEventListener('click',()=>openNovelReader(btn.dataset.chapter));
  });
}

function assetCard(item){
  const tags = (item.tags||[]).slice(0,4).map(t=>`<span class="tag">${t}</span>`).join('');
  return `<div class="asset-card">
    <div class="ac-head"><span class="tag">${item.type}</span></div>
    <div class="name">${item.name}</div>
    <div class="summary">${item.summary||''}</div>
    ${tags ? `<div class="tags">${tags}</div>` : ''}
  </div>`;
}

function chapterNoFromAudio(a){
  if(Number(a.chapterNo)) return Number(a.chapterNo);
  const text = `${a.chapterId || ''} ${a.title || ''} ${a.fileName || ''} ${a.sourceRef || ''}`;
  let match = text.match(/chapter[_-]0*(\d{1,3})/i) || text.match(/(?:ch|第)0*(\d{1,3})(?:章)?/i);
  return match ? Number(match[1]) : 999;
}

function segmentNoFromAudio(a){
  if(Number(a.segmentNo)) return Number(a.segmentNo);
  const text = `${a.title || ''} ${a.fileName || ''} ${a.sourceRef || ''}`;
  const match = text.match(/[_\/-](\d{3})\.(mp3|wav|m4a|ogg|flac)$/i) || text.match(/第(\d+)段/);
  return match ? Number(match[1]) : 1;
}

function isTrialAudio(a){
  if(a.isTrial === true) return true;
  return /试听|开头|sample|v2_samples/.test(`${a.title || ''} ${a.fileName || ''} ${a.notes || ''} ${a.sourceRef || ''}`) || a.status === 'need_fix';
}

function audioStatusLabel(status){
  const map = {indexed:'已收录', need_fix:'试听/待升级', done:'已完成'};
  return map[status] || status || '音频';
}

function audioKindLabel(a){
  if(isTrialAudio(a)) return '试听版';
  return a.isPart ? '分段听书' : '完整音频';
}

function normalizeAudioList(audio){
  return audio.slice().sort((a,b)=>{
    const trialDiff = Number(isTrialAudio(a)) - Number(isTrialAudio(b));
    if(trialDiff) return trialDiff;
    const noDiff = chapterNoFromAudio(a) - chapterNoFromAudio(b);
    if(noDiff) return noDiff;
    const segDiff = segmentNoFromAudio(a) - segmentNoFromAudio(b);
    if(segDiff) return segDiff;
    return (a.title || '').localeCompare(b.title || '', 'zh-Hans-CN');
  });
}

function groupAudioByChapter(playlist){
  const groups = [];
  const map = new Map();
  playlist.forEach((track, index)=>{
    const no = chapterNoFromAudio(track);
    const key = no < 999 ? `ch${String(no).padStart(2,'0')}` : 'misc';
    if(!map.has(key)){
      const group = {key, chapterNo:no, title:no < 999 ? `第${String(no).padStart(2,'0')}章` : '其他音频', tracks:[]};
      map.set(key, group);
      groups.push(group);
    }
    map.get(key).tracks.push({...track, playlistIndex:index});
  });
  return groups;
}

function audioPlaylistItem(a){
  const trial = isTrialAudio(a);
  const seg = segmentNoFromAudio(a);
  const name = trial ? (a.title || '试听版') : (a.isPart ? `第${seg}段` : (a.title || '完整音频'));
  return `<button class="playlist-item${trial ? ' trial' : ' full'}" type="button" data-index="${a.playlistIndex}">
    <span class="playlist-no">${trial ? '试听' : (a.isPart ? `P${String(seg).padStart(2,'0')}` : '全')}</span>
    <span class="playlist-main">
      <span class="playlist-title">${name}<em>${audioKindLabel(a)}</em></span>
      <span class="playlist-meta">${audioStatusLabel(a.status)} · ${a.sizeLabel || ''}</span>
    </span>
    <span class="playlist-state">待播放</span>
  </button>`;
}

function renderAudioPlayer(container, audio){
  const playlist = normalizeAudioList(audio);
  const groups = groupAudioByChapter(playlist);
  const fullChapterCount = groups.filter(g=>g.chapterNo < 999 && g.tracks.some(t=>!isTrialAudio(t))).length;
  const partCount = playlist.filter(a=>!isTrialAudio(a)).length;
  const trialCount = playlist.filter(isTrialAudio).length;
  if(!playlist.length){
    container.innerHTML = '<p class="muted">暂无音频文件。后续将 audio.mp3 放入 media/audio/ 目录即可自动加载。</p>';
    return;
  }

  const groupedHtml = groups.map(group=>{
    const full = group.tracks.filter(t=>!isTrialAudio(t));
    const trials = group.tracks.filter(isTrialAudio);
    const meta = full.length ? `${full.length} 段听书音频` : `${trials.length} 个试听版`;
    return `<section class="audio-chapter-group always-open" aria-label="${group.title}音频列表">
      <div class="audio-chapter-head" role="heading" aria-level="3">
        <strong>${group.title}</strong>
        <span>${meta}${trials.length && full.length ? ` · ${trials.length} 个试听/升级参考` : ''}</span>
        <small>已展开 · 直接点下面任意一行播放</small>
      </div>
      <div class="audio-group-list">${group.tracks.map(audioPlaylistItem).join('')}</div>
    </section>`;
  }).join('');

  container.innerHTML = `<div class="audio-player-card">
    <div class="now-playing">
      <div>
        <p class="eyebrow">NOW PLAYING</p>
        <h3 id="audioTitle">请选择章节开始播放</h3>
        <p id="audioMeta" class="muted">已按章节聚合：${fullChapterCount} 章、${partCount} 段音频、${trialCount} 个试听/升级参考。不再把所有分段堆成第1章。</p>
      </div>
      <span id="playStatus" class="play-status idle">待播放</span>
    </div>
    <div class="audio-hint">章节内分段会连续播放；试听版只作为升级对比，不和正式听书混淆。</div>
    <audio id="mainAudio" class="main-audio" controls preload="metadata" playsinline webkit-playsinline></audio>
    <div class="player-controls" aria-label="听书播放控制">
      <button id="prevTrack" class="btn small" type="button" aria-label="播放上一段">上一段</button>
      <button id="nextTrack" class="btn small blue" type="button" aria-label="播放下一段">下一段</button>
      <label class="autoplay-toggle"><input id="continuousPlay" type="checkbox" checked /> 连续播放</label>
    </div>
    <div id="audioPlaylist" class="audio-playlist grouped">
      ${groupedHtml}
    </div>
  </div>`;

  const player = container.querySelector('#mainAudio');
  const title = container.querySelector('#audioTitle');
  const meta = container.querySelector('#audioMeta');
  const status = container.querySelector('#playStatus');
  const continuous = container.querySelector('#continuousPlay');
  const prev = container.querySelector('#prevTrack');
  const next = container.querySelector('#nextTrack');
  const items = Array.from(container.querySelectorAll('.playlist-item'));
  let current = -1;

  function setStatus(text, cls){
    status.textContent = text;
    status.className = `play-status ${cls || ''}`.trim();
    if(current >= 0){
      const state = items.find(item=>Number(item.dataset.index) === current)?.querySelector('.playlist-state');
      if(state) state.textContent = text;
    }
  }

  function updateActive(index){
    items.forEach((item)=>{
      const active = Number(item.dataset.index) === index;
      item.classList.toggle('active', active);
      const state = item.querySelector('.playlist-state');
      if(state) state.textContent = active ? status.textContent : '待播放';
    });
  }

  function loadTrack(index, autoPlay=false){
    if(index < 0 || index >= playlist.length) return;
    current = index;
    const track = playlist[current];
    const chapterNo = chapterNoFromAudio(track);
    const chapterLabel = chapterNo < 999 ? `第${String(chapterNo).padStart(2,'0')}章` : '其他音频';
    player.src = track.path;
    title.textContent = `${chapterLabel} · ${track.isPart ? `第${segmentNoFromAudio(track)}段` : track.title}`;
    meta.textContent = `${audioKindLabel(track)} · ${audioStatusLabel(track.status)} · ${track.sizeLabel || ''}${isTrialAudio(track) ? ' · 试听版用于对比修正' : ' · 章节内连续播放'}`;
    setStatus('已选择', 'idle');
    updateActive(current);
    if(autoPlay){
      player.load();
      const playPromise = player.play();
      if(playPromise && typeof playPromise.catch === 'function'){
        playPromise.catch(()=>setStatus('请点播放继续', 'paused'));
      }
    }
  }

  function playOffset(offset){
    if(current < 0){
      loadTrack(offset > 0 ? 0 : playlist.length - 1, true);
      return;
    }
    const target = Math.min(Math.max(current + offset, 0), playlist.length - 1);
    loadTrack(target, true);
  }

  items.forEach((item)=>{
    item.addEventListener('click',()=>loadTrack(Number(item.dataset.index), true));
  });
  prev.addEventListener('click',()=>playOffset(-1));
  next.addEventListener('click',()=>playOffset(1));
  player.addEventListener('play',()=>setStatus('正在播放', 'playing'));
  player.addEventListener('pause',()=>{
    if(!player.ended) setStatus('暂停', 'paused');
  });
  player.addEventListener('ended',()=>{
    setStatus('已播放完', 'ended');
    if(continuous.checked && current < playlist.length - 1){
      loadTrack(current + 1, true);
      const active = items.find(item=>Number(item.dataset.index) === current);
      if(active) active.scrollIntoView({block:'nearest', behavior:'smooth'});
    }
  });

  loadTrack(0, false);
}


function supervisionCard(item){
  const blockers = (item.blockers || []).length ? `<div class="supervision-blockers">阻塞：${item.blockers.join('；')}</div>` : '';
  const evidenceItems = (item.evidence || []).slice(0,3).map(e=>`<li>${escapeHtml(e)}</li>`).join('') || '<li>暂无证据</li>';
  return `<article class="supervision-card ${item.status}">
    <div class="supervision-head">
      <span>${badge(item.status)}</span>
      <strong>${item.progress || 0}%</strong>
    </div>
    <h3>${escapeHtml(item.name)}</h3>
    <div class="supervision-meta">${escapeHtml(item.module)} · ${escapeHtml(item.owner || '主线程监督')} · ${formatDateTime(item.updated)}</div>
    <p class="audit"><b>审查：</b>${escapeHtml(item.audit?.summary || '待审查')}</p>
    <p class="next"><b>下一步：</b>${escapeHtml(item.nextAction || '待明确')}</p>
    ${blockers}
    <div class="evidence-box" aria-label="证据记录">
      <div class="evidence-title">证据记录</div>
      <ul>${evidenceItems}</ul>
    </div>
  </article>`;
}

function renderSupervision(container, supervision){
  if(!supervision || !Array.isArray(supervision.lines)){
    container.innerHTML = '<p class="muted">暂无监督台账。</p>';
    return;
  }
  const rules = supervision.rules || {};
  container.innerHTML = `<div class="supervision-rule">
    <strong>监督原则：</strong>${rules.principle || '每件事有记录、有章法；有发展就有审查、有监督。'}
    <span>更新时间：${formatDateTime(supervision.updated)}</span>
  </div>
  <div class="supervision-grid">${supervision.lines.map(supervisionCard).join('')}</div>`;
}

function taskCard(t){
  const prio = {'high':'🟥 高','medium':'🟧 中','low':'🟩 低'};
  const st = {'done':'✅ 已完成','in_progress':'🔄 进行中','need_fix':'⚠️ 待修正','review':'🔍 待确认'};
  return `<div class="task-card">
    <div class="tc-head">${badge(t.status)}</div>
    <div class="tc-title">${t.title}</div>
    <div class="tc-meta">${prio[t.priority]||t.priority} · ${t.module}</div>
    <div class="tc-next">下一步：${t.nextAction}</div>
  </div>`;
}

function getFileGroup(f){
  const text = `${f.title || ''} ${f.fileName || ''} ${(f.keywords || []).join(' ')} ${f.sourceRef || ''}`;
  if(/审稿|校对|停顿|语气|真人感|TTS|听书|audio/i.test(text)) return '审稿 / TTS';
  if(/连续性|资产数据库|分镜关联|母图|资产/i.test(text)) return '连续性 / 资产';
  if(/规划|章纲|连载|钩子|标题库|第04-10章/i.test(text)) return '连载规划';
  if(/网站|部署|Netlify|site|manifest|localtunnel/i.test(text)) return '网站部署';
  if(f.module === 'short-drama') return '短剧制作';
  if(f.module === 'novel') return '小说正文';
  return '其他资料';
}

function isHighlightedFile(f){
  const group = getFileGroup(f);
  return ['审稿 / TTS','连续性 / 资产','连载规划','网站部署'].includes(group);
}

function fileCard(f){
  const group = getFileGroup(f);
  return `<div class="file-card${isHighlightedFile(f) ? ' highlight' : ''}">
    <div class="fc-top"><span class="badge ${f.module}">${f.module}</span><span class="file-group-pill">${group}</span></div>
    <div class="fc-title" title="${f.fileName}">${f.title}</div>
    <div class="fc-meta"><span>${f.sizeLabel}</span><span>${formatDateTime(f.updated)}</span></div>
    <div class="fc-summary">${f.summary||f.fileName}</div>
  </div>`;
}

function fileGroupBlock(group, list){
  return `<section class="file-group">
    <div class="file-group-head">
      <h3>${group}</h3>
      <span>${list.length} 份</span>
    </div>
    <div class="file-list">${list.slice(0,60).map(fileCard).join('')}</div>
  </section>`;
}

function dashboardCard(title, body, cls=''){
  return `<div class="dashboard-card ${cls}">${title ? `<h3>${title}</h3>` : ''}${body}</div>`;
}

function renderLiveDashboard(container, manifest, tasks, logs, files, dashboard){
  const latest = (dashboard && dashboard.latest) || manifest.latest || files.slice().sort((a,b)=>String(b.updated||'').localeCompare(String(a.updated||''))).slice(0,5);
  const nextActions = (dashboard && dashboard.nextActions) || manifest.nextActions || tasks.filter(t=>t.status !== 'done').slice(0,4);
  const todayLogs = logs.slice(0,5);
  const netlify = 'https://tianwailaike.netlify.app/';
  container.innerHTML =
    dashboardCard('正式网站链接', `<p>Netlify 正式站点已上线，后续预览和分享统一使用正式链接，不再使用 localtunnel。</p><a class="btn primary wide" href="${netlify}" target="_blank" rel="noopener">打开 Netlify 正式站</a>`, 'launch') +
    dashboardCard('最新进度', `<ul class="mini-list">${latest.slice(0,5).map(item=>`<li><strong>${item.title}</strong><span>${formatDateTime(item.updated)} · ${item.module || '更新'}</span><p>${item.summary || ''}</p></li>`).join('')}</ul>`) +
    dashboardCard('今日更新', `<ul class="mini-list compact">${todayLogs.map(item=>`<li><strong>${item.summary}</strong><span>${item.date} · ${item.module}</span></li>`).join('')}</ul>`) +
    dashboardCard('下一步', `<ul class="next-list">${nextActions.slice(0,4).map(item=>`<li><span>${badge(item.status)}</span><div><strong>${item.title}</strong><p>${item.nextAction || item.summary || ''}</p></div></li>`).join('')}</ul>`);
}

function timelineItem(log){
  return `<div class="timeline-item">
    <div class="tl-date">${log.date}</div>
    <div class="tl-summary">${log.summary}</div>
    <div class="tl-module">${log.module}</div>
  </div>`;
}

/* ---- Main render ---- */
let cache = {};

async function init(){
  initTheme();
  try{
    const [manifest, chapters, novelTexts, audio, assets, tasks, logs, files, dashboard, supervision] = await Promise.all([
      loadJSON('site_manifest.json'),
      loadJSON('chapters.json'),
      loadJSON('novel_texts.json'),
      loadJSON('audio.json'),
      loadJSON('assets.json'),
      loadJSON('tasks.json'),
      loadJSON('logs.json'),
      loadJSON('output_files.json'),
      loadOptionalJSON('dashboard.json', null),
      loadOptionalJSON('supervision.json', null)
    ]);
    cache = {manifest, chapters, novelTexts, audio, assets, tasks, logs, files, dashboard, supervision};
    buildNovelReader();

    /* Stats */
    const s = manifest.stats;
    document.getElementById('stats').innerHTML =
      statCard('小说章节', s.chapters) +
      statCard('音频文件', s.audio, ' blue') +
      statCard('短剧文件', s.shortDramaFiles, ' blue') +
      statCard('资料文件', s.outputFiles, ' green');

    /* Tagline */
    document.getElementById('tagline').textContent = manifest.site.tagline;

    /* Live dashboard */
    renderLiveDashboard(document.getElementById('liveDashboard'), manifest, tasks, logs, files, dashboard);

    /* Modules */
    document.getElementById('modules').innerHTML = manifest.modules.map(moduleCard).join('');

    /* Chapters */
    const chaptersEl = document.getElementById('chapters');
    chaptersEl.innerHTML = chapters.map(chapterItem).join('');
    bindChapterReader(chaptersEl);

    /* Assets */
    document.getElementById('assets').innerHTML = assets.map(assetCard).join('');

    /* Audio */
    const audioEl = document.getElementById('audio');
    renderAudioPlayer(audioEl, audio);

    /* Tasks */
    const tasksEl = document.getElementById('tasks');
    if(supervision){
      renderSupervision(tasksEl, supervision);
    }else{
      tasksEl.innerHTML = tasks.map(taskCard).join('');
    }

    /* Files */
    const filesEl = document.getElementById('filesList');
    let filteredFiles = files;
    function renderFiles(list){
      const groups = ['审稿 / TTS','连续性 / 资产','连载规划','网站部署','短剧制作','小说正文','其他资料'];
      filesEl.innerHTML = groups.map(group=>{
        const grouped = list.filter(f=>getFileGroup(f) === group);
        return grouped.length ? fileGroupBlock(group, grouped) : '';
      }).join('') || '<p class="muted">没有找到匹配文件。</p>';
    }
    renderFiles(filteredFiles);
    document.getElementById('fileSearch').addEventListener('input',function(){
      const q = this.value.trim().toLowerCase();
      if(!q){renderFiles(files);return}
      renderFiles(files.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.fileName.toLowerCase().includes(q) ||
        f.module.toLowerCase().includes(q) ||
        (f.keywords||[]).some(k=>k.toLowerCase().includes(q)) ||
        (f.summary||'').toLowerCase().includes(q)
      ));
    });

    /* Logs */
    document.getElementById('logsList').innerHTML = logs.map(timelineItem).join('');

    route();
    loaded();
  }catch(e){
    console.error('渲染失败：',e);
    document.querySelectorAll('#stats,#modules,#chapters,#assets,#audio,#tasks,#filesList,#logsList').forEach(el=>{
      if(el) el.innerHTML = `<p class="muted">（数据加载失败：${e.message}。请确认项目目录结构正确，已用 build_manifest.py 生成 JSON。）</p>`;
    });
  }
}

init();

})();