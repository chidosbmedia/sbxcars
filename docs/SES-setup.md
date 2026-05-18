AWS SES Setup and Production Access

This guide walks through verifying a sending identity in AWS SES, configuring DNS for DKIM/SPF, and requesting production access (removing the sandbox). Include screenshots where noted to document the exact steps in your account.

1) Verify a sending identity (email or domain)

- Console path: AWS Console → Services → Simple Email Service (SES) → Verified identities.
- Click "Create identity" → choose "Domain" (recommended) or "Email address".
- If using a domain: enter your domain (example.com) and enable Easy DKIM. SES will show DNS records to add (TXT for SPF/verification, CNAME for DKIM).
- If using an email address: SES will send a verification email to that address. Open the inbox and click the verification link.

Screenshot tip: capture the SES "Create identity" screen showing the TXT and CNAME values.

2) Add DNS records

- Add the provided TXT record (for verification/SPF) and the three CNAME records (for DKIM) to your DNS provider.
- Wait for propagation; SES shows verification status in the console.

Screenshot tip: capture the DNS provider UI showing the records you added.

3) Create SMTP credentials (optional)

- In SES console, go to "SMTP settings" and click "Create SMTP credentials".
- This creates an IAM user with SMTP permissions and returns an SMTP username and password (show only once).
- Save the SMTP credentials and use them in `server/.env` as `SMTP_USER` and `SMTP_PASS`.

4) Request production access (remove sandbox)

- Console path: SES console → Sending statistics panel → "Request production access" or use Support Center.
- The request asks for details: use case description, expected volume, sample email content, sending domain, and contact details.
- Note: Creating a Support case via the Support API requires a paid Support plan (Business/Enterprise). If your account does not have a paid plan, open the case manually in the Console.

Suggested support case text (copy/paste):

```
Please move my account out of the SES sandbox for production sending.
Account ID: [YOUR_ACCOUNT_ID]
Sending region: us-east-1
Use case: Sending inbound web form notifications for SBX Cars prototype. Low volume < 100 emails/day initially.
Sending domain: sbxcars.com (DKIM/SPF configured)
Please advise on any further verification steps.
```

5) Verify deliverability

- Ensure SPF/DKIM DNS records are present and propagated.
- Send test emails to several addresses and check spam folders.

6) Common errors and fixes

- `MessageRejected: Email address is not verified`: The `From` address or recipient is unverified, or account is in sandbox.
- `535 Authentication Credentials Invalid`: SMTP username/password incorrect — re-create SMTP credentials via SES and update `server/.env`.
- Support API errors like `SubscriptionRequiredException`: you must use the Console or upgrade to a paid Support plan to use the Support API.

7) Local testing commands

```bash
cd server
cp .env.example .env
# Edit server/.env with your AWS or SMTP credentials, then:
npm install
npm run dev
# Check health endpoint:
curl http://localhost:3001/server/health
```

8) Screenshots checklist (capture these steps):
- SES "Create identity" with TXT/CNAME values visible
- DNS record entry in your DNS provider
- SES identity showing "verified" status
- SMTP credentials creation screen (save values securely)
- Support Center request summary (if used)

If you want, I can prepare a PDF of these steps with annotated screenshots once you provide the actual screenshots from your console.
