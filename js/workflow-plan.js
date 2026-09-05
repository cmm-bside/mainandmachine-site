/* Public website intake. Independent of the internal Foundry application.
 * Contact/workflow details stay out of URLs and analytics. A submitted payload
 * lives only in this tab's session storage while an uncertain send is retried.
 */
(function () {
  'use strict';
  var RECEIPT = 'mm:workflow-plan:receipt';
  var PENDING = 'mm:workflow-plan:pending';
  var CONTEXT = 'mm:workflow-plan:booking';
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  function read(key) { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (_) { return null; } }
  function save(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* memory still allows a safe retry */ } }
  function remove(key) { try { sessionStorage.removeItem(key); } catch (_) {} }
  function track(name, props) { try { if (typeof window.plausible === 'function') window.plausible(name, { props: props || {page: location.pathname} }); } catch (_) { /* analytics must never change submission state */ } }
  var receipt = read(RECEIPT);
  if (document.getElementById('plan-receipt')) {
    if (receipt && UUID.test(receipt.requestId || '') && Number.isFinite(Date.parse(receipt.deadlineAt))) {
      document.getElementById('plan-status-title').textContent = 'Your next step is on its way.';
      document.getElementById('plan-receipt').hidden = false;
      document.getElementById('plan-no-receipt').hidden = true;
      document.getElementById('plan-deadline').textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(receipt.deadlineAt));
      document.getElementById('plan-reference').textContent = receipt.requestId;
    }
    return;
  }
  var form = document.getElementById('workflowPlanForm');
  if (!form) return;
  var startedAt = Date.now(), step = 1, sending = false, began = false, frozen = null, retryAt = 0, timer;
  var status = document.getElementById('plan-status');
  var contact = document.getElementById('plan-error-contact');
  var submit = document.getElementById('plan-submit');
  var back = document.getElementById('plan-back');
  var next = document.getElementById('plan-next');
  var fields = ['workflow','tools','frequency','name','email','company','website'];
  function value(id) { return document.getElementById(id).value.trim(); }
  function notice(message, focus) { status.textContent = message; status.hidden = false; if (focus) status.focus(); }
  function fieldError(id, message) {
    var el = document.getElementById(id), error = document.getElementById(id + '-error');
    if (!el) return;
    if (message) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    if (error) { error.textContent = message || ''; error.hidden = !message; }
  }
  function go(to, focus) {
    step = to;
    document.getElementById('plan-step-1').hidden = to !== 1;
    document.getElementById('plan-step-2').hidden = to !== 2;
    document.getElementById('plan-progress-1').removeAttribute('aria-current');
    document.getElementById('plan-progress-2').removeAttribute('aria-current');
    document.getElementById('plan-progress-' + to).setAttribute('aria-current', 'step');
    document.getElementById('plan-summary-text').textContent = value('workflow');
    if (focus) document.getElementById('plan-step-title-' + to).focus();
  }
  function errorsFor(part) {
    var errors = {};
    if (part === 1 || part === 'all') {
      if (value('workflow').length < 20) errors.workflow = 'Add a little more detail (at least 20 characters) so we can give you a useful recommendation.';
      if (value('workflow').length > 4000) errors.workflow = 'Keep your description under 4,000 characters.';
    }
    if (part === 2 || part === 'all') {
      if (value('name').length < 2) errors.name = 'Please enter your name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value('email'))) errors.email = 'Enter a valid email so we can send your plan.';
      if (value('company').length < 2) errors.company = 'Please enter your business name.';
      if (value('website')) {
        try { var url = new URL(/^https?:\/\//i.test(value('website')) ? value('website') : 'https://' + value('website')); if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.') || /\s/.test(value('website'))) throw new Error(); }
        catch (_) { errors.website = 'Enter a website such as yourbusiness.com, or leave this blank.'; }
      }
    }
    return errors;
  }
  function showErrors(errors) {
    fields.forEach(function (id) { fieldError(id, errors[id]); });
    var first = Object.keys(errors).find(function (id) { return document.getElementById(id); });
    if (!first) return false;
    go(['workflow','tools','frequency'].includes(first) ? 1 : 2, false);
    document.getElementById(first).focus();
    return true;
  }
  function lock(locked) {
    form.querySelectorAll('input,textarea,select').forEach(function (el) { el.disabled = locked; });
    back.disabled = locked; next.disabled = locked;
  }
  function restore(payload) {
    fields.forEach(function (id) { document.getElementById(id).value = payload[id] || ''; });
    var radio = form.querySelector('input[name="workflowType"][value="' + (['leads','operations','reporting','documents','other'].includes(payload.workflowType) ? payload.workflowType : 'other') + '"]');
    if (radio) radio.checked = true;
    frozen = Object.freeze(payload); lock(true); go(2, false);
    submit.textContent = 'Retry the same request →';
    notice('A previous send has not been confirmed in this tab. Your details are saved. Retry this same request to check its status without creating a duplicate.', false);
  }
  var pending = read(PENDING);
  if (pending && UUID.test(pending.requestId || '') && Date.now() - Date.parse(pending.submittedAt) < 23 * 3600000) restore(pending);
  else if (pending) {
    remove(PENDING); notice('An earlier request is too old to retry safely. Check your acknowledgment email before submitting again, or contact us with your request reference: ' + String(pending.requestId || '').slice(0, 36), false); contact.hidden = false;
  }
  form.addEventListener('input', function (event) {
    if (!began && event.target.id !== 'companyUrl') { began = true; track('workflow_plan_started'); }
    if (event.target.id) fieldError(event.target.id, '');
  });
  next.addEventListener('click', function () { if (!showErrors(errorsFor(1))) { go(2, true); track('workflow_plan_details'); } });
  back.addEventListener('click', function () { if (!frozen) go(1, true); });
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (sending || Date.now() < retryAt) return;
    if (step === 1) { next.click(); return; }
    if (!frozen && showErrors(errorsFor('all'))) return;
    if (!frozen) {
      var type = form.querySelector('input[name="workflowType"]:checked');
      var payload = { requestId: crypto.randomUUID(), submittedAt: new Date().toISOString(), startedAt: startedAt, workflowType: type ? type.value : 'other', companyUrl: value('companyUrl') };
      fields.forEach(function (id) { payload[id] = value(id); });
      frozen = Object.freeze(payload); save(PENDING, frozen);
    }
    if (Date.now() - Date.parse(frozen.submittedAt) >= 23 * 3600000) {
      notice('This request can no longer be retried safely. Please contact us with reference ' + frozen.requestId + ' before sending another request.', true); contact.hidden = false; submit.disabled = true; return;
    }
    sending = true; lock(true); submit.disabled = true; submit.textContent = 'Sending your workflow…';
    contact.hidden = true; notice('Sending your request. Please keep this page open.', false);
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 20000);
    try {
      var response = await fetch('/api/workflow-plan', {method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body:JSON.stringify(frozen), signal:controller.signal});
      var data; try { data = await response.json(); } catch (_) { throw new Error('unconfirmed'); }
      if (response.ok && data.ok === true && data.requestId === frozen.requestId && Number.isFinite(Date.parse(data.deadlineAt)) && data.emailStatus === 'queued') {
        var confirmed = {requestId:data.requestId,deadlineAt:data.deadlineAt};
        save(RECEIPT, confirmed);
        save(CONTEXT, {workflow:frozen.workflow,tools:frozen.tools,requestId:frozen.requestId,at:Date.now()});
        remove(PENDING);
        track('workflow_plan_submitted');
        try { window.uetq = window.uetq || []; window.uetq.push('event','submit_lead_form',{event_category:'lead',event_label:'workflow_plan'}); } catch (_) { /* conversion tracking is optional */ }
        // Storage-blocked browsers still see an honest success without relying on another page.
        if (read(RECEIPT)?.requestId !== data.requestId) {
          notice('Your request is confirmed. Your plan is due within 24 hours. Reference: ' + data.requestId + '. An acknowledgment email has been queued. You can book an optional call using the link above.', true);
          submit.textContent = 'Request received'; return;
        }
        window.location.assign('/plan/thanks/'); return;
      }
      if (response.status === 422 && data.errors) {
        var metaError = data.errors.submittedAt || data.errors.startedAt || data.errors.requestId || data.errors.workflowType;
        if (data.errors.submittedAt && /too old/i.test(data.errors.submittedAt)) {
          notice('This request is too old to retry safely. Please contact us with reference ' + frozen.requestId + ' before sending another.', true);
          contact.hidden = false; submit.textContent = 'Please contact us'; submit.disabled = true; return;
        }
        // A definitive validation rejection has not sent email. Keep the fields
        // editable, and explain non-field/device-clock failures explicitly.
        remove(PENDING); frozen = null; lock(false); var hasFieldErrors = showErrors(data.errors);
        if (data.errors.startedAt) startedAt = Date.now();
        notice(metaError ? metaError + ' Your details are still here; correct the issue before sending again.' : 'Please check the highlighted details and send again.', !!metaError && !hasFieldErrors);
        submit.textContent = 'Get my free plan →'; submit.disabled = false; return;
      }
      if (data.retryable === false || [403,409,413,415,422].includes(response.status)) {
        notice('We couldn’t confirm this request. Please contact us with reference ' + frozen.requestId + '. Your details are still here; don’t send a new request until we’ve checked it.', true);
        contact.hidden = false; submit.textContent = 'Please contact us'; submit.disabled = true; return;
      }
      var seconds = Number(response.headers.get('Retry-After')) || 0;
      retryAt = Date.now() + Math.min(Math.max(seconds, 0), 3600) * 1000;
      throw new Error('unconfirmed');
    } catch (_) {
      notice('We couldn’t confirm the send. Your original request is saved in this tab. Retry the same request; you won’t need to re-enter your details.', true);
      contact.hidden = false;
      function retryButton() {
        var remaining = Math.ceil((retryAt - Date.now()) / 1000);
        submit.disabled = remaining > 0;
        submit.textContent = remaining > 0 ? 'Retry in ' + remaining + ' seconds' : 'Retry the same request →';
        if (remaining > 0) timer = setTimeout(retryButton, 1000);
      }
      clearTimeout(timer); retryButton();
    } finally { clearTimeout(timeout); sending = false; }
  });
})();
