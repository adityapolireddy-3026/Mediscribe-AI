import { createFileRoute } from "@tanstack/react-router";
import { RequireRole } from "@/components/dashboard/role-guards";
import { StaffManager } from "@/components/staff/staff-manager";

export const Route = createFileRoute("/_authenticated/admin-doctors")({
  head: () => ({
    meta: [
      { title: "Doctors — MediScribe AI Admin" },
      {
        name: "description",
        content:
          "Create, edit, activate and review clinician accounts registered on MediScribe AI, with their patient and consultation volumes.",
      },
      { property: "og:title", content: "Doctors — MediScribe AI Admin" },
      {
        property: "og:description",
        content: "Administrator management of clinician accounts and their clinical activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireRole allow={["admin"]} area="Doctor management">
      <StaffManager kind="doctor" />
    </RequireRole>
  ),
});
