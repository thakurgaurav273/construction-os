# Design System

> Product: SitePilot
>
> Version: MVP (v0.1)
>
> Last Updated: July 2026

---

# Overview

The SitePilot Design System defines the visual language, interaction patterns, layout principles, and component guidelines for the entire platform.

The objective is to create a product that feels:

- Professional
- Modern
- Fast
- Spacious
- Consistent
- Easy to learn

Every screen should look like it belongs to the same product regardless of who builds it.

This document serves as the single source of truth for designers, developers, and AI coding assistants.

---

# Design Philosophy

SitePilot is enterprise software.

However, enterprise software does not have to feel outdated.

The interface should prioritize clarity over decoration and usability over visual complexity.

Every UI decision should answer one question:

> Does this make construction work easier?

If the answer is no, reconsider the design.

---

# Core Principles

## Simplicity

Users should understand a screen within a few seconds.

Avoid unnecessary visual elements.

---

## Consistency

Buttons should always look like buttons.

Cards should always behave like cards.

Tables should always follow the same interaction model.

Never invent a new UI pattern when an existing one already solves the problem.

---

## Clarity

Information hierarchy should always be obvious.

The user's attention should naturally move from:

Page Title

↓

Primary Action

↓

Key Metrics

↓

Main Content

↓

Secondary Information

---

## Speed

The interface should feel responsive.

Users should never wonder if something is loading.

Skeleton loaders should replace empty blank pages.

---

## Accessibility

The platform should remain usable for everyone.

Support:

- Keyboard navigation
- Focus indicators
- Screen readers
- Proper contrast
- Semantic HTML

Accessibility is not optional.

---

## Mobile First Thinking

Although SitePilot is desktop-focused, every workflow should remain usable on tablets and mobile devices.

No desktop-only experiences.

---

# Product Personality

SitePilot should feel:

✓ Professional

✓ Calm

✓ Reliable

✓ Intelligent

✓ Trustworthy

Not:

❌ Playful

❌ Flashy

❌ Experimental

❌ Trendy for the sake of trends

Construction companies value reliability more than visual novelty.

---

# Design Language

The design language is inspired by products like:

- Linear
- Stripe Dashboard
- Vercel
- Notion
- GitHub
- Figma

Characteristics include:

- Plenty of whitespace
- Clean typography
- Light shadows
- Minimal borders
- Soft corners
- Consistent spacing
- Information density without clutter

---

# Color Philosophy

Colors communicate meaning.

Avoid using colors purely for decoration.

Every color should have a purpose.

Primary

Actions

Links

Highlights

---

Success

Completed

Approved

Healthy

Available

---

Warning

Pending

Attention Required

Upcoming Deadlines

---

Danger

Errors

Deletion

Critical Alerts

Budget Overruns

---

Info

Updates

Notifications

System Messages

---

Neutral

Backgrounds

Cards

Borders

Text

---

# Color Tokens

## Primary

```css
Primary-50
Primary-100
Primary-200
Primary-300
Primary-400
Primary-500
Primary-600
Primary-700
Primary-800
Primary-900
```

---

## Success

```css
Success-50
Success-100
Success-500
Success-700
```

---

## Warning

```css
Warning-50
Warning-100
Warning-500
Warning-700
```

---

## Danger

```css
Danger-50
Danger-100
Danger-500
Danger-700
```

---

## Neutral

```css
Gray-50
Gray-100
Gray-200
Gray-300
Gray-400
Gray-500
Gray-600
Gray-700
Gray-800
Gray-900
```

Avoid arbitrary colors.

Always use design tokens.

---

# Semantic Colors

Never reference raw colors directly inside components.

Instead use semantic variables.

Example

```
Background

Surface

Surface Hover

Border

Border Strong

Primary

Primary Hover

Success

Warning

Danger

Text Primary

Text Secondary

Text Muted

Disabled
```

This enables future theme customization.

---

# Typography

Typography creates hierarchy.

