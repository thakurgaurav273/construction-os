# Product Requirements Document (PRD)

> Product: SitePilot
>
> Version: MVP (v0.1)
>
> Status: In Development

---

# Overview

SitePilot is an AI-native Construction ERP designed for contractors, builders,
developers, EPC companies, infrastructure firms, and real estate organizations.

Traditional construction ERPs are often slow, complex, and built around outdated
desktop-era workflows.

SitePilot aims to modernize construction management by providing a fast,
cloud-native, collaborative platform with AI integrated throughout the product.

Rather than replacing spreadsheets with complicated software, SitePilot should
make project management significantly easier through intuitive workflows,
automation, and intelligent assistance.

---

# Vision

Build the operating system for construction companies.

A single platform where organizations can manage:

- Projects
- Workforce
- Procurement
- Inventory
- Vendors
- BOQs
- Billing
- Reporting
- Documentation
- AI Assistance

The product should reduce manual work, improve collaboration, and provide
real-time visibility into project health.

---

# Mission

Help construction companies complete projects:

- Faster
- With lower costs
- With better communication
- With fewer mistakes
- Using AI to automate repetitive work

---

# Target Customers

## Primary

- General Contractors
- Construction Companies
- Builders
- Infrastructure Companies
- EPC Companies

---

## Secondary

- Real Estate Developers
- Interior Contractors
- Architects
- Consultants
- Government Contractors

---

# User Personas

## Organization Owner

Responsible for the entire organization.

Needs:

- Business overview
- Financial visibility
- Project progress
- User management
- Reports
- AI insights

---

## Project Manager

Responsible for multiple projects.

Needs:

- Project planning
- Progress tracking
- Budget monitoring
- Team coordination
- Daily reports

---

## Site Engineer

Works directly at the construction site.

Needs:

- Daily reporting
- Material tracking
- Task updates
- Issue reporting
- Photo uploads

---

## Procurement Manager

Responsible for purchasing.

Needs:

- Vendor management
- Purchase orders
- Material requests
- Approval workflows
- Delivery tracking

---

## Store Manager

Responsible for inventory.

Needs:

- Material stock
- Warehouse transfers
- Material issues
- Material receipts
- Inventory reports

---

## Finance Team

Responsible for project finances.

Needs:

- Budgets
- Billing
- Expenses
- Cost tracking
- Financial reports

---

## HR / Admin

Responsible for employees.

Needs:

- Employee records
- Attendance
- Roles
- Permissions
- Organization settings

---

# Problems We Are Solving

Construction companies typically struggle with:

- Multiple disconnected tools
- Manual reporting
- Spreadsheet-based tracking
- Delayed communication
- Material wastage
- Budget overruns
- Lack of real-time visibility
- Poor documentation
- Slow approvals

SitePilot should solve these problems through a unified platform.

---

# Product Principles

Every feature should follow these principles.

## Simple

A new user should understand the interface quickly.

---

## Fast

The application should feel responsive.

---

## Collaborative

Everyone should work from the same source of truth.

---

## AI Assisted

Every workflow should benefit from AI where appropriate.

---

## Mobile Friendly

Site teams frequently work from phones and tablets.

Every workflow should remain usable on smaller devices.

---

## Enterprise Ready

The architecture should support organizations of different sizes without
changing the core product.

---

# Success Metrics

The MVP should enable an organization to:

- Create an organization
- Invite users
- Create projects
- Track project progress
- Manage workforce
- Manage materials
- Raise purchase orders
- Record daily reports
- Track project costs
- Generate reports

without relying on spreadsheets.

---

# MVP Scope

The MVP focuses on the essential workflows required to run a construction
project.

Features outside this scope should be considered future enhancements unless they
are critical for core operations.

# MVP Modules

The MVP is divided into independent modules.

Each module should be fully functional before moving to the next.

Modules should be loosely coupled but work together through shared business entities.

---

# Module 1 - Authentication

## Goal

Provide secure authentication and organization onboarding.

## Features

- Login
- Logout
- Forgot Password
- Reset Password
- Invite Users
- Accept Invitation
- Email Verification
- Refresh Tokens

## Future

- Google Login
- Microsoft Login
- SSO
- 2FA

---

# Module 2 - Organizations

Every customer is an Organization.

Organizations own all business data.

## Features

- Create Organization
- Edit Organization
- Company Logo
- Address
- GST Details
- Company Settings
- Working Hours
- Currency
- Timezone

## Users

Organization

↓

Users

↓

Roles

↓

Permissions

Everything belongs to an organization.

---

# Module 3 - Dashboard

The dashboard provides a real-time overview.

## Widgets

Projects

Active Projects

Completed Projects

Delayed Projects

Upcoming Deadlines

---

Financial

Budget

Spent

Remaining

Pending Bills

---

Inventory

Low Stock

Recent Material Issues

Pending Purchase Orders

---

People

Present Workforce

Absent Workforce

Pending Approvals

---

Recent Activity

Timeline

Notifications

Recent Reports

Recent Uploads

