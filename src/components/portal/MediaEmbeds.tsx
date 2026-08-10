import { ExternalLink } from "lucide-react";

import { isDirectVideoFile, videoEmbedUrl, type MediaItem } from "@/lib/media";
import { cn } from "@/lib/utils";

export function MediaEmbeds({ items, className }: { items: MediaItem[]; className?: string }) {
  if (!items.length) return null;
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, i) => (
        <MediaEmbed key={`${item.url}-${i}`} item={item} />
      ))}
    </div>
  );
}

function MediaEmbed({ item }: { item: MediaItem }) {
  if (item.kind === "image") {
    return (
      <figure className="overflow-hidden rounded-md border border-border">
        <img
          src={item.url}
          alt={item.label || "Attached picture"}
          loading="lazy"
          className="h-auto w-full object-cover"
        />
        {item.label ? (
          <figcaption className="border-t border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {item.label}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (item.kind === "video") {
    const embed = videoEmbedUrl(item.url);
    if (embed) {
      return (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="aspect-video w-full">
            <iframe
              src={embed}
              title={item.label || "Attached video"}
              className="size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      );
    }
    if (isDirectVideoFile(item.url)) {
      return (
        <video controls preload="metadata" className="w-full rounded-md border border-border">
          <source src={item.url} />
        </video>
      );
    }
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
    >
      <ExternalLink className="size-4 shrink-0 text-accent" />
      <span className="truncate">{item.label || item.url}</span>
    </a>
  );
}
