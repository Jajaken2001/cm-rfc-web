export const SERVICE_FEE_RATE = 0.03;

/** The salary week runs Thursday → Wednesday. */
export const DAY_LABELS = ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"] as const;

export interface SalaryWeekRecord {
  id: string;
  user_id: string;
  user_email: string;
  week_start: string;
  day_1: number;
  day_2: number;
  day_3: number;
  day_4: number;
  day_5: number;
  day_6: number;
  day_7: number;
  night_shift_allowance: number;
  activity_bonus: number;
  hiring_leader_bonus: number;
  chatter_bonus: number;
  deductions_back: number;
  last_week_salary: number;
  deduction: number;
  gross_total: number;
  service_fee: number;
  net_total: number;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export function daysOf(row: SalaryWeekRecord): number[] {
  return [row.day_1, row.day_2, row.day_3, row.day_4, row.day_5, row.day_6, row.day_7].map(Number);
}

export function bonusesOf(row: SalaryWeekRecord): { label: string; amount: number }[] {
  return [
    { label: "Night shift allowance", amount: Number(row.night_shift_allowance) },
    { label: "Full-time activity bonus", amount: Number(row.activity_bonus) },
    { label: "Hiring leader bonus", amount: Number(row.hiring_leader_bonus) },
    { label: "Great chatter bonus", amount: Number(row.chatter_bonus) },
    { label: "Deductions returned", amount: Number(row.deductions_back) },
    { label: "Last week's carryover", amount: Number(row.last_week_salary) },
  ];
}

/** Returns the Thursday that starts the salary week containing `date`. */
export function salaryWeekStart(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() - 4 + 7) % 7; // 4 = Thursday
  d.setDate(d.getDate() - offset);
  return toISODate(d);
}

export function toISODate(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function salaryWeekLabel(weekStart: string): string {
  const [y, m, d] = weekStart.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return weekStart;
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (dt: Date) => dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}

export function dayDateLabels(weekStart: string): string[] {
  const [y, m, d] = weekStart.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return DAY_LABELS.map((x) => x);
  return DAY_LABELS.map((label, i) => {
    const dt = new Date(y, m - 1, d + i);
    return `${label} ${dt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  });
}

export interface ParsedSalaryRow {
  email: string;
  days: number[];
  night: number;
  activity: number;
  hiring: number;
  chatter: number;
  deductions_back: number;
  last_week: number;
  deduction: number;
  /** The "Salary" column from the pasted sheet, used to verify our own maths. */
  statedTotal: number | null;
  computedTotal: number;
  serviceFee: number;
  netTotal: number;
  matches: boolean;
}

function num(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[$,\s"]/g, "").replace(/[（(]/g, "").replace(/[）)]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Parses a pasted spreadsheet block. Each data line is expected to be
 * tab-separated in sheet order:
 * Account | 7 day columns | Night | Activity | Hiring | Chatter |
 * Deductions back | Last week's salary | Deduction | Salary
 */
export function parseSalaryPaste(text: string): { rows: ParsedSalaryRow[]; skipped: number } {
  const lines = text.split(/\r?\n/);
  const rows: ParsedSalaryRow[] = [];
  let skipped = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = line.split(/\t|\s{2,}|,(?=\s*[-\d.$]|\s*$)/).map((c) => c.trim());
    const emailIndex = cells.findIndex((c) => /[^@\s]+@[^@\s]+\.[^@\s]+/.test(c));
    if (emailIndex === -1) {
      if (/\d/.test(line)) skipped += 1;
      continue;
    }
    const email = (cells[emailIndex]?.match(/[^@\s"]+@[^@\s"]+\.[^@\s"]+/) ?? [""])[0].toLowerCase();
    const rest = cells.slice(emailIndex + 1);
    const value = (i: number) => num(rest[i]);

    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => value(i));
    const night = value(7);
    const activity = value(8);
    const hiring = value(9);
    const chatter = value(10);
    const deductions_back = value(11);
    const last_week = value(12);
    const deduction = value(13);
    const statedRaw = rest[14];
    const statedTotal = statedRaw && statedRaw.trim() !== "" ? num(statedRaw) : null;

    const computedTotal = round2(
      days.reduce((s, v) => s + v, 0) +
        night +
        activity +
        hiring +
        chatter +
        deductions_back +
        last_week -
        deduction,
    );
    const serviceFee = round2(computedTotal * SERVICE_FEE_RATE);
    const netTotal = round2(computedTotal - serviceFee);

    rows.push({
      email,
      days,
      night,
      activity,
      hiring,
      chatter,
      deductions_back,
      last_week,
      deduction,
      statedTotal,
      computedTotal,
      serviceFee,
      netTotal,
      matches: statedTotal === null || Math.abs(statedTotal - computedTotal) < 0.02,
    });
  }

  return { rows, skipped };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const SALARY_PASTE_EXAMPLE = `Account\tAug.6\tAug.7\tAug.8\tAug.9\tAug.10\tAug.11\tAug.12\tNight Shift Allowance($)\tFull-time Activity Bonus($)\tHiring Leader Bonus($)\tGreat Chatter BONUS($)\tDeductions back\tlast week's salary\tDeduction\tSalary
T959@gmail.com\t38.1\t18.75\t26.8\t22.55\t12.1\t32.1\t21.5\t4\t\t\t\t\t\t1\t174.9`;
