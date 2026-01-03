/**
 * KKBOX OAuth Proxy Cloud Functions
 * Handles KKBOX API authentication and requests to bypass CORS
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const cors = require("cors")({origin: true});

// KKBOX API Configuration
const KKBOX_API_BASE = "https://api.kkbox.com";
const KKBOX_AUTH_URL = "https://account.kkbox.com/oauth2/token";

// Store access token in memory (will reset on cold start)
let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get KKBOX Access Token using Client Credentials Flow
 */
async function getKKBOXToken() {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.KKBOX_CLIENT_ID;
  const clientSecret = process.env.KKBOX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("KKBOX credentials not configured. Set KKBOX_CLIENT_ID and KKBOX_CLIENT_SECRET in Firebase Functions config.");
  }

  try {
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
    // Set expiry to 5 minutes before actual expiry for safety
    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

    logger.info("KKBOX token obtained successfully");
    return cachedToken;
  } catch (error) {
    logger.error("Failed to get KKBOX token:", error);
    throw error;
  }
}

/**
 * Search tracks on KKBOX
 * GET /kkboxSearch?q=song+name&territory=TW&limit=20
 */
exports.kkboxSearch = onRequest({cors: true}, async (req, res) => {
  return cors(req, res, async () => {
    try {
      const {q, territory = "TW", limit = 20} = req.query;

      if (!q) {
        res.status(400).json({error: "Missing query parameter 'q'"});
        return;
      }

      const token = await getKKBOXToken();

      const searchUrl = new URL(`${KKBOX_API_BASE}/v1.1/search`);
      searchUrl.searchParams.set("q", q);
      searchUrl.searchParams.set("type", "track");
      searchUrl.searchParams.set("territory", territory);
      searchUrl.searchParams.set("limit", limit.toString());

      const response = await fetch(searchUrl.toString(), {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error("KKBOX search failed:", error);
        res.status(response.status).json({error: "KKBOX API error"});
        return;
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
        previewUrl: track.url, // KKBOX preview URL
        kkboxUrl: track.url,
        isrcCode: track.isrc,
        source: "kkbox",
      })) || [];

      res.json({tracks, total: data.tracks?.summary?.total || 0});
    } catch (error) {
      logger.error("Error in kkboxSearch:", error);
      res.status(500).json({error: error.message});
    }
  });
});

/**
 * Get track details from KKBOX
 * GET /kkboxTrack?id=track_id&territory=TW
 */
exports.kkboxTrack = onRequest({cors: true}, async (req, res) => {
  return cors(req, res, async () => {
    try {
      const {id, territory = "TW"} = req.query;

      if (!id) {
        res.status(400).json({error: "Missing query parameter 'id'"});
        return;
      }

      const token = await getKKBOXToken();

      const trackUrl = `${KKBOX_API_BASE}/v1.1/tracks/${id}?territory=${territory}`;

      const response = await fetch(trackUrl, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error("KKBOX track fetch failed:", error);
        res.status(response.status).json({error: "KKBOX API error"});
        return;
      }

      const track = await response.json();

      // Transform to our format
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
        source: "kkbox",
      };

      res.json(trackData);
    } catch (error) {
      logger.error("Error in kkboxTrack:", error);
      res.status(500).json({error: error.message});
    }
  });
});

/**
 * Get new releases from KKBOX
 * GET /kkboxNewReleases?territory=TW&limit=20
 */
exports.kkboxNewReleases = onRequest({cors: true}, async (req, res) => {
  return cors(req, res, async () => {
    try {
      const {territory = "TW", limit = 20} = req.query;

      const token = await getKKBOXToken();

      const url = `${KKBOX_API_BASE}/v1.1/new-release-categories/all/albums?territory=${territory}&limit=${limit}`;

      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error("KKBOX new releases failed:", error);
        res.status(response.status).json({error: "KKBOX API error"});
        return;
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      logger.error("Error in kkboxNewReleases:", error);
      res.status(500).json({error: error.message});
    }
  });
});
