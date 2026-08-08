import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ErrorState, LoadingState, PageHeader } from "@/components/portal/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  FIELD_TYPES,
  newFieldId,
  type FieldType,
  type FormField,
  type FormRecord,
} from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/manage/forms/$formId")({
  head: () => ({
    meta: [
      { title: "Form Builder — Request & Feedback Portal" },
      { name: "description", content: "Add, reorder and configure the questions on a portal form." },
      { property: "og:title", content: "Form Builder — Request & Feedback Portal" },
      {
        property: "og:description",
        content: "Add, reorder and configure the questions on a portal form.",
      },
    ],
  }),
  component: FormBuilderPage,
});

const NEEDS_OPTIONS: FieldType[] = ["dropdown", "multiple_choice"];

function FormBuilderPage() {
  const { formId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["manage-form", formId],
    queryFn: async () => {
      const { data, error } = await supabase.from("forms").select("*").eq("id", formId).maybeSingle();
      if (error) throw error;
      return (data as unknown as FormRecord) ?? null;
    },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allowAttachments, setAllowAttachments] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);

  useEffect(() => {
    const form = query.data;
    if (!form) return;
    setTitle(form.title);
    setDescription(form.description ?? "");
    setAllowAttachments(form.allow_attachments);
    setFields(form.fields);
  }, [query.data]);

  const save = useMutation({
    mutationFn: async () => {
      const form = query.data!;
      const { error } = await supabase
        .from("forms")
        .update({
          title: title.trim() || "Untitled form",
          description: description.trim() || null,
          allow_attachments: allowAttachments,
          fields: fields as never,
          version: form.status === "published" ? form.version + 1 : form.version,
        })
        .eq("id", formId);
      if (error) throw error;
      await supabase.rpc("write_audit", {
        _action: "form_updated",
        _target_type: "form",
        _target_id: formId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-form", formId] });
      queryClient.invalidateQueries({ queryKey: ["manage-forms"] });
      queryClient.invalidateQueries({ queryKey: ["published-forms"] });
      toast.success("Form saved");
    },
    onError: () => toast.error("Could not save the form"),
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState message="This form could not be loaded." />;

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function move(index: number, delta: number) {
    setFields((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item!);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Form builder"
        description={
          query.data.status === "published"
            ? "This form is published. Saving creates a new version — submissions already made keep the version they answered."
            : "Draft form. Publish it from the Forms list when it is ready."
        }
        actions={
          <>
            <Button variant="outline" onClick={() => void navigate({ to: "/manage/forms" })}>
              Back
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save form"}
            </Button>
          </>
        }
      />

      <section className="panel space-y-4 p-6">
        <div className="space-y-2">
          <Label htmlFor="form-title">Form title</Label>
          <Input id="form-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="form-description">Description</Label>
          <Textarea
            id="form-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain what this form is for."
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Allow attachments</p>
            <p className="text-sm text-muted-foreground">
              Lets employees upload supporting files with their submission.
            </p>
          </div>
          <Switch checked={allowAttachments} onCheckedChange={setAllowAttachments} />
        </div>
      </section>

      <section className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="panel space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm text-muted-foreground">
                Question {index + 1}
              </span>
              <div className="ml-auto flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move up"
                  onClick={() => move(index, -1)}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move down"
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete question"
                  onClick={() => setFields((prev) => prev.filter((f) => f.id !== field.id))}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`label-${field.id}`}>Question label</Label>
                <Input
                  id={`label-${field.id}`}
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`type-${field.id}`}>Field type</Label>
                <Select
                  value={field.type}
                  onValueChange={(value) => updateField(field.id, { type: value as FieldType })}
                >
                  <SelectTrigger id={`type-${field.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`help-${field.id}`}>Helper text</Label>
              <Input
                id={`help-${field.id}`}
                value={field.description ?? ""}
                onChange={(e) => updateField(field.id, { description: e.target.value })}
                placeholder="Optional guidance shown under the question."
              />
            </div>

            {NEEDS_OPTIONS.includes(field.type) ? (
              <div className="space-y-2">
                <Label htmlFor={`options-${field.id}`}>Options (one per line)</Label>
                <Textarea
                  id={`options-${field.id}`}
                  rows={4}
                  value={(field.options ?? []).join("\n")}
                  onChange={(e) =>
                    updateField(field.id, {
                      options: e.target.value.split("\n").map((o) => o.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <Switch
                id={`required-${field.id}`}
                checked={field.required}
                onCheckedChange={(checked) => updateField(field.id, { required: checked })}
              />
              <Label htmlFor={`required-${field.id}`} className="font-normal">
                Required
              </Label>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            setFields((prev) => [
              ...prev,
              { id: newFieldId(), type: "short_text", label: "New question", required: false },
            ])
          }
        >
          <Plus className="size-4" /> Add question
        </Button>
      </section>
    </div>
  );
}