Limit the number of font styles.

Recommended Font

```
Inter
```

Fallback

```
system-ui
```

Avoid decorative fonts.

---

# Type Scale

Display

```
48px
```

Page Title

```
36px
```

Section Title

```
30px
```

Heading Large

```
24px
```

Heading Medium

```
20px
```

Heading Small

```
18px
```

Body Large

```
16px
```

Body

```
14px
```

Caption

```
12px
```

Small Labels

```
11px
```

Maintain consistent line heights.

---

# Font Weights

```
400 Regular

500 Medium

600 SemiBold

700 Bold
```

Avoid unnecessary bold text.

Hierarchy should come from spacing before weight.

---

# Spacing System

The entire interface follows an **8px spacing grid**.

Base Unit

```
4px
```

Spacing Tokens

```
4

8

12

16

20

24

32

40

48

64

80

96
```

Never use random spacing values.

---

# Border Radius

Components use soft corners.

```
xs = 4px

sm = 6px

md = 8px

lg = 12px

xl = 16px

2xl = 20px
```

Avoid fully rounded enterprise interfaces.

---

# Shadows

Elevation should remain subtle.

Small

Cards

Inputs

Dropdowns

---

Medium

Dialogs

Drawers

Popovers

---

Large

Only for major overlays.

Never use dramatic shadows.

---

# Borders

Prefer borders over shadows.

Cards

Inputs

Tables

Panels

should remain visually separated using light borders.

---

# Iconography

Use one icon library throughout the project.

Recommended

```
Lucide React
```

Rules

- Stroke icons
- Consistent size
- Avoid filled icons
- Avoid mixing icon sets

Standard Sizes

```
16px

18px

20px

24px
```

---

# Illustrations

Illustrations should only appear for:

- Empty states
- Onboarding
- Success pages
- Error pages

Avoid decorative illustrations inside normal workflows.

---

# Grid System

Desktop

```
12 Column Grid
```

Tablet

```
8 Column Grid
```

Mobile

```
4 Column Grid
```

Use consistent gutters and margins across all pages.

---

# White Space

Whitespace improves readability.

Never attempt to fill every available pixel.

Spacing is a feature.

Crowded interfaces reduce productivity.

---

# Visual Hierarchy

Every page should naturally follow this order:

1. Page Title

2. Description (optional)

3. Primary Action

4. Metrics

5. Filters

6. Main Content

7. Secondary Content

Users should never have to search for the primary action.

---

# Theme Support

The design system should support:

- Light Theme
- Dark Theme

Avoid hardcoded colors.

All components should consume semantic color tokens.

This ensures themes can evolve without rewriting components.

# Layout System

The layout system defines how every screen in SitePilot is structured.

A consistent layout reduces cognitive load and allows users to navigate the product without relearning interfaces.

Every page should follow the same structural hierarchy.

---

# Desktop Layout

Desktop is the primary experience.

```
┌─────────────────────────────────────────────────────────────┐
│ Top Navigation                                               │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│              │                                              │
│   Sidebar    │              Page Content                    │
│              │                                              │
│              │                                              │
├──────────────┴──────────────────────────────────────────────┤
```

The sidebar remains fixed.

The page content scrolls independently.

---

# Tablet Layout

On tablets, maximize available content space.

```
☰ Header

↓

Page Content

↓

Optional Bottom Actions
```

The sidebar collapses into a drawer.

---

# Mobile Layout

```
Header

↓

Page Content

↓

Bottom Navigation
```

Avoid sidebars on mobile.

Navigation should be optimized for one-handed use.

---

# Maximum Content Width

Large forms should not stretch across the full screen.

Recommended maximum widths:

Content Pages

```
1280px
```

Forms

```
720px
```

Authentication

```
420px
```

Reading-heavy pages

```
900px
```

---

# Sidebar

The sidebar is the primary navigation.

It should always remain predictable.

Structure

