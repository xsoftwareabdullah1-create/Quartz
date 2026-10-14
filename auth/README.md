# Quartz Google Sign-In and @quartz.com IDs

Quartz uses Google OAuth to authenticate a person, then assigns a unique Quartz username and address such as `alex.smith@quartz.com`. **This address is an account identifier/alias, not a Gmail inbox. It cannot receive mail until Quartz controls the domain and configures email hosting.** Do not promise a mailbox or OTP delivery before that setup.

## Architecture
- `src/server.js`: Google OAuth authorization-code flow, session-bound state validation, Google ID-token verification, identity provisioning, profile and logout endpoints.
- PostgreSQL stores user identities and server-side sessions.
- `web/auth.js` renders sign-in/profile/sign-out controls.
- Stable Google `sub` links identities; usernames and aliases are unique in the database.

## Google OAuth setup
1. Create/select a project in Google Cloud Console and configure the OAuth consent screen.
2. Create an OAuth 2.0 client of type **Web application**.
3. Add this exact redirect URI: `https://AUTH_HOST/auth/google/callback` (replace AUTH_HOST).
4. Keep the client secret in your hosting secret manager; never place it in browser files or Android assets.

## Deployment configuration
Own/control `quartz.com` before using it as your official email domain. Provision PostgreSQL and deploy this service behind HTTPS. Set the web origin to the exact origin serving the Quartz search page.

Required environment variables:
```sh
DATABASE_URL=postgresql://USER:PASSWORD@DB_HOST:5432/DB_NAME
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
SESSION_SECRET=generate-a-random-secret-at-least-32-characters-long
QUARTZ_PUBLIC_URL=https://auth.example-host.com
QUARTZ_WEB_URL=https://search.example-host.com
PORT=8788
# Optional for trusted local DB only: DATABASE_SSL=disable
```
Default database connection uses TLS certificate verification. Only disable TLS for a trusted local development database.

## Run
Requires Node.js 20+ and PostgreSQL:
```sh
cd auth
npm install
npm run check
npm start
``
Serve `web/` over HTTP/HTTPS (not `file://`). Set `web/config.js` `authBase` to the deployed auth service URL. OAuth callback URI must match exactly. Production uses HTTPS.

## Real email delivery is separate
To make assigned addresses receive mail:
1. Configure an email hosting or transactional mail provider for the domain.
2. Publish the provider's SPF and DKIM DNS records and an appropriate DMARC policy.
3. Verify domain ownership with the provider and store API/SMTP secrets only in the deployment environment.
4. Decide whether addresses are mailboxes, aliases/forwarders, or sending-only identities.
5. Implement delivery, bounces, rate limits, abuse controls and recovery before claiming email/OTP works.

## Security
OAuth state is session-bound and checked; verified Google email is required. Access/refresh tokens are not persisted. PostgreSQL stores sessions; cookies are HttpOnly, SameSite=Lax and Secure on HTTPS. Add production monitoring, rate limiting, privacy/retention policy and incident response before public launch. Never treat an assigned alias as proof an inbox exists.
