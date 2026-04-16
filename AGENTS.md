# AI Agent Instructions

For complete raw app documentation (app structure, backend runnables, datatables, SQL migrations), use the `raw-app` skill.

This file contains **app-specific configuration** for this raw app instance.

---

## Data Configuration

**No default datatable configured.** Set `data.datatable` in `raw_app.yaml` to enable database access.

### Whitelisted Tables

**No tables whitelisted.** Add tables to `data.tables` in `raw_app.yaml`.

### Adding a Table

Edit `raw_app.yaml`:

```yaml
data:
  datatable: main
  tables:
    # Add tables here
    - main/new_table  # ← Add like this
```

**Table reference formats:**
- `<datatable>/<table>` - Table in public schema
- `<datatable>/<schema>:<table>` - Table in specific schema

---

## Quick Reference

**Backend runnable:** Add `backend/<name>.ts` (or .py, etc.), then run `wmill generate-metadata`

**Call from frontend:**
```typescript
import { backend } from './wmill';
const result = await backend.<name>({ arg: 'value' });
```

**Query datatable (TypeScript):**
```typescript
const sql = wmill.datatable();
const rows = await sql`SELECT * FROM table WHERE id = ${id}`.fetch();
```

**SQL migrations:** Add `.sql` files to `sql_to_apply/`, run `wmill app dev`, then whitelist tables

---

## Development Tips & Troubleshooting

### Forcing a Remote Sync
If `wmill sync push` reports `Done (0ms)` but changes (like script deletions) aren't reflected in the Cloud UI, **touch or modify `App.svelte`** (e.g., update a version comment). This forces the CLI to rebuild the app bundle and re-evaluate the backend runnables.

### Fixing "Iterator value undefined" Error
If you encounter `TypeError: Iterator value undefined is not an entry object` during a push, it usually indicates stale or missing metadata for a backend script. 
**Fix:** Run `wmill generate-metadata f/public/postmill__raw_app` to regenerate locks and schemas.

### Handling Binary Data in Backend Scripts
When using `wmill.writeS3File` (or similar S3 functions) in a backend script to save binary data (like an image):
- **Avoid** passing a raw Node.js/Bun `Buffer`. Windmill may stringify it into a JSON object (e.g., `{"type":"Buffer","data":[...]}`).
- **Fix:** Convert the `Buffer` or `Uint8Array` into a `Blob` before passing it to the function.

```typescript
// Correct way to save binary data
const buffer = Buffer.from(base64Content, 'base64');
const blob = new Blob([buffer]);
await wmill.writeS3File({ s3: 'filename.jpg' }, blob, bucketPath);
```

### Handling Threads API Authentication
When configuring Threads integration, ensure you use a **Threads-specific User Access Token**:
- **Format**: Tokens must start with `TH...`. Standard Meta/Facebook tokens (starting with `EA...`) will fail with "Invalid OAuth access token" when calling `graph.threads.net`.
- **Generation**: Use the **Threads -> User Token Generator** in the Meta Developer Portal after adding the "Threads" product to your app and yourself as a Threads Tester.
- **Variables**: Set `u/aaron/THREADS_USER_ID` and `u/aaron/THREADS_ACCESS_TOKEN` in Windmill (or `.env` for local tests).
- **Debugging**: If a token fails, verify it using the [Meta Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/) and ensure the "Threads" product is selected.

### Project Linking
When linking a local directory to a remote app, ensure the code is placed within the correct folder structure (e.g., `f/public/<app_name>__raw_app`). The Windmill CLI tracks apps based on these path conventions defined in `wmill.yaml`.

---
*Run `wmill app generate-agents` to refresh. See `.claude/skills/raw-app` skill for full documentation.*
