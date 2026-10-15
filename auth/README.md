# Quartz Google and Email Sign-In

Quartz supports Google OAuth and passwordless email sign-in using a six-digit, one-time code. A verified email login provisions a Quartz account and a unique identifier such as `alex@quartz.com`. **That Quartz address is an account alias, not an inbox. The one-time code is sent to the real email address the user enters.**

## Authentication flows
- Google: OAuth authorization-code flow with session-bound state and server-side ID-token verification.
- Email: sends a six-digit code to the entered email address; code expires after 10 minutes and is limited to five verification attempts. A new code cannot be requested for the same address for 60 seconds.
- PostgreSQL stores users, short-lived code hashes, and server-side sessions.
- `web/auth.js` provides the email sign-in panel, Google sign-in, session profile and logout.

## Google OAuth setup
1. Create/select a project in Google Cloud Console and configure the OAuth consent screen.
2. Create an OAuth 2.0 client of type **Web application**.
3. Add this exact redirect URI: `https://AUTH_HOST/auth/google/callback` (replace AUTH_HOST).
4. Keep the client secret in your hosting secret manager; never place it in browser files or Android assets.

## Deployment configuration
Provision PostgreSQL and deploy this service behind HTTPS. Set `QUARTZ_WEB_URL` to the exact origin serving the Quartz website. Configure the static website's `web/config.js` `authBase` value to the deployed auth service URL (not localhost).

Required server environment variables:
```sh
DATABASE_URL=postgresql://USER:PASSWORD@DB_HOST:5432/DB_NAME
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
SESSION_SECRET=generate-a-random-secret-at-least-32-characters-long
QUARTZ_PUBLIC_URL=https://auth.example-host.com
QUARTZ_WEB_URL=https://search.example-host.com
PORT=8788
```

To enable email-code sign-in, set SMTP credentials in the server's secret manager:
```sh
SMTP_HOST=smtp.your-mail-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
MAIL_FROM=Quartz Sign-In <no-reply@your-verified-domain.com>
```
Use the exact SMTP settings from your mail provider. Verify the sender/domain with that provider and configure its SPF/DKIM records. SMTP credentials must never be committed to GitHub or shipped in website/Android files. Without these settings the auth service can start, but email sign-in returns a configuration error.

## Run and verify
Requires Node.js 20+ and PostgreSQL:
```sh
cd auth
npm install
npm run check
npm start
``
Serve `web/` over HTTP/HTTPS (not `file://`). The database schema is created/updated at service startup. OAuth callback URI must match exactly. Production uses HTTPS.

## Important limits before public launch
- `username@quartz.com` is only a Quartz account alias. It does not automatically create a mailbox or receive mail.
- Configure SMTP sender verification and domain authentication before relying on email delivery.
- Add distributed IP-based rate limiting, monitoring, privacy/retention policy and incident response before broad public launch. Current email-code protection includes per-address cooldown, expiry and attempt limits; it is not a complete abuse-prevention system.
- Use secure cookies and HTTPS in production. Keep all credentials in the hosting secret manager.
