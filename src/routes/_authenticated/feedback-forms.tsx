import { createFileRoute } from "@tanstack/react-router";

import { PublishedFormsList } from "@/components/portal/PublishedFormsList";

export const Route = createFileRoute("/_authenticated/feedback-forms")({
  head: () => ({
    meta: [
      { title: "Feedback Forms — Request & Feedback Portal" },
      { name: "description", content: "Share feedback through forms published by your administrators." },
      { property: "og:title", content: "Feedback Forms — Request & Feedback Portal" },
      {
        property: "og:description",
        content: "Share feedback through forms published by your administrators.",
      },
    ],
  }),
  component: () => (
    <PublishedFormsList
      kind="feedback"
      title="Feedback Forms"
      description="Choose a form to send your feedback."
    />
  ),
});
