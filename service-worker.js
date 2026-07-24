'use strict';

/* Service worker for "نبض بازار".
   Scope: caches the site's own static shell only (HTML/CSS/JS/manifest).
   Anything that carries live data - the tgju widget engine and its API,
   the BrsApi/TradingView scripts, Google/Vazirmatn fonts - is deliberately
   left alone in the fetch handler below and always goes straight to the
   network, so a stale cache can never show an out-of-date price or chart. */

var CACHE_VERSION = 'v2';
var STATIC_CACHE = 'nb-shell-' + CACHE_VERSION;

var PRECACHE_URLS = [
  'index.html',
  'chart.html',
  'notes.html',
  'css/style.css',
  'css/chart.css',
  'js/theme.js',
  'js/widget-theme-fix.js',
  'js/header-scroll.js',
  'js/nav.js',
  'js/dashboard.js',
  'js/ui-controls.js',
  'js/calculator.js',
  'js/notes-store.js',
  'js/calendar.js',
  'js/notes-list.js',
  'js/sw-register.js',
  'js/chart-data.js',
  'js/chart-clock.js',
  'js/chart.js',
  'manifest.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-192-maskable.png',
  'icons/icon-512-maskable.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache){
      // cache.addAll() fails the *entire* install if a single URL 404s.
      // Caching each URL independently means one missing/renamed asset
      // can never block the rest of the shell from being cached.
      return Promise.all(PRECACHE_URLS.map(function(url){
        return cache.add(url).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys
          .filter(function(key){ return key !== STATIC_CACHE; })
          .map(function(key){ return caches.delete(key); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

function isNavigationRequest(request){
  if(request.mode === 'navigate') return true;
  var accept = request.headers.get('accept');
  return request.method === 'GET' && !!accept && accept.indexOf('text/html') !== -1;
}

self.addEventListener('fetch', function(event){
  var request = event.request;
  if(request.method !== 'GET') return;

  var url = new URL(request.url);

  // Cross-origin requests power the live market widgets, the price feed
  // and the advanced chart. Never intercept them - always hit the network.
  if(url.origin !== self.location.origin) return;

  if(isNavigationRequest(request)){
    // Network-first for pages: visitors get the live page whenever
    // possible, falling back to the cached shell only when actually
    // offline (or the network request fails outright).
    event.respondWith(
      fetch(request).then(function(response){
        var copy = response.clone();
        caches.open(STATIC_CACHE).then(function(cache){ cache.put(request, copy); });
        return response;
      }).catch(function(){
        return caches.match(request).then(function(cached){
          return cached || caches.match('index.html');
        });
      })
    );
    return;
  }

  // Same-origin static assets (css/js/manifest): stale-while-revalidate.
  // The visitor gets an instant response from cache when one exists, and
  // the cache is refreshed quietly in the background for next time.
  event.respondWith(
    caches.match(request).then(function(cached){
      var network = fetch(request).then(function(response){
        if(response && response.ok){
          var copy = response.clone();
          caches.open(STATIC_CACHE).then(function(cache){ cache.put(request, copy); });
        }
        return response;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
