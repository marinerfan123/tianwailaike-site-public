/* ===========================================================
   天外来客 · 秦篆未来 — app.js
   Qin Seal Script × Future Technology
   =========================================================== */
;(function(){
'use strict';

const DATA = './data/';
const DATA_VERSION = '20260617-0150-full-redesign';
const SECTIONS = ['home','novel','short-drama','tts','languages','progress','files','writing-system','logs'];

/* ---- Theme system ---- */
const THEME_KEY = 'twlk-theme';
const THEME_LABELS = {'system':'◐','light':'☀','dark':'☾'};

function getStoredTheme(){
  try{
    const v = localStorage.getItem(THEME_KEY);
    return ['system','light','dark'].includes(v) ? v : 'system';
  }catch(e){ return 'system'; }
}

function resolveTheme(mode){
  if(mode === 'light' || mode === 'dark') return mode;
  if(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

function applyTheme(theme){
  const mode = ['system','light','dark'].includes(theme) ? theme : 'system';
  document.documentElement.dataset.theme = mode;
  document.documentElement.dataset.themeResolved = resolveTheme(mode);
  const btn = document.getElementById('themeToggle');
  if(btn){
    btn.textContent = THEME_LABELS[mode];
    btn.setAttribute('aria-label', '切换颜色模式：' + mode);
  }
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if(themeMeta){
    themeMeta.content = resolveTheme(mode) === 'light' ? '#F5F0E8' : '#0A0B0E';
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
  btn.addEventListener('click', function(){
    const current = getStoredTheme();
    const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
    setTheme(next);
  });
  if(window.matchMedia){
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const refresh = function(){ if(getStoredTheme() === 'system') applyTheme('system'); };
    if(mq.addEventListener) mq.addEventListener('change', refresh);
    else if(mq.addListener) mq.addListener(refresh);
  }
}

/* ---- Hash routing ---- */
function route(){
  const hash = location.hash.slice(1) || 'home';
  document.querySelectorAll('.section').forEach(function(s){ s.style.display = 'none'; });
  const target = document.getElementById(hash);
  if(target){ target.style.display = ''; }
  // Desktop nav
  document.querySelectorAll('.nav-link').forEach(function(a){
    a.removeAttribute('aria-current');
    if(a.getAttribute('href') === '#'+hash) a.setAttribute('aria-current','page');
  });
  // Mobile nav
  document.querySelectorAll('.mnav-link').forEach(function(a){
    a.removeAttribute('aria-current');
    if(a.getAttribute('href') === '#'+hash) a.setAttribute('aria-current','page');
  });
  // Scroll to top on section change (mobile friendly)
  if(target){
    setTimeout(function(){
      target.scrollIntoView({behavior:'smooth', block:'start'});
    }, 50);
  }
}

window.addEventListener('hashchange', route);

/* ---- Nav scroll shadow ---- */
function handleNavScroll(){
  const nav = document.getElementById('desktopNav');
  if(!nav) return;
  if(window.scrollY > 20){
    nav.classList.add('scrolled');
  }else{
    nav.classList.remove('scrolled');
  }
}
window.addEventListener('scroll', handleNavScroll, {passive:true});

/* ---- Back to top ---- */
function initBackToTop(){
  const btn = document.getElementById('backToTop');
  if(!btn) return;
  window.addEventListener('scroll', function(){
    if(window.scrollY > 500){
      btn.classList.add('visible');
    }else{
      btn.classList.remove('visible');
    }
  }, {passive:true});
  btn.addEventListener('click', function(){
    window.scrollTo({top:0, behavior:'smooth'});
  });
}

/* ---- Scroll reveal with IntersectionObserver ---- */
function initScrollReveal(){
  const revealEls = document.querySelectorAll('.fade-up');
  if(!revealEls.length) return;
  const observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {threshold:0.08, rootMargin:'0px 0px -40px 0px'});
  revealEls.forEach(function(el){ observer.observe(el); });
}

/* ---- Load JSON ---- */
async function loadJSON(name){
  const r = await fetch(DATA + name + '?v=' + encodeURIComponent(DATA_VERSION), {cache:'no-store'});
  if(!r.ok) throw new Error('Failed to load ' + name + ': ' + r.status);
  return r.json();
}

async function loadOptionalJSON(name, fallback){
  try{ return await loadJSON(name); }
  catch(e){
    console.info('Optional data not loaded: ' + name, e.message);
    return fallback;
  }
}

function formatDateTime(value){
  if(!value) return '待更新';
  return String(value).replace('T',' ').slice(0,16);
}

/* ---- Helpers ---- */
function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, function(ch){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}

function bodyToParagraphs(body){
  return String(body || '').split(/\n{2,}/).map(function(block){
    return block.trim();
  }).filter(Boolean).map(function(block){
    return '<p>' + escapeHtml(block).replace(/\n/g,'<br>') + '</p>';
  }).join('');
}

function badge(s){
  var map = {'done':'已完成','in_progress':'进行中','draft':'草稿','review':'待审','need_fix':'待修正','planning':'规划','indexed':'已索引'};
  return '<span class="badge ' + s + '">' + (map[s]||s) + '</span>';
}

/* ---- Renderers ---- */

function statCard(label, num, cls){
  return '<div class="stat-card' + (cls||'') + '"><div class="num">' + num + '</div><div class="label">' + label + '</div></div>';
}

function moduleCard(m){
  var pct = m.progress || 0;
  return '<a class="module-card" href="#' + m.id + '">' +
    '<span class="icon">' + m.icon + '</span>' +
    '<h3>' + m.name + '</h3>' +
    '<p class="muted" style="font-size:.7rem;line-height:1.35">' + m.summary + '</p>' +
    '<div class="pct">' + pct + '%</div>' +
    '<div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
    '</a>';
}

function chapterItem(ch){
  var hasText = ch.hasText !== false;
  var btnLabel = hasText ? '阅读正文' : '查看状态';
  var source = ch.textSourceType ? '<span class="source">' + ch.textSourceType + '</span>' : '<span class="source">待创作</span>';
  var maturity = Number(ch.maturity || 0);
  var tags = (ch.planningTags || []).slice(0,3).map(function(t){ return '<span>' + t + '</span>'; }).join('');
  return '<button class="chapter-open' + (hasText ? '' : ' pending-text') + '" type="button" data-chapter="ch' + String(ch.number).padStart(2,'0') + '">' +
    '<span class="chapter-glow"></span>' +
    '<span class="no">CH' + String(ch.number).padStart(2,'0') + '</span>' +
    '<span class="name"><strong>' + ch.title + '</strong><small>' + escapeHtml(ch.reviewConclusion || ch.summary || '') + '</small></span>' +
    badge(ch.status) +
    source +
    '<span class="review-pill">审：' + escapeHtml(ch.reviewStatus || '待审') + '</span>' +
    '<span class="maturity"><i style="width:' + Math.max(4, maturity) + '%"></i><em>' + maturity + '%</em></span>' +
    (tags ? '<span class="planning-tags">' + tags + '</span>' : '') +
    '<span class="count">' + btnLabel + ' · ' + (ch.files||[]).length + ' 份资料 · 下一步：' + escapeHtml(ch.nextAction || '待补充') + '</span>' +
    '</button>';
}

function assetCard(item){
  var tags = (item.tags||[]).slice(0,4).map(function(t){ return '<span class="tag">' + t + '</span>'; }).join('');
  return '<div class="asset-card">' +
    '<div class="ac-head"><span class="tag">' + item.type + '</span></div>' +
    '<div class="name">' + item.name + '</div>' +
    '<div class="summary">' + (item.summary||'') + '</div>' +
    (tags ? '<div class="tags">' + tags + '</div>' : '') +
    '</div>';
}

function languageAssetCard(ch){
  var files = (ch.files || []).filter(function(f){
    return /英文|English|多语言|language/i.test((f.title||'') + ' ' + (f.fileName||'') + ' ' + (f.sourceRef||''));
  });
  if(!files.length) return '';
  var drafts = files.filter(function(f){ return /审稿版|审稿版候选|草稿|Draft/i.test((f.title||'') + ' ' + (f.fileName||'')); });
  var audits = files.filter(function(f){ return /审计|审稿|自检|报告|说明|任务单/i.test((f.title||'') + ' ' + (f.fileName||'')); });
  var rules = files.filter(function(f){ return /原则|规则|标准/i.test((f.title||'') + ' ' + (f.fileName||'')); });
  var primary = drafts[0] || files[0];
  var fileList = files.slice(0,5).map(function(f){
    return '<li><span>' + escapeHtml(f.title || f.fileName) + '</span><small>' + escapeHtml((f.fileName||'').replace(/^天外来客_/,'')) + '</small></li>';
  }).join('');
  var statusText = '资料已收录';
  var text = files.map(function(f){ return (f.title||'') + ' ' + (f.fileName||''); }).join(' ');
  if(/审稿版|审稿版候选|Draft v\d|候选/i.test(text)) statusText = '已有稿件';
  else if(/草稿/.test(text)) statusText = '草稿候选';
  else if(/原则|规则|标准/.test(text)) statusText = '已有原则';
  return '<article class="language-card">' +
    '<div class="language-head"><span class="language-no">CH' + String(ch.number).padStart(2,'0') + '</span><span class="badge in_progress">English</span></div>' +
    '<h3>' + escapeHtml(ch.title || '第' + ch.number + '章') + '</h3>' +
    '<p class="language-status">' + statusText + ' · 稿件 ' + drafts.length + ' · 审计/说明 ' + audits.length + ' · 原则 ' + rules.length + '</p>' +
    '<p class="language-primary"><b>主文件：</b>' + escapeHtml(primary.title || primary.fileName) + '</p>' +
    '<ul class="language-files">' + fileList + '</ul>' +
    '</article>';
}

function renderLanguageAssets(container, chapters){
  if(!container) return;
  var html = chapters.map(languageAssetCard).filter(Boolean).join('');
  container.innerHTML = html || '<p class="muted" style="color:var(--text-muted);font-size:.85rem">暂无多语言资产。后续英文/其他语言稿会集中展示在这里。</p>';
}

/* ---- Audio helpers ---- */
function chapterNoFromAudio(a){
  if(Number(a.chapterNo)) return Number(a.chapterNo);
  var text = (a.chapterId || '') + ' ' + (a.title || '') + ' ' + (a.fileName || '') + ' ' + (a.sourceRef || '');
  var match = text.match(/chapter[_-]0*(\d{1,3})/i) || text.match(/(?:ch|第)0*(\d{1,3})(?:章)?/i);
  return match ? Number(match[1]) : 999;
}
function segmentNoFromAudio(a){
  if(Number(a.segmentNo)) return Number(a.segmentNo);
  var text = (a.title || '') + ' ' + (a.fileName || '') + ' ' + (a.sourceRef || '');
  var match = text.match(/[_\/-](\d{3})\.(mp3|wav|m4a|ogg|flac)$/i) || text.match(/第(\d+)段/);
  return match ? Number(match[1]) : 1;
}
function isTrialAudio(a){
  if(a.isTrial === true) return true;
  return /试听|开头|sample|v2_samples/.test((a.title||'') + ' ' + (a.fileName||'') + ' ' + (a.notes||'') + ' ' + (a.sourceRef||'')) || a.status === 'need_fix';
}
function audioStatusLabel(status){
  var map = {indexed:'已收录', need_fix:'试听/待升级', done:'已完成'};
  return map[status] || status || '音频';
}
function audioKindLabel(a){
  return isTrialAudio(a) ? '试听版' : (a.isPart ? '分段听书' : '完整音频');
}
function normalizeAudioList(audio){
  return audio.slice().sort(function(a,b){
    var trialDiff = Number(isTrialAudio(a)) - Number(isTrialAudio(b));
    if(trialDiff) return trialDiff;
    var noDiff = chapterNoFromAudio(a) - chapterNoFromAudio(b);
    if(noDiff) return noDiff;
    var segDiff = segmentNoFromAudio(a) - segmentNoFromAudio(b);
    if(segDiff) return segDiff;
    return (a.title || '').localeCompare(b.title || '', 'zh-Hans-CN');
  });
}
function groupAudioByChapter(playlist){
  var groups = [];
  var map = new Map();
  playlist.forEach(function(track, index){
    var no = chapterNoFromAudio(track);
    var key = no < 999 ? 'ch' + String(no).padStart(2,'0') : 'misc';
    if(!map.has(key)){
      var group = {key:key, chapterNo:no, title:no < 999 ? '第' + String(no).padStart(2,'0') + '章' : '其他音频', tracks:[]};
      map.set(key, group);
      groups.push(group);
    }
    map.get(key).tracks.push({...track, playlistIndex:index});
  });
  return groups;
}

function renderAudioPlayer(container, audio){
  var playlist = normalizeAudioList(audio);
  var rawGroups = groupAudioByChapter(playlist);
  var chapterGroups = rawGroups.map(function(group, chapterIndex){
    var formal = group.tracks.filter(function(t){ return !isTrialAudio(t); }).sort(function(a,b){ return segmentNoFromAudio(a) - segmentNoFromAudio(b); });
    var trials = group.tracks.filter(isTrialAudio).sort(function(a,b){ return segmentNoFromAudio(a) - segmentNoFromAudio(b); });
    var tracks = formal.length ? formal : trials;
    return {chapterIndex:chapterIndex, chapterNo:group.chapterNo, title:group.title, tracks:tracks, formalCount:formal.length, trialCount:trials.length, key:group.key};
  }).filter(function(g){ return g.tracks.length; });
  var fullChapterCount = chapterGroups.filter(function(g){ return g.chapterNo < 999 && g.formalCount; }).length;
  if(!chapterGroups.length){
    container.innerHTML = '<p class="muted" style="color:var(--text-muted);font-size:.85rem">暂无音频文件。后续将 audio.mp3 放入 media/audio/ 目录即可自动加载。</p>';
    return;
  }
  var chapterHtml = chapterGroups.map(function(group){
    var first = group.tracks[0] || {};
    var chapterName = group.chapterNo < 999 ? group.title : '其他音频';
    var titleText = group.formalCount ? '整章听书' : '试听参考';
    var metaText = group.formalCount
      ? (group.formalCount > 1 ? '内部自动续播' : '单文件') + ' · ' + audioStatusLabel(first.status) + ' · ' + ((first.sizeLabel || '').replace(/\s*$/,''))
      : group.trialCount + ' 个试听参考 · 不作为正式听书';
    return '<button class="playlist-item full chapter-audio-card" type="button" data-chapter-index="' + group.chapterIndex + '" aria-label="播放' + chapterName + '">' +
      '<span class="playlist-no">' + (group.chapterNo < 999 ? 'CH' + String(group.chapterNo).padStart(2,'0') : '其他') + '</span>' +
      '<span class="playlist-main">' +
        '<span class="playlist-title">' + chapterName + '<em>' + titleText + '</em></span>' +
        '<span class="playlist-meta">' + metaText + '</span>' +
      '</span>' +
      '<span class="playlist-state">点击播放</span>' +
      '</button>';
  }).join('');

  container.innerHTML = '<div class="audio-player-card">' +
    '<div class="now-playing">' +
      '<div>' +
        '<p class="section-eyebrow" style="margin-bottom:.2rem">NOW PLAYING</p>' +
        '<h3 id="audioTitle">请选择章节开始播放</h3>' +
        '<p id="audioMeta" class="section-desc" style="font-size:.72rem">按整章展示：' + fullChapterCount + ' 章正式听书。技术分段已隐藏，点章节后自动连续播放。</p>' +
      '</div>' +
      '<span id="playStatus" class="play-status idle">待播放</span>' +
    '</div>' +
    '<div class="audio-hint">页面只显示"第01章、第02章……"；TTS 分段只是内部技术切片，会自动接着播。</div>' +
    '<audio id="mainAudio" class="main-audio" controls preload="metadata" playsinline webkit-playsinline></audio>' +
    '<div class="player-controls">' +
      '<button id="prevTrack" class="btn btn-gold small" type="button" aria-label="播放上一章">‹ 上一章</button>' +
      '<button id="nextTrack" class="btn btn-jade small" type="button" aria-label="播放下一章">下一章 ›</button>' +
      '<label class="autoplay-toggle"><input id="continuousPlay" type="checkbox" checked /> 连续播放整章</label>' +
    '</div>' +
    '<div id="audioPlaylist" class="audio-playlist">' + chapterHtml + '</div>' +
    '</div>';

  var player = document.getElementById('mainAudio');
  var titleEl = document.getElementById('audioTitle');
  var metaEl = document.getElementById('audioMeta');
  var statusEl = document.getElementById('playStatus');
  var continuous = document.getElementById('continuousPlay');
  var prevBtn = document.getElementById('prevTrack');
  var nextBtn = document.getElementById('nextTrack');
  var items = Array.from(document.querySelectorAll('.chapter-audio-card'));
  var currentChapter = -1;
  var currentPart = 0;

  function currentGroup(){ return chapterGroups[currentChapter]; }
  function setStatus(text, cls){
    statusEl.textContent = text;
    statusEl.className = 'play-status ' + (cls || '');
    updateActive();
  }
  function updateActive(){
    items.forEach(function(item){
      var active = Number(item.dataset.chapterIndex) === currentChapter;
      item.classList.toggle('active', active);
      var state = item.querySelector('.playlist-state');
      if(state){
        if(!active) state.textContent = '播放整章';
        else {
          var group = currentGroup();
          var total = group && group.tracks ? group.tracks.length : 1;
          state.textContent = total > 1 ? '播放中 ' + (currentPart + 1) + '/' + total : statusEl.textContent;
        }
      }
    });
  }
  function loadChapter(chapterIndex, autoPlay, partIndex){
    if(chapterIndex < 0 || chapterIndex >= chapterGroups.length) return;
    currentChapter = chapterIndex;
    var group = currentGroup();
    currentPart = Math.min(Math.max(partIndex || 0, 0), group.tracks.length - 1);
    var track = group.tracks[currentPart];
    var chapterLabel = group.chapterNo < 999 ? '第' + String(group.chapterNo).padStart(2,'0') + '章' : '其他音频';
    player.src = track.path;
    titleEl.textContent = chapterLabel + ' · ' + (group.formalCount ? '整章听书' : '试听参考');
    var total = group.tracks.length;
    metaEl.textContent = audioKindLabel(track) + ' · ' + audioStatusLabel(track.status) + ' · ' + (total > 1 ? '内部连续播放 ' + (currentPart + 1) + '/' + total : '单文件') + (isTrialAudio(track) ? ' · 试听版' : '');
    setStatus('已选择', 'idle');
    if(autoPlay){
      player.load();
      var playPromise = player.play();
      if(playPromise && typeof playPromise.catch === 'function'){
        playPromise.catch(function(){ setStatus('请点播放继续', 'paused'); });
      }
    }
  }
  function playChapterOffset(offset){
    if(currentChapter < 0){
      loadChapter(offset > 0 ? 0 : chapterGroups.length - 1, true);
      return;
    }
    var target = Math.min(Math.max(currentChapter + offset, 0), chapterGroups.length - 1);
    loadChapter(target, true);
  }
  items.forEach(function(item){
    item.addEventListener('click', function(){
      loadChapter(Number(item.dataset.chapterIndex), true);
    });
  });
  prevBtn.addEventListener('click', function(){ playChapterOffset(-1); });
  nextBtn.addEventListener('click', function(){ playChapterOffset(1); });
  player.addEventListener('play', function(){ setStatus('正在播放', 'playing'); });
  player.addEventListener('pause', function(){
    if(!player.ended) setStatus('暂停', 'paused');
  });
  player.addEventListener('ended', function(){
    var group = currentGroup();
    if(group && currentPart < group.tracks.length - 1){
      loadChapter(currentChapter, true, currentPart + 1);
      return;
    }
    setStatus('本章已播完', 'ended');
    if(continuous.checked && currentChapter < chapterGroups.length - 1){
      loadChapter(currentChapter + 1, true, 0);
      var activeItem = items.find(function(it){ return Number(it.dataset.chapterIndex) === currentChapter; });
      if(activeItem) activeItem.scrollIntoView({block:'nearest', behavior:'smooth'});
    }
  });
  loadChapter(0, false);
}

/* ---- Supervision / Task cards ---- */
function supervisionCard(item){
  var blockers = (item.blockers || []).length ? '<div class="supervision-blockers">阻塞：' + item.blockers.join('；') + '</div>' : '';
  var evidenceItems = (item.evidence || []).slice(0,3).map(function(e){ return '<li>' + escapeHtml(e) + '</li>'; }).join('') || '<li>暂无证据</li>';
  return '<article class="supervision-card ' + (item.status || '') + '">' +
    '<div class="supervision-head">' + badge(item.status) + '<strong>' + (item.progress || 0) + '%</strong></div>' +
    '<h3>' + escapeHtml(item.name) + '</h3>' +
    '<div class="supervision-meta">' + escapeHtml(item.module) + ' · ' + escapeHtml(item.owner || '主线程监督') + ' · ' + formatDateTime(item.updated) + '</div>' +
    '<p><b>审查：</b>' + escapeHtml((item.audit && item.audit.summary) || '待审查') + '</p>' +
    '<p><b>下一步：</b>' + escapeHtml(item.nextAction || '待明确') + '</p>' +
    blockers +
    '<div class="evidence-box"><div class="evidence-title">证据记录</div><ul>' + evidenceItems + '</ul></div>' +
    '</article>';
}

function renderSupervision(container, supervision){
  if(!supervision || !Array.isArray(supervision.lines)){
    container.innerHTML = '<p class="muted" style="color:var(--text-muted);font-size:.85rem">暂无监督台账。</p>';
    return;
  }
  var rules = supervision.rules || {};
  container.innerHTML = '<div class="supervision-rule">' +
    '<strong>监督原则：</strong>' + (rules.principle || '每件事有记录、有章法；有发展就有审查、有监督。') +
    '<span>更新时间：' + formatDateTime(supervision.updated) + '</span>' +
    '</div>' +
    '<div class="supervision-grid">' + supervision.lines.map(supervisionCard).join('') + '</div>';
}

function taskCard(t){
  var prio = {'high':'🟥 高','medium':'🟧 中','low':'🟩 低'};
  return '<div class="task-card">' +
    '<div class="tc-head">' + badge(t.status) + '</div>' +
    '<div class="tc-title">' + t.title + '</div>' +
    '<div class="tc-meta">' + (prio[t.priority] || t.priority) + ' · ' + t.module + '</div>' +
    '<div class="tc-next">下一步：' + t.nextAction + '</div>' +
    '</div>';
}

/* ---- Dashboard ---- */
function dashboardCard(title, body, cls){
  return '<div class="dashboard-card ' + (cls||'') + '">' + (title ? '<h3>' + title + '</h3>' : '') + body + '</div>';
}

function renderLiveDashboard(container, manifest, tasks, logs, files, dashboard){
  var latest = (dashboard && dashboard.latest) || manifest.latest || files.slice().sort(function(a,b){
    return String(b.updated||'').localeCompare(String(a.updated||''));
  }).slice(0,5);
  var nextActions = (dashboard && dashboard.nextActions) || manifest.nextActions || tasks.filter(function(t){ return t.status !== 'done'; }).slice(0,4);
  var todayLogs = logs.slice(0,5);
  var netlify = 'https://tianwailaike.netlify.app/';
  container.innerHTML =
    dashboardCard('正式网站链接', '<p>Netlify 正式站点已上线，后续预览和分享统一使用正式链接。</p><a class="btn btn-primary wide" href="' + netlify + '" target="_blank" rel="noopener">打开 Netlify 正式站</a>', 'launch') +
    dashboardCard('最新进度', '<ul class="mini-list">' + latest.slice(0,5).map(function(item){
      return '<li><strong>' + item.title + '</strong><span>' + formatDateTime(item.updated) + ' · ' + (item.module || '更新') + '</span><p>' + (item.summary||'') + '</p></li>';
    }).join('') + '</ul>') +
    dashboardCard('今日更新', '<ul class="mini-list compact">' + todayLogs.map(function(item){
      return '<li><strong>' + item.summary + '</strong><span>' + item.date + ' · ' + item.module + '</span></li>';
    }).join('') + '</ul>') +
    dashboardCard('下一步', '<ul class="next-list">' + nextActions.slice(0,4).map(function(item){
      return '<li><span>' + badge(item.status) + '</span><div><strong>' + item.title + '</strong><p>' + (item.nextAction || item.summary || '') + '</p></div></li>';
    }).join('') + '</ul>');
}

function timelineItem(log){
  return '<div class="timeline-item"><div class="tl-date">' + log.date + '</div><div class="tl-summary">' + log.summary + '</div><div class="tl-module">' + log.module + '</div></div>';
}

/* ---- Files ---- */
function getFileGroup(f){
  var text = (f.title||'') + ' ' + (f.fileName||'') + ' ' + ((f.keywords||[]).join(' ')) + ' ' + (f.sourceRef||'');
  if(/审稿|校对|停顿|语气|真人感|TTS|听书|audio/i.test(text)) return '审稿 / TTS';
  if(/连续性|资产数据库|分镜关联|母图|资产/i.test(text)) return '连续性 / 资产';
  if(/规划|章纲|连载|钩子|标题库|第04-10章/i.test(text)) return '连载规划';
  if(/网站|部署|Netlify|site|manifest|localtunnel/i.test(text)) return '网站部署';
  if(f.module === 'short-drama') return '短剧制作';
  if(f.module === 'novel') return '小说正文';
  return '其他资料';
}
function isHighlightedFile(f){
  var group = getFileGroup(f);
  return ['审稿 / TTS','连续性 / 资产','连载规划','网站部署'].indexOf(group) >= 0;
}
function fileCard(f){
  var group = getFileGroup(f);
  return '<div class="file-card' + (isHighlightedFile(f) ? ' highlight' : '') + '">' +
    '<div class="fc-top"><span class="badge ' + f.module + '">' + f.module + '</span><span class="file-group-pill">' + group + '</span></div>' +
    '<div class="fc-title" title="' + f.fileName + '">' + f.title + '</div>' +
    '<div class="fc-meta"><span>' + (f.sizeLabel||'') + '</span><span>' + formatDateTime(f.updated) + '</span></div>' +
    '<div class="fc-summary">' + (f.summary||f.fileName) + '</div>' +
    '</div>';
}
function fileGroupBlock(group, list){
  return '<section class="file-group"><div class="file-group-head"><h3>' + group + '</h3><span>' + list.length + ' 份</span></div><div class="file-list" style="display:block">' + list.slice(0,60).map(fileCard).join('') + '</div></section>';
}

/* ---- Novel Reader ---- */
function buildNovelReader(){
  if(document.getElementById('novelReader')) return;
  var reader = document.createElement('aside');
  reader.id = 'novelReader';
  reader.className = 'novel-reader';
  reader.setAttribute('aria-hidden','true');
  reader.innerHTML = '<div class="reader-backdrop" data-close-reader></div>' +
    '<article class="reader-panel" role="dialog" aria-modal="true" aria-labelledby="readerTitle">' +
      '<button class="reader-close" type="button" data-close-reader aria-label="关闭正文">✕</button>' +
      '<div class="reader-meta" id="readerMeta"></div>' +
      '<h2 id="readerTitle"></h2>' +
      '<div class="reader-review" id="readerReview"></div>' +
      '<div class="reader-source" id="readerSource"></div>' +
      '<div class="reader-body" id="readerBody"></div>' +
      '<div class="reader-next" id="readerNext"></div>' +
      '<div class="reader-notice" id="readerNotice"></div>' +
    '</article>';
  document.body.appendChild(reader);
  reader.addEventListener('click', function(e){
    if(e.target.closest('[data-close-reader]')) closeNovelReader();
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && reader.classList.contains('open')) closeNovelReader();
  });
}
function closeNovelReader(){
  var reader = document.getElementById('novelReader');
  if(!reader) return;
  reader.classList.remove('open');
  reader.setAttribute('aria-hidden','true');
  document.body.classList.remove('reader-lock');
}
function openNovelReader(chapterId){
  var reader = document.getElementById('novelReader');
  var novel = (cache.novelTexts || []).find(function(item){ return item.chapterId === chapterId || item.id === chapterId; });
  if(!reader || !novel) return;
  reader.querySelector('#readerMeta').textContent = '第' + String(novel.number).padStart(2,'0') + '章 · ' + (novel.sourceType || '正文') + ' · ' + formatDateTime(novel.updated);
  reader.querySelector('#readerTitle').textContent = novel.title || '第' + String(novel.number).padStart(2,'0') + '章';
  var maturity = Number(novel.maturity || 0);
  var tags = (novel.planningTags || []).map(function(t){ return '<span>' + escapeHtml(t) + '</span>'; }).join('');
  reader.querySelector('#readerReview').innerHTML = '<div class="review-state"><strong>审核状态</strong><b>' + escapeHtml(novel.reviewStatus || '待审') + '</b></div>' +
    '<div class="review-progress"><i style="width:' + Math.max(4,maturity) + '%"></i><em>' + maturity + '% 完善度</em></div>' +
    (tags ? '<div class="reader-tags">' + tags + '</div>' : '') +
    '<p>' + escapeHtml(novel.reviewConclusion || '') + '</p>';
  reader.querySelector('#readerSource').innerHTML = '<strong>出处说明：</strong>' + escapeHtml(novel.origin || '');
  reader.querySelector('#readerBody').innerHTML = bodyToParagraphs(novel.body || '本章暂未形成可开放正文。');
  reader.querySelector('#readerNext').innerHTML = '<strong>下一步：</strong>' + escapeHtml(novel.nextAction || '补充审稿和正文完善计划。');
  reader.querySelector('#readerNotice').innerHTML = '<strong>转载说明：</strong>' + escapeHtml(novel.copyrightNotice || '转载请注明出处：本站《天外来客》项目总控台。');
  reader.classList.add('open');
  reader.setAttribute('aria-hidden','false');
  document.body.classList.add('reader-lock');
  var panel = reader.querySelector('.reader-panel');
  if(panel) panel.scrollTop = 0;
}
function bindChapterReader(container){
  container.querySelectorAll('.chapter-open').forEach(function(btn){
    btn.addEventListener('click', function(){ openNovelReader(btn.dataset.chapter); });
  });
}

/* ===== Main render ===== */
var cache = {};

async function init(){
  initTheme();
  initBackToTop();
  initScrollReveal();
  // Setup mobile nav click to close
  document.querySelectorAll('.mnav-link').forEach(function(a){
    a.addEventListener('click', function(){
      document.querySelectorAll('.mnav-link').forEach(function(l){ l.removeAttribute('aria-current'); });
    });
  });

  try{
    var results = await Promise.all([
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
    var manifest = results[0], chapters = results[1], novelTexts = results[2];
    var audio = results[3], assets = results[4], tasks = results[5];
    var logs = results[6], files = results[7], dashboard = results[8], supervision = results[9];
    cache = {manifest:manifest, chapters:chapters, novelTexts:novelTexts, audio:audio, assets:assets, tasks:tasks, logs:logs, files:files, dashboard:dashboard, supervision:supervision};

    buildNovelReader();

    /* Stats */
    var s = manifest.stats;
    document.getElementById('stats').innerHTML =
      statCard('小说章节', s.chapters) +
      statCard('音频文件', s.audio, ' blue') +
      statCard('短剧文件', s.shortDramaFiles, ' blue') +
      statCard('资料文件', s.outputFiles, ' green');

    /* Tagline */
    var taglineEl = document.getElementById('tagline');
    if(taglineEl) taglineEl.textContent = manifest.site.tagline;

    /* Version */
    var verEl = document.getElementById('siteVersion');
    if(verEl) verEl.textContent = manifest.site.version;

    /* Live dashboard */
    renderLiveDashboard(document.getElementById('liveDashboard'), manifest, tasks, logs, files, dashboard);

    /* Modules */
    document.getElementById('modules').innerHTML = manifest.modules.map(moduleCard).join('');

    /* Chapters */
    var chaptersEl = document.getElementById('chapters');
    chaptersEl.innerHTML = chapters.map(chapterItem).join('');
    bindChapterReader(chaptersEl);

    /* Language assets */
    renderLanguageAssets(document.getElementById('languageAssets'), chapters);

    /* Short drama assets */
    document.getElementById('assets').innerHTML = assets.map(assetCard).join('');

    /* Audio Player */
    renderAudioPlayer(document.getElementById('audio'), audio);

    /* Tasks / Supervision */
    var tasksEl = document.getElementById('tasks');
    if(supervision){
      renderSupervision(tasksEl, supervision);
    }else{
      tasksEl.innerHTML = tasks.map(taskCard).join('');
    }

    /* Files */
    var filesEl = document.getElementById('filesList');
    function renderFiles(list){
      var groups = ['审稿 / TTS','连续性 / 资产','连载规划','网站部署','短剧制作','小说正文','其他资料'];
      filesEl.innerHTML = groups.map(function(grp){
        var grouped = list.filter(function(f){ return getFileGroup(f) === grp; });
        return grouped.length ? fileGroupBlock(grp, grouped) : '';
      }).join('') || '<p class="muted" style="color:var(--text-muted);font-size:.85rem;padding:1rem">没有找到匹配文件。</p>';
    }
    renderFiles(files);
    var searchInput = document.getElementById('fileSearch');
    if(searchInput){
      searchInput.addEventListener('input', function(){
        var q = this.value.trim().toLowerCase();
        if(!q){ renderFiles(files); return; }
        renderFiles(files.filter(function(f){
          return (f.title||'').toLowerCase().indexOf(q) >= 0 ||
            (f.fileName||'').toLowerCase().indexOf(q) >= 0 ||
            (f.module||'').toLowerCase().indexOf(q) >= 0 ||
            (f.keywords||[]).some(function(k){ return k.toLowerCase().indexOf(q) >= 0; }) ||
            (f.summary||'').toLowerCase().indexOf(q) >= 0;
        }));
      });
    }

    /* Logs */
    document.getElementById('logsList').innerHTML = logs.map(timelineItem).join('');

    /* Route */
    route();

    /* Reactive observer for new content */
    setTimeout(initScrollReveal, 100);

  }catch(e){
    console.error('渲染失败：', e);
    document.querySelectorAll('#stats,#modules,#chapters,#assets,#audio,#tasks,#filesList,#logsList').forEach(function(el){
      if(el) el.innerHTML = '<p class="muted" style="color:var(--text-muted);font-size:.85rem;padding:1rem">（数据加载失败：' + e.message + '。请确认项目目录结构正确。）</p>';
    });
  }
}

/* ---- PWA manifest check ---- */
if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('/sw.js').catch(function(err){
      console.info('ServiceWorker registration skipped:', err.message);
    });
  });
}

init();

})();
