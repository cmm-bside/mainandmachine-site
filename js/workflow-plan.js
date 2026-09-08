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
  function issue(reason) { track('workflow_plan_submit_issue', {page: location.pathname, reason: reason}); }
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
  var startedAt = Date.now(), step = 1, sending = false, began = false, detailsReached = false, completed = false, frozen = null, retryAt = 0, timer;
  var status = document.getElementById('plan-status');
  var contact = document.getElementById('plan-error-contact');
  var submit = document.getElementById('plan-submit');
  var back = document.getElementById('plan-back');
  var next = document.getElementById('plan-next');
  var fields = ['workflow','tools','name','email','company'];
  function begin() { if (!began) { began = true; track('workflow_plan_started'); } }
  function value(id) { var el = document.getElementById(id); return el && typeof el.value === 'string' ? el.value.trim() : ''; }
  function expandContext() { var details = document.getElementById('plan-context'); if (details) details.open = true; }
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
      if (value('tools').length > 600) errors.tools = 'Keep your tools list under 600 characters.';
    }
    if (part === 2 || part === 'all') {
      if (value('name').length < 2) errors.name = 'Please enter your name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value('email'))) errors.email = 'Enter a valid email so we can send your plan.';
      if (value('company').length < 2) errors.company = 'Please enter your business name.';
    }
    return errors;
  }
  function showErrors(errors) {
    fields.forEach(function (id) { fieldError(id, errors[id]); });
    var first = Object.keys(errors).find(function (id) { return fields.includes(id) && document.getElementById(id); });
    if (!first) return false;
    go(['workflow','tools'].includes(first) ? 1 : 2, false);
    if (first === 'tools') expandContext();
    document.getElementById(first).focus();
    return true;
  }
  function lock(locked) {
    form.querySelectorAll('input,textarea,select').forEach(function (el) { el.disabled = locked; });
    back.disabled = locked; next.disabled = locked;
  }
  function restore(payload) {
    fields.forEach(function (id) { var el = document.getElementById(id); if (el) el.value = typeof payload[id] === 'string' ? payload[id] : ''; });
    if (value('tools')) expandContext();
    // Keep the stored object intact: older requests can contain fields that no
    // longer have inputs. Reconstructing it would break provider idempotency.
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
    if (fields.includes(event.target.id)) begin();
    if (event.target.id) fieldError(event.target.id, '');
  });
  next.addEventListener('click', function () {
    if (frozen || completed) return;
    begin();
    if (!showErrors(errorsFor(1))) {
      go(2, true);
      if (!detailsReached) { detailsReached = true; track('workflow_plan_details'); }
    } else { issue('validation'); }
  });
  back.addEventListener('click', function () { if (!frozen) go(1, true); });
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (sending || completed || submit.disabled || Date.now() < retryAt) return;
    if (step === 1) { next.click(); return; }
    if (!frozen && showErrors(errorsFor('all'))) { issue('validation'); return; }
    var attempt = frozen ? 'retry' : 'initial';
    if (!frozen) {
      var payload = { requestId: crypto.randomUUID(), submittedAt: new Date().toISOString(), startedAt: startedAt, workflowType: 'other', frequency: '', website: '', companyUrl: value('companyUrl') };
      fields.forEach(function (id) { payload[id] = value(id); });
      frozen = Object.freeze(payload); save(PENDING, frozen);
    }
    if (Date.now() - Date.parse(frozen.submittedAt) >= 23 * 3600000) {
      issue('expired');
      notice('This request can no longer be retried safely. Please contact us with reference ' + frozen.requestId + ' before sending another request.', true); contact.hidden = false; submit.disabled = true; return;
    }
    sending = true; lock(true); submit.disabled = true; submit.textContent = 'Sending your workflow…';
    contact.hidden = true; notice('Sending your request. Please keep this page open.', false);
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 20000);
    try {
      track('workflow_plan_submit_attempt', {page: location.pathname, attempt: attempt});
      var response = await fetch('/api/workflow-plan', {method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body:JSON.stringify(frozen), signal:controller.signal});
      var data; try { data = await response.json(); } catch (_) { throw new Error('unconfirmed'); }
      if (response.ok && data.ok === true && data.requestId === frozen.requestId && Number.isFinite(Date.parse(data.deadlineAt)) && data.emailStatus === 'queued') {
        completed = true;
        var confirmed = {requestId:data.requestId,deadlineAt:data.deadlineAt};
        save(RECEIPT, confirmed);
        save(CONTEXT, {workflow:frozen.workflow,tools:frozen.tools,requestId:frozen.requestId,at:Date.now()});
        remove(PENDING);
        track('workflow_plan_submitted');
        try { window.uetq = window.uetq || []; window.uetq.push('event','submit_lead_form',{event_category:'lead',event_label:'workflow_plan'}); } catch (_) { /* conversion tracking is optional */ }
        if (read(RECEIPT)?.requestId === data.requestId) {
          try { window.location.assign('/plan/thanks/'); return; } catch (_) { /* show the confirmed receipt here instead */ }
        }
        // Storage or navigation restrictions never turn an accepted receipt
        // into an uncertain-send message, or permit a second conversion.
        notice('Your request is confirmed. Your plan is due within 24 hours. Reference: ' + data.requestId + '. An acknowledgment email has been queued. You can book an optional call using the link above.', true);
        submit.textContent = 'Request received'; return;
      }
      if (response.status === 422 && data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors) && Object.keys(data.errors).length) {
        var missingField = Object.keys(data.errors).find(function (id) { return !fields.includes(id) || !document.getElementById(id); });
        var metaError = missingField ? data.errors[missingField] : '';
        if (data.errors.submittedAt && /too old/i.test(data.errors.submittedAt)) {
          issue('expired');
          notice('This request is too old to retry safely. Please contact us with reference ' + frozen.requestId + ' before sending another.', true);
          contact.hidden = false; submit.textContent = 'Please contact us'; submit.disabled = true; return;
        }
        // A definitive validation rejection has not sent email. Keep the fields
        // editable, and explain non-field/device-clock failures explicitly.
        issue('validation');
        remove(PENDING); frozen = null; lock(false); var hasFieldErrors = showErrors(data.errors);
        if (data.errors.startedAt) startedAt = Date.now();
        notice(metaError ? metaError + ' Your details are still here; correct the issue before sending again.' : 'Please check the highlighted details and send again.', !!metaError && !hasFieldErrors);
        submit.textContent = 'Get my free plan →'; submit.disabled = false; return;
      }
      if (data.retryable === false || [403,409,413,415,422].includes(response.status)) {
        issue('rejected');
        notice('We couldn’t confirm this request. Please contact us with reference ' + frozen.requestId + '. Your details are still here; don’t send a new request until we’ve checked it.', true);
        contact.hidden = false; submit.textContent = 'Please contact us'; submit.disabled = true; return;
      }
      var seconds = Number(response.headers.get('Retry-After')) || 0;
      retryAt = Date.now() + Math.min(Math.max(seconds, 0), 3600) * 1000;
      throw new Error('unconfirmed');
    } catch (_) {
      issue('unconfirmed');
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
