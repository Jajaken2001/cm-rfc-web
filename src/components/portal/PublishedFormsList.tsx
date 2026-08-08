import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Paperclip } from "lucide-react";

import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/portal/Primitives";
import { supabase } from "@/integrations/supabase/client";
import type { FormRecord } from "@/lib/portal";

export function PublishedFormsList({
  kind,
  title,
  description,
}: {
  kind: "request" | "feedback";
  title: string;
  description: string;
}) {
  const query = useQuery({
    queryKey: ["published-forms", kind],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("kind", kind)
        .eq("status", "published")
        .order("title");
      if (error) throw error;
      return (data ?? []) as unknown as FormRecord[];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {query.data.map((form) => (
            <Link
              key={form.id}
              to="/submit/$formId"
              params={{ formId: form.id }}
              className="panel flex flex-col gap-3 p-5 transition-colors hover:border-accent/50"
            >
              <h2 className="text-lg">{form.title}</h2>
              {form.description ? (
                <p className="line-clamp-3 text-sm text-muted-foreground">{form.description}</p>
              ) : null}
              <div className="mt-auto flex items-center justify-between pt-2 text-sm text-accent">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  {form.allow_attachments ? (
                    <>
                      <Paperclip className="size-3.5" /> Attachments allowed
                    </>
                  ) : (
                    `${form.fields.length} question${form.fields.length === 1 ? "" : "s"}`
                  )}
                </span>
                <span className="inline-flex items-center gap-1">
                  Open <ArrowRight className="size-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No ${kind} forms are published`}
          hint="Your administrators publish forms here when they are ready."
        />
      )}
    </div>
  );
}
