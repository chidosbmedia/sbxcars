Render deployment — quickstart and recommended settings

Overview
This project is configured to deploy to Render using a Docker-based web service. The `render.yaml` Blueprint template is provided at the repo root (render.yaml).

High-level checklist before linking the repo
- Remove any secrets from git history and working tree (do NOT push `server/.env` or `server/aws-credentials.json`).
- Confirm `Dockerfile` runs the Node server and listens on `$PORT` (Render provides `$PORT` at runtime).
- Ensure `render.yaml` includes `repo:` with your repository URL, or set the Blueprint path when creating the Blueprint.

Create a Blueprint in Render (step-by-step)
1. Push your repository to GitHub/GitLab/Bitbucket.
2. In Render Dashboard: New -> Blueprint.
3. Connect the repository that contains this project and select the branch (e.g., `main`).
4. If prompted, confirm the Blueprint path is `/render.yaml` (default).
5. Review the resources Render will create (the service named `sbxcars`).
6. During the create flow Render will prompt for any environment variables marked `sync: false` (we recommend setting secrets in the Dashboard instead).
7. Deploy Blueprint.

Required environment variables (set these in Render Dashboard -> Service -> Environment)
- `USE_AWS_SDK` (true|false) — prefer AWS SDK for SES in production
- `AWS_REGION` (e.g., us-east-1)
- `AWS_ACCESS_KEY_ID` — IAM key with SES Send permissions (do NOT commit)
- `AWS_SECRET_ACCESS_KEY` — (do NOT commit)
- `TO_EMAIL` — the mailbox to receive site submissions (verify in SES if needed)
- `SMTP_FROM` — verified sender address (if using SMTP fallback)

Security notes
- Never commit secrets. Use Render's secret management (set values in the Dashboard). If you accidentally committed secrets, remove them and rotate the credentials.
- If you want the Blueprint creation to prompt for secrets, use `sync: false` on the `envVars` entries — be aware prompts run only during initial creation.

Health checks (recommended)
- Liveness: `/server/alive` — simple 200 response to confirm the process is running.
- Readiness: `/server/ready` — returns 200 when either SES SDK validated or SMTP is available; returns 503 otherwise.
- Render settings recommended (Dashboard or using `render.yaml`):
  - Health path: `/server/ready`
  - Check interval: 15s
  - Timeout: 5s
  - Initial grace: 30s

CI and post-deploy testing
- The repo includes a GitHub Action `post-deploy-test-email.yml` which can run `npm run test-email` in `server/` to validate email sending.
- Best practice: gate the test-email step so it runs only after a successful Render deploy (Render can send a webhook to trigger a GitHub workflow). Alternatively, run the job in a protected branch after deploy.

SES and sandbox reminders
- SES starts in sandbox mode: you must verify `SMTP_FROM` (and any `TO_EMAIL` used in tests) or request production access via AWS Support Console.
- The server performs an SES `getSendQuota()` check on startup when `USE_AWS_SDK=true`. Ensure AWS credentials are valid.

Troubleshooting
- `MessageRejected: Email address is not verified`: verify sending identity or remove sandbox.
- `535 Authentication Credentials Invalid`: incorrect SMTP credentials — re-create in SES and update Render env var.
- If health checks fail, check server logs in Render and confirm the app binds to `$PORT`.

Useful commands (local testing)
```bash
# start server locally (edit server/.env first)
cd server
cp .env.example .env
# edit server/.env with credentials (do NOT commit)
npm ci
npm run dev

# check readiness
curl http://localhost:3001/server/ready

# run integration test send (sends to TO_EMAIL)
npm run test-email
```

If you want, I can:
- Add `sync: false` entries for sensitive env vars in `render.yaml` so Render prompts during creation.
- Add a Render webhook example and update the GitHub Action to be triggered by that webhook.
- Scan git history to ensure no secrets were committed and provide remediation commands.
