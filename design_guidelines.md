# AI Performance Mirror - Design Guidelines

## Design Approach

**Selected Approach:** Custom Design System with Data Dashboard Focus

This enterprise performance analytics application requires a sophisticated, data-dense interface that balances complexity with usability. Drawing inspiration from Linear's precision, Notion's clarity, and modern data platforms like Grafana and Tableau, while incorporating the specified 3D elements and dark theme.

**Core Principles:**
- Information density without overwhelming users
- Clear visual hierarchy for complex data
- Role-specific optimized experiences
- Premium, modern aesthetic with depth

---

## Visual Theme & Atmosphere

**Color Palette (User-Specified):**
- Primary Dark: #0B1F3A
- Mid-tone: #123B6A  
- Accent Blue: #1E6FB8
- Background: #0E2940
- Supporting neutrals: Soft grays (#E5E7EB, #9CA3AF) for text on dark
- Whites for high contrast text and active elements
- Accent colors for status indicators (green for positive metrics, amber for warnings, red for alerts)

**3D Treatment Philosophy:**
- Subtle depth layering through glassmorphism panels with backdrop-blur
- Floating card effects with soft shadows and slight elevation
- Extruded components for primary CTAs and KPI cards
- Minimal React Three Fiber elements: orbiting data nodes in headers, floating score visualizations
- Performance-first: simple geometries, no heavy scenes

---

## Typography System

**Font Family:** Inter (primary) with tabular numerics for data tables

**Scale & Hierarchy:**
- Hero/Display: text-4xl to text-5xl, font-bold (Dashboard titles, main metrics)
- Section Headers: text-2xl to text-3xl, font-semibold
- Subsection Headers: text-xl, font-medium
- Body: text-base, font-normal
- Captions/Labels: text-sm, font-medium
- Data Tables: text-sm with tabular-nums
- Micro-text: text-xs for timestamps and metadata

**Treatment:**
- High contrast white text on dark backgrounds
- Soft gray (#9CA3AF) for secondary information
- Letter-spacing: tracking-tight for headlines, tracking-normal for body

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 24

**Grid Structure:**
- Standard container: max-w-7xl with mx-auto
- Dashboard grids: 12-column system
- Responsive breakpoints: Standard Tailwind (sm, md, lg, xl, 2xl)

**Dashboard Layout Patterns:**

1. **HR Dashboard (Org-Wide View):**
   - Top: Global KPI bar (4 metric cards spanning full width) - grid-cols-4
   - Main: Split layout - Left sidebar (20%) with filters/navigation, Right (80%) content area
   - Content sections: Department heatmap (full width), Employee table (full width), Trend charts (grid-cols-2)
   - Each section: p-8 spacing, rounded-xl cards with glassmorphism

2. **Manager Dashboard:**
   - Hero metrics: Team score + 3 key metrics in grid-cols-4
   - Team list: Full-width table with expandable rows
   - Alert panel: Sticky right sidebar (25%) showing real-time notifications
   - Activity feed: 2-column grid of recent team activities

3. **Employee View:**
   - Personal score hero: Centered, large circular progress visualization with 3D depth
   - Timeline: Single column, max-w-4xl centered
   - Feedback cards: grid-cols-2 on desktop, grid-cols-1 on mobile
   - Improvement suggestions: Accent cards with left border indicator

**Consistent Spacing:**
- Section padding: py-12 to py-16
- Card padding: p-6 to p-8
- Gap between grid items: gap-6 to gap-8
- Page margins: px-8 to px-12

---

## Component Library

### Navigation
**Top Navigation Bar:**
- Sticky, backdrop-blur glassmorphism panel
- Height: h-16
- Logo left, role indicator center, user menu right
- Horizontal navigation tabs for main sections
- Notification bell icon with badge indicator

**Sidebar Navigation (Dashboard-specific):**
- Width: w-64 on desktop, collapsible to w-16 icon-only
- Dark panel with subtle border-r
- Icon + label pattern for nav items
- Active state: bright accent background with left border indicator

### Data Display Components

**KPI Cards:**
- Glassmorphism panels with backdrop-blur-md
- Extruded effect: subtle box-shadow with y-offset
- Structure: Large metric (text-4xl), label below, trend indicator (arrow + %)
- Size: Compact (p-6), Standard (p-8)
- Hover: Slight lift effect (transform translate-y)

**Performance Score Display:**
- Large circular progress (200px diameter minimum)
- 3D treatment: layered rings with gradient fills
- Center: Score value (text-5xl font-bold)
- Surrounding: Component breakdown with small radial segments
- Animation: Smooth fill on load

**Data Tables:**
- Header: Sticky with backdrop-blur, font-semibold
- Row height: h-12 to h-14 for breathing room
- Zebra striping: Subtle alternating row backgrounds
- Hover state: Lighter background overlay
- Sortable columns: Icon indicators
- Action columns: Right-aligned with icon buttons
- Expandable rows: Smooth accordion animation

**Charts & Graphs:**
- Area charts for trend visualization (recharts or similar)
- Bar charts for comparisons (horizontal for employee rankings)
- Heatmaps for department/team performance (calendar-style grid)
- Line graphs for score history
- Consistent accent colors with opacity gradients

**Activity Timeline:**
- Vertical line connector with nodes
- Card per activity: Icon badge left, content right
- Timestamp in soft gray
- Event type color-coding
- Expandable details for complex activities

### Interactive Components

**Feedback Cards:**
- Two-column layout: Rating visual left (stars/score circle), content right
- Category badge at top
- Comment text with expand/collapse for long content
- Submitter info with avatar
- Card border-left with category color

**Filters & Controls:**
- Date range picker: Floating panel with calendar
- Dropdown filters: Multi-select with tag chips
- Search: Full-width with icon, backdrop-blur container
- Toggle groups for view switching (day/week/month)

**Modals:**
- Score Details Modal: Large (max-w-4xl), centered overlay
- Structure: Header with title, scrollable body with component breakdown visualization, footer with actions
- Backdrop: Dark overlay with blur
- Animation: Fade + scale entrance (Framer Motion)

**Forms (Feedback Submission):**
- Clean vertical layout with generous spacing (space-y-6)
- Rating input: Interactive star/scale selector with large tap targets
- Category: Button group selection
- Comment: Textarea with character counter
- Submit: Primary button with loading state

### Buttons & CTAs

**Primary Actions:**
- Solid accent background (#1E6FB8)
- px-6 py-3, rounded-lg
- font-medium text
- Hover: Brightness increase + subtle scale
- 3D treatment: Inner shadow for depth

**Secondary Actions:**
- Border with transparent background
- Same padding as primary
- Hover: Background fill with accent color

**Icon Buttons:**
- Square (w-10 h-10), rounded-md
- Icon centered
- Hover: Background overlay

**Floating Action Button (if needed):**
- Fixed bottom-right position
- Large circular button (w-14 h-14)
- Box shadow with 3D depth

### Status Indicators

**Score Status:**
- Excellent (90-100): Bright green accent
- Good (75-89): Standard accent blue
- Fair (60-74): Amber/yellow
- Needs Attention (<60): Red/warning

**Badges:**
- Pill-shaped (rounded-full)
- px-3 py-1, text-xs font-medium
- Background with 20% opacity, full opacity text

**Alerts/Notifications:**
- Toast notifications: Top-right, auto-dismiss
- Alert banners: Full-width with icon left, message center, dismiss right
- Priority levels: Info (blue), Success (green), Warning (amber), Error (red)

---

## Animations & Microinteractions

**Principles:** Subtle, purposeful, performant

**Card Entrances:**
- Stagger animation for dashboard cards (Framer Motion)
- Fade + slide-up, 150ms delay between items
- Duration: 400ms with ease-out

**Hover States:**
- KPI cards: translate-y-1 + shadow increase
- Table rows: Background opacity change
- Buttons: Scale to 1.02 + brightness increase
- Duration: 200ms

**Score Animations:**
- Circular progress: Animated stroke-dasharray fill
- Number counting: Smooth increment to final value
- Duration: 1000ms on initial load

**Page Transitions:**
- Route changes: Fade crossfade (300ms)
- Modal entrance: Scale from 0.95 to 1 + fade (250ms)

**Loading States:**
- Skeleton screens for data tables (shimmer effect)
- Spinner for buttons (inline, small)
- Progress bar for bulk operations

---

## Images & Visual Assets

**Icons:** Heroicons (outline and solid variants)

**Avatars:**
- User profile images: Circular, multiple sizes (w-8, w-10, w-12, w-16)
- Fallback: Initials in colored background (generated from name)

**Illustrations:**
- Empty states: Simple line illustrations with accent colors
- Error states: Friendly iconography with helpful messaging

**3D Elements:**
- Floating geometric shapes in dashboard headers (low-poly spheres, cubes)
- Orbiting data nodes around main score visualization
- Extruded card layers for depth perception

**No hero images required** - This is a dashboard application focused on data visualization rather than marketing content

---

## Responsive Behavior

**Desktop (lg and above):**
- Full multi-column layouts
- Sidebar navigation persistent
- Tables show all columns
- 3D elements fully rendered

**Tablet (md):**
- Reduce grid to 2 columns
- Collapsible sidebar
- Horizontal scroll for tables
- Simplified 3D elements

**Mobile (base):**
- Single column layouts
- Bottom navigation bar
- Card-based views instead of tables
- Minimal 3D effects (performance)
- Larger touch targets (min h-12)

---

## Role-Specific Adaptations

**HR Admin:**
- Information-dense layouts maximized
- Advanced filtering prominently placed
- Export buttons in header sections
- Comprehensive data tables as primary view

**Manager:**
- Team-focused grouping
- Alert sidebar emphasized
- Quick action buttons for common tasks
- Balanced data density

**Employee:**
- Personal focus, less clutter
- Encouraging messaging and color choices
- Simplified navigation
- Feedback input easily accessible

---

## Accessibility & Polish

- Minimum contrast ratio 4.5:1 for text
- Focus indicators: 2px accent ring on all interactive elements
- Screen reader labels on all icons and interactive components
- Keyboard navigation: Logical tab order, skip links
- ARIA labels for complex widgets (progress circles, charts)
- Reduced motion support: Disable animations for users with prefers-reduced-motion