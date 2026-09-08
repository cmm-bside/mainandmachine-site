// Run: node --test scripts/test-conversion.mjs
// Execute the production scripts in a small DOM model. No browser, analytics
// provider, real endpoint, or email service is contacted. Markup is checked
// separately below; focus/layout/native browser behavior still needs browser QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const file = (name) => readFileSync(new URL(name, root), 'utf8');
const analytics = file('js/analytics.js');
const workflow = file('js/workflow-plan.js');
const intakeHtml = file('plan/index.html');
const thanksHtml = file('plan/thanks/index.html');
const ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const NOW = Date.parse('2026-09-07T18:00:00.000Z');
const PENDING = 'mm:workflow-plan:pending';
const RECEIPT = 'mm:workflow-plan:receipt';
const CONTEXT = 'mm:workflow-plan:booking';
const privateFields = {
  workflow: 'PRIVATE_WORKFLOW: we copy customer invoices between two systems.',
  tools: 'PRIVATE_TOOLS',
  name: 'PRIVATE_NAME',
  email: 'private-owner@example.com',
  company: 'PRIVATE_COMPANY',
};
const clone = (value) => JSON.parse(JSON.stringify(value));

class Node {
  constructor(tag = 'div', attrs = {}, document) {
    this.tagName = tag.toUpperCase();
    this.attrs = { ...attrs };
    this.id = attrs.id || '';
    this.value = '';
    this.textContent = '';
    this.hidden = 'hidden' in attrs;
    this.disabled = 'disabled' in attrs;
    this.open = false;
    this.children = [];
    this.listeners = new Map();
    this.ownerDocument = document;
  }
  getAttribute(key) { return this.attrs[key] ?? null; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  removeAttribute(key) { delete this.attrs[key]; }
  get href() { return new URL(this.attrs.href || '', this.ownerDocument.location.href).href; }
  set href(value) { this.attrs.href = value; }
  append(child) { child.parentNode = this; this.children.push(child); return child; }
  insertBefore(child, before) {
    child.parentNode = this;
    this.children.splice(this.children.indexOf(before), 0, child);
  }
  matches(selector) {
    return selector.split(',').some((part) => {
      const attrs = [...part.matchAll(/\[([\w-]+)(?:([\^]?=)"([^"]*)")?\]/g)];
      const base = part.trim().replace(/\[[^\]]*\]/g, '');
      const tag = base.match(/^[a-z]+/i)?.[0];
      const id = base.match(/#([\w-]+)/)?.[1];
      const classes = [...base.matchAll(/\.([\w-]+)/g)].map((match) => match[1]);
      return (!tag || this.tagName === tag.toUpperCase()) &&
        (!id || this.id === id) &&
        classes.every((name) => (this.attrs.class || '').split(/\s+/).includes(name)) &&
        attrs.every(([, key, op, value]) => key in this.attrs &&
          (!op || (op === '^=' ? this.attrs[key].startsWith(value) : this.attrs[key] === value)));
    });
  }
  closest(selector) {
    for (let node = this; node; node = node.parentNode) if (node.matches(selector)) return node;
    return null;
  }
  querySelectorAll(selector) {
    return this.children.flatMap((child) => [
      ...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector),
    ]);
  }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type, details = {}) {
    const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...details };
    return Promise.all([...(this.listeners.get(type) || [])].map((callback) => callback(event)));
  }
  click() { return this.disabled ? Promise.resolve() : this.emit('click'); }
  focus() { this.ownerDocument.activeElement = this; }
}

