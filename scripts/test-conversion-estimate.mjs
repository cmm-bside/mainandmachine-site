// Run: node --test scripts/test-conversion-estimate.mjs
// Executes the real inline estimate handlers and shared analytics with modeled
// DOM capture/target/bubble phases and a mocked API. No browser, HTTP server,
// provider, mail, analytics network, or credentials. Rendered UI needs browser QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const file = (name) => readFileSync(new URL(name, root), 'utf8');
const analytics = file('js/analytics.js');
const paths = {
  calculator: '/calculator/',
  guide: '/guides/ai-roi-math-small-business/',
};
const PRIVATE_EMAIL = 'private-estimate@example.com';
const clone = (value) => JSON.parse(JSON.stringify(value));
const response = (body = { ok: true }, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const flush = () => new Promise(setImmediate);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

class EventModel {
  constructor(type, options = {}) {
    Object.assign(this, { type, bubbles: false, cancelable: false, defaultPrevented: false }, options);
  }
  preventDefault() { if (this.cancelable) this.defaultPrevented = true; }
}
class Node {
  constructor(tag, attrs = {}, document) {
    this.tagName = tag.toUpperCase(); this.attrs = attrs; this.ownerDocument = document;
    this.children = []; this.listeners = new Map(); this.value = attrs.value || '';
    this.textContent = ''; this.disabled = false; this.id = attrs.id || '';
  }
  append(node) { node.parentNode = this; this.children.push(node); return node; }
  getAttribute(name) { return this.attrs[name] ?? null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  matches(selector) {
    return selector.split(',').some((part) => {
      const attributes = [...part.matchAll(/\[([\w-]+)(?:=(["']?)([^\]"']+)\2)?\]/g)];
      const base = part.trim().replace(/\[[^\]]*\]/g, '');
      const tag = base.match(/^[a-z]+/i)?.[0];
      const id = base.match(/#([\w-]+)/)?.[1];
      const classes = [...base.matchAll(/\.([\w-]+)/g)].map((match) => match[1]);
      return (!tag || tag.toUpperCase() === this.tagName) && (!id || this.id === id) &&
        classes.every((name) => (this.attrs.class || '').split(/\s+/).includes(name)) &&
        attributes.every(([, name, , value]) => name in this.attrs && (value === undefined || this.attrs[name] === value));
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
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(type, callback, options = false) {
    const capture = typeof options === 'boolean' ? options : !!options.capture;
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push({ callback, capture });
  }
  removeEventListener(type, callback) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((listener) => listener.callback !== callback));
  }
  dispatchEvent(event) {
    event.target = this;
    const ancestors = [];
    for (let node = this.parentNode; node; node = node.parentNode) ancestors.push(node);
    const invoke = (node, capture) => {
      event.currentTarget = node;
      for (const listener of node.listeners.get(event.type) || []) {
        if (listener.capture === capture) listener.callback(event);
      }
    };
    // This ordering is essential: the old document capture listener counted
    // a lead before the target form could reject an invalid email address.
    for (const node of [...ancestors].reverse()) invoke(node, true);
    invoke(this, true); invoke(this, false);
    if (event.bubbles) for (const node of ancestors) invoke(node, false);
    return !event.defaultPrevented;
  }
  reset() {
    for (const node of this.querySelectorAll('input')) node.value = node.attrs.value || '';
  }
  focus() { this.ownerDocument.activeElement = this; }
}
function attrs(text) {
  return Object.fromEntries([...text.matchAll(/([:\w-]+)(?:="([^"]*)")?/g)].map(([, name, value]) => [name, value ?? '']));
}
function scripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(([, attributes]) => !/\bsrc=|application\/ld\+json/.test(attributes)).map(([, , source]) => source);
}

function harness(kind = 'calculator', { provider = () => response(), tracker = 'record', loadAnalytics = true } = {}) {
  const html = file(`${paths[kind].slice(1)}index.html`);
  const document = new Node('document'); document.ownerDocument = document;
  const location = new URL(paths[kind], 'https://preview.example');
  const events = [], requests = [], uet = [], timers = [];
  const window = new Node('window', {}, document);
  Object.assign(window, { location, innerHeight: 800, pageYOffset: 0, uetq: uet });
  document.documentElement = { scrollHeight: 3000, scrollTop: 0 };
  document.visibilityState = 'visible';
  document.getElementById = (id) => document.querySelector(`#${id}`);
  const add = (tag, attributes = {}, parent = document) => parent.append(new Node(tag, attributes, document));
  const formMarkup = html.match(/<form\b([^>]*class="estimate-form"[^>]*)>([\s\S]*?)<\/form>/);
  assert.ok(formMarkup, `${kind}: production estimate form must exist`);
  const form = add('form', attrs(formMarkup[1]));
  for (const [, tag, attributes] of formMarkup[2].matchAll(/<(input|button|p)\b([^>]*)>/g)) add(tag, attrs(attributes), form);
  const input = form.querySelector('input[type=email]');
  const button = form.querySelector('button');
  const note = kind === 'calculator' ? document.getElementById('estimateNote') : form.querySelector('[data-note]');
  assert.ok(input && button && note, `${kind}: production input, button and status must exist`);
  let select, range;
  if (kind === 'calculator') {
    const roi = add('div', { class: 'roi' });
    const selectMarkup = html.match(/<select\b([^>]*id="calcIndustry"[^>]*)>([\s\S]*?)<\/select>/);
    assert.ok(selectMarkup, 'production calculator select must exist');
    select = add('select', attrs(selectMarkup[1]), roi);
    select.options = [...selectMarkup[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)]
      .map(([, attributes, text]) => ({ ...attrs(attributes), text: text.trim() }));
    select.selectedIndex = Math.max(0, select.options.findIndex((option) => 'selected' in option));
    select.value = select.options[select.selectedIndex].value;
    select.textContent = select.options.map((option) => option.text).join(' ');
    const rangeMarkup = html.match(/<input\b([^>]*id="calcRange"[^>]*)>/);
    assert.ok(rangeMarkup, 'production calculator range must exist');
    range = add('input', attrs(rangeMarkup[1]), roi);
    for (const id of ['calcCount', 'calcHours', 'calcManual']) {
      const markup = html.match(new RegExp('<([a-z0-9]+)\\b([^>]*id="' + id + '"[^>]*)>([\\s\\S]*?)<\\/\\1>'));
      if (id !== 'calcHours') assert.ok(markup, `production #${id} must exist`);
      // The legacy hours field is optional in the production handler.
      if (markup) add(markup[1], attrs(markup[2]), roi).textContent = markup[3].replace(/<[^>]*>/g, '').trim();
    }
  }
  if (tracker !== 'absent') window.plausible = (name, options) => {
    if (tracker === 'throws') throw Error('mock analytics unavailable');
    events.push(clone({ name, ...options }));
  };
  const storage = new Map();
  const context = vm.createContext({
    window, document, location, URL, URLSearchParams, console,
    CustomEvent: EventModel, plausible: window.plausible,
    sessionStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    setTimeout(callback) { timers.push(callback); return timers.length; },
    clearTimeout(id) { timers[id - 1] = null; },
    requestAnimationFrame(callback) { callback(); },
    fetch(url, options) {
      assert.equal(url, '/api/book-assessment', 'No non-mocked endpoint may be requested');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['Content-Type'], 'application/json');
      const payload = JSON.parse(options.body);
      assert.equal(payload.stage, 'estimate');
      const request = { url, payload }; requests.push(request);
      return Promise.resolve().then(() => provider(request, requests.length));
    },
  });
  const inlineScripts = scripts(html);
  const handler = inlineScripts.find((source) => source.includes(kind === 'calculator' ? '/* Email-me-this-estimate' : '/* Worksheet request'));
  assert.ok(handler, `${kind}: real production handler must exist`);
  vm.runInContext(handler, context);
  // Execute any legacy handler too: an old copy must not silently escape the
  // interaction assertion just because the new implementation removes it.
  for (const source of inlineScripts.filter((script) => script.includes('/* Calculator engagement -> Plausible.'))) vm.runInContext(source, context);
  if (loadAnalytics) vm.runInContext(analytics, context);
  return {
    document, window, form, input, button, note, select, range, events, requests, uet,
    submit(email = PRIVATE_EMAIL) {
      input.value = email;
      form.dispatchEvent(new EventModel('submit', { bubbles: true, cancelable: true }));
    },
    selectInputs(industry, team) {
      select.value = industry;
      select.selectedIndex = select.options.findIndex((option) => option.value === industry);
      range.value = String(team); document.getElementById('calcCount').textContent = String(team);
    },
    interact() {
      select.dispatchEvent(new EventModel('change', { bubbles: true }));
      for (const callback of timers.splice(0)) if (callback) callback();
    },
  };
}
function assertNoConversions(h) {
  assert.equal(h.events.filter((event) => event.name === 'calculator_emailed').length, 0);
  assert.equal(h.uet.filter((entry) => entry === 'submit_lead_form').length, 0);
}
function assertAccepted(h, expectedProps) {
  const accepted = h.events.filter((event) => event.name === 'calculator_emailed');
  assert.equal(accepted.length, 1, 'one accepted request produces one event');
  assert.deepEqual(accepted[0].props, expectedProps);
  assert.deepEqual(clone(h.uet), ['event', 'submit_lead_form', { event_category: 'lead', event_label: expectedProps.page }]);
  assert.equal(h.button.disabled, false);
  assert.match(h.note.textContent, /^Sent\./);
  assert.equal(h.input.value, '');
  const telemetry = JSON.stringify({ events: h.events, uet: h.uet });
  for (const secret of [PRIVATE_EMAIL, 'private-estimate', 'PRIVATE_WORKFLOW']) assert.ok(!telemetry.includes(secret));
  assert.deepEqual(Object.keys(accepted[0].props).sort(), ['industry', 'page', 'team_band']);
}

test('modeled events preserve document capture before form validation and then bubble', () => {
  const h = harness('calculator', { loadAnalytics: false });
  const order = [];
  h.document.addEventListener('submit', () => order.push('capture'), true);
  h.form.addEventListener('submit', () => { assert.match(h.note.textContent, /does not look right/); order.push('form'); });
  h.document.addEventListener('submit', () => order.push('bubble'));
  h.submit('bad');
  assert.deepEqual(order, ['capture', 'form', 'bubble']);
});

for (const kind of Object.keys(paths)) {
  test(`${kind}: invalid email causes no request or lead conversion`, async () => {
    const h = harness(kind);
    h.submit(''); h.submit('invalid'); await flush();
    assert.equal(h.requests.length, 0); assertNoConversions(h);
    assert.equal(h.document.activeElement, h.input);
  });
  test(`${kind}: pending request does not count and cannot overlap`, async () => {
    const pending = deferred();
    const h = harness(kind, { provider: () => pending.promise });
    h.submit(); h.submit(); await flush();
    assert.equal(h.requests.length, 1); assert.equal(h.button.disabled, true); assertNoConversions(h);
    pending.resolve(response()); await flush();
    assert.equal(h.requests.length, 1);
    assertAccepted(h, { page: paths[kind], industry: kind === 'calculator' ? 'professional-services' : 'not-specified', team_band: kind === 'calculator' ? '11–25' : 'not-specified' });
  });
  for (const [name, provider] of [
    ['HTTP 422', () => response({ ok: false, error: 'Rejected' }, 422)],
    ['HTTP 500 with misleading success body', () => response({ ok: true }, 500)],
    ['HTTP 200 with false result', () => response({ ok: false })],
    ['truthy non-boolean success', () => response({ ok: 'true' })],
    ['null result', () => response(null)],
    ['malformed JSON', () => new Response('not-json', { status: 200 })],
    ['network rejection', () => Promise.reject(Error('mock offline'))],
  ]) {
    test(`${kind}: ${name} does not count or clear user input`, async () => {
      const h = harness(kind, { provider }); h.submit(); await flush();
      assert.equal(h.requests.length, 1); assertNoConversions(h);
      assert.equal(h.input.value, PRIVATE_EMAIL); assert.equal(h.button.disabled, false);
      assert.doesNotMatch(h.note.textContent, /^Sent\./);
    });
  }
  test(`${kind}: failed request followed by accepted retry counts only the accepted response`, async () => {
    const h = harness(kind, { provider: (_request, count) => count === 1 ? response({ ok: false }, 502) : response() });
    h.submit(); await flush(); assertNoConversions(h);
    h.submit(); await flush();
    assert.equal(h.requests.length, 2);
    assertAccepted(h, { page: paths[kind], industry: kind === 'calculator' ? 'professional-services' : 'not-specified', team_band: kind === 'calculator' ? '11–25' : 'not-specified' });
  });
  for (const tracker of ['absent', 'throws']) {
    test(`${kind}: ${tracker} Plausible leaves accepted submission successful`, async () => {
      const h = harness(kind, { tracker }); h.submit(); await flush();
      assert.match(h.note.textContent, /^Sent\./); assert.equal(h.input.value, '');
      assert.equal(h.button.disabled, false);
      assert.equal(h.uet.filter((entry) => entry === 'submit_lead_form').length, 1);
    });
  }
  test(`${kind}: throwing UET leaves accepted submission successful`, async () => {
    const h = harness(kind); h.window.uetq = { push() { throw Error('mock UET unavailable'); } };
    h.submit(); await flush();
    assert.match(h.note.textContent, /^Sent\./); assert.equal(h.button.disabled, false);
    assert.equal(h.events.filter((event) => event.name === 'calculator_emailed').length, 1);
  });
  test(`${kind}: missing shared analytics does not prevent receipt`, async () => {
    const h = harness(kind, { loadAnalytics: false }); h.submit(); await flush();
    assert.match(h.note.textContent, /^Sent\./); assert.equal(h.button.disabled, false);
  });
}

test('calculator accepted event describes the submitted snapshot, not later edited controls', async () => {
  const pending = deferred();
  const h = harness('calculator', { provider: () => pending.promise });
  h.selectInputs('construction', 80); h.submit(); await flush();
  assert.equal(h.requests[0].payload.industry, h.select.options[h.select.selectedIndex].text);
  assert.equal(h.requests[0].payload.team, '80');
  h.selectInputs('retail', 10);
  pending.resolve(response()); await flush();
  assertAccepted(h, { page: '/calculator/', industry: 'construction', team_band: '51–100' });
  const telemetry = JSON.stringify({ events: h.events, uet: h.uet });
  assert.ok(!telemetry.includes('80')); assert.ok(!telemetry.includes('$'));
  assert.equal(h.requests[0].payload.email, PRIVATE_EMAIL, 'delivery email belongs in API payload only');
});

test('calculator interaction uses maintained key/band event and has no stale duplicate', () => {
  const h = harness(); h.selectInputs('hospitality', 40); h.interact();
  assert.deepEqual(h.events.map((event) => event.name), ['calculator_interacted']);
  assert.deepEqual(h.events[0].props, { page: '/calculator/', industry: 'hospitality', team_band: '26–50', at: 'first-touch' });
  assertNoConversions(h);
});
