import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { bannerClasses, type BannerRecord } from "@/lib/site-content";
import { cn } from "@/lib/utils";

export function useActiveBanners() {
  return useQuery({
    queryKey: ["site-banners", "active"],
    staleTime: 60_000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("site_banners")
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", nowIso)
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as BannerRecord[]).filter(
        (b) => !b.ends_at || new Date(b.ends_at).getTime() > Date.now(),
      );
    },
  });
}

export function SiteBanners({ className }: { className?: string }) {
  const { data } = useActiveBanners();
  if (!data || data.length === 0) return null;
  return (
    <div className={cn("space-y-2", className)}>
      {data.map((banner) => (
        <div
          key={banner.id}
          role="status"
          className={cn(
            "flex flex-wrap items-center justify-center gap-3 border px-4 py-2.5 text-sm",
            bannerClasses(banner.variant),
          )}
        >
          <span>{banner.message}</span>
          {banner.link_url ? (
            <a
              href={banner.link_url}
              className="font-medium underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              {banner.link_label || "Learn more"}
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}
