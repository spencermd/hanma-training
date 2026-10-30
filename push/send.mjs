// Sends the morning / evening reminder pushes. Run hourly by GitHub Actions.
// Each device code (from the app's Settings tab) carries its own time zone and
// reminder hours, so this only sends to devices whose local hour matches now.
//
// Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_SUBSCRIPTIONS (JSON array of
// device codes), optional FORCE_TYPE = morning | evening to send right away.
import webpush from 'web-push';

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_SUBSCRIPTIONS, FORCE_TYPE, GITHUB_REPOSITORY } = process.env;
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error('Missing VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');

let devices;
try {
  devices = JSON.parse(PUSH_SUBSCRIPTIONS || '[]');
  if (!Array.isArray(devices)) devices = [devices];
} catch {
  throw new Error('PUSH_SUBSCRIPTIONS is not valid JSON. It should look like [ {device code}, {device code} ]');
}
if (!devices.length) {
  console.log('No devices yet. Add your device code(s) to the PUSH_SUBSCRIPTIONS secret.');
  process.exit(0);
}

// Apple requires a contact URL or mailto; the app's own GitHub Pages URL works.
const [owner, repo] = (GITHUB_REPOSITORY || 'hanma/app').split('/');
webpush.setVapidDetails(process.env.VAPID_SUBJECT || `https://${owner}.github.io/${repo}/`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const localHour = (tz) => Number(new Intl.DateTimeFormat('en-US', { timeZone: tz || 'UTC', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));

let failures = 0;
for (const d of devices) {
  const hour = localHour(d.tz);
  const type = FORCE_TYPE || (hour === Number(d.morning) ? 'morning' : hour === Number(d.evening) ? 'evening' : null);
  const label = `${d.device || 'device'} (${d.tz}, local hour ${hour})`;
  if (!type) { console.log(`${label}: nothing due`); continue; }
  try {
    await webpush.sendNotification(d.sub, JSON.stringify({ type }), { TTL: 3 * 3600, urgency: 'high' });
    console.log(`${label}: sent ${type}`);
  } catch (err) {
    failures++;
    const gone = err.statusCode === 404 || err.statusCode === 410;
    console.error(`${label}: failed (${err.statusCode || err.message})${gone ? ' - subscription expired: tap "Refresh notifications" in the app and update your device code' : ''}`);
  }
}
if (failures) process.exitCode = 1;
