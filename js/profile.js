(function(){
  'use strict';

  var wrap = document.querySelector('.profile-wrap');
  var btn = document.getElementById('profileBtn');
  var tip = document.getElementById('profileTooltip');
  if(!wrap || !btn || !tip) return;

  function isOpen(){ return btn.getAttribute('aria-expanded') === 'true'; }

  function close(){
    btn.setAttribute('aria-expanded', 'false');
    tip.hidden = true;
  }

  function open(){
    btn.setAttribute('aria-expanded', 'true');
    tip.hidden = false;
  }

  btn.addEventListener('click', function(e){
    e.stopPropagation();
    if(isOpen()){ close(); } else { open(); }
  });

  document.addEventListener('click', function(e){
    if(isOpen() && !wrap.contains(e.target)){ close(); }
  });

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && isOpen()){
      close();
      btn.focus();
    }
  });
})();
