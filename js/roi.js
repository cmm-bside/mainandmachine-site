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

  /* The two lines the ROI guide adds to the raw model, quoted from its own
     worked example (/guides/ai-roi-math-small-business/). The guide is the
     spec: if these ever disagree with it, this file is what changes.

       run costs — "the tools and model usage behind a working system
                    typically run $50–$500 a month, so call it up to $6,000
                    a year on top."
       stress    — "Cut both lines in half … and assume the build captures
                    only a quarter of that" → 0.5 × 0.25 = 0.125 of the
                    modeled drag.

     So the output is a BAND, never a point. The high bound is the raw model
     (all the drag recovered, run costs not yet counted); the low bound is the
     guide's stress test with a full year of run costs against it. The low
     bound goes negative on small teams, which is the model saying "wait" —
     the guide publishes that same result for a 10-person construction firm
     and calls a model that can say wait the only kind worth publishing. */
  var RUN_COST_YEAR = 6000;
  var STRESS_CAPTURE = 0.125;

  var usd = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 });
  function fmt(n){ return usd.format(Math.round(n)); }
  function signed(n){ return (n < 0 ? '-' : '+') + fmt(Math.abs(n)); }
  /* "+$18,750–+$132,000" — an en dash, both ends signed, so a negative low
     end reads as the warning it is instead of hiding inside a range. */
  function band(v){ return signed(v.roiLow) + '–' + signed(v.roiHigh); }

  function compute(industryKey, teamSize){
    var r = rates[industryKey];
    var emp = Number(teamSize);
    var manual = emp * r.manual;
    var revenue = emp * r.revenue;
    var total = manual + revenue;
    var implementation = Math.min(60000, Math.max(18000, 720 * emp));
    var roiHigh = total - implementation;
    var roiLow = (total * STRESS_CAPTURE) - implementation - RUN_COST_YEAR;
    return {
      r:r, emp:emp, manual:manual, revenue:revenue, total:total,
      implementation:implementation, runCost: RUN_COST_YEAR,
      roiLow: roiLow, roiHigh: roiHigh,
      roi: roiHigh /* legacy alias — the high bound */
    };
  }

  /* Returns an update(target) function that eases the money fields from the
     previous estimate to the target over 400ms, calling paint() each frame.
     Respects prefers-reduced-motion (paints instantly). */
  var MONEY = ['manual','revenue','total','implementation','runCost','roi','roiLow','roiHigh'];
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

  window.MMRoi = { rates: rates, fmt: fmt, signed: signed, band: band, compute: compute, animator: animator };
})();
