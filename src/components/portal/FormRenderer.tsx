import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormField } from "@/lib/portal";

export type AnswerMap = Record<string, unknown>;

export function validateAnswers(fields: FormField[], answers: AnswerMap): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (!field.required) continue;
    const value = answers[field.id];
    const empty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0) ||
      (field.type === "checkbox" && value !== true);
    if (empty) errors[field.id] = "This field is required.";
    if (field.type === "link" && typeof value === "string" && value && !/^https?:\/\//i.test(value)) {
      errors[field.id] = "Enter a full link starting with http:// or https://";
    }
  }
  return errors;
}

export function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}) {
  const id = `field-${field.id}`;
  const describedBy = error ? `${id}-error` : undefined;

  function control() {
    switch (field.type) {
      case "long_text":
        return (
          <Textarea
            id={id}
            rows={5}
            value={(value as string) ?? ""}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "number":
        return (
          <Input
            id={id}
            type="number"
            value={(value as string) ?? ""}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "date":
        return (
          <Input
            id={id}
            type="date"
            value={(value as string) ?? ""}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "time":
        return (
          <Input
            id={id}
            type="time"
            value={(value as string) ?? ""}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "link":
        return (
          <Input
            id={id}
            type="url"
            placeholder="https://"
            value={(value as string) ?? ""}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "dropdown":
        return (
          <Select value={(value as string) ?? ""} onValueChange={onChange}>
            <SelectTrigger id={id} aria-describedby={describedBy}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "multiple_choice":
        return (
          <RadioGroup
            value={(value as string) ?? ""}
            onValueChange={onChange}
            className="gap-2"
            aria-describedby={describedBy}
          >
            {(field.options ?? []).map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <RadioGroupItem value={opt} id={`${id}-${opt}`} />
                <Label htmlFor={`${id}-${opt}`} className="font-normal">
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={value === true}
              aria-describedby={describedBy}
              onCheckedChange={(checked) => onChange(checked === true)}
            />
            <Label htmlFor={id} className="font-normal">
              {field.description || "Yes"}
            </Label>
          </div>
        );
      default:
        return (
          <Input
            id={id}
            value={(value as string) ?? ""}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold">
        {field.label}
        {field.required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {field.description && field.type !== "checkbox" ? (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      ) : null}
      {control()}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function useAnswers(initial: AnswerMap = {}) {
  const [answers, setAnswers] = useState<AnswerMap>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  return {
    answers,
    errors,
    setErrors,
    set(fieldId: string, value: unknown) {
      setAnswers((prev) => ({ ...prev, [fieldId]: value }));
      setErrors((prev) => {
        if (!prev[fieldId]) return prev;
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    },
    reset() {
      setAnswers({});
      setErrors({});
    },
  };
}

export function AnswerList({
  fields,
  answers,
}: {
  fields: FormField[];
  answers: AnswerMap;
}) {
  return (
    <dl className="divide-y divide-border">
      {fields.map((field) => {
        const raw = answers[field.id];
        let display: string;
        if (raw === true) display = "Yes";
        else if (raw === false) display = "No";
        else if (Array.isArray(raw)) display = raw.join(", ");
        else display = raw === undefined || raw === null || raw === "" ? "—" : String(raw);
        return (
          <div key={field.id} className="grid gap-1 py-3 sm:grid-cols-[220px_1fr] sm:gap-6">
            <dt className="text-sm font-semibold">{field.label}</dt>
            <dd className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {display}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
