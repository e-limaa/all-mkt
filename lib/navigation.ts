import { LucideIcon, BarChart3, FileImage, Target, Building, Share2, Users, Settings } from "lucide-react";
import { Permission } from "../types/enums";

export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
};

const BASE_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "dashboard",
    icon: BarChart3,
    permission: Permission.VIEW_DASHBOARD,
  },
  {
    id: "materials",
    label: "Materiais",
    href: "materials",
    icon: FileImage,
  },
  {
    id: "campaigns",
    label: "Campanhas",
    href: "campaigns",
    icon: Target,
  },
  {
    id: "projects",
    label: "Empreendimentos",
    href: "projects",
    icon: Building,
  },
  {
    id: "shared",
    label: "Links",
    href: "shared",
    icon: Share2,
    permission: Permission.VIEW_SHARED_LINKS,
  },
  {
    id: "users",
    label: "Usuários",
    href: "users",
    icon: Users,
    permission: Permission.VIEW_USERS,
  },
  {
    id: "settings",
    label: "Configurações",
    href: "settings",
    icon: Settings,
    permission: Permission.ACCESS_SETTINGS,
  },
];

export function buildNavigationItems(
  hasPermission: (permission: Permission) => boolean,
): NavigationItem[] {
  return BASE_NAVIGATION_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });
}