Dashboard widgets should be configurable.

---

# Module 4 - Projects

Projects are the heart of SitePilot.

Everything else is attached to projects.

## Project Information

Project Name

Project Code

Client

Location

Description

Budget

Status

Priority

Start Date

Expected Completion

Actual Completion

Manager

Engineers

Site Address

Coordinates

Project Documents

---

## Project Dashboard

Overview

Budget

Progress

Workforce

Materials

Purchase Orders

Daily Reports

Issues

Timeline

Documents

Photos

Each project acts as its own workspace.

---

## Project Status

Planning

Active

On Hold

Completed

Cancelled

Archived

---

## Project Timeline

Every action appears chronologically.

Examples

Project Created

↓

Engineer Assigned

↓

Budget Updated

↓

Material Issued

↓

Daily Report Submitted

↓

Project Completed

---

# Module 5 - Workforce

Manage employees working on projects.

## Employee Profile

Name

Phone

Email

Designation

Department

Role

Manager

Status

Documents

Emergency Contact

---

## Workforce Assignment

Assign Employee

Remove Employee

Transfer Employee

Multiple Projects

History

---

## Attendance

Present

Absent

Leave

Half Day

Late

Attendance should eventually support biometric integrations.

---

# Module 6 - Vendors

Manage suppliers.

## Vendor Profile

Company

Contact Person

Phone

Email

GST

Address

Payment Terms

Categories

Rating

Notes

---

Vendor History

Purchase Orders

Invoices

Payments

Projects

Communication

---

# Module 7 - Materials

Track all construction materials.

## Material Master

Material Name

SKU

Category

Unit

Cost

Vendor

Minimum Stock

Current Stock

Warehouse

---

Material Actions

Receive

Issue

Transfer

Adjust

Return

Dispose

---

Inventory should always maintain stock history.

Nothing should silently disappear.

Every stock movement must be traceable.

---

# Module 8 - Warehouses

Organizations can have multiple warehouses.

Examples

Main Warehouse

Site Warehouse

Temporary Storage

Regional Warehouse

---

Warehouse Operations

Receive Material

Issue Material

Transfer Material

Inventory Count

Adjust Stock

History

---

# Module 9 - Purchase Orders

Procurement begins here.

Purchase Requests

↓

Approval

↓

Purchase Order

↓

Delivery

↓

Receipt

↓

Invoice

↓

Payment

Entire workflow should be trackable.

---

Purchase Order

Vendor

Project

Items

Quantity

Rates

Taxes

Expected Delivery

Attachments

Approval Status

Notes

---

Statuses

Draft

Pending Approval

Approved

Ordered

Partially Delivered

Delivered

Cancelled

Closed

---

Approval workflow should be configurable in future versions.

---

# Module 10 - Daily Reports

Daily Reports are submitted by site engineers.

Reports include

Weather

Work Completed

Labour Count

Equipment Used

Materials Consumed

Issues

Safety Incidents

Photos

Remarks

---

AI should eventually generate summaries automatically.

---

# Module 11 - Billing

Track project finances.

Budget

↓

Expenses

↓

Invoices

↓

Payments

↓

Remaining Budget

---

Features

Project Budget

Expense Tracking

Invoices

Payment Tracking

Financial Reports

Budget Variance

---

# Module 12 - Reports

Generate reports for management.

Examples

Project Progress

Material Consumption

Purchase History

Attendance

Vendor Performance

Budget Utilization

Billing Summary

Reports should support

Export PDF

Export Excel

Scheduled Reports

---

# Module 13 - Notifications

Users receive notifications for

Assignments

Approvals

Comments

Material Requests

Purchase Orders

Daily Reports

Project Updates

Notifications should support

In-App

Email

Push (Future)

---

# Module 14 - Documents

Projects should allow storing

Contracts

Drawings

Images

Permits

Approvals

Invoices

Inspection Reports

Files should be searchable.

Versioning will be introduced later.

---

# Module 15 - AI Assistant

AI should exist throughout the platform instead of being a standalone chatbot.

Examples

Generate Daily Report

Summarize Project

Explain Budget Variance

Generate Purchase Order

Suggest Procurement

Predict Delays

Meeting Minutes

Construction Q&A

Future versions may include autonomous project assistants.

# User Workflows

The MVP focuses on the core construction lifecycle.

Every workflow should be intuitive, require minimal clicks, and maintain complete traceability.

---

# Workflow 1 - Organization Setup

The first experience should be simple.

```
Create Account
        ↓
Verify Email
        ↓
Create Organization
        ↓
Complete Organization Profile
        ↓
Invite Team Members
        ↓
Create First Project
```

## Acceptance Criteria

- Organization created successfully
- Owner automatically assigned
- Default roles generated
- Dashboard available immediately

---

# Workflow 2 - Invite Team Members

```
Settings
      ↓
Users
      ↓
Invite Member
      ↓
Enter Email
      ↓
Assign Role
      ↓
Send Invitation
      ↓
User Accepts Invitation
      ↓
User Joins Organization
```

Future

