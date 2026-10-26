import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  NotebookPen,
  Pill,
  FileText,
  Settings,
  LogOut,
  UserRound,
  Building2,
  ShieldCheck,
  ConciergeBell,
  CalendarClock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const doctorItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Consultations", url: "/consultations", icon: Stethoscope },
  { title: "Clinical Notes", url: "/clinical-notes", icon: NotebookPen },
  { title: "Prescriptions", url: "/prescriptions", icon: Pill },
  { title: "Reports", url: "/reports", icon: FileText },
];

const adminItems: NavItem[] = [
  { title: "Dashboard", url: "/admin", icon: ShieldCheck },
  { title: "Doctors", url: "/admin-doctors", icon: Stethoscope },
  { title: "Receptionists", url: "/admin-receptionists", icon: ConciergeBell },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Consultation Records", url: "/admin-consultations", icon: NotebookPen },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Hospital Settings", url: "/hospital-settings", icon: Building2 },
];

const receptionItems: NavItem[] = [
  { title: "Dashboard", url: "/reception", icon: LayoutDashboard },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Patient Reports", url: "/patient-reports", icon: FileText },
  { title: "Appointments", url: "/appointments", icon: CalendarClock },
];

const accountItems: NavItem[] = [
  { title: "My Profile", url: "/profile", icon: UserRound },
  { title: "Settings", url: "/settings", icon: Settings },
];

const menuButtonClass =
  "relative gap-2.5 rounded-lg pl-3 transition-all duration-200 ease-out before:absolute before:left-0 before:top-1/2 before:h-0 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-sidebar-primary before:transition-all before:duration-200 hover:translate-x-[1px] data-[active=true]:font-semibold data-[active=true]:before:h-6";

function StaffProfileCard({ roleLabel }: { roleLabel: string }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const { data } = useQuery({
    queryKey: ["sidebar-profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, specialty, hospital, email, department")
        .eq("id", auth.user.id)
        .maybeSingle();
      return {
        name: profile?.full_name?.trim() || auth.user.email || "Staff member",
        detail: profile?.specialty?.trim() || profile?.department?.trim() || "",
        hospital: profile?.hospital?.trim() || "",
        photo: (auth.user.user_metadata?.avatar_url as string | undefined) ?? "",
      };
    },
  });

  const initials = (data?.name ?? "MS")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className={collapsed ? "px-2 pb-2" : "px-3 pb-3"}>
      <div
        className={
          collapsed
            ? "flex justify-center"
            : "flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-2.5"
        }
      >
        {data?.photo ? (
          <img
            src={data.photo}
            alt={`${data.name} profile photo`}
            className="size-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="gradient-clinical flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-foreground">
            {initials || "MS"}
          </span>
        )}
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{data?.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {data?.detail || roleLabel}
            </p>
            {data?.hospital && (
              <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                <Building2 className="size-3 shrink-0" />
                <span className="truncate">{data.hospital}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { role } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const primaryItems =
    role === "admin" ? adminItems : role === "receptionist" ? receptionItems : doctorItems;
  const groupLabel =
    role === "admin" ? "Administration" : role === "receptionist" ? "Front Desk" : "Clinic";
  const roleLabel =
    role === "admin" ? "Administrator" : role === "receptionist" ? "Receptionist" : "Doctor";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarContent>
            <div className="flex items-center gap-2.5 px-3 py-4">
              <span className="gradient-clinical flex size-8 shrink-0 items-center justify-center rounded-lg text-primary-foreground">
                <Stethoscope className="size-4" />
              </span>
              <span className="truncate font-display text-sm font-extrabold">MediScribe AI</span>
            </div>

            <StaffProfileCard roleLabel={roleLabel} />

            <SidebarGroup>
              <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {primaryItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        className={menuButtonClass}
                        tooltip={item.title}
                      >
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="size-4 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Account</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        className={menuButtonClass}
                        tooltip={item.title}
                      >
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="size-4 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border pt-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={signOut}
                  className={`${menuButtonClass} group hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400`}
                  tooltip="Logout"
                >
                  <LogOut className="size-4 shrink-0 group-hover:text-red-600 dark:group-hover:text-red-400" />
                  <span className="truncate">Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
            <SidebarTrigger />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </header>
          <main className="flex-1 p-5 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
