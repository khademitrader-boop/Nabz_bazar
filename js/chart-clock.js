(function(){
  'use strict';

  /* ---------- Clock ---------- */
  var clockHM = document.getElementById('clockHM');
  var clockSec = document.getElementById('clockSec');
  function tickClock(){
    var now = new Date();
    var fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    var parts = {};
    fmt.formatToParts(now).forEach(function(p){ parts[p.type] = p.value; });
    if(clockHM) clockHM.textContent = parts.hour + ':' + parts.minute;
    if(clockSec) clockSec.textContent = ':' + parts.second;
  }
  tickClock();
  setInterval(tickClock, 1000);

})();