- Multiple Invitations
- CSV Import
- Department Assignment

---

# Workflow 3 - Create Project

```
Projects
      ↓
Create Project
      ↓
Basic Information
      ↓
Assign Manager
      ↓
Assign Engineers
      ↓
Budget
      ↓
Timeline
      ↓
Create
```

Required Fields

- Project Name
- Client
- Start Date
- Expected Completion
- Budget
- Project Manager

After creation

Automatically create

- Timeline
- Activity Log
- Default Status
- Default Dashboard

---

# Workflow 4 - Daily Site Operations

Engineer opens project.

```
Project
      ↓
Daily Report
      ↓
Weather
      ↓
Labour
      ↓
Completed Work
      ↓
Materials Used
      ↓
Equipment Used
      ↓
Issues
      ↓
Photos
      ↓
Submit
```

Manager immediately sees updates.

Future AI

Generate summary automatically.

---

# Workflow 5 - Material Request

```
Site Engineer
      ↓
Create Material Request
      ↓
Store Manager Reviews
      ↓
Issue Materials
      ↓
Stock Reduced
      ↓
Timeline Updated
```

If insufficient stock

↓

Generate Purchase Request.

---

# Workflow 6 - Procurement

```
Purchase Request
        ↓
Approval
        ↓
Purchase Order
        ↓
Vendor
        ↓
Delivery
        ↓
Goods Receipt
        ↓
Inventory Updated
        ↓
Invoice
        ↓
Payment
```

Every step should be traceable.

---

# Workflow 7 - Vendor Management

```
Vendor Created
        ↓
Assign Categories
        ↓
Attach Documents
        ↓
Receive Purchase Orders
        ↓
Deliver Materials
        ↓
Payment History Updated
```

Vendor profile becomes a complete history.

---

# Workflow 8 - Inventory

Inventory movement should never lose history.

Receive

↓

Warehouse

↓

Issue

↓

Transfer

↓

Return

↓

Adjustment

↓

Stock History

Every movement should be recorded.

---

# Workflow 9 - Budget Tracking

Project Budget

↓

Purchase Orders

↓

Expenses

↓

Payments

↓

Budget Consumed

↓

Remaining Budget

Managers should always know

Allocated

Spent

Committed

Remaining

---

# Workflow 10 - Project Completion

```
Complete Pending Tasks
        ↓
Close Purchase Orders
        ↓
Verify Inventory
        ↓
Finalize Budget
        ↓
Upload Final Documents
        ↓
Generate Final Report
        ↓
Archive Project
```

Archived projects remain searchable.

---

# Screen Inventory

The MVP should contain the following pages.

Authentication

- Login
- Forgot Password
- Reset Password

Dashboard

- Organization Dashboard

Projects

- Project List
- Project Details
- Create Project
- Edit Project

Workforce

- Employee List
- Employee Details

Materials

- Material List
- Material Details

Inventory

- Warehouse
- Stock Movements

Procurement

- Vendors
- Purchase Orders

Finance

- Billing
- Expenses

Reports

- Report Center

Settings

- Organization
- Users
- Roles
- Permissions
- Profile

---

# Navigation Structure

```
Dashboard

Projects

Workforce

Inventory

Procurement

Finance

Reports

Settings
```

Project Detail Navigation

```
Overview

Daily Reports

Materials

BOQ

Purchase Orders

Documents

Photos

Activity

Settings
```

Navigation should remain shallow.

Avoid more than two levels of nesting.

---

# Roles

MVP Roles

Owner

Admin

Project Manager

Site Engineer

Store Manager

Procurement

Finance

Viewer

Roles should be permission-based.

Future versions should allow custom roles.

---

# Notifications

Notify users for

Project Assigned

Material Issued

Purchase Approved

Purchase Rejected

Daily Report Submitted

Budget Exceeded

Document Uploaded

Assignment Changed

Notifications should appear

- In App
- Email

Push notifications will be introduced later.

---

# Search

Users should be able to search

Projects

Employees

Materials

Vendors

Purchase Orders

Invoices

Reports

Search should be global.

---

# Audit Requirements

Every important action should generate an immutable audit entry.

Track

Who

What

When

Where

Changes

Old Value

New Value

Example

```
Project Updated

Budget

₹12,00,000

↓

₹14,50,000
```

---

# MVP Success Criteria

The MVP is considered complete when a construction company can:

✓ Create an organization

✓ Invite team members

✓ Create projects

✓ Manage employees

✓ Manage vendors

✓ Track materials

✓ Raise purchase orders

✓ Record daily reports

✓ Track project costs

✓ Generate reports

without requiring spreadsheets or external tools.

---

# Out of Scope (MVP)

The following are intentionally excluded from v0.1:

- Mobile applications
- Offline mode
- GPS tracking
- Equipment telematics
- BIM integration
- ERP integrations
- Accounting integrations
- Payroll
- Biometric attendance
- IoT integrations
- Advanced AI agents
- Multi-language support
- White-labeling
- Client Portal

These will be introduced after the MVP stabilizes.