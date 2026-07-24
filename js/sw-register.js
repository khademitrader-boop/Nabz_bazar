(function(){
  'use strict';

  if(!('serviceWorker' in navigator)) return;

  // Registered as soon as this script runs (it's loaded with `defer`, so
  // the DOM is already parsed by this point). Service worker registration
  // is async and doesn't block rendering, so there's no real benefit to
  // waiting for the `load` event - and waiting can make automated PWA
  // scanners (which run with a short timeout) miss the registration
  // entirely if third-party widgets/fonts are slow to finish loading.
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

})();
