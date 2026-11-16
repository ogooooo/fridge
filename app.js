/* 우주아라네 냉장고 — data.json 기반 단일 페이지 앱 */
(function () {
  'use strict';

  var KEY_CONSUMED = 'uyb-fridge:consumed:v1';
  var KEY_SHOP = 'uyb-fridge:shopping:v1';

  var TABS = [
    { id: 'all', icon: '🏠', label: '전체 보기' },
    { id: 'week', icon: '📅', label: '주간 식단' },
    { id: 'fridge', icon: '❄️', label: '냉장실', zone: '냉장' },
    { id: 'freezer', icon: '🧊', label: '냉동실', zone: '냉동' },
    { id: 'room', icon: '🧺', label: '실온', zone: '실온' },
    { id: 'simple', icon: '🍳', label: '간단 식단' },
    { id: 'shop', icon: '🛒', label: '장보기' }
  ];

  var ZONES = [
    { key: '냉장', label: '냉장실', icon: '❄️' },
    { key: '냉동', label: '냉동실', icon: '🧊' },
    { key: '실온', label: '실온', icon: '🧺' }
  ];

  var DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

  var state = {
    data: null,
    tab: 'all',
    query: '',
    category: '전체',
    expanded: {},
    consumed: loadSet(KEY_CONSUMED),
    shopping: loadSet(KEY_SHOP)
  };

  function loadSet(key) {
    var out = {};
    try {
      var raw = window.localStorage.getItem(key);
      if (raw) JSON.parse(raw).forEach(function (v) { out[v] = true; });
    } catch (e) { /* 저장소를 못 쓰면 그냥 무시 */ }
    return out;
  }

  function saveSet(key, obj) {
    try {
      window.localStorage.setItem(key, JSON.stringify(Object.keys(obj).filter(function (k) { return obj[k]; })));
    } catch (e) { /* 무시 */ }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function norm(s) {
    return String(s == null ? '' : s).replace(/\s+/g, '').toLowerCase();
  }

  function todayStr() {
    var d = new Date();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function parseDate(str) {
    if (!str) return null;
    var p = String(str).split('T')[0].split('-');
    if (p.length !== 3) return null;
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function dayDiff(a, b) {
    if (!a || !b) return null;
    return Math.round((a.getTime() - b.getTime()) / 86400000);
  }

  function formatUpdated(iso) {
    var d = iso ? new Date(iso) : null;
    if (!d || isNaN(d.getTime())) return '—';
    var h = d.getHours();
    var ampm = h < 12 ? '오전' : '오후';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    var min = ('0' + d.getMinutes()).slice(-2);
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + DAY_NAMES[d.getDay()] + ') ' + ampm + ' ' + h12 + ':' + min;
  }

  function formatShortDate(str) {
    var d = parseDate(str);
    if (!d) return '';
    return (d.getMonth() + 1) + '/' + d.getDate() + '(' + DAY_NAMES[d.getDay()] + ')';
  }

  /* ---------- 데이터 파생 ---------- */
  function items() {
    return (state.data && Array.isArray(state.data.items)) ? state.data.items : [];
  }

  function isExpiringSoon(item) {
    var d = parseDate(item.expiry);
    if (!d) return false;
    var diff = dayDiff(d, parseDate(todayStr()));
    return diff != null && diff <= 3;
  }

  function usableItems() {
    return items().filter(function (it) { return !state.consumed[it.id]; });
  }

  function zoneCount(zone) {
    return usableItems().filter(function (it) { return it.zone === zone; }).length;
  }

  function counts() {
    var list = usableItems();
    return {
      냉장: list.filter(function (i) { return i.zone === '냉장'; }).length,
      냉동: list.filter(function (i) { return i.zone === '냉동'; }).length,
      실온: list.filter(function (i) { return i.zone === '실온'; }).length,
      hot: list.filter(function (i) { return i.priority; }).length,
      soon: list.filter(isExpiringSoon).length
    };
  }

  var inventoryIndex = null;
  function hasItem(name) {
    if (!inventoryIndex) {
      inventoryIndex = usableItems().map(function (it) { return norm(it.name); });
    }
    var n = norm(name);
    if (!n) return true;
    return inventoryIndex.some(function (x) { return x === n || x.indexOf(n) !== -1 || n.indexOf(x) !== -1; });
  }

  /* ---------- 필터 ---------- */
  function filteredItems(list) {
    var q = norm(state.query);
    var cat = state.category;
    return list.filter(function (it) {
      if (cat === '아이 맞춤') {
        if (!it.kids) return false;
      } else if (cat !== '전체') {
        if (it.category !== cat) return false;
      }
      if (!q) return true;
      var hay = norm([it.name, it.note, it.category, it.zone, it.qty].join(' '));
      return hay.indexOf(q) !== -1;
    });
  }

  function hasFilter() {
    return !!norm(state.query) || state.category !== '전체';
  }

  /* ---------- 렌더: 헤더 ---------- */
  function renderHeader() {
    var d = state.data || {};
    document.getElementById('appTitle').textContent = d.title || '우주아라네 냉장고';
    document.getElementById('appSubtitle').textContent = d.subtitle || '냉장실 · 냉동실 · 실온 재료를 한 번에 볼 수 있어요';
    document.getElementById('updatedAt').textContent = formatUpdated(d.updatedAt);
    document.title = d.title || '우주아라네 냉장고';

    var c = counts();
    var badges = [
      { cls: 'cold', icon: '❄️', label: '냉장', n: c.냉장 },
      { cls: 'freeze', icon: '🧊', label: '냉동', n: c.냉동 },
      { cls: 'room', icon: '🧺', label: '실온', n: c.실온 },
      { cls: 'hot', icon: '🔥', label: '우선 소진', n: c.hot },
      { cls: 'soon', icon: '⏰', label: '임박', n: c.soon }
    ];
    document.getElementById('badges').innerHTML = badges.map(function (b) {
      return '<span class="badge ' + b.cls + '"><span aria-hidden="true">' + b.icon + '</span>' +
        b.label + ' <b>' + b.n + '</b></span>';
    }).join('');
  }

  /* ---------- 렌더: 탭 ---------- */
  function renderTabs() {
    document.getElementById('tabs').innerHTML = TABS.map(function (t) {
      return '<button class="tab" type="button" role="tab" data-tab="' + t.id + '" aria-selected="' +
        (state.tab === t.id ? 'true' : 'false') + '"><span class="tab-ico" aria-hidden="true">' + t.icon +
        '</span>' + esc(t.label) + '</button>';
    }).join('');
  }

  function currentTab() {
    for (var i = 0; i < TABS.length; i++) if (TABS[i].id === state.tab) return TABS[i];
    return TABS[0];
  }

  /* ---------- 렌더: 칩 ---------- */
  function renderChips() {
    var wrap = document.getElementById('searchWrap');
    var tab = currentTab();
    var isItemTab = !!tab.zone || tab.id === 'all';
    var showSearch = isItemTab || tab.id === 'simple';
    wrap.classList.toggle('hidden', !showSearch);
    if (!showSearch) return;
    var cats = isItemTab
      ? ((state.data && state.data.categories) ? state.data.categories : ['전체'])
      : ['전체', '아이 맞춤'];
    if (!isItemTab && cats.indexOf(state.category) === -1) state.category = '전체';
    document.getElementById('chips').innerHTML = cats.map(function (c) {
      return '<button class="chip-btn" type="button" data-cat="' + esc(c) + '" aria-pressed="' +
        (state.category === c ? 'true' : 'false') + '">' + esc(c) + '</button>';
    }).join('');
  }

  /* ---------- 렌더: 재료 행 ---------- */
  function itemRow(it) {
    var done = !!state.consumed[it.id];
    var tags = [];
    if (it.kids) tags.push('<span class="tag kids">아이 맞춤</span>');
    if (it.priority) tags.push('<span class="tag hot">우선 소진</span>');
    if (isExpiringSoon(it)) tags.push('<span class="tag soon">임박</span>');
    var meta = [ZONES.filter(function (z) { return z.key === it.zone; })[0] ?
      ZONES.filter(function (z) { return z.key === it.zone; })[0].label : it.zone,
      it.category || '', it.qty || ''].filter(Boolean).join(' · ');

    return '<li class="item' + (done ? ' done' : '') + '">' +
      '<span class="item-emoji" aria-hidden="true">' + esc(it.emoji || '🍽') + '</span>' +
      '<div class="item-main">' +
        '<div class="item-name">' + esc(it.name) + tags.join('') + '</div>' +
        '<div class="item-meta">' + esc(meta) + '</div>' +
        (it.note ? '<div class="item-note">' + esc(it.note) + '</div>' : '') +
      '</div>' +
      '<button class="use-btn' + (done ? ' on' : '') + '" type="button" data-use="' + esc(it.id) + '">' +
        (done ? '되돌리기' : '다 씀') + '</button>' +
    '</li>';
  }

  function zoneBlock(zone, list, opts) {
    opts = opts || {};
    var filtered = filteredItems(list.filter(function (it) { return it.zone === zone.key; }));
    if (!filtered.length) return '';
    var limitKey = zone.key;
    var limit = opts.limit || 0;
    var isExpanded = !!state.expanded[limitKey];
    var shown = (limit && !isExpanded && filtered.length > limit) ? filtered.slice(0, limit) : filtered;
    var rest = filtered.length - shown.length;

    return '<div class="zone-block">' +
      '<div class="zone-head"><span aria-hidden="true">' + zone.icon + '</span>' + zone.label +
        ' <span class="count">' + filtered.length + '개</span></div>' +
      '<ul class="item-list">' + shown.map(itemRow).join('') + '</ul>' +
      (rest > 0 || (limit && isExpanded && filtered.length > limit)
        ? '<button class="chip-btn" type="button" data-expand="' + limitKey + '" style="margin-top:9px;width:100%">' +
            (rest > 0 ? '더 보기 (' + rest + '개)' : '접기') + '</button>'
        : '') +
    '</div>';
  }

  function emptyItems() {
    return '<div class="empty"><span class="empty-emoji" aria-hidden="true">🧺</span>' +
      '<div class="empty-title">아직 담긴 재료가 없어요</div>' +
      '<p class="empty-text"><code>data.json</code>의 <code>items</code>에 재료를 추가하면 ' +
      '여기에 바로 채워져요. 냉장·냉동·실온과 카테고리를 함께 적어 주세요.</p></div>';
  }

  function noMatch() {
    return '<div class="empty"><span class="empty-emoji" aria-hidden="true">🔍</span>' +
      '<div class="empty-title">찾는 재료가 없어요</div>' +
      '<p class="empty-text">다른 이름으로 검색하거나 필터를 “전체”로 바꿔 보세요.</p></div>';
  }

  /* ---------- 렌더: 오늘 뭐 먹지 ---------- */
  function mealCard(meal) {
    var ings = (meal.ingredients || []).map(function (name) {
      var missing = !hasItem(name);
      return '<span class="ing' + (missing ? ' missing' : '') + '">' + esc(name) + '</span>';
    }).join('');
    var tags = (meal.tags || []).map(function (t) {
      var cls = t.indexOf('아이') !== -1 ? 'kids' : (t.indexOf('소진') !== -1 ? 'hot' : (t.indexOf('네 가족') !== -1 ? 'family' : ''));
      return '<span class="tag ' + cls + '">' + esc(t) + '</span>';
    }).join('');
    return '<article class="meal">' +
      '<div class="meal-top">' +
        (meal.slot ? '<span class="meal-slot">' + esc(meal.slot) + '</span>' : '') +
        '<span class="meal-title">' + esc(meal.emoji || '🍽') + ' ' + esc(meal.title) + '</span>' +
      '</div>' +
      '<div class="meal-ings">' + ings + '</div>' +
      '<div class="meal-foot">' + (meal.time ? '<span class="time-pill">⏱ ' + esc(meal.time) + '</span>' : '') + tags + '</div>' +
      (meal.steps ? '<p class="meal-steps">' + esc(meal.steps) + '</p>' : '') +
    '</article>';
  }

  function todaySection() {
    var menu = state.data && state.data.todayMenu;
    if (!menu) return '';
    var nav = '<span class="section-note">오늘 ' + formatShortDate(menu.date || todayStr()) + ' 식단</span>';
    var groups = (menu.groups || []).map(function (g) {
      return '<div class="meal-group ' + (g.tone || '') + '">' +
        '<div class="meal-group-head"><span aria-hidden="true">' + esc(g.emoji || '🍱') + '</span>' + esc(g.label) + '</div>' +
        (g.meals || []).map(mealCard).join('') +
      '</div>';
    }).join('');
    return '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">🔍 오늘 뭐 먹지?</h2>' + nav + '</div>' +
      (menu.note ? '<p class="section-caption">' + esc(menu.note) + '</p>' : '') +
      groups +
    '</section>';
  }

  function hotSection() {
    var hot = usableItems().filter(function (it) { return it.priority; });
    if (!hot.length) return '';
    return '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">🔥 먼저 써야 할 재료</h2>' +
        '<span class="section-note">' + hot.length + '개</span></div>' +
      '<div class="card"><ul class="item-list">' + hot.map(itemRow).join('') + '</ul></div>' +
    '</section>';
  }

  /* ---------- 렌더: 각 탭 ---------- */
  function viewAll() {
    if (!items().length) return todaySection() + (emptyItems());
    var html = todaySection() + hotSection();
    if (hasFilter()) {
      var list = filteredItems(usableItems());
      html += '<section class="section"><div class="section-head">' +
        '<h2 class="section-title">🔎 검색 결과</h2><span class="section-note">' + list.length + '개</span></div>' +
        (list.length
          ? '<div class="card"><ul class="item-list">' + list.map(itemRow).join('') + '</ul></div>'
          : noMatch()) +
        '</section>';
      return html;
    }
    html += '<section class="section"><div class="section-head">' +
      '<h2 class="section-title">🧊 재료 전체</h2><span class="section-note">' + usableItems().length + '개</span></div>' +
      '<div class="card">' +
        ZONES.map(function (z) { return zoneBlock(z, items(), { limit: 4 }); }).join('') +
      '</div></section>';
    return html;
  }

  function viewZone(tab) {
    var list = filteredItems(usableItems().filter(function (it) { return it.zone === tab.zone; }));
    var zone = ZONES.filter(function (z) { return z.key === tab.zone; })[0];
    if (!items().length) return emptyItems();
    return '<section class="section"><div class="section-head">' +
      '<h2 class="section-title">' + zone.icon + ' ' + zone.label + '</h2>' +
      '<span class="section-note">' + list.length + '개</span></div>' +
      (list.length ? '<div class="card"><ul class="item-list">' + list.map(itemRow).join('') + '</ul></div>' : noMatch()) +
      '</section>';
  }

  function viewWeek() {
    var plan = (state.data && state.data.weekPlan) || [];
    if (!plan.length) {
      return '<div class="empty"><span class="empty-emoji" aria-hidden="true">📅</span>' +
        '<div class="empty-title">주간 식단이 아직 없어요</div>' +
        '<p class="empty-text"><code>data.json</code>의 <code>weekPlan</code>에 날짜별 점심·저녁·간식을 적으면 여기에 표시돼요.</p></div>';
    }
    var today = todayStr();
    var rows = plan.map(function (day) {
      var isToday = day.date === today;
      var d = parseDate(day.date);
      var dayNum = d ? d.getDate() : '';
      return '<div class="week-day' + (isToday ? ' today' : '') + '">' +
        '<div class="week-date"><b>' + dayNum + '</b>' +
          esc(day.day || '') + '요일</div>' +
        '<div class="week-meals">' +
          (day.breakfast ? '<div class="week-row"><span class="k">아침</span><span>' + esc(day.breakfast) + '</span></div>' : '') +
          (day.lunch ? '<div class="week-row"><span class="k">점심</span><span>' + esc(day.lunch) + '</span></div>' : '') +
          (day.dinner ? '<div class="week-row"><span class="k">저녁</span><span>' + esc(day.dinner) + '</span></div>' : '') +
          (day.snack ? '<div class="week-row"><span class="k">간식</span><span>' + esc(day.snack) + '</span></div>' : '') +
        '</div>' +
      '</div>';
    }).join('');
    return '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">📅 이번 주 식단</h2>' +
        '<span class="section-note">' + plan.length + '일</span></div>' +
      (state.data.weekNote ? '<p class="section-caption">' + esc(state.data.weekNote) + '</p>' : '') +
      '<div class="card" style="padding:4px 6px">' + rows + '</div>' +
      '<p class="section-note" style="display:block;margin-top:10px;text-align:center">보유 재료로 짠 제안 식단이에요 · 장보기 탭과 함께 보세요</p>' +
    '</section>';
  }

  function viewSimple() {
    var recipes = (state.data && state.data.simpleRecipes) || [];
    if (!recipes.length) {
      return '<div class="empty"><span class="empty-emoji" aria-hidden="true">🍳</span>' +
        '<div class="empty-title">간단 식단이 아직 없어요</div>' +
        '<p class="empty-text"><code>data.json</code>의 <code>simpleRecipes</code>에 레시피를 적으면 여기에 표시돼요.</p></div>';
    }
    var q = norm(state.query);
    var cat = state.category;
    var list = recipes.filter(function (r) {
      if (cat === '아이 맞춤' && !r.kids) return false;
      if (q) {
        var hay = norm([r.title, (r.ingredients || []).join(' '), r.steps].join(' '));
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    return '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">🍳 간단 식단</h2>' +
        '<span class="section-note">' + list.length + '개</span></div>' +
      (list.length ? '<div class="recipe-grid">' + list.map(function (r) {
        var ready = (r.ingredients || []).every(hasItem);
        return '<article class="recipe">' +
          '<span class="recipe-emoji" aria-hidden="true">' + esc(r.emoji || '🍽') + '</span>' +
          '<div class="recipe-body">' +
            '<div class="recipe-title">' + esc(r.title) +
              (r.kids ? ' <span class="tag kids">아이 맞춤</span>' : '') +
              (ready ? '' : ' <span class="tag soon">재료 일부 없음</span>') +
            '</div>' +
            '<div class="meal-foot"><span class="time-pill">⏱ ' + esc(r.time || '') + '</span></div>' +
            '<p class="recipe-line">' + (r.ingredients || []).map(function (n) { return esc(n); }).join(' · ') + '</p>' +
            (r.steps ? '<p class="recipe-steps">' + esc(r.steps) + '</p>' : '') +
          '</div>' +
        '</article>';
      }).join('') + '</div>' : noMatch()) +
    '</section>';
  }

  function viewShop() {
    var list = (state.data && state.data.shopping) || [];
    if (!list.length) {
      return '<div class="empty"><span class="empty-emoji" aria-hidden="true">🛒</span>' +
        '<div class="empty-title">장보기 목록이 비어 있어요</div>' +
        '<p class="empty-text"><code>data.json</code>의 <code>shopping</code>에 사야 할 것을 적으면 여기에 표시돼요.</p></div>';
    }
    var left = list.filter(function (s) { return !state.shopping[s.name]; }).length;
    var rows = list.map(function (s) {
      var checked = !!state.shopping[s.name];
      return '<div class="shop-item' + (checked ? ' checked' : '') + '">' +
        '<button class="shop-check" type="button" data-shop="' + esc(s.name) + '" aria-pressed="' +
          (checked ? 'true' : 'false') + '" aria-label="' + esc(s.name) + ' 담기 표시">✓</button>' +
        '<div><div class="shop-name">' + esc(s.name) + '</div>' +
          '<div class="shop-reason">' + esc(s.category || '') + (s.reason ? ' · ' + esc(s.reason) : '') + '</div></div>' +
      '</div>';
    }).join('');
    return '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">🛒 장보기</h2>' +
        '<span class="section-note">' + left + '개 남음</span></div>' +
      '<div class="card">' + rows + '</div>' +
    '</section>';
  }

  function renderContent() {
    var tab = currentTab();
    var html;
    if (tab.id === 'all') html = viewAll();
    else if (tab.id === 'week') html = viewWeek();
    else if (tab.id === 'simple') html = viewSimple();
    else if (tab.id === 'shop') html = viewShop();
    else html = viewZone(tab);
    document.getElementById('content').innerHTML = html;
  }

  function render() {
    renderHeader();
    renderTabs();
    renderChips();
    renderContent();
  }

  /* ---------- 이벤트 ---------- */
  function bind() {
    document.getElementById('tabs').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tab]');
      if (!btn) return;
      state.tab = btn.getAttribute('data-tab');
      renderTabs();
      renderChips();
      renderContent();
      var tabs = document.getElementById('tabs');
      if (tabs.scrollWidth > tabs.clientWidth) {
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('chips').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cat]');
      if (!btn) return;
      state.category = btn.getAttribute('data-cat');
      renderChips();
      renderContent();
    });

    var search = document.getElementById('search');
    var clear = document.getElementById('searchClear');
    search.addEventListener('input', function () {
      state.query = search.value;
      clear.hidden = !search.value;
      renderContent();
    });
    clear.addEventListener('click', function () {
      search.value = '';
      state.query = '';
      clear.hidden = true;
      renderContent();
      search.focus();
    });

    document.getElementById('content').addEventListener('click', function (e) {
      var useBtn = e.target.closest('[data-use]');
      if (useBtn) {
        var id = useBtn.getAttribute('data-use');
        state.consumed[id] = !state.consumed[id];
        saveSet(KEY_CONSUMED, state.consumed);
        inventoryIndex = null;
        render();
        return;
      }
      var shopBtn = e.target.closest('[data-shop]');
      if (shopBtn) {
        var name = shopBtn.getAttribute('data-shop');
        state.shopping[name] = !state.shopping[name];
        saveSet(KEY_SHOP, state.shopping);
        renderContent();
        return;
      }
      var exp = e.target.closest('[data-expand]');
      if (exp) {
        var key = exp.getAttribute('data-expand');
        state.expanded[key] = !state.expanded[key];
        renderContent();
      }
    });
  }

  /* ---------- 시작 ---------- */
  function load() {
    fetch('data.json', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        state.data = data;
        inventoryIndex = null;
        render();
      })
      .catch(function (err) {
        document.getElementById('updatedAt').textContent = '데이터를 불러오지 못했어요';
        document.getElementById('content').innerHTML =
          '<div class="empty"><span class="empty-emoji" aria-hidden="true">😢</span>' +
          '<div class="empty-title">data.json을 읽지 못했어요</div>' +
          '<p class="empty-text">파일이 같은 폴더에 있는지 확인해 주세요. (' + esc(err.message) + ')</p></div>';
      });
  }

  bind();
  renderHeader();
  renderTabs();
  load();
})();
