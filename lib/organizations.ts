export interface Organization {
  id: string;
  name: string;
  industry: string;
  plants: number;
  users: number;
  status: "Active" | "Inactive";
  lastUpdated: string;
}

export const ORGANIZATIONS: readonly Organization[] = [
  { id: "abc-manufacturing", name: "ABC Manufacturing", industry: "Manufacturing", plants: 3, users: 42, status: "Active", lastUpdated: "Today" },
  { id: "xyz-components", name: "XYZ Components", industry: "Manufacturing", plants: 2, users: 18, status: "Active", lastUpdated: "Sep 12, 2026" },
] as const;

export const DEMO_ORGANIZATION = ORGANIZATIONS[0];