```
Logo

Workspace Switcher

────────────

Dashboard

Projects

Workforce

Inventory

Procurement

Finance

Reports

────────────

Settings

Profile
```

Never place more than one level of nesting inside the sidebar.

---

# Sidebar Behavior

Desktop

- Fixed
- Expandable
- Collapsible

Tablet

- Hidden by default
- Opens as drawer

Mobile

- Replaced by bottom navigation

---

# Top Navigation

The top navigation should contain only global actions.

Recommended layout

```
Breadcrumbs

↓

Search

↓

Notifications

↓

Organization Switcher

↓

User Menu
```

Avoid placing feature-specific actions inside the top navigation.

---

# User Menu

The user menu should include

- Profile
- Organization
- Preferences
- Theme
- Keyboard Shortcuts
- Logout

---

# Breadcrumbs

Breadcrumbs should appear on detail pages.

Example

```
Projects

>

Residential Tower

>

Purchase Orders

>

PO-0014
```

Do not use breadcrumbs on dashboards.

---

# Global Search

Search should be available from every screen.

Future capabilities

Search

Projects

Employees

Materials

Purchase Orders

Invoices

Reports

Documents

Users

Eventually support AI-powered semantic search.

---

# Notifications Panel

Notifications should open from the top navigation.

Each notification includes

- Icon
- Title
- Description
- Timestamp
- Read Status

Actions

Mark Read

Mark All Read

View Details

---

# Page Structure

Every page follows the same structure.

```
Page Title

↓

Description (Optional)

↓

Primary Actions

↓

Filters

↓

Content

↓

Pagination
```

Consistency is more important than creativity.

---

# Page Header

Every page should include

- Title
- Description (optional)
- Primary CTA
- Secondary Actions (if required)

Example

```
Projects

Manage all construction projects.

[ Create Project ]
```

---

# Primary Actions

Each page should have one clearly emphasized action.

Examples

Dashboard

```
Create Project
```

Projects

```
Add Project
```

Materials

```
Add Material
```

Vendors

```
Add Vendor
```

Avoid multiple competing primary buttons.

---

# Secondary Actions

Examples

Export

Import

Refresh

Archive

Duplicate

Delete

Secondary actions should never visually compete with the primary CTA.

---

# Filters

Lists should place filters above tables.

Recommended order

```
Search

↓

Status

↓

Date

↓

Assigned User

↓

Sort

↓

More Filters
```

Filters should remain sticky while scrolling on long pages.

---

# Cards

Cards group related information.

Standard layout

```
Title

↓

Description

↓

Content

↓

Footer (optional)
```

Cards should never contain excessive nested sections.

---

# Dashboard Layout

Dashboard follows this structure.

```
Greeting

↓

Quick Actions

↓

Metrics

↓

Charts

↓

Recent Activity

↓

Projects

↓

Tasks

↓

Notifications
```

The most important information should always appear above the fold.

---

# Metrics Section

Metrics should be displayed as cards.

Examples

Projects

Budget

Revenue

Expenses

Delayed Projects

Pending Approvals

Material Requests

Each metric card should include

- Title
- Value
- Trend
- Comparison
- Icon

---

# Charts

Charts communicate trends.

Preferred charts

- Line
- Bar
- Area
- Donut

Avoid

- 3D Charts
- Gauges
- Pie charts with many segments

Every chart should have a clear title and legend.

---

# Lists

Lists should always support

- Search
- Sorting
- Pagination
- Filters

Bulk actions appear only after selection.

---

# Detail Pages

Every entity detail page follows the same structure.

```
Overview

↓

Tabs

↓

Content

↓

Timeline
```

Example

Project

```
Overview

Daily Reports

Materials

Purchase Orders

Documents

Photos

Timeline

Settings
```

---

# Tab Navigation

Tabs should be horizontal.

Keep labels concise.

Good

```
Overview

Reports

Files

Timeline
```

Bad

```
Project Overview Information

Project Related Reports
```

---

# Right Side Panel

Optional side panels may contain

