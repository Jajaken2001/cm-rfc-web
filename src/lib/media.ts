export type MediaKind = "link" | "image" | "video";

export interface MediaItem {
  kind: MediaKind;
  url: string;
  label?: string;
}

export const MEDIA_KINDS: { value: MediaKind; label: string }[] = [
  { value: "link", label: "Link" },
  { value: "image", label: "Picture" },
  { value: "video", label: "Video" },
];

export function parseMedia(value: unknown): MediaItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((v) => {
      const kind = String(v["kind"] ?? "link");
      return {
        kind: (kind === "image" || kind === "video" ? kind : "link") as MediaKind,
        url: String(v["url"] ?? ""),
        label: v["label"] ? String(v["label"]) : "",
      };
    })
    .filter((m) => m.url.trim().length > 0);
}

/** Returns an embeddable iframe URL for known video hosts, otherwise null. */
export function videoEmbedUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname.startsWith("/embed/")) return `https://www.youtube.com${url.pathname}`;
    if (url.pathname.startsWith("/shorts/")) {
      return `https://www.youtube.com/embed/${url.pathname.split("/")[2] ?? ""}`;
    }
    const id = url.searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === "player.vimeo.com" || host === "drive.google.com") {
    return rawUrl;
  }
  return null;
}

export function isDirectVideoFile(rawUrl: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(rawUrl);
}
