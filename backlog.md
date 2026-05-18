Backlog
=======

2026-05-18 — Triggering a GitHub Action from a Render deployment webhook

Summary:

Short answer: have Render call GitHub to start the Action after a successful deploy, instead of the Action running on every git push.

Why do this:
- Ensures the post-deploy test runs only after Render finishes deploying the new release (safer than running on push).
- Lets you run smoke tests against the live service that was just deployed.

How it works (high level):
- Create a GitHub Actions workflow that listens for `repository_dispatch` (or `workflow_dispatch`) events.
- Configure Render to send a webhook when a deploy finishes (Render Dashboard → Webhooks → add deploy-success webhook).
- The webhook calls the GitHub API (POST /repos/:owner/:repo/dispatches) with a custom `event_type` to trigger the workflow.
- Store a GitHub token in Render (or a Render secret) and use it to authenticate the webhook call to GitHub.

Minimal example (what Render should POST to GitHub):

- Endpoint: `POST https://api.github.com/repos/<owner>/<repo>/dispatches`
- Headers: `Authorization: token <GITHUB_TOKEN>`, `Accept: application/vnd.github+json`
- Body:
```
{ "event_type": "render-deploy-complete", "client_payload": { "service": "sbxcars", "status":"succeeded" } }
```

GitHub workflow snippet (listen for that event):

```
on:
  repository_dispatch:
    types: [render-deploy-complete]
```

Security notes:
- Use a least-privilege GitHub token (repo scope as needed). Store the token securely (Render secret).
- Verify the source and payload where possible (limit event_type, use minimal permissions).
- Do not expose the token in the repo or public logs.

Alternatives:
- Trigger on push and add a guard that checks Render deploy status via Render API (more complex).
- Use a CI/CD system that supports deploy hooks natively.

Next actions listed to implement (options):
- A) Create the `repository_dispatch`-listening workflow for `post-deploy-test-email`.
- B) Add a short curl snippet and instructions to configure Render's webhook to call GitHub (including how to store the token in Render).