- Activity
- Notes
- AI Assistant
- Comments

Keep them collapsible.

---

# Drawers

Use drawers instead of full-page navigation for lightweight tasks.

Examples

- Edit Project
- Assign Employee
- Upload File
- Change Status

Avoid using drawers for long multi-step workflows.

---

# Modals

Use dialogs only for

- Confirmation
- Short Forms
- Delete Actions
- Warnings

Do not build complex forms inside modal dialogs.

---

# Multi-Step Workflows

Long processes should use step-based forms.

Example

Create Project

```
Step 1

Basic Information

↓

Step 2

Budget

↓

Step 3

Team

↓

Step 4

Review

↓

Create
```

Each step should be independently validated.

---

# Responsive Rules

Desktop

≥ 1280px

Three-column layouts allowed.

---

Tablet

768–1279px

Reduce spacing.

Collapse side panels.

---

Mobile

<768px

Single-column layout.

Full-width forms.

Scrollable tables.

Drawer navigation.

---

# Responsive Tables

Large tables should adapt gracefully.

Priority

1. Horizontal scroll

2. Column hiding

3. Card layout (if appropriate)

Never truncate important business data without providing access.

---

# Sticky Elements

Sticky elements improve usability.

Recommended

- Sidebar
- Table Header
- Page Header
- Filter Bar
- Primary Actions

Avoid excessive sticky components that reduce usable screen space.

---

# Layout Principles

Every screen should satisfy:

✓ Predictable

✓ Spacious

✓ Consistent

✓ Responsive

✓ Accessible

✓ Easy to scan

Users should always know:

- Where they are
- What they can do
- What happens next

# Component Library

The SitePilot component library provides a consistent set of reusable UI components.

Every screen should be built from these components instead of creating custom UI.

Components should be:

- Reusable
- Accessible
- Responsive
- Theme-aware
- Composable
- Consistent

Never duplicate components with slightly different styling.

---

# Buttons

Buttons communicate actions.

There are four primary variants.

## Primary

Used for the main action on a page.

Examples

- Create Project
- Save Changes
- Submit Report

There should only be one primary button per section.

---

## Secondary

Used for supporting actions.

Examples

- Cancel
- Edit
- View Details

---

## Outline

Used for less important actions.

Examples

- Export
- Duplicate
- Preview

---

## Destructive

Reserved for irreversible actions.

Examples

- Delete
- Remove User
- Archive Project

Always require confirmation before destructive actions.

---

# Button Sizes

Small

```
Height: 32px
```

Medium

```
Height: 40px
```

Large

```
Height: 48px
```

Buttons should never exceed the width required by their content unless used in mobile layouts.

---

# Button States

Every button supports

- Default
- Hover
- Focus
- Active
- Disabled
- Loading

Loading buttons should retain their width to avoid layout shifts.

---

# Icons

Buttons may contain icons.

Preferred placement

```
+ Create Project

📥 Export

📤 Import
```

Avoid icon-only buttons unless the meaning is universally understood.

---

# Forms

Forms should feel effortless.

Every form follows the same structure.

```
Section Title

↓

Description

↓

Fields

↓

Actions
```

Long forms should be split into logical sections.

---

# Input Fields

Standard inputs support

- Label
- Placeholder
- Helper Text
- Validation
- Error Message

Example

```
Project Name

[____________________]

Must be unique within your organization.
```

Labels should always remain visible.

Never rely solely on placeholders.

---

# Text Areas

Use for

- Descriptions
- Notes
- Remarks
- Comments

Avoid making text areas excessively tall by default.

---

# Select Inputs

Use searchable selects whenever the dataset exceeds 10 items.

Examples

- Project
- Employee
- Vendor
- Material

---

# Multi Select

Use chips to display selections.

Example

```
Civil

Electrical

Mechanical
```

Allow quick removal.

---

# Date Pickers

Every date picker should support

- Calendar selection
- Manual typing
- Keyboard navigation

Support locale-aware formatting.

---

