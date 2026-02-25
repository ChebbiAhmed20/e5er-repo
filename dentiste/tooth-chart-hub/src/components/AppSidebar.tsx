import { Home, Calendar, BarChart3, CreditCard, Users, Bell, Lock, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Tableau de bord", url: "/dashboard", icon: Home },
  { title: "Calendrier", url: "/appointments", icon: Calendar },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Rappels", url: "/reminders", icon: Bell, locked: true },
  { title: "Services en ligne", url: "/billing", icon: CreditCard, locked: true },
  { title: "Analyses", url: "/analytics", icon: BarChart3 },
  { title: "Mon Abonnement", url: "/subscription", icon: ShieldCheck },
];

export function AppSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-base font-semibold py-4">
            {open ? "Virela" : "V"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "relative bg-sidebar-accent/90 text-sidebar-accent-foreground font-semibold border-l-2 border-sidebar-primary"
                          : item.locked
                            ? "hover:bg-sidebar-accent/40 text-sidebar-foreground/80"
                            : "hover:bg-sidebar-accent/60 text-sidebar-foreground"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex items-center gap-1">
                        {item.title}
                        {item.locked && <Lock className="h-3 w-3 opacity-80" aria-hidden="true" />}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
