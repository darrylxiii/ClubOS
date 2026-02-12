
## Add Feature Control Center to Admin Navigation

The admin navigation is defined in `src/config/navigation.config.ts` in the `roleSpecificGroups` object under the `admin` key. The Feature Control Center should be added to the **Operations** group (lines 330-342), which currently contains:
- KPI Command Center
- Edge Function Command Center
- Employee Dashboard
- System Health
- Bulk Operations
- Page Templates
- AI Configuration

### Plan

**Add one navigation item to the Operations group:**

In `src/config/navigation.config.ts`, within the admin's Operations group:
- Add a new item: `{ name: "Feature Control Center", icon: Zap, path: "/admin/feature-control" }`
- Place it **immediately after** "Edge Function Command Center" to keep related platform control features grouped together
- Use the `Zap` icon (already imported) for visual consistency with the Edge Function Command Center (which also uses `Zap`)

**Why this location:**
- The Operations group is the natural home for platform infrastructure tools
- Placing it right after Edge Function Command Center creates a clear "control center" pair: Edge Functions (backend) and Features (frontend)
- Both serve admin efficiency and cost reduction goals

**Files to modify:**
- `src/config/navigation.config.ts` (add 1 line to the admin Operations group items array)

