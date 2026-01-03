/**
 * KKBOX Track Details - Vercel Serverless Function
 */

let cachedToken = null;
let tokenExpiry = 0;

const KKBOX_AUTH_URL = "https://account.kkbox.com/oauth2/token";
const KKBOX_API_BASE = "https://api.kkbox.com";

async function getKKBOXToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.KKBOX_CLIENT_ID;
  const clientSecret = process.env.KKBOX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("KKBOX credentials not configured");
  }

  const response = await fetch(KKBOX_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`KKBOX auth failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

  return cachedToken;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, territory = 'TW' } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing query parameter 'id'" });
    }

    const token = await getKKBOXToken();

    const trackUrl = `${KKBOX_API_BASE}/v1.1/tracks/${id}?territory=${territory}`;

    const response = await fetch(trackUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'KKBOX API error' });
    }

    const track = await response.json();

    const trackData = {
      id: track.id,
      name: track.name,
      artist: track.album?.artist?.name,
      album: track.album?.name,
      image: track.album?.images?.[0]?.url,
      duration: track.duration,
      previewUrl: track.url,
      kkboxUrl: track.url,
      isrcCode: track.isrc,
      source: 'kkbox',
    };

    return res.status(200).json(trackData);
  } catch (error) {
    console.error('Error in kkboxTrack:', error);
    return res.status(500).json({ error: error.message });
  }
}
