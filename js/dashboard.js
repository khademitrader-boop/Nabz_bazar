(function(){
  'use strict';

  // ---------- Refresh button ----------
  var refreshBtn = document.getElementById('refreshBtn');
  refreshBtn.addEventListener('click', function(){
    if(refreshBtn.classList.contains('spinning')) return;
    refreshBtn.classList.add('spinning');
    setTimeout(function(){ location.reload(); }, 350);
  });

  // NOTE: the old "[data-widget]"/"<tgju>" skeleton-handoff + "last updated"
  // badge logic that used to live here was removed. The markets section now
  // uses the mihanarz widgets (see .mz-widget-box in css/style.css) and no
  // page ships a [data-widget] wrapper or a <tgju> element anymore - that
  // whole block was querying an empty NodeList and doing nothing on every
  // single page load (building an Intl formatter, setting up a 30s
  // setInterval that stamped badges that don't exist, etc). Removed.

})();
