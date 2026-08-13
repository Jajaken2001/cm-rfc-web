export type AppRole = "developer" | "admin" | "moderator" | "user";

export const ROLE_LABEL: Record<AppRole, string> = {
  developer: "Developer",
  admin: "Admin",
  moderator: "Moderator",
  user: "User",
};

export const PROTECTED_DEVELOPER_EMAIL = "j.thunder0008@gmail.com";

export function isStaff(role: AppRole | null): boolean {
  return role === "developer" || role === "admin" || role === "moderator";
}
export function isAdminRole(role: AppRole | null): boolean {
  return role === "developer" || role === "admin";
}
export function isDeveloperRole(role: AppRole | null): boolean {
  return role === "developer";
}

export type FieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "dropdown"
  | "multiple_choice"
  | "checkbox"
  | "date"
  | "time"
  | "file"
  | "link";

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "dropdown", label: "Dropdown" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "file", label: "File Upload" },
  { value: "link", label: "Link" },
];

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
}

export interface FormRecord {
  id: string;
  title: string;
  description: string | null;
  kind: "request" | "feedback";
  status: "draft" | "published" | "archived";
  version: number;
  fields: FormField[];
  allow_attachments: boolean;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  path: string;
  name: string;
  size: number;
  type: string;
}

export interface SubmissionRecord {
  id: string;
  reference: string;
  kind: "request" | "feedback";
  form_id: string | null;
  form_title: string;
  form_version: number;
  form_snapshot: FormField[];
  answers: Record<string, unknown>;
  attachments: Attachment[];
  user_id: string;
  user_email: string;
  user_name: string | null;
  status: "pending" | "approved" | "declined" | "new" | "acknowledged";
  response_note: string | null;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ProfileRecord {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_authorized: boolean;
  last_seen_at: string;
  created_at: string;
}

export interface DeductionRecord {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  reason: string;
  applicable_date: string;
  week_start: string;
  notified: boolean;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  status: "draft" | "published" | "archived";
  publish_at: string;
  expires_at: string | null;
  repeat_schedule: string;
  requires_ack: boolean;
  audience_user_id: string | null;
  media?: unknown;
  created_by_email: string | null;
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChatMessageRecord {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_email: string;
  sender_role: string | null;
  message: string;
  created_at: string;
}

export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export function isOnline(lastSeenAt: string): boolean {
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatPeso(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


export function weekLabel(weekStart: string): string {
  const [y, m, d] = weekStart.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return weekStart;
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (dt: Date) => dt.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}

export function initialsOf(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function newFieldId(): string {
  return Math.random().toString(36).slice(2, 10);
}