function attributes(text) {
  return Object.fromEntries([...text.matchAll(/([:\w-]+)(?:="([^"]*)")?/g)].map(([, key, value]) => [key, value ?? '']));
}

function harness({
  path = '/plan/', script = workflow, page = 'form', visible = true,
  stored = {}, storageBlocked = false, plausible = 'record', navigateBlocked = false,
  provider = () => receiptResponse(),
} = {}) {
  const events = [], uet = [], requests = [], navigation = [], insertedScripts = [];
  const store = new Map(Object.entries(stored).map(([key, value]) => [key, JSON.stringify(value)]));
  let now = NOW, timerId = 0;
  const timers = new Map();
  const location = new URL(path, 'https://preview.example');
  location.assign = (url) => { if (navigateBlocked) throw Error('mock navigation blocked'); navigation.push(url); };
  const document = new Node('document');
  document.ownerDocument = document;
  document.location = location;
  document.visibilityState = visible ? 'visible' : 'hidden';
  document.documentElement = { scrollHeight: 3000, scrollTop: 0 };
  const elements = new Map();
  const add = (tag, attrs = {}, parent = document) => {
    const node = parent.append(new Node(tag, attrs, document));
    if (node.id) elements.set(node.id, node);
    return node;
  };
  if (page !== 'none') {
    const html = page === 'thanks' ? thanksHtml : intakeHtml;
    for (const [, tag, attrText] of html.matchAll(/<([a-z][a-z0-9-]*)\b([^<>]*\bid="[^"]+"[^<>]*)>/gi)) {
      const attrs = attributes(attrText);
      add(tag, attrs, elements.get('workflowPlanForm') || document);
    }
  }
  document.getElementById = (id) => elements.get(id) || null;
  document.createElement = (tag) => { const node = new Node(tag, {}, document); insertedScripts.push(node); return node; };
  const firstScript = add('script');
  document.getElementsByTagName = (tag) => tag === 'script' ? [firstScript] : [];
  const sessionStorage = {
    getItem(key) { if (storageBlocked) throw Error('mock storage blocked'); return store.get(key) ?? null; },
    setItem(key, value) { if (storageBlocked) throw Error('mock storage blocked'); store.set(key, value); },
    removeItem(key) { if (storageBlocked) throw Error('mock storage blocked'); store.delete(key); },
  };
  const window = new Node('window', {}, document);
  Object.assign(window, { location, uetq: uet, innerHeight: 800, pageYOffset: 0 });
  if (plausible !== 'absent') window.plausible = (name, options) => {
    if (plausible === 'throws') throw Error('mock tracker blocked');
    events.push(clone({ name, ...options }));
  };
  let uuidCount = 0;
  const context = vm.createContext({
    window, document, location, sessionStorage, URL, URLSearchParams,
    AbortController, console,
    crypto: { randomUUID: () => uuidCount++ === 0 ? ID : OTHER_ID },
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return now; }
    },
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { at: now + delay, callback }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(callback) { callback(); },
    fetch: async (url, options) => {
      assert.equal(url, '/api/workflow-plan', 'Only the mock intake may be requested');
      assert.equal(options.method, 'POST');
      assert.deepEqual(clone(options.headers), { 'Content-Type': 'application/json', Accept: 'application/json' });
      assert.ok(options.signal instanceof AbortSignal);
      const request = { url, ...options, payload: JSON.parse(options.body) };
      requests.push(request);
      return provider(request, requests.length);
    },
  });
  const load = (source = script) => vm.runInContext(source, context);
  const el = (id) => { assert.ok(elements.has(id), `Missing production markup: #${id}`); return elements.get(id); };
  const dispatch = (type, target) => document.emit(type, { target });
  const fill = (patch = privateFields) => Object.entries(patch).forEach(([key, value]) => { el(key).value = value; });
  const input = (id) => el('workflowPlanForm').emit('input', { target: el(id) });
  const submit = () => el('workflowPlanForm').emit('submit');
  const clickLink = (href, placement, parent) => {
    const link = add('a', { href, ...(placement ? { 'data-cta': placement } : {}) }, parent);
    return { link, click: () => dispatch('click', add('span', {}, link)) };
  };
  const advance = (milliseconds) => {
    const until = now + milliseconds;
    for (;;) {
      const due = [...timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      const [id, timer] = due;
      now = timer.at; timers.delete(id); timer.callback();
    }
    now = until;
  };
  return { events, uet, requests, navigation, insertedScripts, store, document, window,
    add, el, fill, input, submit, clickLink, dispatch, advance, load, timers,
    names: () => events.map(({ name }) => name),
    saved: (key) => JSON.parse(store.get(key) || 'null'),
    next: () => el('plan-next').click(),
    back: () => el('plan-back').click(),
    setProvider: (nextProvider) => { provider = nextProvider; },
  };
}

function receiptResponse(patch = {}, status = 200, headers = {}) {
  return new Response(JSON.stringify({
    ok: true, requestId: ID, deadlineAt: new Date(NOW + 86400000).toISOString(),
    emailStatus: 'queued', ...patch,
  }), { status, headers: { 'content-type': 'application/json', ...headers } });
}

function pendingPayload(patch = {}) {
  return {
    requestId: ID, submittedAt: new Date(NOW - 60000).toISOString(),
    startedAt: NOW - 120000, workflowType: 'other', frequency: '', website: '',
    companyUrl: '', ...privateFields, ...patch,
  };
}

function privateAnalyticsCheck(h) {
  const serialized = JSON.stringify({ events: h.events, uet: h.uet, navigation: h.navigation });
  for (const secret of [...Object.values(privateFields), ID, 'PRIVATE_PROVIDER_MESSAGE', 'PRIVATE_QUERY']) {
    assert.ok(!serialized.includes(secret), `Private value reached telemetry/navigation: ${secret}`);
  }
  for (const event of h.events) {
    const keys = Object.keys(event.props).sort();
    const expected = event.name === 'workflow_plan_submit_attempt' ? ['attempt', 'page'] :
      event.name === 'workflow_plan_submit_issue' ? ['page', 'reason'] :
        /_click$/.test(event.name) ? ['location', 'page'] : ['page'];
    assert.deepEqual(keys, expected, `Unexpected props on ${event.name}`);
  }
}

test('sample clicks are intent, not views; unlabelled plan/sample links and tagged placements are counted', async () => {
  const h = harness({ script: analytics, page: 'none', path: '/?email=PRIVATE_QUERY#PRIVATE_QUERY' });
  h.load();
  const sample = h.clickLink('/plan/sample/?email=PRIVATE_QUERY#PRIVATE_QUERY', 'hero');
  await sample.click();
  await h.clickLink('/plan/sample/').click();
  await h.clickLink('/plan/', 'final-cta').click();
  await h.clickLink('/plan').click();
  assert.deepEqual(h.events, [
    { name: 'workflow_plan_sample_click', props: { page: '/', location: 'hero' } },
    { name: 'workflow_plan_sample_click', props: { page: '/', location: 'unlabelled' } },
    { name: 'cta_plan_click', props: { page: '/', location: 'final-cta' } },
    { name: 'cta_plan_click', props: { page: '/', location: 'unlabelled' } },
  ]);
  assert.equal(new URL(sample.link.href).searchParams.get('email'), 'PRIVATE_QUERY', 'Tracking must not break the link');
  privateAnalyticsCheck(h);
});

test('visible sample documents emit one view, including direct landings; background tabs wait', async () => {
  for (const visible of [true, false]) {
    const h = harness({ script: analytics, page: 'none', path: '/plan/sample/?email=PRIVATE_QUERY', visible });
    h.load();
    assert.equal(h.events.length, visible ? 1 : 0);
    h.document.visibilityState = 'visible';
    await h.document.emit('visibilitychange');
    await h.document.emit('visibilitychange');
    assert.deepEqual(h.events, [{ name: 'workflow_plan_sample_view', props: { page: '/plan/sample/' } }]);
    privateAnalyticsCheck(h);
  }
});

test('CTA routing excludes other origins, lookalike paths, receipt pages and fragment-only controls', async () => {
  const h = harness({ script: analytics, page: 'none' });
  h.load();
  for (const href of ['https://external.example/plan/', 'https://preview.example.evil/plan/sample/', 'mailto:private-owner@example.com', '/plans/', '/plan/sample-extra/', '/plan/thanks/', '#start', '#main']) {
    await h.clickLink(href, 'hero').click();
  }
  assert.deepEqual(h.events, []);
  await h.dispatch('click', {});
  await h.clickLink('/book/?email=PRIVATE_QUERY', 'plan-header-book').click();
  await h.clickLink('/score/?score=PRIVATE_QUERY', 'nav').click();
  assert.deepEqual(h.names(), ['cta_book_click', 'cta_score_click']);
  privateAnalyticsCheck(h);
});

test('current and legacy placement attributes win over region inference; known campaigns still carry', async () => {
  const h = harness({ script: analytics, page: 'none', path: '/?utm_source=qa-campaign&utm_medium=email&email=PRIVATE_QUERY&ctx=score&phase=prove' });
  const header = h.add('header', { class: 'nav' });
  const cta = h.clickLink('/plan/?utm_medium=existing#start', 'hero', header);
  const legacy = h.add('a', { href: '/plan/', 'data-cta-placement': 'score-report' }, header);
  h.load();
  await cta.click();
  await h.dispatch('click', legacy);
  await h.clickLink('/plan/', null, header).click();
  const destination = new URL(cta.link.href);
  assert.equal(destination.searchParams.get('utm_source'), 'qa-campaign');
  assert.equal(destination.searchParams.get('utm_medium'), 'existing');
  assert.equal(destination.searchParams.get('ctx'), 'score');
  assert.equal(destination.searchParams.get('phase'), 'prove');
  assert.equal(destination.searchParams.get('email'), null);
  assert.equal(destination.hash, '#start');
  assert.deepEqual(h.events.map(({ props }) => props.location), ['hero', 'score-report', 'nav']);
  privateAnalyticsCheck(h);
});

test('blocked analytics/storage do not break links; preview hosts never load the ad provider', async () => {
  for (const plausible of ['absent', 'throws']) {
    const h = harness({ script: analytics, page: 'none', plausible, storageBlocked: true });
    h.load();
    const cta = h.clickLink('/plan/', 'nav');
    await assert.doesNotReject(cta.click());
    assert.equal(new URL(cta.link.href).pathname, '/plan/');
    assert.equal(h.insertedScripts.length, 0);
    assert.deepEqual(h.events, []);
  }
});

test('task validation, start, contact-step completion, Back and autofill are bounded and preserve values', async () => {
  const h = harness();
  h.load();
  await h.input('companyUrl');
  assert.deepEqual(h.events, [], 'The trap is not a form start');
  await h.next();
  assert.equal(h.el('plan-step-2').hidden, true);
  assert.equal(h.document.activeElement, h.el('workflow'));
  assert.equal(h.el('workflow').getAttribute('aria-invalid'), 'true');
  assert.deepEqual(h.names(), ['workflow_plan_started', 'workflow_plan_submit_issue']);
  h.fill();
  await h.input('workflow');
  assert.equal(h.el('workflow').getAttribute('aria-invalid'), null);
  await h.next();
  await h.back();
  assert.equal(h.document.activeElement, h.el('plan-step-title-1'));
  await h.next();
  assert.equal(h.el('plan-summary-text').textContent, privateFields.workflow);
  assert.equal(h.document.activeElement, h.el('plan-step-title-2'));
  assert.equal(h.el('plan-progress-2').getAttribute('aria-current'), 'step');
  assert.equal(h.names().filter((name) => name === 'workflow_plan_details').length, 1);
  assert.equal(h.requests.length, 0);
  privateAnalyticsCheck(h);
  const autofill = harness();
  autofill.load(); autofill.fill();
  await autofill.submit(); // Enter on task step advances, not POST.
  assert.deepEqual(autofill.names(), ['workflow_plan_started', 'workflow_plan_details']);
  assert.equal(autofill.requests.length, 0);
});

test('optional context and contact errors focus real fields without a submit-attempt or conversion', async () => {
  const h = harness();
  h.load(); h.fill({ workflow: privateFields.workflow, tools: 'x'.repeat(601) });
  await h.next();
  assert.equal(h.el('plan-context').open, true);
  assert.equal(h.document.activeElement, h.el('tools'));
  h.fill({ tools: privateFields.tools });
  await h.next();
  await h.submit();
  assert.equal(h.document.activeElement, h.el('name'));
  assert.equal(h.el('email').getAttribute('aria-invalid'), 'true');
  assert.equal(h.requests.length, 0);
  assert.ok(!h.names().includes('workflow_plan_submit_attempt'));
  assert.deepEqual(h.uet, []);
  privateAnalyticsCheck(h);
});

test('one validated POST produces one attempt and one confirmed receipt conversion; duplicate submits are blocked', async () => {
  let resolveSend;
  const h = harness({ path: '/plan/?email=PRIVATE_QUERY#PRIVATE_QUERY',
    provider: () => new Promise((resolve) => { resolveSend = resolve; }) });
  h.load(); h.fill(); await h.input('workflow'); await h.next();
  const sending = h.submit();
  assert.equal(h.el('plan-submit').disabled, true);
  assert.equal(h.el('plan-back').disabled, true);
  assert.ok(Object.keys(privateFields).every((id) => h.el(id).disabled));
  assert.equal(h.names().at(-1), 'workflow_plan_submit_attempt');
  await h.submit();
  assert.equal(h.requests.length, 1);
  resolveSend(receiptResponse());
  await sending;
  await h.submit();
  assert.deepEqual(h.names(), [
    'workflow_plan_started', 'workflow_plan_details',
    'workflow_plan_submit_attempt', 'workflow_plan_submitted',
  ]);
  assert.equal(h.events[2].props.attempt, 'initial');
  assert.equal(h.saved(PENDING), null);
  assert.equal(h.saved(RECEIPT).requestId, ID);
  assert.equal(h.saved(CONTEXT).workflow, privateFields.workflow);
  assert.deepEqual(h.navigation, ['/plan/thanks/']);
  assert.deepEqual(clone(h.uet), ['event', 'submit_lead_form', { event_category: 'lead', event_label: 'workflow_plan' }]);
  assert.equal(h.timers.size, 0);
  privateAnalyticsCheck(h);
});

test('unconfirmed send preserves exact bytes for a retry, without an early success claim', async () => {
  const h = harness({ provider: () => { throw Error('PRIVATE_PROVIDER_MESSAGE'); } });
  h.load(); h.fill(); await h.next(); await h.submit();
  assert.deepEqual(h.events.at(-1), { name: 'workflow_plan_submit_issue', props: { page: '/plan/', reason: 'unconfirmed' } });
  assert.deepEqual(h.uet, []);
  assert.equal(h.saved(RECEIPT), null);
  assert.equal(h.saved(PENDING).requestId, ID);
  assert.equal(h.el('workflow').disabled, true);
  assert.equal(h.el('plan-submit').disabled, false);
  await h.back();
  assert.equal(h.el('plan-step-1').hidden, true);
  h.setProvider(() => receiptResponse());
  await h.submit();
  assert.equal(h.requests[0].body, h.requests[1].body);
  assert.deepEqual(h.events.filter(({ name }) => name === 'workflow_plan_submit_attempt').map(({ props }) => props.attempt), ['initial', 'retry']);
  assert.equal(h.names().filter((name) => name === 'workflow_plan_submitted').length, 1);
  privateAnalyticsCheck(h);
});

test('restoring a pending request does not invent a new start or task completion and preserves legacy fields', async () => {
  const pending = pendingPayload({ frequency: 'PRIVATE_LEGACY_FIELD', website: 'https://example.com/' });
  const h = harness({ stored: { [PENDING]: pending } });
  h.load();
  assert.equal(h.el('plan-step-1').hidden, true);
  assert.equal(h.el('plan-context').open, true);
  assert.equal(h.el('name').disabled, true);
  assert.deepEqual(h.events, []);
  await h.submit();
  assert.deepEqual(h.requests[0].payload, pending);
  assert.deepEqual(h.events[0], { name: 'workflow_plan_submit_attempt', props: { page: '/plan/', attempt: 'retry' } });
  privateAnalyticsCheck(h);
  assert.ok(!JSON.stringify(h.events).includes('PRIVATE_LEGACY_FIELD'));
});

test('422 field validation unlocks details; metadata rejection and expired requests do not masquerade as success', async () => {
  const h = harness({ provider: () => receiptResponse({ ok: false, errors: { email: 'Check the email.' } }, 422) });
  h.load(); h.fill(); await h.next(); await h.submit();
  assert.equal(h.saved(PENDING), null);
  assert.equal(h.el('email').disabled, false);
  assert.equal(h.document.activeElement, h.el('email'));
  assert.equal(h.events.at(-1).props.reason, 'validation');
  assert.deepEqual(h.uet, []);
  h.setProvider(() => receiptResponse({ requestId: OTHER_ID }));
  await h.submit();
  assert.notEqual(h.requests[0].payload.requestId, h.requests[1].payload.requestId);
  assert.equal(h.events.filter(({ name }) => name === 'workflow_plan_submit_attempt')[1].props.attempt, 'initial');
  privateAnalyticsCheck(h);
  for (const [status, body, reason] of [
    [422, { errors: { submittedAt: 'This request is too old to retry safely.' } }, 'expired'],
    [409, { retryable: false }, 'rejected'],
    [403, {}, 'rejected'],
    [502, { retryable: false }, 'rejected'],
  ]) {
    const rejected = harness({ provider: () => receiptResponse({ ok: false, ...body }, status) });
    rejected.load(); rejected.fill(); await rejected.next(); await rejected.submit();
    assert.equal(rejected.events.at(-1).props.reason, reason);
    assert.equal(rejected.el('plan-submit').disabled, true);
    assert.equal(rejected.el('plan-error-contact').hidden, false);
    await rejected.submit();
    assert.equal(rejected.requests.length, 1, 'A terminal rejection is not automatically retried');
    assert.deepEqual(rejected.uet, []);
    privateAnalyticsCheck(rejected);
  }
});

test('malformed, mismatched or incomplete success responses cannot emit a receipt conversion', async () => {
  const responses = [
    () => new Response('<html>not JSON</html>', { status: 200 }),
    () => new Response('null', { status: 200 }),
    () => receiptResponse({ requestId: OTHER_ID }),
    () => receiptResponse({ deadlineAt: 'invalid' }),
    () => receiptResponse({ emailStatus: 'delivered' }),
    () => receiptResponse({ ok: 'true' }),
    () => receiptResponse({}, 502),
  ];
  for (const provider of responses) {
    const h = harness({ provider });
    h.load(); h.fill(); await h.next(); await h.submit();
    assert.equal(h.events.at(-1).props.reason, 'unconfirmed');
    assert.equal(h.saved(RECEIPT), null);
    assert.deepEqual(h.navigation, []);
    assert.deepEqual(h.uet, []);
    privateAnalyticsCheck(h);
  }
});

test('Retry-After blocks early attempts and a timed-out send remains a retry, not a failed-delivery claim', async () => {
  const h = harness({ provider: () => receiptResponse({ ok: false, retryable: true }, 429, { 'Retry-After': '3' }) });
  h.load(); h.fill(); await h.next(); await h.submit();
  assert.equal(h.el('plan-submit').textContent, 'Retry in 3 seconds');
  await h.submit();
  assert.equal(h.requests.length, 1);
  h.advance(3000);
  assert.equal(h.el('plan-submit').disabled, false);
  h.setProvider(() => receiptResponse());
  await h.submit();
  assert.equal(h.requests.length, 2);
  privateAnalyticsCheck(h);
  const timeout = harness({ provider: ({ signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(Error('mock timeout')), { once: true });
  }) });
  timeout.load(); timeout.fill(); await timeout.next();
  const send = timeout.submit();
  timeout.advance(20000);
  await send;
  assert.equal(timeout.requests[0].signal.aborted, true);
  assert.equal(timeout.events.at(-1).props.reason, 'unconfirmed');
  assert.deepEqual(timeout.uet, []);
  assert.equal(timeout.el('plan-submit').disabled, false);
});

test('a pending request that expires in an open tab cannot reach the API or an attempt event', async () => {
  const h = harness({ stored: { [PENDING]: pendingPayload() } });
  h.load(); h.advance(23 * 3600000);
  await h.submit();
  assert.deepEqual(h.events, [{ name: 'workflow_plan_submit_issue', props: { page: '/plan/', reason: 'expired' } }]);
  assert.equal(h.requests.length, 0);
  assert.equal(h.el('plan-submit').disabled, true);
  privateAnalyticsCheck(h);
});

test('blocked storage, navigation or analytics never turn a confirmed request into an error or a duplicate', async () => {
  for (const options of [
    { storageBlocked: true }, { navigateBlocked: true },
    { plausible: 'throws' }, { plausible: 'absent' },
  ]) {
    const h = harness(options);
    h.load(); h.fill(); await h.next(); await h.submit(); await h.submit();
    assert.equal(h.requests.length, 1);
    assert.ok(!h.names().includes('workflow_plan_submit_issue'));
    assert.equal(h.uet.length, 3);
    if (options.storageBlocked || options.navigateBlocked) {
      assert.match(h.el('plan-status').textContent, /Your request is confirmed/);
      assert.equal(h.el('plan-submit').textContent, 'Request received');
    } else assert.deepEqual(h.navigation, ['/plan/thanks/']);
    privateAnalyticsCheck(h);
  }
});

test('receipt refreshes and direct confirmation URLs never emit another conversion', () => {
  for (const receipt of [null, { requestId: ID, deadlineAt: new Date(NOW + 86400000).toISOString() },
    { requestId: 'invalid', deadlineAt: 'invalid' }]) {
    const h = harness({ page: 'thanks', path: '/plan/thanks/', stored: receipt ? { [RECEIPT]: receipt } : {} });
    h.load(); h.load();
    assert.deepEqual(h.events, []);
    assert.deepEqual(h.uet, []);
    assert.equal(h.requests.length, 0);
    assert.equal(h.el('plan-receipt').hidden, receipt?.requestId !== ID);
  }
});

test('production form retains native task/details controls, error hooks, private POST and no-marketing copy', () => {
  const h = harness();
  assert.equal(h.el('workflowPlanForm').getAttribute('action'), '/api/workflow-plan');
  assert.equal(h.el('workflowPlanForm').getAttribute('method'), 'post');
  for (const id of ['workflow', 'tools', 'name', 'email', 'company']) {
    assert.equal(h.el(id).getAttribute('name'), id);
    assert.ok(h.el(id).getAttribute('aria-describedby').includes(`${id}-error`));
    assert.ok(h.el(`${id}-error`).hidden);
  }
  assert.equal(h.el('plan-next').getAttribute('type'), 'button');
  assert.equal(h.el('plan-back').getAttribute('type'), 'button');
  assert.equal(h.el('plan-submit').getAttribute('type'), 'submit');
  assert.equal(h.el('plan-step-2').hidden, true);
  assert.equal(h.el('plan-status').getAttribute('aria-live'), 'polite');
  assert.equal(h.el('companyUrl').getAttribute('tabindex'), '-1');
  assert.match(intakeHtml, /No marketing signup/);
});
