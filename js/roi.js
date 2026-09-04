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

  /* Headcount defaults are planning assumptions, not measured savings or a
     quote. The lower sensitivity case captures 12.5% of opportunity. The
     100% case is a theoretical ceiling, never a predicted or typical result.
     Actual capture and costs can be supplied as a third compute argument. */
  var RUN_MIN_MONTH = 50;
  var RUN_MAX_MONTH = 500;
  var RUN_MIN_EMP = 5;
  var RUN_MAX_EMP = 100;
  var STRESS_CAPTURE = 0.125;

  function runCostYear(emp){
    var t = (emp - RUN_MIN_EMP) / (RUN_MAX_EMP - RUN_MIN_EMP);
    t = Math.min(1, Math.max(0, t));
    return Math.round((RUN_MIN_MONTH + (RUN_MAX_MONTH - RUN_MIN_MONTH) * t) * 12);
  }

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

  function numberOr(value, fallback, min, max){
    var n = value === '' || value == null ? NaN : Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }

  function compute(industryKey, teamSize, options){
    options = options || {};
    var r = rates[industryKey] || rates['professional-services'];
    var emp = numberOr(teamSize, 25, RUN_MIN_EMP, RUN_MAX_EMP);
    var manual = emp * r.manual;
    var revenue = emp * r.revenue;
    var total = manual + revenue;                 /* modeled annual drag */
    var defaultImplementation = Math.min(60000, Math.max(18000, 720 * emp));
    var implementation = numberOr(options.implementation, defaultImplementation, 0, 100000000);
    var runCost = Math.round(numberOr(options.monthlyRunCost, runCostYear(emp) / 12, 0, 1000000) * 12);
    var capturePercent = numberOr(options.capturePercent, STRESS_CAPTURE * 100, 0, 100);
    var captured = total * capturePercent / 100;
    var annualNet = captured - runCost;
    var annualHigh = total - runCost;             /* all of the drag recovered */
    var annualLow = (total * STRESS_CAPTURE) - runCost; /* the guide's stress test */
    return {
      r:r, emp:emp, manual:manual, revenue:revenue, total:total,
      implementation:implementation, runCost: runCost,
      annualLow: annualLow, annualHigh: annualHigh,
      capturePercent: capturePercent, captured: captured, annualNet: annualNet,
      firstYearNet: annualNet - implementation,
      firstYearLow: annualLow - implementation,
      firstYearHigh: annualHigh - implementation
    };
  }

  /* Returns an update(target) function that eases the money fields from the
     previous estimate to the target over 400ms, calling paint() each frame.
     Respects prefers-reduced-motion (paints instantly). */
  var MONEY = ['manual','revenue','total','implementation','runCost','annualLow','annualHigh','captured','annualNet','firstYearNet','firstYearLow','firstYearHigh'];
  function animator(paint){
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var prev = null, frame = 0;
    function lerp(a, b, t){
      var out = { r: b.r, emp: b.emp, capturePercent: b.capturePercent };
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
