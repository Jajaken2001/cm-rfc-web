import { createFileRoute } from "@tanstack/react-router";

import { PublishedFormsList } from "@/components/portal/PublishedFormsList";

export const Route = createFileRoute("/_authenticated/request-forms")({
  head: () => ({
    meta: [
      { title: "Request Forms — Request & Feedback Portal" },
      { name: "description", content: "Open a published request form and submit it for review." },
      { property: "og:title", content: "Request Forms — Request & Feedback Portal" },
      { property: "og:description", content: "Open a published request form and submit it for review." },
    ],
  }),
  component: () => (
    <PublishedFormsList
      kind="request"
      title="Request Forms"
      description="Choose a form to submit an official request."
    />
  ),
});
