import { createFileRoute } from "@tanstack/react-router";

import { PublicShell } from "@/components/portal/PublicShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Request & Feedback Portal" },
      {
        name: "description",
        content:
          "How the Request & Feedback Portal processes your Google account details, submissions, attachments, notifications and salary deduction records.",
      },
      { property: "og:title", content: "Privacy Policy — Request & Feedback Portal" },
      {
        property: "og:description",
        content: "What information the internal portal processes, why, and how it is used.",
      },
    ],
  }),
  component: Privacy,
});

const processed = [
  ["Google account name", "Shown on your profile and on records you submit, so staff know who sent them."],
  ["Google account email", "Used as your identity in the portal and stamped on every request and feedback you send."],
  ["Google profile photo", "Displayed in the portal where available. Optional — the portal works without it."],
  ["Account identifier", "The unique account ID issued at sign-in. It links your records to you."],
  ["User role", "Developer, Admin, Moderator or User. Determines what you can see and do."],
  ["Requests and feedback", "The forms you submit, including every answer you provide."],
  ["Form responses", "Stored with a snapshot of the form version you answered, so old records stay readable."],
  ["Attachments", "Files you upload with a submission. Stored privately, not on public links."],
  ["Notifications", "Official updates published to you by administrators."],
  ["Notification acknowledgements", "A record that you confirmed reading an update that required it."],
  ["Request statuses", "Pending, approved or declined, plus the history of each change."],
  ["Salary deduction records", "Amount, reason and the week a deduction applies to."],
  ["Timestamps", "When records are created, submitted, reviewed or acknowledged."],
  ["Audit and security information", "A record of administrative actions such as role changes and deduction edits."],
];

function Privacy() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="text-3xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This policy explains what the Request &amp; Feedback Portal processes and why. It is
          written in plain language and describes our actual practice — it does not claim any legal
          certification or compliance that has not been verified.
        </p>

        <h2 className="mt-10 text-xl">Information the portal may process</h2>
        <div className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {processed.map(([label, why]) => (
            <div key={label} className="grid gap-1 p-4 sm:grid-cols-[220px_1fr] sm:gap-6">
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-sm text-muted-foreground">{why}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-10 text-xl">Why we collect it</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Every item above exists to operate the portal: to confirm who you are, to route your
          request to the right reviewer, to show you the correct dashboard, to keep your submissions
          and deduction records accurate, and to keep an accountable record of administrative
          decisions. We do not use this information for advertising and we do not sell it.
        </p>

        <h2 className="mt-10 text-xl">Who can see your information</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>You can always see your own profile, requests, feedback, acknowledgements and deductions.</li>
          <li>Moderators and Admins can review requests, feedback and forms as part of their duties.</li>
          <li>Only Admins and Developers can view or manage salary deductions and moderation.</li>
          <li>Regular users cannot see other people's requests, feedback, attachments or deductions. This is enforced by the database, not just hidden in the interface.</li>
        </ul>

        <h2 className="mt-10 text-xl">Attachments</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Files you upload are stored privately. They are not published on open links. Access is
          limited to you and to staff authorized to review the record the file belongs to.
        </p>

        <h2 className="mt-10 text-xl">Retention</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Submissions, status history, deduction records and audit entries are retained as
          organizational records. Editing or archiving a form never removes submissions that were
          already made against an earlier version of it.
        </p>

        <h2 className="mt-10 text-xl">Your choices</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          You can sign out at any time, which ends your session on this device. To ask about the
          information held about you, or to request a correction to a record, contact your
          administrator directly.
        </p>

        <h2 className="mt-10 text-xl">Changes</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          If this policy changes, the updated version replaces this page. Continued use of the
          portal after a change means the current version applies.
        </p>
      </article>
    </PublicShell>
  );
}
