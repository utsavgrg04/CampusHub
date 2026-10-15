# CampusHub

CampusHub is a browser based JavaScript application served by an Express API and backed by SQLite. The static frontend is in `public/`; `server.js` serves it and the `/api` endpoints. The SQLite database defaults to `campus.db` beside `server.js`.

## Run locally

1. Install Node.js dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set a unique `JWT_SECRET` of at least 32 characters. Configure `APP_BASE_URL` and the mail settings before enabling email registration or recovery.
3. Run `npm start` and open <http://localhost:3000>.

New accounts receive the student role. An administrator can promote an existing account to organizer using a controlled database administration process; the app does not expose role changes to students.

## Configuration

- `JWT_SECRET` is required. Keep it private and use a different random value in each environment.
- `DB_PATH` optionally sets the SQLite file path. Relative paths resolve from this project directory. Use persistent storage in hosted deployments.
- `HOST` and `PORT` optionally configure the Express listener (defaults: `0.0.0.0` and `3000`). Put public deployments behind HTTPS and a managed reverse proxy; do not expose SQLite files or `.env`.
- `GEOAPIFY_API_KEY` enables venue geocoding and real driving, walking, cycling, and supported transit routes on the Leaflet/OpenStreetMap map page. The key is used by the server and is not sent in page markup. Without it, the map can still show stored venue coordinates and OSM tiles, while geocoding/routing actions report that the provider is unavailable.
- `CAMPUS_GEOCODING_CONTEXT` optionally appends a city, region, or country to venue address lookups.
- `APP_BASE_URL` is the public CampusHub origin used in verification, recovery, and OAuth callback links.
- `RESEND_API_KEY` and `EMAIL_FROM` enable account verification and password reset email through Resend. Verify the sender/domain in Resend first.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` enable Google OpenID Connect. The exact local callback is `http://localhost:3000/api/auth/google/callback`.
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_AUTHORITY`, and `MICROSOFT_REDIRECT_URI` enable Microsoft OpenID Connect. The default authority is `/common/v2.0`; the exact local callback is `http://localhost:3000/api/auth/microsoft/callback`.
- OAuth uses authorization code + PKCE, one-time state and nonce, and signed identity-token validation against provider JWKS. A provider remains unavailable until its app registration and environment values are configured.
- Browser sessions use an HttpOnly, SameSite=Lax cookie and a CSRF token. Configure HTTPS and `NODE_ENV=production` in production so cookies receive the Secure flag. Roles are assigned by the backend; public signup always creates students.

## Authentication setup

**Google:** In Google Cloud Console, configure the OAuth consent screen and create a Web application OAuth client. Add the exact local and production callback URLs as Authorized redirect URIs, then place its client ID and secret in `.env`.

**Microsoft:** In Microsoft Entra, register a Web application and select accounts in any organizational directory and personal Microsoft accounts. Add the exact callback URL under Web redirect URIs, create a client secret, and set the application client ID, secret, authority, and redirect URL in `.env`. Keep the secret private.

**Email/password:** Configure a verified Resend sender/domain, then set `RESEND_API_KEY` and `EMAIL_FROM`. Signup requires email verification; reset links expire after one hour. Passwords are hashed with bcrypt and never returned to the browser.

Existing password accounts need to confirm their email after the auth upgrade. With mail delivery configured, use the Sign up tab with the existing email and password to request a verification link; the existing account and its data are retained.

Two real initial accounts have not been provisioned. Supply the real student and organizer email addresses and preferred methods (Google, Microsoft, or email/password) before provisioning. Do not use demo credentials; organizer role assignment is an administrator action. The auth migration disables demo/placeholder credentials and revokes their sessions while retaining user rows and linked records.

## Backups and checks

- `npm run backup` creates and integrity-checks a SQLite backup under `backups/`.
- `npm test` runs the isolated authentication/API smoke suite against a temporary SQLite database.
- `npm run test:api` runs the same isolated authentication/API smoke suite.
- End-to-end Google and Microsoft tests require working provider registrations; email verification and password reset tests require a configured Resend sender. Browser/mobile visual checks remain a manual verification step.

The app uses plain browser ES modules, so there is no separate frontend build step. No lint script is configured.
