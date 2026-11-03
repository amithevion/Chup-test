# Peleg's Bar Mitzvah – RSVP

Static RSVP site (Hebrew, mobile-first) with a live organizer dashboard.
No build step: plain HTML/CSS/JS, hosted on GitHub Pages, data in Supabase.

- `index.html` – invitation + RSVP form (guests)
- `admin.html` – organizer dashboard (login required): guest list, live total headcount, search, delete, CSV export
- `supabase/schema.sql` – table, security policies, realtime

## Security model

Guests use Supabase's public *anon* key, which can **only insert** RSVPs.
Reading or deleting requires signing in on `admin.html` with an email listed in the `admins` table.
This is enforced by row-level security in the database, not by hiding the page.

## Setup (one time, ~10 minutes)

1. **Create a Supabase project** at <https://supabase.com> (free tier is enough).
2. **Create the database:** open *SQL Editor*, paste `supabase/schema.sql`,
   change `organizer@example.com` to your email(s), and run it.
3. **Create the organizer login:** *Authentication → Users → Add user → Create new user*
   with the same email and a password (tick "Auto confirm user").
4. **Turn off public sign-ups:** *Authentication → Sign In / Providers* → disable "Allow new users to sign up".
5. **Connect the site:** *Project Settings → API*, copy the Project URL and the `anon` public key
   into `js/config.js`.
6. **Deploy:** push to GitHub, then in the repo go to *Settings → Pages → Source: Deploy from a branch →
   `main` / `(root)`*. After a minute the site is live at
   `https://<github-user>.github.io/<repo>/` – share that link on WhatsApp.
   The dashboard is at `.../admin.html`.

To add another organizer later: `insert into admins (email) values ('someone@example.com');`
and create their user in step 3.

## Run locally

The scripts are ES modules, so open the site through a local server (not by double-clicking):

```sh
npx serve .
# or: python -m http.server 8000
```
