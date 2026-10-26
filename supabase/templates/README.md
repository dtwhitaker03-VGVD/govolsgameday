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

## The rest of the set

Same look, same variables. In the dashboard each lives at Authentication →
Emails → Templates under the name shown; paste the subject and the file's source.

| Dashboard template | Subject | File |
|---|---|---|
| Confirm sign up | `Confirm your Go Vols Gameday account` | `confirm-signup.html` |
| Reset password | `Reset your Go Vols Gameday password` | `reset-password.html` |
| Magic link | `Your Go Vols Gameday sign-in link` | `magic-link.html` |
| Invite user | `You're invited to Go Vols Gameday` | `invite-user.html` |
| Change email address | `Confirm your new email address` | `change-email.html` |
| Reauthentication | `Your Go Vols Gameday verification code` | `reauthentication.html` |

Extra variables: `{{ .NewEmail }}` (change email) and `{{ .Token }}` (the 6-digit
code in the reauthentication email). The app currently only uses sign-up
confirmation and password sign-in, so the others matter as features are added.

## Sender (what makes it look professional in the inbox)

The template only changes the body. The "from" name and address come from the
SMTP settings: Authentication → Emails → SMTP Settings. Supabase's built-in
sender is shared, heavily rate limited and shows a generic address; use a custom
SMTP provider and set:

- **Sender name:** `Go Vols Gameday`
- **Sender address:** an address on the site's own domain (e.g. `no-reply@govolsgameday.com`)

Add the provider's SPF/DKIM DNS records for that domain so mail isn't flagged as spam.
