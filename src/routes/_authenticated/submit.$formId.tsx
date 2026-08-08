import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import { FieldInput, useAnswers, validateAnswers } from "@/components/portal/FormRenderer";
import { ErrorState, LoadingState, PageHeader } from "@/components/portal/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import type { Attachment, FormRecord } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/submit/$formId")({
  head: () => ({
    meta: [
      { title: "Submit a form — Request & Feedback Portal" },
      { name: "description", content: "Fill in and submit a published portal form." },
      { property: "og:title", content: "Submit a form — Request & Feedback Portal" },
      { property: "og:description", content: "Fill in and submit a published portal form." },
    ],
  }),
  component: SubmitFormPage,
});

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function SubmitFormPage() {
  const { formId } = Route.useParams();
  const { profile } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { answers, errors, setErrors, set } = useAnswers();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const formQuery = useQuery({
    queryKey: ["form", formId],
    queryFn: async () => {
      const { data, error } = await supabase.from("forms").select("*").eq("id", formId).maybeSingle();
      if (error) throw error;
      return (data as unknown as FormRecord) ?? null;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const form = formQuery.data;
      if (!form || !profile) throw new Error("missing");

      const uploaded: Attachment[] = [];
      if (files.length > 0) {
        setUploading(true);
        for (const file of files) {
          const path = `${profile.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
          const { error } = await supabase.storage.from("attachments").upload(path, file, {
            contentType: file.type || "application/octet-stream",
          });
          if (error) throw error;
          uploaded.push({ path, name: file.name, size: file.size, type: file.type });
        }
        setUploading(false);
      }

      const { data, error } = await supabase
        .from("submissions")
        .insert({
          kind: form.kind,
          form_id: form.id,
          form_title: form.title,
          form_version: form.version,
          form_snapshot: form.fields as never,
          answers: answers as never,
          attachments: uploaded as never,
          user_id: profile.id,
          user_email: profile.email,
          user_name: profile.full_name,
          status: form.kind === "request" ? "pending" : "new",
        })
        .select("reference")
        .single();
      if (error) throw error;
      return data.reference as string;
    },
    onSuccess: (reference) => {
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Submitted", { description: `Your reference number is ${reference}.` });
      void navigate({ to: "/my-requests" });
    },
    onError: () => {
      setUploading(false);
      toast.error("Could not submit", { description: "Please check your answers and try again." });
    },
  });

  if (formQuery.isLoading) return <LoadingState />;
  if (formQuery.isError) return <ErrorState onRetry={() => void formQuery.refetch()} />;

  const form = formQuery.data;
  if (!form || form.status !== "published") {
    return <ErrorState message="This form is not available." />;
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE_BYTES) {
        toast.error("File too large", { description: `${file.name} is over 10 MB.` });
        continue;
      }
      accepted.push(file);
    }
    setFiles((prev) => [...prev, ...accepted]);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validationErrors = validateAnswers(form!.fields, answers);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Please complete the required fields");
      return;
    }
    submit.mutate();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={form.title} {...(form.description ? { description: form.description } : {})} />

      <form onSubmit={handleSubmit} className="panel space-y-6 p-6">
        {form.fields.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={answers[field.id]}
            {...(errors[field.id] ? { error: errors[field.id] } : {})}
            onChange={(value) => set(field.id, value)}
          />
        ))}

        {form.allow_attachments ? (
          <div className="space-y-2">
            <Label htmlFor="attachments" className="text-sm font-semibold">
              Attachments
            </Label>
            <p className="text-sm text-muted-foreground">
              Optional. Up to 10 MB per file. Files are stored privately.
            </p>
            <Input
              id="attachments"
              type="file"
              multiple
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {files.length > 0 ? (
              <ul className="space-y-2 pt-1">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <Paperclip className="size-3.5 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-border pt-5">
          <Button type="submit" disabled={submit.isPending || uploading}>
            {uploading ? "Uploading files…" : submit.isPending ? "Submitting…" : "Submit"}
          </Button>
          <Button type="button" variant="outline" onClick={() => void navigate({ to: "/dashboard" })}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
