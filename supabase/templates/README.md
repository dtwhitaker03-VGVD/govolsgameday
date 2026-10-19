# Auth email templates

Supabase Auth emails are configured in the dashboard, not deployed from this
repo, so these files are the source of truth to copy from. Variables in
`{{ ... }}` are Supabase's own (Go templates), filled in when the email is sent.

## Confirm signup — `confirm-signup.html`

Dashboard → Authentication → Emails → **Confirm signup**

- **Subject:** `Confirm your Go Vols Gameday account`
- **Body:** paste the contents of `confirm-signup.html` (HTML source, not the rendered page).

Variables used: `{{ .ConfirmationURL }}` (the button and fallback link),
`{{ .Data.username }}` (set at signup in `AuthModal.tsx`, falls back to "Hi
there"), `{{ .Email }}`, `{{ .SiteURL }}` (set under Authentication → URL
Configuration; should be `https://govolsgameday.com`).

## Sender (what makes it look professional in the inbox)

The template only changes the body. The "from" name and address come from the
SMTP settings: Authentication → Emails → SMTP Settings. Supabase's built-in
sender is shared, heavily rate limited and shows a generic address; use a custom
SMTP provider and set:

- **Sender name:** `Go Vols Gameday`
- **Sender address:** an address on the site's own domain (e.g. `no-reply@govolsgameday.com`)

Add the provider's SPF/DKIM DNS records for that domain so mail isn't flagged as spam.
