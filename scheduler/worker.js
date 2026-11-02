// Cloudflare Worker that starts the Daily reminders workflow at the top of every hour.
// GitHub's own schedule can run hours late; Cloudflare's fires on time. send.mjs still
// decides what is due, using each device's own time zone and reminder hours.
//
// Needs: a GITHUB_TOKEN secret (fine-grained, this repo only, Actions: read and write)
// and a cron trigger of "0 * * * *".
const WORKFLOW = 'https://api.github.com/repos/spencermd/hanma-training/actions/workflows/reminders.yml/dispatches';

export default {
  async scheduled(event, env) {
    if (!env.GITHUB_TOKEN) throw new Error('Missing GITHUB_TOKEN secret');
    const res = await fetch(WORKFLOW, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'hanma-reminder-scheduler',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'main', inputs: { type: 'auto' } }),
    });
    if (!res.ok) throw new Error(`GitHub refused the dispatch (${res.status}): ${await res.text()}`);
  },

  fetch() {
    return new Response('Hanma reminder scheduler. Nothing to see here.');
  },
};
