/* =========================================================
   MM-ROI-v1 — shared estimate model.
   Loaded by /calculator/ and the homepage calculator band.
   The rates table lives here ONLY — never fork it into a page.
   ========================================================= */
(function(){
  'use strict';

  var rates = {
    'professional-services': { manual: 4000, revenue: 2000, note: 'Law, accounting, insurance, consulting, financial advisory.' },
    'retail':               { manual: 3200, revenue: 2400, note: 'Physical, online, and omnichannel operators.' },
    'healthcare':           { manual: 3600, revenue: 2800, note: 'Practices, clinics, wellness businesses.' },
    'construction':         { manual: 3000, revenue: 1800, note: 'HVAC, plumbing, electrical, general contracting.' },
    'hospitality':          { manual: 2400, revenue: 2200, note: 'Restaurants, hotels, catering, venues.' }
  };

  var usd = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 });
  function fmt(n){ return usd.format(Math.round(n)); }
  function signed(n){ return (n < 0 ? '-' : '+') + fmt(Math.abs(n)); }

  function compute(industryKey, teamSize){
    var r = rates[industryKey];
    var emp = Number(teamSize);
    var manual = emp * r.manual;
    var revenue = emp * r.revenue;
    var total = manual + revenue;
    var implementation = Math.min(45000, Math.max(12000, 720 * emp));
    return { r:r, emp:emp, manual:manual, revenue:revenue, total:total, implementation:implementation, roi: total - implementation };
  }

  /* Returns an update(target) function that eases the money fields from the
     previous estimate to the target over 400ms, calling paint() each frame.
     Respects prefers-reduced-motion (paints instantly). */
  var MONEY = ['manual','revenue','total','implementation','roi'];
  function animator(paint){
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var prev = null, frame = 0;
    function lerp(a, b, t){
      var out = { r: b.r, emp: b.emp };
      MONEY.forEach(function(k){ out[k] = a[k] + (b[k] - a[k]) * t; });
      return out;
    }
    return function(target){
      if(reduce || !prev){ paint(target); prev = target; return; }
      cancelAnimationFrame(frame);
      var from = prev, start = performance.now(), dur = 400;
      (function tick(now){
        var t = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3);
        var cur = lerp(from, target, eased);
        paint(cur);
        prev = cur;
        if(t < 1){ frame = requestAnimationFrame(tick); } else { prev = target; }
      })(start);
    };
  }

  window.MMRoi = { rates: rates, fmt: fmt, signed: signed, compute: compute, animator: animator };
})();
