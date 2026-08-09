(function(){
  'use strict';

  var dial = document.getElementById('fxDial');
  if(!dial) return; // this script only runs on forex-clock.html

  var hourHand = document.getElementById('fxHourHand');
  var minHand = document.getElementById('fxMinHand');
  var handTip = document.getElementById('fxHandTip');
  var centerTime = document.getElementById('fxCenterTime');
  var localTimeEl = document.getElementById('fxLocalTime');
  var overlapEl = document.getElementById('fxOverlap');
  var listEl = document.getElementById('fxSessionList');

  var CX = 180, CY = 180;
  var FACE_R = 156;

  var TICK_OUTER = 154, TICK_MINOR_INNER = 146, TICK_MAJOR_INNER = 138;
  var HOUR_LABEL_R = 166;                 // sits inside the navy bezel

  var MIN_TICK_OUTER = 134, MIN_TICK_INNER = 128;
  var MIN_LABEL_R = 120;

  var OVERLAP_DOT_R = 112;                // dotted "peak liquidity" ring

  var HOUR_HAND_R = 90, HOUR_TAIL = 16;
  var MIN_HAND_R = 145, MIN_TAIL = 20;

  // Session hours are in UTC and are standard approximations - each
  // region's own daylight-saving schedule shifts these by about an hour
  // for part of the year, and they don't all change on the same date, so
  // this is an at-a-glance "who's trading right now" view, not a precise
  // timing tool. Radii are spaced from the outside in, in the order the
  // sessions roll around the globe: New York, London, Tokyo, Sydney.
  var SESSIONS = [
    { id: 'newyork', name: 'نیویورک', code: 'NYSE · NEW YORK',  start: 13, end: 22, color: 'var(--green-bright)', ring: 100 },
    { id: 'london',  name: 'لندن',    code: 'LSE · LONDON',     start: 8,  end: 17, color: 'var(--currency)',     ring: 84  },
    { id: 'tokyo',   name: 'توکیو',   code: 'JPX · TOKYO',      start: 0,  end: 9,  color: 'var(--gold-accent)',  ring: 68  },
    { id: 'sydney',  name: 'سیدنی',   code: 'ASX · SYDNEY',     start: 22, end: 7,  color: 'var(--crypto)',       ring: 52  }
  ];
  var RING_W = 13;

  // The two windows where two sessions trade at once - drives both the
  // dotted "peak liquidity" ring and the soft background wedge.
  var OVERLAPS = [
    { id: 'sydney-tokyo',   a: 'sydney',  b: 'tokyo',   start: 0,  end: 7 },
    { id: 'london-newyork', a: 'london',  b: 'newyork', start: 13, end: 17 }
  ];

  // The whole dial reads in Tehran local time, not UTC - the ring's 0..24
  // numbers are just a generic 24h scale, and everything plotted on it
  // (hand position, session arcs, overlap windows) is shifted from the
  // sessions' real UTC hours by Iran's current UTC offset, computed once
  // here via Intl so it keeps working even if that offset ever changes.
  function computeTehranOffsetMinutes(){
    try{
      var now = new Date();
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(now);
      var h = 0, m = 0;
      parts.forEach(function(p){
        if(p.type === 'hour') h = parseInt(p.value, 10);
        if(p.type === 'minute') m = parseInt(p.value, 10);
      });
      var diff = (h * 60 + m) - (now.getUTCHours() * 60 + now.getUTCMinutes());
      while(diff <= -720) diff += 1440;
      while(diff > 720) diff -= 1440;
      return diff;
    }catch(e){
      return 210; // fallback: Iran Standard Time, UTC+3:30
    }
  }
  var TEHRAN_OFFSET_MIN = computeTehranOffsetMinutes();
  var TEHRAN_OFFSET = TEHRAN_OFFSET_MIN / 60;

  function shiftHour(h, offset){
    var v = (h + offset) % 24;
    return v < 0 ? v + 24 : v;
  }
  SESSIONS.forEach(function(s){
    s.start = shiftHour(s.start, TEHRAN_OFFSET);
    s.end = shiftHour(s.end, TEHRAN_OFFSET);
  });
  OVERLAPS.forEach(function(ov){
    ov.start = shiftHour(ov.start, TEHRAN_OFFSET);
    ov.end = shiftHour(ov.end, TEHRAN_OFFSET);
  });

  function hourKey(h){ return h.toFixed(1).replace('.', '_').replace('-', 'n'); }

  function pad2(n){ return (n < 10 ? '0' : '') + n; }

  function fmtHM(dec){
    var hh = Math.floor(dec);
    var mm = Math.round((dec - hh) * 60);
    if(mm === 60){ mm = 0; hh = (hh + 1) % 24; }
    return pad2(hh) + ':' + pad2(mm);
  }

  function fmtRange(s){
    return fmtHM(s.start) + ' – ' + fmtHM(s.end);
  }

  // frac: 0..1 around the circle, clockwise, 0 = top (12 o'clock).
  function polarFrac(cx, cy, r, frac){
    var rad = frac * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  function polar(cx, cy, r, hourAngle){ return polarFrac(cx, cy, r, hourAngle / 24); }
  function polarMin(cx, cy, r, minute){ return polarFrac(cx, cy, r, minute / 60); }

  function arcPath(r, startH, endH){
    var start = polar(CX, CY, r, startH);
    var end = polar(CX, CY, r, endH);
    var large = (endH - startH + 24) % 24 > 12 ? 1 : 0;
    return 'M ' + start.x.toFixed(2) + ' ' + start.y.toFixed(2) +
           ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + end.x.toFixed(2) + ' ' + end.y.toFixed(2);
  }

  function wedgePath(r, startH, endH){
    var start = polar(CX, CY, r, startH);
    var end = polar(CX, CY, r, endH);
    var large = (endH - startH + 24) % 24 > 12 ? 1 : 0;
    return 'M ' + CX + ' ' + CY +
           ' L ' + start.x.toFixed(2) + ' ' + start.y.toFixed(2) +
           ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + end.x.toFixed(2) + ' ' + end.y.toFixed(2) +
           ' Z';
  }

  function svgEl(tag, attrs){
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for(var k in attrs){ el.setAttribute(k, attrs[k]); }
    return el;
  }

  function addArc(frag, r, startH, endH, color, id){
    frag.appendChild(svgEl('path', { d: arcPath(r, startH, endH), class: 'fx-dial-arc', stroke: color, id: id }));
  }

  // ---------- Build the static (but data-driven) parts of the dial once ----------
  function buildDial(){
    var frag = document.createDocumentFragment();
    var brand = dial.querySelector('.fx-dial-brand');

    // --- 24 hour ticks + rotated numerals on the navy bezel (0 shown as "24") ---
    for(var h = 0; h < 24; h++){
      var isMajor = h % 6 === 0;
      var outer = polar(CX, CY, TICK_OUTER, h);
      var inner = polar(CX, CY, isMajor ? TICK_MAJOR_INNER : TICK_MINOR_INNER, h);
      frag.appendChild(svgEl('line', {
        x1: outer.x.toFixed(2), y1: outer.y.toFixed(2),
        x2: inner.x.toFixed(2), y2: inner.y.toFixed(2),
        class: 'fx-dial-tick' + (isMajor ? ' is-major' : '')
      }));

      var lp = polar(CX, CY, HOUR_LABEL_R, h);
      var deg = (h * 15).toFixed(2);
      var label = svgEl('text', {
        x: lp.x.toFixed(2), y: lp.y.toFixed(2),
        class: 'fx-dial-hnum',
        transform: 'rotate(' + deg + ' ' + lp.x.toFixed(2) + ' ' + lp.y.toFixed(2) + ')'
      });
      label.textContent = pad2(h === 0 ? 24 : h);
      frag.appendChild(label);
    }

    // --- minute track: 12 short ticks + numerals 05..60 ---
    for(var m = 5; m <= 60; m += 5){
      var mo = polarMin(CX, CY, MIN_TICK_OUTER, m === 60 ? 0 : m);
      var mi = polarMin(CX, CY, MIN_TICK_INNER, m === 60 ? 0 : m);
      frag.appendChild(svgEl('line', {
        x1: mo.x.toFixed(2), y1: mo.y.toFixed(2),
        x2: mi.x.toFixed(2), y2: mi.y.toFixed(2),
        class: 'fx-dial-mtick'
      }));
      var mp = polarMin(CX, CY, MIN_LABEL_R, m === 60 ? 0 : m);
      var mlabel = svgEl('text', { x: mp.x.toFixed(2), y: mp.y.toFixed(2), class: 'fx-dial-mnum' });
      mlabel.textContent = String(m);
      frag.appendChild(mlabel);
    }

    // --- one colored arc + curved market label per session ---
    SESSIONS.forEach(function(s){
      var mainId = 'fxArc-' + s.id;
      if(s.start > s.end){
        // Wraps past midnight - two segments; the label rides the longer one.
        addArc(frag, s.ring, s.start, 24, s.color, mainId + '-a');
        addArc(frag, s.ring, 0, s.end, s.color, mainId + '-b');
      } else {
        addArc(frag, s.ring, s.start, s.end, s.color, mainId);
      }

      var labelPathId = mainId + (s.start > s.end ? '-b' : '');
      var text = svgEl('text', { class: 'fx-dial-arclabel' });
      var textPath = svgEl('textPath', { startOffset: '50%' });
      textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#' + labelPathId);
      textPath.textContent = s.code;
      text.appendChild(textPath);
      frag.appendChild(text);
    });

    // --- dotted "peak liquidity" ring: small dots at every hour of each overlap window ---
    OVERLAPS.forEach(function(ov){
      for(var oh = ov.start; oh < ov.end; oh++){
        var dp = polar(CX, CY, OVERLAP_DOT_R, oh);
        frag.appendChild(svgEl('circle', {
          cx: dp.x.toFixed(2), cy: dp.y.toFixed(2), r: 2.6,
          class: 'fx-dial-odot', id: 'fxDot-' + ov.id + '-' + hourKey(oh)
        }));
      }
    });

    dial.insertBefore(frag, brand);

    // Background wedges for the two overlap windows (already in the markup).
    OVERLAPS.forEach(function(ov){
      var wedge = document.getElementById('fxOverlapWedge-' + ov.id);
      if(wedge){ wedge.setAttribute('d', wedgePath(FACE_R, ov.start, ov.end)); }
    });
  }

  // ---------- Session list (built once; only active-state toggles after) ----------
  function buildList(){
    if(!listEl) return;
    listEl.innerHTML = '';
    SESSIONS.forEach(function(s){
      var item = document.createElement('div');
      item.className = 'fx-session';
      item.id = 'fxSession-' + s.id;
      item.style.setProperty('--s-c', s.color);
      item.innerHTML =
        '<span class="fx-session-ring"><span class="fx-session-dot"></span></span>' +
        '<span class="fx-session-text">' +
          '<span class="fx-session-name">' + s.name + '</span>' +
          '<span class="fx-session-range" dir="ltr">تهران ' + fmtRange(s) + '</span>' +
        '</span>' +
        '<span class="fx-session-state">—</span>';
      listEl.appendChild(item);
    });
  }

  function inSession(hourDec, s){
    if(s.start < s.end){ return hourDec >= s.start && hourDec < s.end; }
    return hourDec >= s.start || hourDec < s.end; // wraps midnight
  }

  function update(){
    var now = new Date();
    // Everything on this dial - the hands, the session arcs, the digital
    // readout - reads in Tehran local time. Minutes are derived with
    // integer arithmetic against the fixed offset computed above, so the
    // half-hour (UTC+3:30) doesn't introduce any float drift over time.
    var utcTotalMin = now.getUTCHours() * 60 + now.getUTCMinutes();
    var localTotalMin = ((utcTotalMin + TEHRAN_OFFSET_MIN) % 1440 + 1440) % 1440;
    var localH = Math.floor(localTotalMin / 60);
    var localM = localTotalMin % 60;
    var hourDec = localH + localM / 60;

    // Hands: computed as plain (x1,y1)-(x2,y2) endpoints in the SVG's own
    // coordinate space, the same way the tick marks and arcs above are -
    // no CSS `transform`/`transform-origin` involved, so there's no
    // browser-dependent guessing about which box or unit that origin is
    // relative to. The hour hand sweeps the full 24h dial once a day;
    // the minute hand sweeps the inner minute track once an hour, just
    // like a normal clock. Each also gets a short tail past the pivot.
    var hTip = polar(CX, CY, HOUR_HAND_R, hourDec);
    var hTail = polar(CX, CY, HOUR_TAIL, hourDec + 12);
    if(hourHand){
      hourHand.setAttribute('x1', hTail.x.toFixed(2));
      hourHand.setAttribute('y1', hTail.y.toFixed(2));
      hourHand.setAttribute('x2', hTip.x.toFixed(2));
      hourHand.setAttribute('y2', hTip.y.toFixed(2));
    }

    var mTip = polarMin(CX, CY, MIN_HAND_R, localM);
    var mTail = polarMin(CX, CY, MIN_TAIL, localM + 30);
    if(minHand){
      minHand.setAttribute('x1', mTail.x.toFixed(2));
      minHand.setAttribute('y1', mTail.y.toFixed(2));
      minHand.setAttribute('x2', mTip.x.toFixed(2));
      minHand.setAttribute('y2', mTip.y.toFixed(2));
    }
    if(handTip){
      handTip.setAttribute('cx', mTip.x.toFixed(2));
      handTip.setAttribute('cy', mTip.y.toFixed(2));
    }
    if(centerTime){ centerTime.textContent = pad2(localH) + ':' + pad2(localM); }
    if(localTimeEl){ localTimeEl.textContent = pad2(localH) + ':' + pad2(localM); }

    // Active sessions
    var activeMap = {};
    var activeCount = 0;
    SESSIONS.forEach(function(s){
      var active = inSession(hourDec, s);
      activeMap[s.id] = active;
      if(active) activeCount++;

      var item = document.getElementById('fxSession-' + s.id);
      if(item){
        item.classList.toggle('is-active', active);
        var stateEl = item.querySelector('.fx-session-state');
        if(stateEl){ stateEl.textContent = active ? 'فعال' : 'بسته'; }
      }

      var arc = document.getElementById('fxArc-' + s.id);
      var arcA = document.getElementById('fxArc-' + s.id + '-a');
      var arcB = document.getElementById('fxArc-' + s.id + '-b');
      if(arc){ arc.classList.toggle('is-active', active); }
      if(arcA){ arcA.classList.toggle('is-active', active); }
      if(arcB){ arcB.classList.toggle('is-active', active); }
    });

    // Overlap ring dots + soft wedge: lit up only while BOTH sessions in
    // that pair are open.
    OVERLAPS.forEach(function(ov){
      var isOn = !!(activeMap[ov.a] && activeMap[ov.b]);
      for(var oh = ov.start; oh < ov.end; oh++){
        var dot = document.getElementById('fxDot-' + ov.id + '-' + hourKey(oh));
        if(dot){ dot.classList.toggle('is-active', isOn); }
      }
      var wedge = document.getElementById('fxOverlapWedge-' + ov.id);
      if(wedge){ wedge.classList.toggle('is-active', isOn); }
    });

    if(overlapEl){
      overlapEl.classList.toggle('show', activeCount >= 2);
    }
  }

  buildDial();
  buildList();
  update();
  // The hands only need to visibly move a few times a minute - updating
  // every 15s keeps it feeling live without doing any work on every frame.
  setInterval(update, 15000);

})();
