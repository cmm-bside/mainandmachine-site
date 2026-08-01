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

  /* Calibrated to /guides/ai-roi-math-small-business/, which is the canonical
     math. Two things come from it verbatim:

       stress   — "Cut both lines in half … and assume the build captures only
                   a quarter of that" → 0.5 x 0.25 = 0.125 of the modeled drag.
                   Stated twice in the guide, and it reproduces both of its
                   worked examples exactly ($18,750 and $6,000 a year).
       run cost — "call it up to $6,000 a year on top."

     THE FRAME MATTERS AS MUCH AS THE RATE. This used to report a year-one NET,
     subtracting the whole one-time build from a single year of stressed
     return. That made the low bound negative across 91% of the inputs —
     including the guide's own 25-person example, which the guide concludes
     "still pays back inside eighteen months … has room to be substantially
     wrong and still clear." The calculator was calling that firm a loss while
     the guide called it a buy.

     The guide never computes a year-one net for the stress case. It compares an
     ANNUAL RETURN against a ONE-TIME build cost and reports payback. So does
     this now: both bounds are annual, net of run costs, and the build is shown
     beside them as the thing being paid back. On that footing the low bound is
     negative only under ~8-11 people, which is what "thin" actually means. */
  var RUN_COST_YEAR = 6000;
  var STRESS_CAPTURE = 0.125;

  var usd = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 });
  function fmt(n){ return usd.format(Math.round(n)); }
  function signed(n){ return (n < 0 ? '-' : '+') + fmt(Math.abs(n)); }
  /* "+$12,750–+$144,000" — both ends signed, so a negative low end reads as
     the warning it is instead of hiding inside a range. */
  function band(v){ return signed(v.annualLow) + '–' + signed(v.annualHigh); }

  /* Payback on the one-time build, the guide's own unit of judgement. Returns
     null for a bound that never pays back — which is a real answer, not an
     error: it is the model saying the run costs eat the return. */
  function paybackYears(annual, implementation){
    return annual > 0 ? implementation / annual : null;
  }
  function paybackLabel(v){
    var fast = paybackYears(v.annualHigh, v.implementation);
    var slow = paybackYears(v.annualLow, v.implementation);
    // Returns [number, unit] so a matching pair can collapse to "2–17 months".
    function term(y){
      var months = Math.round(y * 12);
      if (months < 1) return ['under a month', ''];
      if (months <= 23) return [String(months), 'months'];
      return [String(Math.round(y * 10) / 10), 'years'];
    }
    function label(t){ return t[1] ? t[0] + ' ' + t[1] : t[0]; }
    if (fast === null) return 'does not pay back';
    if (slow === null) return label(term(fast)) + ' at best — the stressed end does not pay back';
    var a = term(fast), b = term(slow);
    if (a[1] && a[1] === b[1]) return a[0] + '–' + b[0] + ' ' + b[1];
    return label(a) + '–' + label(b);
  }

  function compute(industryKey, teamSize){
    var r = rates[industryKey];
    var emp = Number(teamSize);
    var manual = emp * r.manual;
    var revenue = emp * r.revenue;
    var total = manual + revenue;                 /* modeled annual drag */
    var implementation = Math.min(60000, Math.max(18000, 720 * emp)); /* one-time */
    var annualHigh = total - RUN_COST_YEAR;       /* all of the drag recovered */
    var annualLow = (total * STRESS_CAPTURE) - RUN_COST_YEAR; /* the guide's stress test */
    return {
      r:r, emp:emp, manual:manual, revenue:revenue, total:total,
      implementation:implementation, runCost: RUN_COST_YEAR,
      annualLow: annualLow, annualHigh: annualHigh
    };
  }

  /* Returns an update(target) function that eases the money fields from the
     previous estimate to the target over 400ms, calling paint() each frame.
     Respects prefers-reduced-motion (paints instantly). */
  var MONEY = ['manual','revenue','total','implementation','runCost','annualLow','annualHigh'];
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

  window.MMRoi = { rates: rates, fmt: fmt, signed: signed, band: band, paybackLabel: paybackLabel, compute: compute, animator: animator };
})();
