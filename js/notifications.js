(function(){
  var STORAGE_KEY = 'nb_notif_prompted_v1';
  var BRAND_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='19' fill='%231E8A55'/%3E%3Cpath d='M10 22 L15 22 L18 14 L22 28 L25 18 L28 22 L30 22' stroke='%23ffffff' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E";

  if(!('Notification' in window)) return;

  function formatNow(){
    var out = { time: '', date: '' };
    try{
      out.time = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' }).format(new Date());
    }catch(e){}
    try{
      out.date = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    }catch(e){}
    return out;
  }

  function fireWelcomeNotification(){
    var now = formatNow();
    var title = '⏰ ' + now.time + '  ·  نبض بازار';
    var options = {
      body: now.date + '\nاعلان‌های نبض بازار با موفقیت فعال شد',
      icon: BRAND_ICON,
      badge: BRAND_ICON,
      tag: 'nb-welcome',
      dir: 'rtl',
      lang: 'fa',
      silent: false
    };

    if('serviceWorker' in navigator && navigator.serviceWorker.ready){
      navigator.serviceWorker.ready.then(function(reg){
        if(reg && reg.showNotification){
          reg.showNotification(title, options);
        }else{
          new Notification(title, options);
        }
      }).catch(function(){
        try{ new Notification(title, options); }catch(e){}
      });
    }else{
      try{ new Notification(title, options); }catch(e){}
    }
  }

  function askForPermission(){
    if(localStorage.getItem(STORAGE_KEY)) return;
    localStorage.setItem(STORAGE_KEY, '1');
    if(Notification.permission === 'granted'){
      fireWelcomeNotification();
      return;
    }
    if(Notification.permission === 'denied') return;
    Notification.requestPermission().then(function(permission){
      if(permission === 'granted'){ fireWelcomeNotification(); }
    }).catch(function(){});
  }

  // Small delay so the prompt doesn't collide with the initial page paint
  window.addEventListener('load', function(){
    setTimeout(askForPermission, 1400);
  });
})();
