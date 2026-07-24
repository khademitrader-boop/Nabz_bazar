(function(){
  'use strict';

  if(!('serviceWorker' in navigator)) return;

  // Registering while the page itself is still loading competes for the
  // network/CPU with things that actually matter for first paint (fonts,
  // the tgju widget engine, css). Waiting for `load` means the SW install
  // only kicks off once the page is already fully up and interactive.
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('service-worker.js').then(function(reg){
      // If a new shell is already installed and waiting (e.g. this tab
      // was open when a new version was deployed), there's no UI here to
      // prompt the visitor - simply let it take over on their next
      // natural navigation instead of forcing a disruptive reload while
      // they're actively watching live prices.
      reg.addEventListener('updatefound', function(){
        var installing = reg.installing;
        if(!installing) return;
        installing.addEventListener('statechange', function(){
          // No-op on purpose - see comment above. Kept as a hook for
          // anyone who wants to surface an "update available" toast later.
        });
      });
    }).catch(function(){
      // Registration can fail for all sorts of harmless reasons (private
      // browsing storage restrictions, blocked scope, etc). The site is
      // fully functional without a service worker, so this must never
      // surface as an unhandled promise rejection or a console error.
    });
  });

})();
