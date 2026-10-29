# Workflow Plan intake recovery

The `/api/workflow-plan` endpoint saves a private D1 record before attempting
transactional email. A saved receipt confirms intake, not inbox delivery or
completion of the promised plan. No public route returns stored submissions.

## Production resources

- Cloudflare Pages project: `mainandmachine-site`.
- D1 binding: `WORKFLOW_INTAKE`; database: `mainandmachine-workflow-intake`.
- Existing email settings: `RESEND_API_KEY`, `MAIL_FROM`, `LEAD_NOTIFY_TO`.
- Existing abuse control: `RATE_LIMIT` KV. Keep this binding configured.
- Recovery Worker: `mainandmachine-workflow-retry`, every five minutes.
- `WORKFLOW_RETRY_SECRET` is a server secret shared by Pages and the recovery
  Worker. Generate it outside the repository; never put it in browser code,
  command-line arguments, a URL, screenshots, or version control.
- Preview uses a separate `mainandmachine-workflow-intake-preview` database.
  Its notifications need separately configured mail settings; the production
  recovery job never processes preview records.

Apply the SQL files in `db/migrations/` in numeric order before deploying the
functions. Deploy the Worker using `workers/workflow-plan-retry/wrangler.jsonc`.
It has no public HTTP endpoint. Its authenticated call to
`/api/internal/workflow-plan-retry` returns counts only.

## Recover an inquiry

Use the authenticated Cloudflare D1 console or Wrangler. Search the exact
reference supplied by the customer; use parameters in scripts rather than
interpolating untrusted text into SQL.

```sql
SELECT request_id, deadline_at, email_status, attempt_count, last_reason,
       review_status, payload_json
FROM workflow_intakes
WHERE request_id = ?;
```

`payload_json` contains the customer's submitted information. Keep it private.
Use it to prepare the promised recommendation without asking the customer to
repeat the form. The reference and reason codes can be searched in server logs;
personal information and raw provider errors are excluded from those logs.

## Delivery states

- `queued`: Resend accepted the batch. Check Resend for actual delivery.
- `pending`: the intake is saved; the recovery job retries the same frozen
  email bytes with the same provider idempotency key. Persistent delays trigger
  a separately deduplicated internal review alert after 30 minutes.
- `needs_review`: the safe retry window ended or the provider reported an
  idempotency conflict. Reconcile Resend before manually sending anything.
  Automatic retries never resend the customer's batch after the original
  submission's 23-hour safety boundary.

The internal recovery alert has its own key and frozen payload and never sends
to the customer. Its own uncertain sends stop before its 24-hour provider
deduplication window expires. A positive `unalerted` count or failed scheduled
execution requires operator attention through Cloudflare's Worker logs; a
provider-wide outage can delay both normal notifications and recovery alerts.

Records, including saved email payloads, are purged after 90 days by the recovery
job. A deletion request must remove the full row and any corresponding business
records under the privacy policy. Never regenerate an ID merely to bypass a
delivery conflict.

## Verification

Run `npm run test:workflow-plan` and `npm run build:static`. The tests cover real
SQLite persistence, duplicates, changed-content conflicts, concurrent attempts,
provider failures, retry windows, private recovery access, and client receipts.
After release, verify the deployed script version, a saved receipt, the matching
private database row, provider delivery, and a scheduled recovery execution.
Use clearly labeled test data and only authorized recipients.
