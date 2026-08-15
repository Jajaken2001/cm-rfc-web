import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchGifs, type GifResult } from "@/lib/giphy.functions";

export function GifPicker({
  onPick,
  onClose,
}: {
  onPick: (gif: GifResult) => void;
  onClose: () => void;
}) {
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const run = useServerFn(searchGifs);

  const gifs = useQuery({
    queryKey: ["giphy", query],
    queryFn: () => run({ data: { query } }),
    staleTime: 5 * 60 * 1000,
  });

  const results = gifs.data?.gifs ?? [];

  return (
    <div className="absolute bottom-14 left-0 z-20 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-border bg-popover p-3 shadow-lg">
      <form
        className="mb-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(term.trim());
        }}
      >
        <Input
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search GIPHY…"
          className="h-8"
        />
        <Button type="submit" size="sm" variant="outline">
          Search
        </Button>
      </form>

      <div className="h-64 overflow-y-auto">
        {gifs.isLoading ? (
          <p className="p-4 text-center text-xs text-muted-foreground">Loading GIFs…</p>
        ) : gifs.data?.error ? (
          <p className="p-4 text-center text-xs text-muted-foreground">{gifs.data.error}</p>
        ) : results.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">No GIFs found.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {results.map((gif) => (
              <button
                key={gif.id}
                type="button"
                className="overflow-hidden rounded border border-border transition-opacity hover:opacity-80"
                onClick={() => {
                  onPick(gif);
                  onClose();
                }}
              >
                <img src={gif.previewUrl} alt={gif.title} loading="lazy" className="h-20 w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Powered by GIPHY</span>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