# Number Inputs

Examples

- Budget
- Quantity
- Cost

Include appropriate formatting.

Examples

₹125,000

25 kg

150 bags

Avoid raw numbers when units matter.

---

# Validation

Validation should occur

Immediately for formatting errors.

On blur for field validation.

On submit for required fields.

Never overwhelm users with errors before interaction.

---

# Required Fields

Required fields should use

```
*
```

Do not rely on color alone.

---

# Form Actions

Actions should remain consistent.

```
Cancel

↓

Save
```

or

```
Back

↓

Next
```

Primary action always appears on the right.

---

# Tables

Tables are central to enterprise software.

Every table should support

- Sorting
- Search
- Pagination
- Column Visibility
- Responsive Layout

---

# Table Header

Include

- Title
- Search
- Filters
- Export
- Primary Action

Example

```
Projects

Search

Status Filter

Create Project
```

---

# Table Columns

Columns should prioritize important information.

Example

Projects

Name

Status

Manager

Budget

Progress

Completion

Actions

Avoid excessive columns.

---

# Row Actions

Row actions belong inside a dropdown menu.

Examples

View

Edit

Duplicate

Archive

Delete

Avoid showing five action buttons in every row.

---

# Bulk Actions

Bulk actions appear only after rows are selected.

Examples

Archive

Delete

Export

Assign

Users should never see inactive bulk action toolbars.

---

# Pagination

Standard pagination

Previous

↓

Page Numbers

↓

Next

Display

Showing 21–40 of 256 results

---

# Cards

Cards group related information.

Structure

Header

↓

Content

↓

Footer (optional)

Cards should never become miniature dashboards.

---

# Metric Cards

Each metric card contains

Title

↓

Primary Value

↓

Trend Indicator

↓

Comparison

↓

Icon

Example

```
Active Projects

24

↑ 12%

Compared to last month
```

---

# Dialogs

Dialogs are reserved for

- Confirmations
- Simple Forms
- Warnings

Dialogs should remain focused.

Avoid embedding large workflows.

---

# Drawers

Use drawers for lightweight editing.

Examples

Edit Project

Assign Employee

Upload Documents

Users should remain in context while editing.

---

# Tabs

Tabs organize related content.

Rules

Maximum 7 tabs.

Short labels.

Horizontal layout.

Overflow into dropdown if necessary.

---

# Accordions

Use accordions only for optional information.

Never hide critical content behind accordions.

---

# Badges

Badges communicate status.

Examples

Active

Completed

Delayed

Pending

Approved

Rejected

Keep labels concise.

---

# Timeline

Timeline components display chronological activity.

Each event includes

- Icon
- Title
- Description
- User
- Timestamp

Newest events appear first.

---

# Avatars

Show initials when no profile image exists.

Support

Single User

Group

Stacked Avatars

Limit visible avatars before collapsing into

```
+4
```

---

# File Upload

Uploads should support

Drag & Drop

Browse Files

Progress

Preview

Retry

Supported previews

Images

PDF

Office Documents

---

# Empty States

Every empty state includes

Illustration

↓

Title

↓

Description

↓

Primary Action

Example

```
No Projects Yet

Create your first project to get started.

[ Create Project ]
```

Never show blank pages.

---

# Loading States

Prefer skeleton loaders over spinners.

Skeletons should resemble the final layout.

Examples

Dashboard

Tables

Cards

Forms

Charts

Avoid full-screen spinners except during authentication.

---

# Error States

Error states should include

Title

↓

Friendly Description

↓

Retry Action

↓

Support Link (optional)

Never expose stack traces.

---

# Success Feedback

Examples

Project Created

Purchase Approved

Material Issued

Report Submitted

Use

Toast Notifications

Success Icons

Short messages

Avoid modal confirmations for successful operations.

---

# Toast Notifications

Use toasts for lightweight feedback.

Duration

3–5 seconds

Types

Success

Info

Warning

Error

Allow manual dismissal.

