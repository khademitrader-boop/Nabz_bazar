(function(){
  'use strict';

  /* ------------------------------------------------------------
     Market Analysis feed for گلد / بیت‌کوین / اتریوم.

     There is no backend on this site, so "خودش آپدیت بشه" is done
     the only honest way a static site can: every time someone
     opens the page (and every few minutes while it stays open) it
     pulls the freshest Persian news/analysis for each asset live
     from Google News, parses it in the browser and rebuilds the
     cards — no manual editing ever required. Results are cached
     in localStorage so the page still shows the last-known
     analyses instantly and even if the visitor is offline.
     ------------------------------------------------------------ */

  var root = document.getElementById('analysisRoot');
  if(!root) return;

  var FEEDS = {
    gold: { query: '(طلا OR انس جهانی OR سکه) analysis' },
    btc: { query: '(بیت‌کوین OR بیتکوین) analysis' },
    eth: { query: '(اتریوم OR اتریم) analysis' }
  };

  var CORS_PROXIES = [
    function(u){ return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); },
    function(u){ return 'https://corsproxy.io/?url=' + encodeURIComponent(u); }
  ];

  var CACHE_PREFIX = 'nb-analysis-cache-';
  var REFRESH_MS = 20 * 60 * 1000; // auto refresh every 20 minutes while the tab is open
  var ITEMS_PER_FEED = 6;

  function newsUrl(query){
    return 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=fa&gl=IR&ceid=IR:fa';
  }

  function stripHtml(html){
    var tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function parseFeed(xmlText){
    var doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    if(doc.querySelector('parsererror')) return [];
    var nodes = doc.querySelectorAll('item');
    var out = [];
    for(var i = 0; i < nodes.length && out.length < ITEMS_PER_FEED; i++){
      var item = nodes[i];
      var titleEl = item.querySelector('title');
      var linkEl = item.querySelector('link');
      var pubEl = item.querySelector('pubDate');
      var sourceEl = item.querySelector('source');
      var descEl = item.querySelector('description');
      var title = stripHtml(titleEl ? titleEl.textContent : '');
      if(!title) continue;
      out.push({
        title: title,
        link: linkEl ? (linkEl.textContent || '').trim() : '#',
        pubDate: pubEl ? pubEl.textContent : '',
        source: sourceEl ? sourceEl.textContent : '',
        desc: stripHtml(descEl ? descEl.textContent : '')
      });
    }
    return out;
  }

  function timeAgo(pubDate){
    var d = new Date(pubDate);
    if(isNaN(d.getTime())) return '';
    var diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if(diffMin < 1) return 'همین الان';
    if(diffMin < 60) return diffMin + ' دقیقه پیش';
    var diffH = Math.floor(diffMin / 60);
    if(diffH < 24) return diffH + ' ساعت پیش';
    return Math.floor(diffH / 24) + ' روز پیش';
  }

  function fetchText(url, proxyIndex){
    proxyIndex = proxyIndex || 0;
    if(proxyIndex >= CORS_PROXIES.length){
      return Promise.reject(new Error('no more proxies'));
    }
    return fetch(CORS_PROXIES[proxyIndex](url), { cache: 'no-store' }).then(function(res){
      if(!res.ok) throw new Error('bad response');
      return res.text();
    }).catch(function(){
      return fetchText(url, proxyIndex + 1);
    });
  }

  function badgeLabel(key){
    return key === 'gold' ? 'تحلیل طلا' : (key === 'btc' ? 'تحلیل بیت‌کوین' : 'تحلیل اتریوم');
  }

  function buildCard(item, key){
    var art = document.createElement('article');
    art.className = 'card analysis-card';
    art.setAttribute('data-cat', key === 'gold' ? 'gold' : (key === 'btc' ? 'crypto-btc' : 'crypto-eth'));

    var top = document.createElement('div');
    top.className = 'analysis-card-top';
    var badge = document.createElement('span');
    badge.className = 'analysis-card-badge';
    badge.textContent = badgeLabel(key);
    var time = document.createElement('span');
    time.className = 'analysis-card-time';
    time.textContent = timeAgo(item.pubDate);
    top.appendChild(badge);
    top.appendChild(time);

    var h3 = document.createElement('h3');
    h3.className = 'analysis-card-title';
    var a = document.createElement('a');
    a.href = item.link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer nofollow';
    a.textContent = item.title;
    h3.appendChild(a);

    var desc = document.createElement('p');
    desc.className = 'analysis-card-desc';
    desc.textContent = item.desc || item.title;

    var foot = document.createElement('div');
    foot.className = 'analysis-card-foot';
    var src = document.createElement('span');
    src.className = 'analysis-card-source';
    src.textContent = item.source || 'منبع خبری';
    var link = document.createElement('a');
    link.className = 'analysis-card-link';
    link.href = item.link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer nofollow';
    link.textContent = 'مطالعه کامل ←';
    foot.appendChild(src);
    foot.appendChild(link);

    art.appendChild(top);
    art.appendChild(h3);
    art.appendChild(desc);
    art.appendChild(foot);
    return art;
  }

  function renderSkeleton(container){
    container.innerHTML = '';
    for(var i = 0; i < 3; i++){
      var sk = document.createElement('div');
      sk.className = 'analysis-skeleton';
      sk.innerHTML = '<div class="analysis-skel-row" style="width:70%"></div>' +
                      '<div class="analysis-skel-row" style="width:100%"></div>' +
                      '<div class="analysis-skel-row" style="width:90%"></div>' +
                      '<div class="analysis-skel-row" style="width:40%"></div>';
      container.appendChild(sk);
    }
  }

  function renderItems(container, items, key){
    container.innerHTML = '';
    if(!items.length){
      var empty = document.createElement('div');
      empty.className = 'analysis-empty';
      empty.textContent = 'فعلاً تحلیل تازه‌ای برای این بازار پیدا نشد.';
      container.appendChild(empty);
      return;
    }
    items.forEach(function(item){
      container.appendChild(buildCard(item, key));
    });
  }

  function renderError(container, hasCache){
    container.innerHTML = '';
    var err = document.createElement('div');
    err.className = 'analysis-feed-error';
    err.textContent = hasCache
      ? 'بروزرسانی زنده انجام نشد؛ آخرین تحلیل‌های ذخیره‌شده نمایش داده می‌شود.'
      : 'اتصال به منبع تحلیل برقرار نشد. لطفاً بعداً دوباره امتحان کنید یا دکمه بروزرسانی را بزنید.';
    container.appendChild(err);
  }

  function readCache(key){
    try{
      var raw = localStorage.getItem(CACHE_PREFIX + key);
      if(!raw) return null;
      var parsed = JSON.parse(raw);
      if(parsed && Array.isArray(parsed.items)) return parsed;
    }catch(e){}
    return null;
  }

  function writeCache(key, items){
    try{
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ items: items, ts: Date.now() }));
    }catch(e){}
  }

  function loadFeed(key){
    var container = document.getElementById('feed-' + key);
    if(!container) return Promise.resolve();

    var cached = readCache(key);
    if(cached && cached.items.length){
      renderItems(container, cached.items, key);
    } else {
      renderSkeleton(container);
    }

    return fetchText(newsUrl(FEEDS[key].query)).then(function(xml){
      var items = parseFeed(xml);
      if(!items.length) throw new Error('empty feed');
      writeCache(key, items);
      renderItems(container, items, key);
    }).catch(function(){
      if(cached && cached.items.length){
        renderItems(container, cached.items, key);
      } else {
        renderError(container, false);
      }
    });
  }

  function updateStamp(){
    var stamp = document.getElementById('analysisUpdatedStamp');
    if(!stamp) return;
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, '0');
    var mm = String(now.getMinutes()).padStart(2, '0');
    stamp.textContent = 'آخرین بررسی: ' + hh + ':' + mm;
  }

  function loadAll(){
    var keys = Object.keys(FEEDS);
    return Promise.all(keys.map(loadFeed)).then(updateStamp);
  }

  document.addEventListener('DOMContentLoaded', function(){
    loadAll();
    setInterval(loadAll, REFRESH_MS);

    var refreshBtn = document.getElementById('analysisRefreshBtn');
    if(refreshBtn){
      refreshBtn.addEventListener('click', function(){
        if(refreshBtn.classList.contains('is-spinning')) return;
        refreshBtn.classList.add('is-spinning');
        loadAll().then(function(){
          setTimeout(function(){ refreshBtn.classList.remove('is-spinning'); }, 700);
        });
      });
    }

    // Refresh automatically whenever the tab becomes visible again,
    // so a visitor coming back after a while always sees fresh items.
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState === 'visible') loadAll();
    });
  });

})();
