# Hanma Training

A phone app for the 6-week Baki Hanma workout and diet plan. It works on Android (Pixel) and iPhone. Install it from the browser to your home screen.

- **Today:** the day's workout and meals. Check off exercises, log weights and reps, mark meals as eaten, log other food, and log your bodyweight.
- **Plan:** all 42 days, week by week.
- **Grocery:** a weekly shopping list in store units (pounds of raw meat, dozens of eggs, tubs, cans), grouped by aisle and scaled to your bodyweight and goal, with check-offs for the store. The Sunday morning reminder says to restock.
- **Progress:** completion stats, streak, benchmark tests (weeks 0, 3 and 6) and a bodyweight chart.
- **Settings:** start date, bodyweight and goal (meal portions rescale to fit), reminder times, and backup/restore.
- **Reminders:** a morning push with the day's plan and an evening check-in on what's still unlogged.

All logs stay on your phone. The push only says "morning" or "evening"; the phone builds the notification text itself.

## How the reminders work

GitHub Actions runs [`push/send.mjs`](push/send.mjs) every hour. Each phone's *device code* holds that phone's time zone and reminder hours, so a phone only gets a push when its local hour matches. GitHub's scheduler can run 5–30 minutes late, so expect a 7:00 reminder somewhere around 7:05–7:30.

## One-time setup

### 1. Publish the app (GitHub Pages)

1. Push this folder to a **public** GitHub repo (free GitHub Pages needs a public repo; your logs never go there).
2. In the repo, open **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder `/ (root)`.
3. Your app will be at `https://<your-username>.github.io/<repo-name>/`.

### 2. Add the push keys

In the repo, open **Settings → Secrets and variables → Actions**:

| Type | Name | Value |
|---|---|---|
| Variable | `VAPID_PUBLIC_KEY` | the `vapidPublicKey` in [`config.js`](config.js) |
| Secret | `VAPID_PRIVATE_KEY` | `privateKey` from `push/.vapid.json` (this file is never committed) |
| Secret | `PUSH_SUBSCRIPTIONS` | `[]` for now; your device codes go here in step 4 |

### 3. Install on your phones

- **Pixel 8 Pro (Chrome):** open the app URL, then tap **⋮ → Install app** (or *Add to Home screen*).
- **iPhone 14 Pro Max (Safari):** open the app URL, tap **Share → Add to Home Screen**, then **open Hanma from the Home Screen icon**. iOS only allows notifications for apps opened this way.

### 4. Turn on reminders (on each phone)

1. In the app, open **Settings → Daily reminders**, choose your times, and tap **Turn on notifications**. Allow the prompt.
2. Tap **Copy device code**.
3. Edit the `PUSH_SUBSCRIPTIONS` secret on GitHub and paste the codes as a JSON list:
   ```json
   [ {paste Pixel code here}, {paste iPhone code here} ]
   ```
   (Each code already starts with `{` and ends with `}`; separate them with a comma.)
4. Test it: open **Actions → Daily reminders → Run workflow**, pick *morning*, and run it. The notification should arrive within a minute.

If you change reminder times, or a run's log says a subscription "expired", tap **Refresh notifications** in the app and paste the new code.

## Good to know

- **Back up your data:** use **Settings → Export backup** now and then. Deleting the home screen app or clearing site data erases your logs.
- **Offline:** the app works with no signal once it's installed.
- **GitHub pauses scheduled jobs** in a repo with no activity for 60 days. The program is 42 days, so this won't matter for one run; for a second run, just push any commit.
- **Updating the app:** after changing files, bump `CACHE` in [`sw.js`](sw.js) (e.g. `hanma-v2`) so phones pick up the new version. It loads on the second open.

## Local testing

```bash
node tools/serve.mjs
```

Then open http://localhost:5173. `node tools/make-icons.mjs` regenerates the icons. The plan data in [`plan.js`](plan.js) matches the two spreadsheets exactly.

*Inspired by a fictional character. Check with a doctor before starting, and scale everything to your level.*