---

# Progress Indicators

Use progress bars for

File Upload

Project Completion

Background Processing

Report Generation

Long-running AI tasks

Always show percentage where possible.

---

# Search Components

Search inputs should support

Instant search

Keyboard shortcuts

Clear button

Recent searches (future)

Highlight matching results.

---

# Charts

Preferred chart types

- Line
- Area
- Bar
- Donut

Every chart includes

Title

Legend

Tooltip

Responsive resizing

Avoid decorative charts.

---

# AI Components

AI interactions should be visually distinct but not distracting.

AI cards include

- AI badge
- Prompt input
- Suggested actions
- Generated response
- Copy
- Regenerate
- Accept
- Reject

Users should always review AI-generated content before it affects business data.

---

# Component Principles

Every component should satisfy:

✓ Accessible

✓ Keyboard navigable

✓ Responsive

✓ Theme-aware

✓ Reusable

✓ Composable

✓ Consistent

Before creating a new component, check whether an existing component can be extended instead.

# Screen Patterns

The following patterns define how complete screens should be designed.

Rather than designing every page from scratch, each screen should follow one of these templates.

This ensures consistency throughout the application.

---

# Dashboard

The dashboard is the landing page after login.

Purpose:

- Provide business visibility
- Surface important information
- Enable quick actions

Structure

```
Greeting

↓

Quick Actions

↓

Key Metrics

↓

Charts

↓

Recent Activity

↓

Assigned Tasks

↓

Recent Projects

↓

Notifications
```

Dashboard widgets should be configurable in future versions.

Avoid overwhelming users with too many charts.

---

# List Pages

Examples

- Projects
- Vendors
- Materials
- Purchase Orders
- Employees

Structure

```
Page Header

↓

Search

↓

Filters

↓

Bulk Actions (Conditional)

↓

Table

↓

Pagination
```

Every list page should support:

- Search
- Filtering
- Sorting
- Pagination
- Bulk Selection
- Export

---

# Detail Pages

Every business entity follows the same layout.

```
Header

↓

Summary Card

↓

Tabs

↓

Main Content

↓

Timeline
```

Example

Project Detail

```
Overview

↓

Daily Reports

↓

Materials

↓

Purchase Orders

↓

Documents

↓

Photos

↓

Activity

↓

Settings
```

Always show the entity status prominently.

---

# Create/Edit Pages

Large forms should use a step-based workflow.

Example

```
Basic Information

↓

Assignments

↓

Budget

↓

Review

↓

Create
```

Each step should save progress locally until submission.

---

# Settings Pages

Settings should be organized into logical sections.

Example

```
Organization

Users

Roles

Permissions

Billing

Integrations

Preferences
```

Avoid long scrolling settings pages.

Use side navigation where appropriate.

---

# Report Pages

Report screens should include

- Filters
- Date Range
- Export
- Charts
- Tables
- Summary Metrics

Reports should be printable without additional styling.

---

# Timeline Pattern

Timelines represent historical activity.

Each entry includes:

- Actor
- Action
- Timestamp
- Optional Metadata

Example

```
👤 Rahul Sharma

Approved Purchase Order #PO-0012

Today • 10:45 AM
```

Display newest events first.

---

# Document Management

Documents should support:

- Grid View
- List View
- Search
- Preview
- Download
- Version (future)

File metadata should always be visible.

---

# Empty States

Every empty state should answer three questions:

1. What happened?
2. Why is it empty?
3. What should the user do next?

Structure

```
Illustration

↓

Title

↓

Description

↓

Primary CTA
```

Example

```
No Purchase Orders

Create your first purchase order to begin procurement.

[ Create Purchase Order ]
```

---

# Loading Experience

Loading should communicate progress.

Preferred

- Skeletons
- Progressive Rendering
- Optimistic Updates (where appropriate)

Avoid

- Blank screens
- Infinite spinners
- Layout shifts

---

# Error Experience

Errors should be actionable.

Structure

