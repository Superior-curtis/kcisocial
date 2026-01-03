/**
 * KKBOX OAuth Proxy - Vercel Serverless Function
 * Free alternative to Firebase Cloud Functions
 */

// Token cache (will persist during function lifetime)
let cachedToken = null;
let tokenExpiry = 0;

const KKBOX_AUTH_URL = "https://account.kkbox.com/oauth2/token";
const KKBOX_API_BASE = "https://api.kkbox.com";

/**
 * Get KKBOX Access Token
 */
async function getKKBOXToken() {
  // Return cached token if still valid
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
    const error = await response.text();
    throw new Error(`KKBOX auth failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

  return cachedToken;
}

/**
 * Main handler for KKBOX search
 */
export default async function handler(req, res) {
  // Enable CORS
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
    const { q, territory = 'TW', limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Missing query parameter 'q'" });
    }

    const token = await getKKBOXToken();

    const searchUrl = new URL(`${KKBOX_API_BASE}/v1.1/search`);
    searchUrl.searchParams.set('q', q);
    searchUrl.searchParams.set('type', 'track');
    searchUrl.searchParams.set('territory', territory);
    searchUrl.searchParams.set('limit', limit.toString());

    const response = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('KKBOX search failed:', error);
      return res.status(response.status).json({ error: 'KKBOX API error' });
    }

    const data = await response.json();

    // Transform to our format
    const tracks = data.tracks?.data?.map((track) => ({
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
    })) || [];

    return res.status(200).json({
      tracks,
      total: data.tracks?.summary?.total || 0,
    });
  } catch (error) {
    console.error('Error in kkboxSearch:', error);
    return res.status(500).json({ error: error.message });
  }
}
