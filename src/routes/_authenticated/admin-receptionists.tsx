import { createFileRoute } from "@tanstack/react-router";
import { RequireRole } from "@/components/dashboard/role-guards";
import { StaffManager } from "@/components/staff/staff-manager";

export const Route = createFileRoute("/_authenticated/admin-receptionists")({
  head: () => ({
    meta: [
      { title: "Receptionists — MediScribe AI Admin" },
      {
        name: "description",
        content:
          "Create, edit, activate and review front-desk receptionist accounts responsible for patient registration and report uploads.",
      },
      { property: "og:title", content: "Receptionists — MediScribe AI Admin" },
      {
        property: "og:description",
        content: "Administrator management of front-desk receptionist accounts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireRole allow={["admin"]} area="Receptionist management">
      <StaffManager kind="receptionist" />
    </RequireRole>
  ),
});