```
Title

↓

Explanation

↓

Retry

↓

Secondary Action
```

Example

```
Unable to load project.

Please check your connection and try again.

[ Retry ]
```

Technical details should be logged, not shown.

---

# Success Experience

Success feedback should be immediate.

Examples

✓ Project Created

✓ Purchase Approved

✓ Material Issued

✓ Report Submitted

Use lightweight toast notifications.

Avoid unnecessary confirmation dialogs.

---

# Motion Principles

Motion should improve understanding.

Never animate for decoration alone.

Use animation to indicate:

- State changes
- Navigation
- Loading
- Success
- Expand/Collapse

---

# Animation Timing

Recommended durations

```
Fast

150ms

Standard

200ms

Complex

250ms
```

Avoid animations longer than 300ms for common interactions.

---

# Page Transitions

Transitions should be subtle.

Recommended

- Fade
- Slide
- Scale

Avoid

- Bounce
- Spin
- Elastic
- Flashing effects

---

# Micro Interactions

Examples

- Button hover
- Input focus
- Card hover
- Dropdown open
- Menu selection

Micro interactions should reinforce user actions without distracting them.

---

# Accessibility

Every screen should support:

✓ Keyboard navigation

✓ Visible focus states

✓ Screen readers

✓ Semantic HTML

✓ Proper ARIA attributes

✓ Color contrast (WCAG AA)

✓ Reduced motion preferences

Accessibility should be considered from the beginning, not added later.

---

# Responsive Design

Every page must function on:

Desktop

```
≥1280px
```

Laptop

```
1024px–1279px
```

Tablet

```
768px–1023px
```

Mobile

```
<768px
```

Layouts should adapt gracefully without hiding critical functionality.

---

# AI User Experience

AI is integrated into workflows, not isolated in a chatbot.

Examples

Generate Daily Report

↓

Review Output

↓

Edit

↓

Approve

↓

Save

Users should always remain in control.

AI-generated changes must never be applied automatically.

---

# AI Components

AI interfaces should include:

- Prompt Input
- Suggested Prompts
- Generated Response
- Confidence Indicator (future)
- Copy
- Retry
- Regenerate
- Accept
- Reject

Generated content should be clearly distinguishable from user-authored content.

---

# Design Anti-Patterns

Avoid the following:

❌ Heavy gradients

❌ Glassmorphism-heavy interfaces

❌ Inconsistent spacing

❌ Multiple button styles

❌ Multiple card styles

❌ More than one primary action per section

❌ Excessive nested dialogs

❌ Dense tables without spacing

❌ Decorative animations

❌ Hardcoded colors

❌ Custom UI for common interactions

❌ Hidden primary actions

Consistency is more valuable than novelty.

---

# Screen Checklist

Before a screen is considered complete, verify:

✓ Correct page title

✓ Primary action is obvious

✓ Search implemented (where applicable)

✓ Filters implemented (where applicable)

✓ Loading state exists

✓ Empty state exists

✓ Error state exists

✓ Success feedback exists

✓ Responsive layout verified

✓ Accessibility verified

✓ Theme support verified

✓ Keyboard navigation tested

✓ Mobile layout tested

✓ Design tokens used

✓ Reusable components used

---

# Design Principles

Every screen should satisfy the following principles:

- Clear before clever
- Functional before decorative
- Consistent before unique
- Accessible before optimized
- Reusable before custom
- Fast before feature-rich

A user should never need to learn a new interaction pattern to complete a familiar task.

---

# Definition of Done (Design)

A screen is complete only when:

✓ Matches the design system

✓ Uses reusable components

✓ Responsive across supported devices

✓ Accessible

✓ Supports loading, empty, success, and error states

✓ Uses semantic design tokens

✓ Maintains visual hierarchy

✓ Provides clear navigation

✓ Includes appropriate user feedback

✓ Has been reviewed for consistency with the rest of the product

Design quality is measured not by visual complexity, but by how easily users can accomplish their work.