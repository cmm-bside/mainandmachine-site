/** Local endpoint checks: all email requests are intercepted; no credentials or mail delivery. */
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/book-assessment.js';
const originalFetch = globalThis.fetch;
const mail = [];
let failInternal = false;
globalThis.fetch = async (url, init) => {
  assert.equal(url, 'https://api.resend.com/emails');
  const body = JSON.parse(init.body); mail.push(body);
  return new Response(JSON.stringify({ id: 'mock-email' }), { status: failInternal && body.to.includes('qa-team@example.com') ? 502 : 200 });
};
const sample = { name:'QA Example', email:'qa-visitor@example.com', contact:'Email', phone:'', company:'Example QA', workflows:'Invoice review', company_url:'', ts:String(Date.now()-60000), interest:'AI-Ready Score phase: Prove' };
const post = body => onRequestPost({request:new Request('http://localhost/api/book-assessment',{method:'POST',body:JSON.stringify(body),headers:{'content-type':'application/json'}}),env:{RESEND_API_KEY:'mock-only',LEAD_NOTIFY_TO:'qa-team@example.com'}});
try {
  for (const bad of [null, [], 'text']) assert.equal((await post(bad)).status,400);
  assert.equal(mail.length,0);
  assert.equal((await post({...sample,email:'bad'})).status,422);
  assert.equal((await post({...sample,company_url:'spam.example'})).status,200);
  assert.equal(mail.length,0);
  const accepted=await post(sample); const body=await accepted.json();
  assert.equal(accepted.status,200);assert.equal(body.ok,true);assert.match(body.referenceId,/^MM-/);
  assert.equal(mail.length,2);assert.ok(mail.some(x=>x.text.includes('AI-Ready Score phase: Prove')));
  mail.length=0;failInternal=true;
  assert.equal((await post(sample)).status,502);
  console.log('PASS: invalid JSON shapes, field validation, honeypot, accepted request+two mocked emails, carried Score context, internal-mail failure');
} finally {globalThis.fetch=originalFetch;}
