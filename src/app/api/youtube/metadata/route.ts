import { NextRequest, NextResponse } from "next/server";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3/videos";
const YOUTUBE_OEMBED_BASE = "https://www.youtube.com/oembed";

function extractYouTubeId(urlOrId: string): string | null {
  const input = (urlOrId || "").trim();
  if (!input) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  try {
    const parsed = new URL(input);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && id.length === 11 ? id : null;
    }

    if (host.includes("youtube.com")) {
      const fromQuery = parsed.searchParams.get("v");
      if (fromQuery && fromQuery.length === 11) return fromQuery;

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" && parts[1]?.length === 11) return parts[1];
      if (parts[0] === "embed" && parts[1]?.length === 11) return parts[1];
    }
  } catch {
    // Fall through to regex parser below.
  }

  const match = input.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] || null;
}

function parseDurationToSeconds(isoDuration?: string): number | undefined {
  if (!isoDuration) return undefined;

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

function getBestThumbnailUrl(thumbnails: Record<string, { url?: string }> = {}): string {
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    ""
  );
}

async function fetchYouTubeDataApiMeta(videoId: string, apiKey: string) {
  const params = new URLSearchParams({
    part: "snippet,contentDetails,statistics",
    id: videoId,
    key: apiKey,
  });

  const response = await fetch(`${YOUTUBE_API_BASE}?${params.toString()}`, {
    // Small revalidation for repeated lookups during admin usage.
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`YouTube API returned ${response.status}`);
  }

  const data = await response.json();
  const item = data?.items?.[0];

  if (!item) {
    throw new Error("Video not found");
  }

  const snippet = item.snippet || {};
  const durationSec = parseDurationToSeconds(item.contentDetails?.duration);
  const parsedViewCount = Number.parseInt(item.statistics?.viewCount || "0", 10);

  return {
    videoId,
    title: snippet.title || "",
    description: snippet.description || "",
    thumbnailUrl: getBestThumbnailUrl(snippet.thumbnails || {}),
    durationSec,
    viewCount: Number.isFinite(parsedViewCount) ? parsedViewCount : 0,
    tags: Array.isArray(snippet.tags) ? snippet.tags : [],
    channelTitle: snippet.channelTitle || "",
    publishedAt: snippet.publishedAt || "",
    source: "youtube-data-api",
  };
}

async function fetchYouTubeOEmbedMeta(videoId: string) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const params = new URLSearchParams({
    url: watchUrl,
    format: "json",
  });

  const response = await fetch(`${YOUTUBE_OEMBED_BASE}?${params.toString()}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`YouTube oEmbed returned ${response.status}`);
  }

  const data = await response.json();

  return {
    videoId,
    title: data?.title || "",
    description: "",
    thumbnailUrl:
      data?.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    durationSec: undefined,
    viewCount: undefined,
    tags: [],
    channelTitle: data?.author_name || "",
    publishedAt: "",
    source: "youtube-oembed",
  };
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url") || "";
  const videoId = extractYouTubeId(rawUrl);

  if (!videoId) {
    return NextResponse.json(
      { error: "Invalid YouTube URL or video ID." },
      { status: 400 }
    );
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const youtubeApiKey =
    process.env.YOUTUBE_DATA_API || process.env.YOUTUBE_API_KEY || "";

  try {
    if (youtubeApiKey) {
      try {
        const fullMeta = await fetchYouTubeDataApiMeta(videoId, youtubeApiKey);
        return NextResponse.json({
          ...fullMeta,
          canonicalUrl,
        });
      } catch {
        // Fallback to oEmbed below.
      }
    }

    const basicMeta = await fetchYouTubeOEmbedMeta(videoId);
    return NextResponse.json({
      ...basicMeta,
      canonicalUrl,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch YouTube details right now." },
      { status: 502 }
    );
  }
}
