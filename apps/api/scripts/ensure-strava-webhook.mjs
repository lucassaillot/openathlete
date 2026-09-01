const endpoint = 'https://www.strava.com/api/v3/push_subscriptions';
const clientId = process.env.STRAVA_CLIENT_ID;
const clientSecret = process.env.STRAVA_CLIENT_SECRET;
const callbackUrl = process.env.STRAVA_WEBHOOK_URL;
const verifyToken = process.env.STRAVA_WEBHOOK_TOKEN;

const missing = [
  ['STRAVA_CLIENT_ID', clientId],
  ['STRAVA_CLIENT_SECRET', clientSecret],
  ['STRAVA_WEBHOOK_URL', callbackUrl],
  ['STRAVA_WEBHOOK_TOKEN', verifyToken],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const listUrl = new URL(endpoint);
listUrl.searchParams.set('client_id', clientId);
listUrl.searchParams.set('client_secret', clientSecret);

const listResponse = await fetch(listUrl);
if (!listResponse.ok) {
  throw new Error(
    `Unable to list Strava webhook subscriptions (${listResponse.status}): ${await listResponse.text()}`,
  );
}

const subscriptions = await listResponse.json();
if (!Array.isArray(subscriptions)) {
  throw new Error('Unexpected response while listing Strava webhook subscriptions');
}

if (subscriptions.length > 0) {
  const matching = subscriptions.find(
    (subscription) => subscription.callback_url === callbackUrl,
  );
  if (matching) {
    console.log(`Strava webhook subscription ${matching.id} is correctly configured.`);
    process.exit(0);
  }

  const configuredUrls = subscriptions
    .map((subscription) => subscription.callback_url || '(unknown URL)')
    .join(', ');
  throw new Error(
    `A Strava webhook subscription already exists with a different callback URL: ${configuredUrls}. Delete it explicitly before creating a replacement.`,
  );
}

const form = new FormData();
form.set('client_id', clientId);
form.set('client_secret', clientSecret);
form.set('callback_url', callbackUrl);
form.set('verify_token', verifyToken);

const createResponse = await fetch(endpoint, { method: 'POST', body: form });
if (!createResponse.ok) {
  throw new Error(
    `Unable to create Strava webhook subscription (${createResponse.status}): ${await createResponse.text()}`,
  );
}

const subscription = await createResponse.json();
console.log(`Created Strava webhook subscription ${subscription.id}.`);
