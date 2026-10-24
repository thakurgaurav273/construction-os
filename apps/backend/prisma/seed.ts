import {
  Prisma, PrismaClient, ProcurementPriority, PurchaseOrderStatus, RfqInvitationStatus, RfqStatus, VendorStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { subDays, subMonths, addMonths, addDays } from 'date-fns';
import {
  dateKeyToDbDate, lastDateKeys, toLocalDateKey,
} from '../src/modules/workforce/attendance-dates';
import { orderTotal, startOfUtcDay } from '../src/modules/procurement/procurement-math';

const prisma = new PrismaClient();

const TEAM_MEMBERS = [
  { name: 'Ananya Krishnan',   email: 'ananya.k@grovyn.com',  role: 'PROJECT_MANAGER' as const },
  { name: 'Rajan Mehta',       email: 'rajan.m@grovyn.com',   role: 'SITE_ENGINEER'   as const },
  { name: 'Divya Nair',        email: 'divya.n@grovyn.com',   role: 'PROCUREMENT'     as const },
  { name: 'Suresh Babu',       email: 'suresh.b@grovyn.com',  role: 'FINANCE'         as const },
];

const PROJECTS = [
  {
    name:              'Whitefield IT Corridor - Block C',
    code:              'GRV-001',
    clientName:        'Prestige Group',
    location:          'Whitefield, Bengaluru',
    description:       'Construction of a 6-storey Grade-A commercial complex comprising 2.4 lakh sq ft of leasable office space, basement parking for 420 vehicles, and a sky bridge connecting Block B. Includes smart building management systems and LEED Platinum certification compliance.',
    status:            'ACTIVE'     as const,
    priority:          'HIGH'       as const,
    progress:          52,
    budget:            92_000_000,
    spent:             47_840_000,
    startOffset:       -240,
    completionOffset:  180,
  },
  {
    name:              'BBMP Drainage Rehabilitation - Zone 4',
    code:              'GRV-002',
    clientName:        'BBMP',
    location:          'Indiranagar, Bengaluru',
    description:       'Comprehensive stormwater drain rehabilitation across 18 km of primary and secondary drainage networks in Zone 4. Work includes de-silting, lining, manhole upgrades, and installation of smart flow sensors to enable real-time flood monitoring.',
    status:            'ACTIVE'     as const,
    priority:          'CRITICAL'   as const,
    progress:          34,
    budget:            28_000_000,
    spent:              9_520_000,
    startOffset:       -150,
    completionOffset:  210,
  },
  {
    name:              'Sarjapur Smart Township - Phase 1',
    code:              'GRV-003',
    clientName:        'Brigade Group',
    location:          'Sarjapur Road, Bengaluru',
    description:       'Phase 1 of a 45-acre integrated township delivering 680 residential units across 8 towers (G+14), a clubhouse, landscaped podium, and 24 MW captive solar plant. Project includes complete internal road network, underground utilities, and STP with recycling capability.',
    status:            'ACTIVE'     as const,
    priority:          'HIGH'       as const,
    progress:          78,
    budget:            320_000_000,
    spent:             249_600_000,
    startOffset:       -540,
    completionOffset:   90,
  },
  {
    name:              'Electronic City Road Widening - Package 2',
    code:              'GRV-004',
    clientName:        'NHAI',
    location:          'Electronic City, Bengaluru',
    description:       'Widening of 6.2 km of the Electronic City-Hosur Road corridor from 4 to 6 lanes with grade separators at 3 intersections, dedicated bus rapid transit lanes, cycle tracks, and utility duct installation. Project is currently on hold pending revised forest clearance.',
    status:            'ON_HOLD'    as const,
    priority:          'MEDIUM'     as const,
    progress:          22,
    budget:            55_000_000,
    spent:             12_100_000,
    startOffset:       -180,
    completionOffset:  360,
  },
];

const ACTIVITIES: Record<string, { type: string; title: string; description: string }[]> = {
  'GRV-001': [
    { type: 'report',   title: 'Daily report submitted',           description: 'Floor 4 slab pour completed. 148 workers on site. No safety incidents.' },
    { type: 'approval', title: 'Purchase order approved',          description: 'PO-2024-089 approved - Structural steel 85MT from Tata Steel @ ₹68,000/MT.' },
    { type: 'update',   title: 'Progress milestone reached',       description: 'Floor 4 structural work completed ahead of schedule by 4 days.' },
    { type: 'alert',    title: 'Material delay flagged',           description: 'Curtain wall aluminium sections delayed by supplier - 10-day impact expected.' },
    { type: 'report',   title: 'Safety audit completed',           description: 'Monthly safety audit: 0 critical findings, 3 minor observations raised.' },
  ],
  'GRV-002': [
    { type: 'report',   title: 'Survey report submitted',          description: 'Drone survey of Sector 4-A completed. 2.1 km stretch mapped for de-silting.' },
    { type: 'alert',    title: 'Underground utilities conflict',   description: 'BESCOM HT cable found at Ch. 1+240. Coordination meeting scheduled.' },
    { type: 'approval', title: 'Subcontractor invoice approved',  description: 'Invoice INV-SC-044 from Raj Excavators approved - ₹8.4L for reach Ch. 0-2 km.' },
    { type: 'update',   title: 'Milestone: Phase A complete',      description: 'De-silting and lining of Ch. 0–4.5 km accepted by BBMP site engineer.' },
  ],
  'GRV-003': [
    { type: 'approval', title: 'Handover certificate issued',      description: 'Tower A & B - 240 units handed over to Brigade Group for finishing works.' },
    { type: 'report',   title: 'Daily report submitted',           description: 'Tower C–F: floor 12 slab poured. 312 workers present. Concrete cube tests passed.' },
    { type: 'update',   title: 'STP commissioning complete',       description: '750 KLD STP commissioned and test-run for 72 hours. Results within KSPCB norms.' },
    { type: 'report',   title: 'Quality inspection passed',        description: 'IGBC auditor inspection for IGBC Green Homes certification - provisionally passed.' },
    { type: 'alert',    title: 'Scaffold clearance required',      description: 'Tower E scaffolding requires third-party clearance before Floor 13 pour.' },
  ],
  'GRV-004': [
    { type: 'alert',    title: 'Project placed on hold',           description: 'NHAI issued stop-work notice pending revised forest clearance from MoEFCC.' },
    { type: 'report',   title: 'Site closure report submitted',    description: 'All open excavations backfilled and barricaded per NHAI instructions. Equipment demobilised.' },
    { type: 'update',   title: 'Forest clearance resubmitted',     description: 'Revised Stage-1 clearance application filed with additional tree survey.' },
  ],
};

async function seedOrg(orgId: string, ownerId: string) {
  const hashedPassword = await bcrypt.hash('SitePilot@2026!', 10);

  // Create team members (skip if email already exists)
  const members: { id: string; name: string; role: typeof TEAM_MEMBERS[0]['role'] }[] = [];

  for (const m of TEAM_MEMBERS) {
    let user = await prisma.user.findUnique({ where: { email: m.email } });

    if (!user) {
      user = await prisma.user.create({
        data: { name: m.name, email: m.email, password: hashedPassword, status: 'ACTIVE' },
      });
    }

    // Link to org if not already linked
    await prisma.userOrganization.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: orgId } },
      create: { userId: user.id, organizationId: orgId, role: m.role },
      update: {},
    });

    members.push({ id: user.id, name: m.name, role: m.role });
  }

  // Create pending invitations
  const pendingInvites = [
    { email: 'newengineer@company.com', role: 'SITE_ENGINEER' },
    { email: 'contractor@vendor.com', role: 'VIEWER' },
    { email: 'finance@partner.com', role: 'FINANCE' },
  ];

  for (const inv of pendingInvites) {
    const token = (Math.random() * 1e10).toString(36);
    const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const existing = await prisma.invitation.findFirst({
      where: { email: inv.email, organizationId: orgId, acceptedAt: null },
    });

    if (!existing) {
      await prisma.invitation.create({
        data: {
          email: inv.email,
          token: hashedToken,
          role: inv.role as any,
          organizationId: orgId,
          invitedById: ownerId,
          expiresAt,
        },
      });
    }
  }

  // Create projects
  for (const p of PROJECTS) {
    const existing = await prisma.project.findFirst({
      where: { code: p.code, organizationId: orgId },
    });

    let projectId: string;

    if (existing) {
      projectId = existing.id;
    } else {
      const project = await prisma.project.create({
        data: {
          name:               p.name,
          code:               p.code,
          description:        p.description,
          clientName:         p.clientName,
          location:           p.location,
          status:             p.status,
          priority:           p.priority,
          progress:           p.progress,
          budget:             p.budget,
          spent:              p.spent,
          startDate:          subDays(new Date(), -p.startOffset),
          expectedCompletion: addDays(new Date(), p.completionOffset),
          organizationId:     orgId,
          createdById:        ownerId,
        },
      });
      projectId = project.id;
    }

    // Add project members (owner + team)
    for (const m of [
      { id: ownerId,     role: 'MANAGER' as const },
      { id: members[0].id, role: 'MANAGER' as const },
      { id: members[1].id, role: 'ENGINEER' as const },
      { id: members[2].id, role: 'VIEWER' as const },
    ]) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId, userId: m.id } },
        create: { projectId, userId: m.id, role: m.role },
        update: {},
      });
    }

    // Seed activities (skip if project already has some)
    const activityCount = await prisma.activity.count({ where: { projectId } });
    if (activityCount === 0) {
      const acts = ACTIVITIES[p.code] ?? [];
      for (let i = 0; i < acts.length; i++) {
        const a = acts[i];
        await prisma.activity.create({
          data: {
            type:           a.type,
            title:          a.title,
            description:    a.description,
            entityType:     'project',
            entityId:       projectId,
            actorId:        i % 2 === 0 ? ownerId : members[i % members.length].id,
            projectId,
            organizationId: orgId,
            createdAt:      subDays(new Date(), i * 2 + 1),
          },
        });
      }
    }
  }
}

// ─── Workforce Seed Data ────────────────────────────────────────────────────

// Expiry is relative to the day the seed runs, so demo data always has valid, expiring and expired certificates.
type CertificationSeed = { name: string; expiresInDays: number };

const CV_C: CertificationSeed = { name: 'Safety Induction Certificate', expiresInDays: 180 };
const CV_E: CertificationSeed = { name: 'Safety Induction Certificate', expiresInDays: 12 };
const CV_X: CertificationSeed = { name: 'Safety Induction Certificate', expiresInDays: -40 };
const FA_C: CertificationSeed = { name: 'First Aid & CPR', expiresInDays: 240 };
const FA_E: CertificationSeed = { name: 'First Aid & CPR', expiresInDays: 5 };
const HS_C: CertificationSeed = { name: 'Height Safety Training', expiresInDays: 300 };
const HS_E: CertificationSeed = { name: 'Height Safety Training', expiresInDays: 21 };
const EL_C: CertificationSeed = { name: 'Electrical Safety Certificate', expiresInDays: 150 };
const EL_E: CertificationSeed = { name: 'Electrical Safety Certificate', expiresInDays: 27 };
const EL_X: CertificationSeed = { name: 'Electrical Safety Certificate', expiresInDays: -95 };
const EQ_C: CertificationSeed = { name: 'Equipment Operation License', expiresInDays: 400 };
const OS_C: CertificationSeed = { name: 'OSHA 10-Hour Safety', expiresInDays: 500 };
const MF_C: CertificationSeed = { name: 'Medical Fitness Certificate', expiresInDays: 260 };
const MF_E: CertificationSeed = { name: 'Medical Fitness Certificate', expiresInDays: 9 };
const MF_X: CertificationSeed = { name: 'Medical Fitness Certificate', expiresInDays: -160 };
const PP_C: CertificationSeed = { name: 'PPE Compliance Certificate', expiresInDays: 210 };
const PP_X: CertificationSeed = { name: 'PPE Compliance Certificate', expiresInDays: -210 };

const W_CIVIL     = ['Foundation Work', 'Excavation', 'Formwork', 'Concrete Pouring', 'Survey Reading'];
const W_ELEC      = ['Wiring & Cabling', 'Panel Installation', 'Testing & Commissioning', 'Cable Management', 'Electrical Safety'];
const W_STEEL     = ['Rebar Bending', 'Structural Connections', 'Blueprint Reading', 'Safety Rigging', 'Tack Welding'];
const W_CONCRETE  = ['Mix Design', 'Pour & Finish', 'Pump Operation', 'Quality Testing', 'Curing Methods'];
const W_MECH      = ['HVAC Installation', 'Pipe Fitting', 'Equipment Maintenance', 'MIG Welding', 'Pressure Testing'];
const W_MASONRY   = ['Block Laying', 'Tile Work', 'Plastering', 'Waterproofing', 'Brick Bonding'];
const W_EQUIP     = ['Crane Operation', 'Excavator', 'Forklift', 'JCB Operation', 'Pre-shift Safety Checks'];
const W_PLUMBING  = ['Pipe Fitting', 'Drain Installation', 'Fixtures & Fittings', 'Pressure Testing', 'Blueprint Reading'];
const W_CARPENTRY = ['Formwork', 'Shuttering', 'Wood Framing', 'Blueprint Reading', 'Site Measurement'];
const W_PAINTING  = ['Interior Painting', 'Waterproofing Coat', 'Surface Preparation', 'Colour Mixing', 'Anti-Rust Coating'];

// projectCode -> Worker[] (projects will be resolved by code at seed time)
// status / attendancePercent / lastCheckIn are hints used to generate a realistic attendance history.
type WorkerSeedEntry = {
  name: string; initials: string; role: string; trade: string; type: 'EMPLOYEE' | 'SUBCONTRACTOR';
  projectCode: string; phone: string; email: string; status: 'ACTIVE' | 'LATE' | 'ABSENT' | 'ON_LEAVE';
  experienceYears: number; shift: 'DAY' | 'NIGHT'; attendancePercent: number; lastCheckIn: string;
  supervisor: string; emergencyContact: object; skills: string[]; certifications: CertificationSeed[];
  ppeCompliant: boolean;
};

const WORKER_SEEDS: WorkerSeedEntry[] = [
  { name: 'Rajesh Kumar', initials: 'RK', role: 'Site Supervisor', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43210', email: 'rajesh.kumar@sitepilot.in', status: 'ACTIVE', experienceYears: 12, shift: 'DAY', attendancePercent: 95, lastCheckIn: 'Today, 07:32 AM', supervisor: 'Ananya Krishnan', emergencyContact: { name: 'Sunita Kumar', phone: '+91 98766 00001', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, FA_C, HS_C, OS_C, MF_C], ppeCompliant: true },
  { name: 'Suresh Sharma', initials: 'SS', role: 'Foundation Specialist', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-002', phone: '+91 98765 43211', email: 'suresh.sharma@sitepilot.in', status: 'ACTIVE', experienceYears: 8, shift: 'DAY', attendancePercent: 89, lastCheckIn: 'Today, 07:55 AM', supervisor: 'Rajesh Kumar', emergencyContact: { name: 'Kavita Sharma', phone: '+91 98766 00002', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, FA_C, HS_C, MF_C], ppeCompliant: true },
  { name: 'Dinesh Patel', initials: 'DP', role: 'Excavation Operator', trade: 'Civil', type: 'SUBCONTRACTOR', projectCode: 'GRV-003', phone: '+91 98765 43212', email: 'dinesh.patel@sitepilot.in', status: 'ACTIVE', experienceYears: 6, shift: 'DAY', attendancePercent: 91, lastCheckIn: 'Today, 07:48 AM', supervisor: 'Rajesh Kumar', emergencyContact: { name: 'Meena Patel', phone: '+91 98766 00003', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true },
  { name: 'Mahesh Yadav', initials: 'MY', role: 'Grading Specialist', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43213', email: 'mahesh.yadav@sitepilot.in', status: 'LATE', experienceYears: 10, shift: 'DAY', attendancePercent: 82, lastCheckIn: 'Today, 09:20 AM', supervisor: 'Rajesh Kumar', emergencyContact: { name: 'Priya Yadav', phone: '+91 98766 00004', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, FA_E, HS_C, MF_C], ppeCompliant: true },
  { name: 'Ramesh Singh', initials: 'RS', role: 'Civil Supervisor', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-002', phone: '+91 98765 43214', email: 'ramesh.singh@sitepilot.in', status: 'ACTIVE', experienceYears: 15, shift: 'DAY', attendancePercent: 97, lastCheckIn: 'Today, 07:15 AM', supervisor: 'Ananya Krishnan', emergencyContact: { name: 'Geeta Singh', phone: '+91 98766 00005', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, FA_C, HS_C, OS_C, MF_C, PP_C], ppeCompliant: true },
  { name: 'Arun Mishra', initials: 'AM', role: 'Formwork Carpenter', trade: 'Civil', type: 'SUBCONTRACTOR', projectCode: 'GRV-004', phone: '+91 98765 43215', email: 'arun.mishra@sitepilot.in', status: 'ACTIVE', experienceYears: 5, shift: 'DAY', attendancePercent: 87, lastCheckIn: 'Today, 08:02 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Rekha Mishra', phone: '+91 98766 00006', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true },
  { name: 'Narendra Kumar', initials: 'NK', role: 'Ground Leveling Worker', trade: 'Civil', type: 'SUBCONTRACTOR', projectCode: 'GRV-001', phone: '+91 98765 43216', email: 'narendra.kumar@sitepilot.in', status: 'ABSENT', experienceYears: 3, shift: 'DAY', attendancePercent: 71, lastCheckIn: 'Yesterday, 05:30 PM', supervisor: 'Rajesh Kumar', emergencyContact: { name: 'Lata Kumar', phone: '+91 98766 00007', relation: 'Wife' }, skills: W_CIVIL.slice(0,3), certifications: [CV_X, MF_X, PP_X], ppeCompliant: false },
  { name: 'Pankaj Verma', initials: 'PV', role: 'Civil Technician', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43217', email: 'pankaj.verma@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'NIGHT', attendancePercent: 88, lastCheckIn: 'Today, 08:30 PM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Anita Verma', phone: '+91 98766 00008', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, FA_C, HS_C], ppeCompliant: true },
  { name: 'Santosh Gupta', initials: 'SG', role: 'Foundation Inspector', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43218', email: 'santosh.gupta@sitepilot.in', status: 'ACTIVE', experienceYears: 11, shift: 'DAY', attendancePercent: 94, lastCheckIn: 'Today, 07:40 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Shanti Gupta', phone: '+91 98766 00009', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, FA_C, OS_C, MF_C], ppeCompliant: true },
  { name: 'Vinod Chauhan', initials: 'VC', role: 'Drain Layer', trade: 'Civil', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43219', email: 'vinod.chauhan@sitepilot.in', status: 'ACTIVE', experienceYears: 7, shift: 'DAY', attendancePercent: 83, lastCheckIn: 'Today, 08:05 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Savita Chauhan', phone: '+91 98766 00010', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true },
  { name: 'Mohan Lal', initials: 'ML', role: 'Site Helper', trade: 'Civil', type: 'SUBCONTRACTOR', projectCode: 'GRV-004', phone: '+91 98765 43220', email: 'mohan.lal@sitepilot.in', status: 'ON_LEAVE', experienceYears: 2, shift: 'DAY', attendancePercent: 78, lastCheckIn: '5 days ago', supervisor: 'Arun Mishra', emergencyContact: { name: 'Maya Lal', phone: '+91 98766 00011', relation: 'Wife' }, skills: W_CIVIL.slice(0,3), certifications: [CV_C, MF_C], ppeCompliant: true },
  { name: 'Deepak Rawat', initials: 'DR', role: 'Concreting Worker', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43221', email: 'deepak.rawat@sitepilot.in', status: 'ACTIVE', experienceYears: 4, shift: 'DAY', attendancePercent: 85, lastCheckIn: 'Today, 07:52 AM', supervisor: 'Rajesh Kumar', emergencyContact: { name: 'Nisha Rawat', phone: '+91 98766 00012', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, FA_C, MF_C], ppeCompliant: true },
  { name: 'Rohit Kumar', initials: 'RoK', role: 'Survey Assistant', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43222', email: 'rohit.kumar@sitepilot.in', status: 'ACTIVE', experienceYears: 3, shift: 'DAY', attendancePercent: 88, lastCheckIn: 'Today, 07:58 AM', supervisor: 'Pankaj Verma', emergencyContact: { name: 'Pooja Kumar', phone: '+91 98766 00013', relation: 'Sister' }, skills: W_CIVIL, certifications: [CV_C, MF_C], ppeCompliant: true },
  { name: 'Alok Pandey', initials: 'AP', role: 'Ground Worker', trade: 'Civil', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43223', email: 'alok.pandey@sitepilot.in', status: 'LATE', experienceYears: 5, shift: 'DAY', attendancePercent: 79, lastCheckIn: 'Today, 09:45 AM', supervisor: 'Vinod Chauhan', emergencyContact: { name: 'Sarla Pandey', phone: '+91 98766 00014', relation: 'Mother' }, skills: W_CIVIL.slice(0,3), certifications: [CV_E, HS_E, MF_E], ppeCompliant: true },
  { name: 'Vikram Reddy', initials: 'VR', role: 'Lead Electrician', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43224', email: 'vikram.reddy@sitepilot.in', status: 'ACTIVE', experienceYears: 14, shift: 'DAY', attendancePercent: 96, lastCheckIn: 'Today, 07:28 AM', supervisor: 'Srinivasa Rao', emergencyContact: { name: 'Padmaja Reddy', phone: '+91 98766 00015', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, FA_C, OS_C, MF_C, PP_C], ppeCompliant: true },
  { name: 'Chandrasekhar Rao', initials: 'CR', role: 'Panel Technician', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43225', email: 'chandrasekhar.rao@sitepilot.in', status: 'ACTIVE', experienceYears: 10, shift: 'DAY', attendancePercent: 93, lastCheckIn: 'Today, 07:42 AM', supervisor: 'Vikram Reddy', emergencyContact: { name: 'Vasantha Rao', phone: '+91 98766 00016', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, FA_C, MF_C], ppeCompliant: true },
  { name: 'Venkatesh Pillai', initials: 'VP', role: 'Wiring Specialist', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43226', email: 'venkatesh.pillai@sitepilot.in', status: 'ACTIVE', experienceYears: 8, shift: 'DAY', attendancePercent: 91, lastCheckIn: 'Today, 07:50 AM', supervisor: 'Vikram Reddy', emergencyContact: { name: 'Lalitha Pillai', phone: '+91 98766 00017', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, HS_C, MF_C], ppeCompliant: true },
  { name: 'Murugan Ramasamy', initials: 'MR', role: 'Cable Technician', trade: 'Electrical', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43227', email: 'murugan.ramasamy@sitepilot.in', status: 'LATE', experienceYears: 6, shift: 'DAY', attendancePercent: 84, lastCheckIn: 'Today, 09:10 AM', supervisor: 'Vikram Reddy', emergencyContact: { name: 'Kavitha Ramasamy', phone: '+91 98766 00018', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_E, MF_C], ppeCompliant: true },
  { name: 'Krishnan Nair', initials: 'KN', role: 'Electrical Inspector', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43228', email: 'krishnan.nair@sitepilot.in', status: 'ACTIVE', experienceYears: 12, shift: 'DAY', attendancePercent: 95, lastCheckIn: 'Today, 07:35 AM', supervisor: 'Srinivasa Rao', emergencyContact: { name: 'Sreelekha Nair', phone: '+91 98766 00019', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, OS_C, FA_C, MF_C, PP_C], ppeCompliant: true },
  { name: 'Subramanian Menon', initials: 'SM', role: 'LV Electrician', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-004', phone: '+91 98765 43229', email: 'subramanian.menon@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'DAY', attendancePercent: 89, lastCheckIn: 'Today, 07:55 AM', supervisor: 'Vikram Reddy', emergencyContact: { name: 'Vimala Menon', phone: '+91 98766 00020', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, FA_C, MF_C], ppeCompliant: true },
  { name: 'Balaji Hegde', initials: 'BH', role: 'Electrician Helper', trade: 'Electrical', type: 'SUBCONTRACTOR', projectCode: 'GRV-001', phone: '+91 98765 43230', email: 'balaji.hegde@sitepilot.in', status: 'ABSENT', experienceYears: 3, shift: 'DAY', attendancePercent: 72, lastCheckIn: 'Yesterday, 05:30 PM', supervisor: 'Venkatesh Pillai', emergencyContact: { name: 'Shantala Hegde', phone: '+91 98766 00021', relation: 'Mother' }, skills: W_ELEC.slice(0,3), certifications: [EL_X, MF_X, PP_X], ppeCompliant: false },
  { name: 'Nagaraju Naidu', initials: 'NN', role: 'HV Technician', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43231', email: 'nagaraju.naidu@sitepilot.in', status: 'ACTIVE', experienceYears: 11, shift: 'NIGHT', attendancePercent: 87, lastCheckIn: 'Today, 08:00 PM', supervisor: 'Vikram Reddy', emergencyContact: { name: 'Sarada Naidu', phone: '+91 98766 00022', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, OS_C, MF_C], ppeCompliant: true },
  { name: 'Ramakrishna Iyer', initials: 'RI', role: 'Testing Specialist', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-002', phone: '+91 98765 43232', email: 'ramakrishna.iyer@sitepilot.in', status: 'ACTIVE', experienceYears: 16, shift: 'DAY', attendancePercent: 98, lastCheckIn: 'Today, 07:20 AM', supervisor: 'Ananya Krishnan', emergencyContact: { name: 'Gomathi Iyer', phone: '+91 98766 00023', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, FA_C, OS_C, MF_C, PP_C], ppeCompliant: true },
  { name: 'Srinivasa Rao', initials: 'SR', role: 'Commissioning Engineer', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43233', email: 'srinivasa.rao@sitepilot.in', status: 'ON_LEAVE', experienceYears: 13, shift: 'DAY', attendancePercent: 90, lastCheckIn: '3 days ago', supervisor: 'Ananya Krishnan', emergencyContact: { name: 'Durga Rao', phone: '+91 98766 00024', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, OS_C, MF_C], ppeCompliant: true },
  { name: 'Arjun Thakur', initials: 'AT', role: 'Lead Steel Fixer', trade: 'Steel Fixing', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43234', email: 'arjun.thakur@sitepilot.in', status: 'ACTIVE', experienceYears: 13, shift: 'DAY', attendancePercent: 94, lastCheckIn: 'Today, 07:30 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Priti Thakur', phone: '+91 98766 00025', relation: 'Wife' }, skills: W_STEEL, certifications: [CV_C, FA_C, HS_C, OS_C, MF_C], ppeCompliant: true },
  { name: 'Bharat Bhushan', initials: 'BB', role: 'Rebar Specialist', trade: 'Steel Fixing', type: 'SUBCONTRACTOR', projectCode: 'GRV-003', phone: '+91 98765 43235', email: 'bharat.bhushan@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'DAY', attendancePercent: 88, lastCheckIn: 'Today, 07:52 AM', supervisor: 'Arjun Thakur', emergencyContact: { name: 'Usha Bhushan', phone: '+91 98766 00026', relation: 'Wife' }, skills: W_STEEL, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true },
  { name: 'Devendra Mehra', initials: 'DM', role: 'Structural Steel Fixer', trade: 'Steel Fixing', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43236', email: 'devendra.mehra@sitepilot.in', status: 'ACTIVE', experienceYears: 7, shift: 'DAY', attendancePercent: 85, lastCheckIn: 'Today, 08:00 AM', supervisor: 'Arjun Thakur', emergencyContact: { name: 'Kamla Mehra', phone: '+91 98766 00027', relation: 'Wife' }, skills: W_STEEL, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true },
  { name: 'Lokesh Bajpai', initials: 'LB', role: 'Steel Inspector', trade: 'Steel Fixing', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43237', email: 'lokesh.bajpai@sitepilot.in', status: 'LATE', experienceYears: 11, shift: 'DAY', attendancePercent: 80, lastCheckIn: 'Today, 09:35 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Meena Bajpai', phone: '+91 98766 00028', relation: 'Wife' }, skills: W_STEEL, certifications: [CV_C, HS_E, FA_E, MF_C], ppeCompliant: true },
  { name: 'Tarun Thakur', initials: 'TT', role: 'Rebar Bender', trade: 'Steel Fixing', type: 'SUBCONTRACTOR', projectCode: 'GRV-003', phone: '+91 98765 43238', email: 'tarun.thakur@sitepilot.in', status: 'ACTIVE', experienceYears: 5, shift: 'DAY', attendancePercent: 82, lastCheckIn: 'Today, 08:10 AM', supervisor: 'Arjun Thakur', emergencyContact: { name: 'Ritu Thakur', phone: '+91 98766 00029', relation: 'Sister' }, skills: W_STEEL, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true },
  { name: 'Harish Garg', initials: 'HG', role: 'Structural Welder', trade: 'Steel Fixing', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43239', email: 'harish.garg@sitepilot.in', status: 'ACTIVE', experienceYears: 10, shift: 'DAY', attendancePercent: 91, lastCheckIn: 'Today, 07:45 AM', supervisor: 'Arjun Thakur', emergencyContact: { name: 'Seema Garg', phone: '+91 98766 00030', relation: 'Wife' }, skills: W_STEEL, certifications: [CV_C, FA_C, HS_C, OS_C, MF_C], ppeCompliant: true },
  { name: 'Sunil Shukla', initials: 'SSh', role: 'Rebar Fixer', trade: 'Steel Fixing', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43240', email: 'sunil.shukla@sitepilot.in', status: 'ABSENT', experienceYears: 4, shift: 'DAY', attendancePercent: 75, lastCheckIn: 'Yesterday, 05:30 PM', supervisor: 'Arjun Thakur', emergencyContact: { name: 'Pushpa Shukla', phone: '+91 98766 00031', relation: 'Mother' }, skills: W_STEEL.slice(0,3), certifications: [CV_X, MF_X, PP_X], ppeCompliant: false },
  { name: 'Nitin Singh', initials: 'NS', role: 'Steel Rigger', trade: 'Steel Fixing', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43241', email: 'nitin.singh@sitepilot.in', status: 'ACTIVE', experienceYears: 8, shift: 'DAY', attendancePercent: 87, lastCheckIn: 'Today, 07:58 AM', supervisor: 'Arjun Thakur', emergencyContact: { name: 'Anjali Singh', phone: '+91 98766 00032', relation: 'Wife' }, skills: W_STEEL, certifications: [CV_C, FA_C, HS_C, MF_C], ppeCompliant: true },
  { name: 'Mohammed Shaikh', initials: 'MS', role: 'Concrete Foreman', trade: 'Concrete', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43242', email: 'mohammed.shaikh@sitepilot.in', status: 'ACTIVE', experienceYears: 15, shift: 'DAY', attendancePercent: 97, lastCheckIn: 'Today, 07:25 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Fatima Shaikh', phone: '+91 98766 00033', relation: 'Wife' }, skills: W_CONCRETE, certifications: [CV_C, FA_C, OS_C, MF_C, PP_C], ppeCompliant: true },
  { name: 'Salim Khan', initials: 'SK', role: 'Pump Operator', trade: 'Concrete', type: 'SUBCONTRACTOR', projectCode: 'GRV-003', phone: '+91 98765 43243', email: 'salim.khan@sitepilot.in', status: 'ACTIVE', experienceYears: 8, shift: 'DAY', attendancePercent: 86, lastCheckIn: 'Today, 07:50 AM', supervisor: 'Mohammed Shaikh', emergencyContact: { name: 'Reshma Khan', phone: '+91 98766 00034', relation: 'Wife' }, skills: W_CONCRETE, certifications: [CV_C, EQ_C, MF_C], ppeCompliant: true },
  { name: 'Raza Hussain', initials: 'RH', role: 'Concrete Finisher', trade: 'Concrete', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43244', email: 'raza.hussain@sitepilot.in', status: 'ACTIVE', experienceYears: 11, shift: 'DAY', attendancePercent: 93, lastCheckIn: 'Today, 07:40 AM', supervisor: 'Mohammed Shaikh', emergencyContact: { name: 'Zarina Hussain', phone: '+91 98766 00035', relation: 'Wife' }, skills: W_CONCRETE, certifications: [CV_C, FA_C, MF_C, OS_C], ppeCompliant: true },
  { name: 'Imran Ali', initials: 'IA', role: 'Batching Technician', trade: 'Concrete', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43245', email: 'imran.ali@sitepilot.in', status: 'LATE', experienceYears: 6, shift: 'NIGHT', attendancePercent: 81, lastCheckIn: 'Today, 09:50 PM', supervisor: 'Mohammed Shaikh', emergencyContact: { name: 'Sabina Ali', phone: '+91 98766 00036', relation: 'Wife' }, skills: W_CONCRETE, certifications: [CV_E, FA_E, MF_E], ppeCompliant: true },
  { name: 'Noor Ahmed', initials: 'NA', role: 'Quality Inspector', trade: 'Concrete', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43246', email: 'noor.ahmed@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'DAY', attendancePercent: 89, lastCheckIn: 'Today, 07:48 AM', supervisor: 'Mohammed Shaikh', emergencyContact: { name: 'Ayesha Ahmed', phone: '+91 98766 00037', relation: 'Wife' }, skills: W_CONCRETE, certifications: [CV_C, FA_C, OS_C, MF_C], ppeCompliant: true },
  { name: 'Yusuf Khan', initials: 'YK', role: 'Concreting Helper', trade: 'Concrete', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43247', email: 'yusuf.khan@sitepilot.in', status: 'ABSENT', experienceYears: 7, shift: 'DAY', attendancePercent: 77, lastCheckIn: 'Yesterday, 05:30 PM', supervisor: 'Raza Hussain', emergencyContact: { name: 'Hina Khan', phone: '+91 98766 00038', relation: 'Wife' }, skills: W_CONCRETE.slice(0,3), certifications: [CV_X, MF_X], ppeCompliant: false },
  { name: 'Kuldeep Arora', initials: 'KA', role: 'Mechanical Engineer', trade: 'Mechanical', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43248', email: 'kuldeep.arora@sitepilot.in', status: 'ACTIVE', experienceYears: 14, shift: 'DAY', attendancePercent: 96, lastCheckIn: 'Today, 07:30 AM', supervisor: 'Ananya Krishnan', emergencyContact: { name: 'Neha Arora', phone: '+91 98766 00039', relation: 'Wife' }, skills: W_MECH, certifications: [CV_C, FA_C, OS_C, MF_C, PP_C], ppeCompliant: true },
  { name: 'Gurpreet Singh', initials: 'GS', role: 'HVAC Technician', trade: 'Mechanical', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43249', email: 'gurpreet.singh@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'DAY', attendancePercent: 92, lastCheckIn: 'Today, 07:45 AM', supervisor: 'Kuldeep Arora', emergencyContact: { name: 'Harpreet Kaur', phone: '+91 98766 00040', relation: 'Wife' }, skills: W_MECH, certifications: [CV_C, FA_C, MF_C], ppeCompliant: true },
  { name: 'Harjinder Dhillon', initials: 'HD', role: 'Pipe Fitter', trade: 'Mechanical', type: 'SUBCONTRACTOR', projectCode: 'GRV-001', phone: '+91 98765 43250', email: 'harjinder.dhillon@sitepilot.in', status: 'ACTIVE', experienceYears: 7, shift: 'DAY', attendancePercent: 88, lastCheckIn: 'Today, 07:58 AM', supervisor: 'Kuldeep Arora', emergencyContact: { name: 'Amrit Kaur', phone: '+91 98766 00041', relation: 'Wife' }, skills: W_MECH, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true },
  { name: 'Paramjit Bains', initials: 'PB', role: 'Mechanical Helper', trade: 'Mechanical', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43251', email: 'paramjit.bains@sitepilot.in', status: 'ON_LEAVE', experienceYears: 4, shift: 'DAY', attendancePercent: 79, lastCheckIn: '4 days ago', supervisor: 'Harjinder Dhillon', emergencyContact: { name: 'Jaswinder Bains', phone: '+91 98766 00042', relation: 'Brother' }, skills: W_MECH.slice(0,3), certifications: [CV_C, MF_C], ppeCompliant: true },
  { name: 'Sukhwinder Gill', initials: 'SGi', role: 'Equipment Technician', trade: 'Mechanical', type: 'EMPLOYEE', projectCode: 'GRV-004', phone: '+91 98765 43252', email: 'sukhwinder.gill@sitepilot.in', status: 'ACTIVE', experienceYears: 11, shift: 'DAY', attendancePercent: 91, lastCheckIn: 'Today, 07:40 AM', supervisor: 'Kuldeep Arora', emergencyContact: { name: 'Mandeep Kaur', phone: '+91 98766 00043', relation: 'Wife' }, skills: W_MECH, certifications: [CV_C, FA_C, OS_C, MF_C], ppeCompliant: true },
  { name: 'Manpreet Kaur', initials: 'MK', role: 'HVAC Inspector', trade: 'Mechanical', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43253', email: 'manpreet.kaur@sitepilot.in', status: 'ACTIVE', experienceYears: 8, shift: 'DAY', attendancePercent: 90, lastCheckIn: 'Today, 07:52 AM', supervisor: 'Kuldeep Arora', emergencyContact: { name: 'Gurjeet Kaur', phone: '+91 98766 00044', relation: 'Mother' }, skills: W_MECH, certifications: [CV_C, FA_C, MF_C, PP_C], ppeCompliant: true },
  { name: 'Ramesh Nair', initials: 'RN', role: 'Lead Mason', trade: 'Masonry', type: 'EMPLOYEE', projectCode: 'GRV-004', phone: '+91 98765 43254', email: 'ramesh.nair@sitepilot.in', status: 'ACTIVE', experienceYears: 16, shift: 'DAY', attendancePercent: 95, lastCheckIn: 'Today, 07:35 AM', supervisor: 'Ananya Krishnan', emergencyContact: { name: 'Saritha Nair', phone: '+91 98766 00045', relation: 'Wife' }, skills: W_MASONRY, certifications: [CV_C, FA_C, OS_C, MF_C, PP_C], ppeCompliant: true },
  { name: 'Pradeep Pillai', initials: 'PP2', role: 'Block Layer', trade: 'Masonry', type: 'SUBCONTRACTOR', projectCode: 'GRV-001', phone: '+91 98765 43255', email: 'pradeep.pillai@sitepilot.in', status: 'ACTIVE', experienceYears: 8, shift: 'DAY', attendancePercent: 84, lastCheckIn: 'Today, 08:00 AM', supervisor: 'Ramesh Nair', emergencyContact: { name: 'Lissy Pillai', phone: '+91 98766 00046', relation: 'Wife' }, skills: W_MASONRY, certifications: [CV_C, MF_C], ppeCompliant: true },
  { name: 'Sanjay Menon', initials: 'SjM', role: 'Tile Expert', trade: 'Masonry', type: 'SUBCONTRACTOR', projectCode: 'GRV-003', phone: '+91 98765 43256', email: 'sanjay.menon@sitepilot.in', status: 'ACTIVE', experienceYears: 10, shift: 'DAY', attendancePercent: 87, lastCheckIn: 'Today, 07:55 AM', supervisor: 'Ramesh Nair', emergencyContact: { name: 'Sheela Menon', phone: '+91 98766 00047', relation: 'Wife' }, skills: W_MASONRY, certifications: [CV_C, FA_C, MF_C], ppeCompliant: true },
  { name: 'Anil Krishnan', initials: 'AK', role: 'Plasterer', trade: 'Masonry', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43257', email: 'anil.krishnan@sitepilot.in', status: 'LATE', experienceYears: 6, shift: 'DAY', attendancePercent: 80, lastCheckIn: 'Today, 09:30 AM', supervisor: 'Ramesh Nair', emergencyContact: { name: 'Sindhu Krishnan', phone: '+91 98766 00048', relation: 'Wife' }, skills: W_MASONRY, certifications: [CV_E, MF_E], ppeCompliant: true },
  { name: 'Babu Thomas', initials: 'BT', role: 'Mason Helper', trade: 'Masonry', type: 'SUBCONTRACTOR', projectCode: 'GRV-004', phone: '+91 98765 43258', email: 'babu.thomas@sitepilot.in', status: 'ABSENT', experienceYears: 3, shift: 'DAY', attendancePercent: 71, lastCheckIn: 'Yesterday, 05:30 PM', supervisor: 'Ramesh Nair', emergencyContact: { name: 'Mariamma Thomas', phone: '+91 98766 00049', relation: 'Mother' }, skills: W_MASONRY.slice(0,3), certifications: [CV_X, MF_X, PP_X], ppeCompliant: false },
  { name: 'Gurdeep Singh', initials: 'GuS', role: 'Crane Operator', trade: 'Equipment Operation', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43259', email: 'gurdeep.singh@sitepilot.in', status: 'ACTIVE', experienceYears: 18, shift: 'DAY', attendancePercent: 98, lastCheckIn: 'Today, 07:10 AM', supervisor: 'Ananya Krishnan', emergencyContact: { name: 'Baljit Kaur', phone: '+91 98766 00050', relation: 'Wife' }, skills: W_EQUIP, certifications: [CV_C, EQ_C, OS_C, FA_C, MF_C, PP_C], ppeCompliant: true },
  { name: 'Ravinder Yadav', initials: 'RY', role: 'Excavator Operator', trade: 'Equipment Operation', type: 'EMPLOYEE', projectCode: 'GRV-002', phone: '+91 98765 43260', email: 'ravinder.yadav@sitepilot.in', status: 'ACTIVE', experienceYears: 12, shift: 'DAY', attendancePercent: 94, lastCheckIn: 'Today, 07:25 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Kamla Yadav', phone: '+91 98766 00051', relation: 'Wife' }, skills: W_EQUIP, certifications: [CV_C, EQ_C, OS_C, MF_C], ppeCompliant: true },
  { name: 'Jagdish Prasad', initials: 'JP', role: 'Forklift Operator', trade: 'Equipment Operation', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43261', email: 'jagdish.prasad@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'DAY', attendancePercent: 89, lastCheckIn: 'Today, 07:48 AM', supervisor: 'Gurdeep Singh', emergencyContact: { name: 'Mridula Prasad', phone: '+91 98766 00052', relation: 'Wife' }, skills: W_EQUIP, certifications: [CV_C, EQ_C, MF_C], ppeCompliant: true },
  { name: 'Ashok Dubey', initials: 'AD', role: 'JCB Operator', trade: 'Equipment Operation', type: 'SUBCONTRACTOR', projectCode: 'GRV-004', phone: '+91 98765 43262', email: 'ashok.dubey@sitepilot.in', status: 'LATE', experienceYears: 7, shift: 'DAY', attendancePercent: 82, lastCheckIn: 'Today, 09:55 AM', supervisor: 'Ravinder Yadav', emergencyContact: { name: 'Reena Dubey', phone: '+91 98766 00053', relation: 'Wife' }, skills: W_EQUIP, certifications: [CV_C, EQ_C, MF_E], ppeCompliant: true },
  { name: 'Vivek Trivedi', initials: 'VT', role: 'Senior Plumber', trade: 'Plumbing', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43263', email: 'vivek.trivedi@sitepilot.in', status: 'ACTIVE', experienceYears: 11, shift: 'DAY', attendancePercent: 93, lastCheckIn: 'Today, 07:38 AM', supervisor: 'Kuldeep Arora', emergencyContact: { name: 'Swati Trivedi', phone: '+91 98766 00054', relation: 'Wife' }, skills: W_PLUMBING, certifications: [CV_C, FA_C, OS_C, MF_C], ppeCompliant: true },
  { name: 'Gaurav Saxena', initials: 'GaS', role: 'Pipe Fitter', trade: 'Plumbing', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43264', email: 'gaurav.saxena@sitepilot.in', status: 'ACTIVE', experienceYears: 7, shift: 'DAY', attendancePercent: 88, lastCheckIn: 'Today, 07:52 AM', supervisor: 'Vivek Trivedi', emergencyContact: { name: 'Megha Saxena', phone: '+91 98766 00055', relation: 'Wife' }, skills: W_PLUMBING, certifications: [CV_C, FA_C, MF_C], ppeCompliant: true },
  { name: 'Manoj Bhatt', initials: 'MBh', role: 'Drainage Specialist', trade: 'Plumbing', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43265', email: 'manoj.bhatt@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'DAY', attendancePercent: 86, lastCheckIn: 'Today, 07:58 AM', supervisor: 'Vivek Trivedi', emergencyContact: { name: 'Poonam Bhatt', phone: '+91 98766 00056', relation: 'Wife' }, skills: W_PLUMBING, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true },
  { name: 'Ramendra Singh', initials: 'RmS', role: 'Lead Carpenter', trade: 'Carpentry', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43266', email: 'ramendra.singh@sitepilot.in', status: 'ACTIVE', experienceYears: 13, shift: 'DAY', attendancePercent: 94, lastCheckIn: 'Today, 07:32 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Usha Singh', phone: '+91 98766 00057', relation: 'Wife' }, skills: W_CARPENTRY, certifications: [CV_C, FA_C, OS_C, MF_C], ppeCompliant: true },
  { name: 'Bittu Sharma', initials: 'BiS', role: 'Carpenter Helper', trade: 'Carpentry', type: 'SUBCONTRACTOR', projectCode: 'GRV-003', phone: '+91 98765 43267', email: 'bittu.sharma@sitepilot.in', status: 'ON_LEAVE', experienceYears: 4, shift: 'DAY', attendancePercent: 75, lastCheckIn: '6 days ago', supervisor: 'Ramendra Singh', emergencyContact: { name: 'Rita Sharma', phone: '+91 98766 00058', relation: 'Wife' }, skills: W_CARPENTRY.slice(0,3), certifications: [CV_C, MF_C], ppeCompliant: true },
  { name: 'Lalit Gupta', initials: 'LG', role: 'Senior Painter', trade: 'Painting', type: 'SUBCONTRACTOR', projectCode: 'GRV-001', phone: '+91 98765 43268', email: 'lalit.gupta@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'DAY', attendancePercent: 86, lastCheckIn: 'Today, 08:05 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Savita Gupta', phone: '+91 98766 00059', relation: 'Wife' }, skills: W_PAINTING, certifications: [CV_C, FA_C, MF_C], ppeCompliant: true },
  { name: 'Prakash Yadav', initials: 'PrY', role: 'Painter Helper', trade: 'Painting', type: 'SUBCONTRACTOR', projectCode: 'GRV-004', phone: '+91 98765 43269', email: 'prakash.yadav@sitepilot.in', status: 'ACTIVE', experienceYears: 5, shift: 'DAY', attendancePercent: 81, lastCheckIn: 'Today, 08:12 AM', supervisor: 'Lalit Gupta', emergencyContact: { name: 'Sarita Yadav', phone: '+91 98766 00060', relation: 'Wife' }, skills: W_PAINTING, certifications: [CV_C, MF_C], ppeCompliant: true },
];

/** A calendar day (UTC midnight, as @db.Date stores it) the given number of days from today. */
function daysFromToday(days: number): Date {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days));
}

async function seedWorkers(orgId: string) {
  const workerCount = await prisma.worker.count({ where: { organizationId: orgId } });
  if (workerCount > 0) {
    console.log('  → Workers already seeded, skipping');
    return;
  }

  // Resolve project IDs by code
  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    select: { id: true, code: true },
  });
  const projectIdByCode = Object.fromEntries(projects.map((p) => [p.code, p.id]));

  for (const w of WORKER_SEEDS) {
    const projectId = projectIdByCode[w.projectCode] ?? null;
    await prisma.worker.create({
      data: {
        name:             w.name,
        initials:         w.initials,
        role:             w.role,
        trade:            w.trade,
        type:             w.type,
        phone:            w.phone,
        email:            w.email,
        experienceYears:  w.experienceYears,
        shift:            w.shift,
        supervisor:       w.supervisor,
        projectId,
        emergencyContact: w.emergencyContact,
        skills:           w.skills,
        ppeCompliant:     w.ppeCompliant,
        organizationId:   orgId,
        certifications: {
          create: w.certifications.map((certification) => ({
            name: certification.name,
            expiresOn: daysFromToday(certification.expiresInDays),
            organizationId: orgId,
          })),
        },
      },
    });
  }

  console.log(`  → Seeded ${WORKER_SEEDS.length} workers`);
}

// ─── Daily Report Seed Data ──────────────────────────────────────────────────

type DailyReportSeedEntry = {
  dayOffset: number;
  weather: string;
  overallProgress: number;
  workCompleted: string;
  remarks: string;
  labourCount: number;
  status: 'DRAFT' | 'SUBMITTED';
  aiSummary: string;
  labourDetails: object;
  materialsConsumed: object[];
  equipmentUsed: object[];
  issues: object[];
};

const ATTENDANCE_HISTORY_DAYS = 21;

/** Deterministic 0–99 value so re-seeding produces the same history. */
function seededPercent(seed: string): number {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 100_003;
  return hash % 100;
}

/** Converts a wall-clock time at a site (e.g. 07:45 in Asia/Kolkata) to a UTC instant. */
function siteTimeToInstant(dateKey: string, minutesAfterMidnight: number, timeZone: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const asUtc = Date.UTC(year, month - 1, day, Math.floor(minutesAfterMidnight / 60), minutesAfterMidnight % 60);
  const zoned = new Date(new Date(asUtc).toLocaleString('en-US', { timeZone }));
  const utc = new Date(new Date(asUtc).toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(asUtc - (zoned.getTime() - utc.getTime()));
}

function parseTodayCheckIn(lastCheckIn: string): number | null {
  const match = /^Today, (\d{1,2}):(\d{2}) (AM|PM)$/.exec(lastCheckIn);
  if (!match) return null;
  const hour = (Number(match[1]) % 12) + (match[3] === 'PM' ? 12 : 0);
  return hour * 60 + Number(match[2]);
}

const TODAY_STATUS: Record<WorkerSeedEntry['status'], 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE'> = {
  ACTIVE: 'PRESENT',
  LATE: 'LATE',
  ABSENT: 'ABSENT',
  ON_LEAVE: 'ON_LEAVE',
};

async function seedAttendance(orgId: string) {
  const existing = await prisma.attendance.count({ where: { organizationId: orgId } });
  if (existing > 0) {
    console.log('  → Attendance already seeded, skipping');
    return;
  }

  const [organization, marker, workers] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { timezone: true } }),
    prisma.userOrganization.findFirst({
      where: { organizationId: orgId, role: { in: ['SITE_ENGINEER', 'OWNER'] } },
      orderBy: { role: 'desc' }, // OrgRole declares SITE_ENGINEER after OWNER, so the engineer wins.
      select: { userId: true },
    }),
    prisma.worker.findMany({ where: { organizationId: orgId, projectId: { not: null } } }),
  ]);
  if (!marker) return;

  const timeZone = organization.timezone;
  const today = toLocalDateKey(new Date(), timeZone);
  const seedByEmail = new Map(WORKER_SEEDS.map((entry) => [entry.email, entry]));
  const records: Prisma.AttendanceCreateManyInput[] = [];

  for (const worker of workers) {
    const hint = worker.email ? seedByEmail.get(worker.email) : undefined;
    if (!hint || !worker.projectId) continue;
    const shiftStart = worker.shift === 'NIGHT' ? 20 * 60 : 8 * 60;

    for (const date of lastDateKeys(today, ATTENDANCE_HISTORY_DAYS)) {
      if (dateKeyToDbDate(date).getUTCDay() === 0) continue; // Sites are closed on Sundays.

      const roll = seededPercent(`${worker.email}:${date}`);
      const isToday = date === today;
      let status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE';
      if (isToday) status = TODAY_STATUS[hint.status];
      else if (hint.status === 'ON_LEAVE' && date >= lastDateKeys(today, 5)[0]) status = 'ON_LEAVE';
      else if (roll >= hint.attendancePercent) status = 'ABSENT';
      else if (hint.status === 'LATE' && roll % 4 === 0) status = 'LATE';
      else status = 'PRESENT';

      const onSite = status === 'PRESENT' || status === 'LATE';
      const todayCheckIn = isToday ? parseTodayCheckIn(hint.lastCheckIn) : null;
      const arrival = todayCheckIn ?? shiftStart + (status === 'LATE' ? 40 + (roll % 50) : -30 + (roll % 50));
      const checkInAt = onSite ? siteTimeToInstant(date, arrival, timeZone) : null;
      const checkOutAt = onSite && !isToday && checkInAt
        ? new Date(checkInAt.getTime() + (9 * 60 + (roll % 60)) * 60_000)
        : null;

      records.push({
        workerId: worker.id,
        projectId: worker.projectId,
        organizationId: orgId,
        date: dateKeyToDbDate(date),
        status,
        checkInAt,
        checkOutAt,
        hoursWorked: checkInAt && checkOutAt
          ? Math.round(((checkOutAt.getTime() - checkInAt.getTime()) / 3_600_000) * 100) / 100
          : null,
        markedById: marker.userId,
      });
    }
  }

  await prisma.attendance.createMany({ data: records });
  console.log(`  → Seeded ${records.length} attendance records over ${ATTENDANCE_HISTORY_DAYS} days`);
}

// projectCode -> DailyReport[] (projects resolved by code at seed time)
const DAILY_REPORTS: Record<string, DailyReportSeedEntry[]> = {
  'GRV-001': [
    { dayOffset: 1, weather: 'Clear, 31°C', overallProgress: 52, workCompleted: 'Floor 4 slab pour completed (240 m³). Column reinforcement for Floor 5 tied and inspected.', remarks: 'Concrete cube samples collected for 7-day and 28-day testing. No safety incidents.', labourCount: 148, status: 'SUBMITTED', aiSummary: 'Strong day: Floor 4 slab pour completed on schedule with full labour attendance and zero safety incidents.', labourDetails: { skilled: 64, unskilled: 78, supervisors: 6 }, materialsConsumed: [{ material: 'RMC M30', quantity: 240, unit: 'm³' }, { material: 'TMT Steel Fe550', quantity: 12.5, unit: 'MT' }], equipmentUsed: [{ name: 'Tower Crane', hours: 9 }, { name: 'Concrete Pump', hours: 6 }], issues: [] },
    { dayOffset: 2, weather: 'Partly cloudy, 29°C', overallProgress: 51, workCompleted: 'Floor 4 shuttering strike-off. MEP sleeve placement for Floor 5 in progress.', remarks: 'Curtain wall aluminium delivery delayed by supplier - 10-day impact flagged to PMC.', labourCount: 142, status: 'SUBMITTED', aiSummary: 'Steady progress on structural works, but a supplier delay on curtain wall sections may affect the façade timeline.', labourDetails: { skilled: 60, unskilled: 76, supervisors: 6 }, materialsConsumed: [{ material: 'Plywood Shuttering', quantity: 85, unit: 'sheets' }], equipmentUsed: [{ name: 'Tower Crane', hours: 8 }, { name: 'Passenger Hoist', hours: 7 }], issues: [{ severity: 'medium', description: 'Curtain wall aluminium sections delayed by supplier' }] },
    { dayOffset: 4, weather: 'Clear, 32°C', overallProgress: 50, workCompleted: 'Basement waterproofing membrane laid across 620 m². Floor 3 blockwork 80% complete.', remarks: 'Monthly safety audit conducted - 0 critical findings, 3 minor observations closed on site.', labourCount: 151, status: 'SUBMITTED', aiSummary: 'Waterproofing and blockwork advanced well; safety audit passed with only minor, already-closed observations.', labourDetails: { skilled: 66, unskilled: 79, supervisors: 6 }, materialsConsumed: [{ material: 'APP Membrane', quantity: 640, unit: 'm²' }, { material: 'AAC Blocks', quantity: 1200, unit: 'nos' }], equipmentUsed: [{ name: 'Tower Crane', hours: 9 }, { name: 'Mortar Mixer', hours: 5 }], issues: [] },
  ],
  'GRV-002': [
    { dayOffset: 1, weather: 'Overcast, 28°C', overallProgress: 34, workCompleted: 'Storm drain lining Ch. 14+000 to 16+000 completed. De-silting at Sector 4-A ongoing.', remarks: 'BESCOM HT cable conflict at Ch. 1+240 - coordination meeting scheduled for tomorrow.', labourCount: 62, status: 'SUBMITTED', aiSummary: 'Drainage lining progressing on the 14–16 km reach; an underground BESCOM cable conflict needs resolution before excavation continues.', labourDetails: { skilled: 24, unskilled: 34, supervisors: 4 }, materialsConsumed: [{ material: 'Precast RCC Segments', quantity: 48, unit: 'nos' }], equipmentUsed: [{ name: 'Excavator', hours: 8 }, { name: 'Tipper Truck', hours: 10 }], issues: [{ severity: 'high', description: 'BESCOM HT cable found at Ch. 1+240' }] },
    { dayOffset: 3, weather: 'Light rain, 26°C', overallProgress: 33, workCompleted: 'Manhole upgrades at 4 locations. Smart flow sensor mounting brackets installed.', remarks: 'Work paused for 2 hours due to intermittent rain. No damage to open trenches.', labourCount: 58, status: 'SUBMITTED', aiSummary: 'Rain caused a short stoppage but sensor and manhole works stayed on track with no trench damage.', labourDetails: { skilled: 22, unskilled: 32, supervisors: 4 }, materialsConsumed: [{ material: 'Precast Manhole Rings', quantity: 12, unit: 'nos' }], equipmentUsed: [{ name: 'Excavator', hours: 6 }, { name: 'Dewatering Pump', hours: 9 }], issues: [{ severity: 'minor', description: 'Rain stoppage - 2 hours lost' }] },
  ],
  'GRV-003': [
    { dayOffset: 1, weather: 'Clear, 30°C', overallProgress: 78, workCompleted: 'Tower C–F Floor 12 slab poured (312 workers on site). STP 72-hour test run completed.', remarks: '750 KLD STP results within KSPCB norms. Concrete cube tests passed.', labourCount: 312, status: 'SUBMITTED', aiSummary: 'Excellent output: Floor 12 slab poured across four towers and the STP passed its commissioning test within regulatory norms.', labourDetails: { skilled: 138, unskilled: 162, supervisors: 12 }, materialsConsumed: [{ material: 'RMC M35', quantity: 410, unit: 'm³' }, { material: 'TMT Steel Fe550', quantity: 22, unit: 'MT' }], equipmentUsed: [{ name: 'Tower Crane', hours: 10 }, { name: 'Boom Placer', hours: 8 }], issues: [] },
    { dayOffset: 2, weather: 'Clear, 31°C', overallProgress: 77, workCompleted: 'Tower A & B - 240 units handed over to client for finishing. Podium landscaping started.', remarks: 'IGBC auditor inspection for Green Homes certification - provisionally passed.', labourCount: 298, status: 'SUBMITTED', aiSummary: 'Major milestone: 240 units handed over and a provisional pass on the IGBC green certification inspection.', labourDetails: { skilled: 130, unskilled: 156, supervisors: 12 }, materialsConsumed: [{ material: 'Vitrified Tiles', quantity: 2400, unit: 'm²' }], equipmentUsed: [{ name: 'Tower Crane', hours: 9 }, { name: 'Passenger Hoist', hours: 8 }], issues: [] },
    { dayOffset: 3, weather: 'Partly cloudy, 29°C', overallProgress: 77, workCompleted: 'Tower E scaffolding erected to Floor 13. Internal road kerb laying in Sector 2.', remarks: 'Tower E scaffold awaiting third-party clearance before Floor 13 pour can proceed.', labourCount: 305, status: 'SUBMITTED', aiSummary: 'Progress continues, though the Floor 13 pour on Tower E is gated on a pending third-party scaffold clearance.', labourDetails: { skilled: 134, unskilled: 159, supervisors: 12 }, materialsConsumed: [{ material: 'Scaffold Pipes', quantity: 180, unit: 'nos' }], equipmentUsed: [{ name: 'Tower Crane', hours: 9 }, { name: 'JCB', hours: 7 }], issues: [{ severity: 'medium', description: 'Tower E scaffold pending third-party clearance' }] },
  ],
  'GRV-004': [
    { dayOffset: 2, weather: 'Clear, 33°C', overallProgress: 22, workCompleted: 'All open excavations backfilled and barricaded per NHAI instruction. Equipment demobilised.', remarks: 'Site closure report submitted. Project on hold pending revised forest clearance from MoEFCC.', labourCount: 0, status: 'SUBMITTED', aiSummary: 'Site fully secured and demobilised under the NHAI stop-work notice; work remains paused until forest clearance is granted.', labourDetails: { skilled: 0, unskilled: 0, supervisors: 2 }, materialsConsumed: [], equipmentUsed: [{ name: 'Excavator', hours: 3 }], issues: [{ severity: 'high', description: 'Stop-work notice - pending forest clearance' }] },
  ],
};

async function seedDailyReports(orgId: string) {
  const reportCount = await prisma.dailyReport.count({ where: { organizationId: orgId } });
  if (reportCount > 0) {
    console.log('  → Daily reports already seeded, skipping');
    return;
  }

  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    select: { id: true, code: true },
  });
  const projectIdByCode = Object.fromEntries(projects.map((p) => [p.code, p.id]));

  // Reports are submitted by the site engineer; fall back to any org member.
  const engineer = await prisma.userOrganization.findFirst({
    where: { organizationId: orgId, role: 'SITE_ENGINEER' },
    select: { userId: true },
  });
  const anyMember = await prisma.userOrganization.findFirst({
    where: { organizationId: orgId },
    select: { userId: true },
  });
  const submittedById = engineer?.userId ?? anyMember?.userId;
  if (!submittedById) {
    console.log('  → No org members found, skipping daily reports');
    return;
  }

  let created = 0;
  for (const [code, reports] of Object.entries(DAILY_REPORTS)) {
    const projectId = projectIdByCode[code];
    if (!projectId) continue;

    for (const r of reports) {
      await prisma.dailyReport.create({
        data: {
          projectId,
          organizationId:   orgId,
          submittedById,
          date:             subDays(new Date(), r.dayOffset),
          weather:          r.weather,
          overallProgress:  r.overallProgress,
          workCompleted:    r.workCompleted,
          remarks:          r.remarks,
          labourCount:      r.labourCount,
          status:           r.status,
          submittedAt:      r.status === 'SUBMITTED' ? subDays(new Date(), r.dayOffset) : null,
          aiSummary:        r.aiSummary,
          labourDetails:    r.labourDetails,
          materialsConsumed: r.materialsConsumed,
          equipmentUsed:    r.equipmentUsed,
          issues:           r.issues,
          createdAt:        subDays(new Date(), r.dayOffset),
        },
      });
      created++;
    }
  }

  console.log(`  → Seeded ${created} daily reports`);
}

// ─── Notification Seed Data ──────────────────────────────────────────────────

type NotificationSeedEntry = {
  dayOffset: number;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  read: boolean;
  entityType: string;
};

const NOTIFICATIONS: NotificationSeedEntry[] = [
  { dayOffset: 0, type: 'SUCCESS', title: 'Daily report submitted',        message: 'Floor 4 slab pour completed at Whitefield IT Corridor - Block C. 148 workers on site.',        read: false, entityType: 'project' },
  { dayOffset: 0, type: 'WARNING', title: 'Material delay flagged',         message: 'Curtain wall aluminium sections delayed by supplier - 10-day impact expected on GRV-001.',       read: false, entityType: 'project' },
  { dayOffset: 1, type: 'SUCCESS', title: 'Purchase order approved',        message: 'PO-2024-089 approved - Structural steel 85MT from Tata Steel @ ₹68,000/MT.',                    read: false, entityType: 'purchase_order' },
  { dayOffset: 1, type: 'ERROR',   title: 'Certification expired',          message: 'Narendra Kumar’s Safety Induction Certificate expired 37 days ago - PPE non-compliance flagged.', read: false, entityType: 'worker' },
  { dayOffset: 2, type: 'INFO',    title: 'Handover certificate issued',    message: 'Tower A & B - 240 units handed over to Brigade Group for finishing works.',                      read: true,  entityType: 'project' },
  { dayOffset: 2, type: 'WARNING', title: 'Scaffold clearance required',    message: 'Tower E scaffolding requires third-party clearance before the Floor 13 pour on GRV-003.',        read: false, entityType: 'project' },
  { dayOffset: 3, type: 'SUCCESS', title: 'STP commissioning complete',     message: '750 KLD STP commissioned and test-run for 72 hours - results within KSPCB norms.',               read: true,  entityType: 'project' },
  { dayOffset: 4, type: 'ERROR',   title: 'Project placed on hold',         message: 'NHAI issued a stop-work notice on GRV-004 pending revised forest clearance from MoEFCC.',         read: true,  entityType: 'project' },
  { dayOffset: 5, type: 'INFO',    title: 'Safety audit completed',         message: 'Monthly safety audit at GRV-001: 0 critical findings, 3 minor observations raised and closed.',  read: true,  entityType: 'project' },
];

async function seedNotifications(orgId: string) {
  const notifCount = await prisma.notification.count({ where: { organizationId: orgId } });
  if (notifCount > 0) {
    console.log('  → Notifications already seeded, skipping');
    return;
  }

  const members = await prisma.userOrganization.findMany({
    where: { organizationId: orgId },
    select: { userId: true },
  });
  if (members.length === 0) {
    console.log('  → No org members found, skipping notifications');
    return;
  }

  for (let i = 0; i < NOTIFICATIONS.length; i++) {
    const n = NOTIFICATIONS[i];
    await prisma.notification.create({
      data: {
        type:           n.type,
        title:          n.title,
        message:        n.message,
        read:           n.read,
        entityType:     n.entityType,
        userId:         members[i % members.length].userId,
        organizationId: orgId,
        createdAt:      subDays(new Date(), n.dayOffset),
      },
    });
  }

  console.log(`  → Seeded ${NOTIFICATIONS.length} notifications`);
}

// ─── Materials Seed Data ─────────────────────────────────────────────────────

const MATERIAL_CATEGORIES = [
  { name: 'Steel & Rebar',      description: 'Structural steel, TMT bars and reinforcement.' },
  { name: 'Cement & Concrete',  description: 'Cement, ready-mix concrete and binders.' },
  { name: 'Aggregates',         description: 'Sand, stone and crushed aggregates.' },
  { name: 'Masonry',            description: 'Blocks, bricks and masonry units.' },
  { name: 'Wood',               description: 'Plywood, shuttering and timber.' },
  { name: 'Electrical',         description: 'Cables, conduits and electrical fittings.' },
  { name: 'Plumbing',           description: 'Pipes, fittings and sanitary items.' },
  { name: 'Finishes',           description: 'Tiles, paint and finishing materials.' },
  { name: 'Waterproofing',      description: 'Waterproofing compounds and membranes.' },
];

const MATERIAL_SUPPLIERS = [
  { name: 'Tata Steel',            contactName: 'Anil Kapoor',    email: 'sales@tatasteel.example',   phone: '+91 80 4100 2201', leadTimeDays: 10, rating: 4.7, onTimeRate: 94, openPurchaseOrders: 3, totalSpend: 41_800_000 },
  { name: 'UltraTech Cement',      contactName: 'Meera Iyer',     email: 'orders@ultratech.example',  phone: '+91 80 4100 2202', leadTimeDays: 5,  rating: 4.6, onTimeRate: 96, openPurchaseOrders: 2, totalSpend: 18_600_000 },
  { name: 'Bhagwati RMC',          contactName: 'Ravi Deshpande', email: 'dispatch@bhagwatirmc.example', phone: '+91 80 4100 2203', leadTimeDays: 1, rating: 4.3, onTimeRate: 88, openPurchaseOrders: 4, totalSpend: 22_400_000 },
  { name: 'Bengaluru Aggregates',  contactName: 'Suresh Gowda',   email: 'sales@blraggregates.example', phone: '+91 80 4100 2204', leadTimeDays: 3, rating: 4.0, onTimeRate: 82, openPurchaseOrders: 1, totalSpend: 9_300_000 },
  { name: 'Xtratech Blocks',       contactName: 'Farha Khan',     email: 'sales@xtratech.example',    phone: '+91 80 4100 2205', leadTimeDays: 6,  rating: 4.2, onTimeRate: 90, openPurchaseOrders: 0, totalSpend: 7_100_000 },
  { name: 'Century Plyboards',     contactName: 'Debashish Roy',  email: 'orders@centuryply.example', phone: '+91 80 4100 2206', leadTimeDays: 8,  rating: 4.5, onTimeRate: 91, openPurchaseOrders: 1, totalSpend: 5_600_000 },
  { name: 'Polycab Wires',         contactName: 'Nitin Shah',     email: 'sales@polycab.example',     phone: '+91 80 4100 2207', leadTimeDays: 7,  rating: 4.6, onTimeRate: 95, openPurchaseOrders: 2, totalSpend: 6_900_000 },
  { name: 'Supreme Pipes',         contactName: 'Kavya Menon',    email: 'orders@supreme.example',    phone: '+91 80 4100 2208', leadTimeDays: 9,  rating: 3.9, onTimeRate: 79, openPurchaseOrders: 1, totalSpend: 3_200_000 },
  { name: 'Kajaria Ceramics',      contactName: 'Rahul Bansal',   email: 'sales@kajaria.example',     phone: '+91 80 4100 2209', leadTimeDays: 12, rating: 4.4, onTimeRate: 89, openPurchaseOrders: 2, totalSpend: 8_400_000 },
  { name: 'Asian Paints',          contactName: 'Priya Rao',      email: 'orders@asianpaints.example', phone: '+91 80 4100 2210', leadTimeDays: 6, rating: 4.7, onTimeRate: 97, openPurchaseOrders: 1, totalSpend: 4_100_000 },
  { name: 'Pidilite (Dr. Fixit)',  contactName: 'Vivek Nair',     email: 'sales@drfixit.example',     phone: '+91 80 4100 2211', leadTimeDays: 5,  rating: 4.5, onTimeRate: 92, openPurchaseOrders: 0, totalSpend: 2_700_000 },
];

type MatMovementType = 'INBOUND' | 'OUTBOUND' | 'CONSUMPTION' | 'ADJUSTMENT' | 'TRANSFER';

type MaterialSeedEntry = {
  name: string; sku: string; unit: string; unitCost: number;
  quantity: number; reserved: number; incoming: number; minStock: number; maxStock: number;
  warehouse: string; category: string; supplier: string;
  specifications: Record<string, string>;
  projects: { code: string; allocated: number; consumed: number }[];
  movements: { type: MatMovementType; quantity: number; reference?: string; note?: string; projectCode?: string; dayOffset: number }[];
};

const MATERIALS: MaterialSeedEntry[] = [
  {
    name: 'TMT Steel Fe500D', sku: 'STL-TMT-500D-16', unit: 'MT', unitCost: 62000,
    quantity: 18, reserved: 12, incoming: 40, minStock: 25, maxStock: 200,
    warehouse: 'Central Store', category: 'Steel & Rebar', supplier: 'Tata Steel',
    specifications: { Grade: 'Fe500D', Diameter: '16mm', Standard: 'IS 1786:2008', Length: '12m' },
    projects: [{ code: 'GRV-001', allocated: 85, consumed: 47 }, { code: 'GRV-003', allocated: 120, consumed: 92 }],
    movements: [
      { type: 'INBOUND', quantity: 50, reference: 'PO-STL-0089', note: 'Received from Tata Steel', dayOffset: 30 },
      { type: 'CONSUMPTION', quantity: 22, projectCode: 'GRV-001', note: 'Floor 4 slab reinforcement', dayOffset: 5 },
      { type: 'OUTBOUND', quantity: 10, projectCode: 'GRV-003', note: 'Issued to Tower C', dayOffset: 1 },
    ],
  },
  {
    name: 'OPC Cement 53 Grade', sku: 'CEM-OPC-53', unit: 'Bags', unitCost: 410,
    quantity: 4200, reserved: 800, incoming: 2000, minStock: 1500, maxStock: 8000,
    warehouse: 'Central Store', category: 'Cement & Concrete', supplier: 'UltraTech Cement',
    specifications: { Grade: '53', Type: 'OPC', Standard: 'IS 12269', Weight: '50kg/bag' },
    projects: [{ code: 'GRV-001', allocated: 3000, consumed: 1850 }, { code: 'GRV-002', allocated: 1200, consumed: 640 }],
    movements: [
      { type: 'INBOUND', quantity: 5000, reference: 'PO-CEM-0142', dayOffset: 20 },
      { type: 'CONSUMPTION', quantity: 1500, projectCode: 'GRV-001', note: 'Column casting', dayOffset: 3 },
      { type: 'CONSUMPTION', quantity: 300, projectCode: 'GRV-002', note: 'Drain lining', dayOffset: 0 },
    ],
  },
  {
    name: 'River Sand', sku: 'AGG-SAND-RIV', unit: 'CFT', unitCost: 55,
    quantity: 900, reserved: 200, incoming: 0, minStock: 1000, maxStock: 6000,
    warehouse: 'Site Store - Whitefield', category: 'Aggregates', supplier: 'Bengaluru Aggregates',
    specifications: { Type: 'River Sand', Zone: 'Zone II', Standard: 'IS 383' },
    projects: [{ code: 'GRV-001', allocated: 2000, consumed: 1400 }],
    movements: [
      { type: 'INBOUND', quantity: 2500, reference: 'PO-AGG-0051', dayOffset: 18 },
      { type: 'CONSUMPTION', quantity: 600, projectCode: 'GRV-001', note: 'Plastering works', dayOffset: 2 },
    ],
  },
  {
    name: 'M20 Ready-Mix Concrete', sku: 'CON-RMC-M20', unit: 'Cu.m', unitCost: 5200,
    quantity: 320, reserved: 260, incoming: 80, minStock: 100, maxStock: 800,
    warehouse: 'Site Store - Sarjapur', category: 'Cement & Concrete', supplier: 'Bhagwati RMC',
    specifications: { Grade: 'M20', Slump: '100-125mm', Standard: 'IS 456' },
    projects: [{ code: 'GRV-003', allocated: 500, consumed: 410 }],
    movements: [
      { type: 'INBOUND', quantity: 400, reference: 'PO-RMC-0210', dayOffset: 12 },
      { type: 'CONSUMPTION', quantity: 140, projectCode: 'GRV-003', note: 'Tower C floor 12 slab', dayOffset: 1 },
      { type: 'ADJUSTMENT', quantity: -6, note: 'Wastage reconciliation', dayOffset: 4 },
    ],
  },
  {
    name: 'AAC Blocks 600x200x150', sku: 'MAS-AAC-150', unit: 'Nos', unitCost: 48,
    quantity: 62000, reserved: 5000, incoming: 0, minStock: 8000, maxStock: 40000,
    warehouse: 'Central Store', category: 'Masonry', supplier: 'Xtratech Blocks',
    specifications: { Size: '600x200x150mm', Density: '551-650 kg/m3', Standard: 'IS 2185 Part 3' },
    projects: [{ code: 'GRV-003', allocated: 40000, consumed: 21000 }],
    movements: [
      { type: 'INBOUND', quantity: 70000, reference: 'PO-AAC-0033', note: 'Bulk order - overstocked', dayOffset: 22 },
      { type: 'CONSUMPTION', quantity: 8000, projectCode: 'GRV-003', note: 'Internal walls', dayOffset: 6 },
    ],
  },
  {
    name: 'Fly Ash Bricks', sku: 'MAS-FAB-STD', unit: 'Nos', unitCost: 7.5,
    quantity: 150000, reserved: 20000, incoming: 0, minStock: 30000, maxStock: 250000,
    warehouse: 'Site Store - Whitefield', category: 'Masonry', supplier: 'Xtratech Blocks',
    specifications: { Size: '230x110x75mm', Strength: '7.5 N/mm2', Standard: 'IS 12894' },
    projects: [{ code: 'GRV-001', allocated: 90000, consumed: 61000 }],
    movements: [
      { type: 'INBOUND', quantity: 200000, reference: 'PO-FAB-0077', dayOffset: 25 },
      { type: 'CONSUMPTION', quantity: 15000, projectCode: 'GRV-001', note: 'Partition walls', dayOffset: 3 },
    ],
  },
  {
    name: 'Aggregate 20mm', sku: 'AGG-STONE-20', unit: 'CFT', unitCost: 48,
    quantity: 5200, reserved: 400, incoming: 0, minStock: 1500, maxStock: 5000,
    warehouse: 'Site Store - Whitefield', category: 'Aggregates', supplier: 'Bengaluru Aggregates',
    specifications: { Size: '20mm', Type: 'Crushed Stone', Standard: 'IS 383' },
    projects: [{ code: 'GRV-002', allocated: 3000, consumed: 1200 }],
    movements: [
      { type: 'INBOUND', quantity: 6000, reference: 'PO-AGG-0061', note: 'Overstocked - excess order', dayOffset: 15 },
      { type: 'CONSUMPTION', quantity: 800, projectCode: 'GRV-002', dayOffset: 4 },
    ],
  },
  {
    name: 'Plywood 18mm Shuttering', sku: 'WD-PLY-18', unit: 'Sheets', unitCost: 2100,
    quantity: 480, reserved: 60, incoming: 200, minStock: 150, maxStock: 1200,
    warehouse: 'Central Store', category: 'Wood', supplier: 'Century Plyboards',
    specifications: { Thickness: '18mm', Size: '8x4 ft', Type: 'Film Faced Shuttering' },
    projects: [{ code: 'GRV-001', allocated: 400, consumed: 260 }, { code: 'GRV-003', allocated: 300, consumed: 180 }],
    movements: [
      { type: 'INBOUND', quantity: 600, reference: 'PO-WD-0044', dayOffset: 28 },
      { type: 'CONSUMPTION', quantity: 120, projectCode: 'GRV-001', note: 'Slab shuttering', dayOffset: 2 },
    ],
  },
  {
    name: 'Electrical Cable 4 sq.mm', sku: 'ELE-CBL-4', unit: 'Mtr', unitCost: 62,
    quantity: 8000, reserved: 1500, incoming: 5000, minStock: 3000, maxStock: 20000,
    warehouse: 'Central Store', category: 'Electrical', supplier: 'Polycab Wires',
    specifications: { Size: '4 sq.mm', Type: 'FR PVC', Cores: 'Single', Standard: 'IS 694' },
    projects: [{ code: 'GRV-001', allocated: 6000, consumed: 3200 }],
    movements: [
      { type: 'INBOUND', quantity: 10000, reference: 'PO-ELE-0091', dayOffset: 16 },
      { type: 'CONSUMPTION', quantity: 1800, projectCode: 'GRV-001', note: 'Floors 11-13 conduit wiring', dayOffset: 2 },
    ],
  },
  {
    name: 'PVC Pipe 110mm', sku: 'PLB-PVC-110', unit: 'Mtr', unitCost: 340,
    quantity: 260, reserved: 40, incoming: 0, minStock: 300, maxStock: 2000,
    warehouse: 'Site Store - Sarjapur', category: 'Plumbing', supplier: 'Supreme Pipes',
    specifications: { Diameter: '110mm', Class: '4 kg/cm2', Type: 'SWR', Standard: 'IS 13592' },
    projects: [{ code: 'GRV-003', allocated: 600, consumed: 340 }],
    movements: [
      { type: 'INBOUND', quantity: 800, reference: 'PO-PLB-0022', dayOffset: 21 },
      { type: 'CONSUMPTION', quantity: 220, projectCode: 'GRV-003', note: 'Drainage stack', dayOffset: 5 },
    ],
  },
  {
    name: 'Vitrified Tiles 600x600', sku: 'FIN-TIL-600', unit: 'Boxes', unitCost: 720,
    quantity: 1400, reserved: 200, incoming: 300, minStock: 400, maxStock: 5000,
    warehouse: 'Central Store', category: 'Finishes', supplier: 'Kajaria Ceramics',
    specifications: { Size: '600x600mm', Finish: 'Glazed Vitrified', Coverage: '4 sqm/box' },
    projects: [{ code: 'GRV-003', allocated: 1200, consumed: 700 }],
    movements: [
      { type: 'INBOUND', quantity: 2000, reference: 'PO-FIN-0130', dayOffset: 19 },
      { type: 'CONSUMPTION', quantity: 300, projectCode: 'GRV-003', note: 'Tower A flooring', dayOffset: 6 },
    ],
  },
  {
    name: 'Emulsion Paint (Interior)', sku: 'FIN-PNT-EMU', unit: 'Ltr', unitCost: 280,
    quantity: 0, reserved: 0, incoming: 400, minStock: 200, maxStock: 3000,
    warehouse: 'Central Store', category: 'Finishes', supplier: 'Asian Paints',
    specifications: { Type: 'Acrylic Emulsion', Finish: 'Matt', Coverage: '140 sqft/ltr' },
    projects: [{ code: 'GRV-001', allocated: 800, consumed: 800 }],
    movements: [
      { type: 'INBOUND', quantity: 800, reference: 'PO-FIN-0101', dayOffset: 40 },
      { type: 'CONSUMPTION', quantity: 800, projectCode: 'GRV-001', note: 'Fully consumed - reorder raised', dayOffset: 4 },
    ],
  },
  {
    name: 'Waterproofing Compound', sku: 'WP-CMP-2K', unit: 'Kg', unitCost: 190,
    quantity: 180, reserved: 120, incoming: 0, minStock: 250, maxStock: 1500,
    warehouse: 'Site Store - Whitefield', category: 'Waterproofing', supplier: 'Pidilite (Dr. Fixit)',
    specifications: { Type: '2K Acrylic', Application: 'Terrace & Wet Areas', Coverage: '1.5 kg/sqm' },
    projects: [{ code: 'GRV-001', allocated: 400, consumed: 220 }],
    movements: [
      { type: 'INBOUND', quantity: 500, reference: 'PO-WP-0018', dayOffset: 24 },
      { type: 'CONSUMPTION', quantity: 200, projectCode: 'GRV-001', note: 'Terrace waterproofing', dayOffset: 3 },
      { type: 'OUTBOUND', quantity: 120, projectCode: 'GRV-001', note: 'Reserved for wet-area works', dayOffset: 1 },
    ],
  },
];

async function seedMaterials(orgId: string) {
  const count = await prisma.material.count({ where: { organizationId: orgId } });
  if (count > 0) {
    console.log('  → Materials already seeded, skipping');
    return;
  }

  const catByName: Record<string, string> = {};
  for (const c of MATERIAL_CATEGORIES) {
    const cat = await prisma.materialCategory.upsert({
      where: { name_organizationId: { name: c.name, organizationId: orgId } },
      create: { name: c.name, description: c.description, organizationId: orgId },
      update: {},
    });
    catByName[c.name] = cat.id;
  }

  const supByName: Record<string, string> = {};
  for (const s of MATERIAL_SUPPLIERS) {
    const sup = await prisma.materialSupplier.create({ data: { ...s, organizationId: orgId } });
    supByName[s.name] = sup.id;
  }

  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    select: { id: true, code: true },
  });
  const projIdByCode: Record<string, string> = Object.fromEntries(projects.map((p) => [p.code, p.id]));

  for (const m of MATERIALS) {
    const material = await prisma.material.create({
      data: {
        name: m.name, sku: m.sku, unit: m.unit, unitCost: m.unitCost,
        quantity: m.quantity, reserved: m.reserved, incoming: m.incoming,
        minStock: m.minStock, maxStock: m.maxStock, warehouse: m.warehouse,
        specifications: m.specifications,
        categoryId: catByName[m.category], supplierId: supByName[m.supplier],
        organizationId: orgId,
      },
    });

    for (const u of m.projects) {
      const projectId = projIdByCode[u.code];
      if (!projectId) continue;
      await prisma.materialProjectUsage.create({
        data: { materialId: material.id, projectId, allocated: u.allocated, consumed: u.consumed, organizationId: orgId },
      });
    }

    for (const mv of m.movements) {
      await prisma.materialMovement.create({
        data: {
          materialId: material.id,
          type: mv.type,
          quantity: mv.quantity,
          reference: mv.reference ?? null,
          note: mv.note ?? null,
          projectId: mv.projectCode ? projIdByCode[mv.projectCode] ?? null : null,
          organizationId: orgId,
          occurredAt: subDays(new Date(), mv.dayOffset),
        },
      });
    }
  }

  console.log(`  → Seeded ${MATERIALS.length} materials, ${MATERIAL_CATEGORIES.length} categories, ${MATERIAL_SUPPLIERS.length} suppliers`);
}

// ─── Procurement Seed Data ──────────────────────────────────────────────────
// Day offsets are relative to today: negative is in the past, positive in the future.

const PROCUREMENT_REQUESTER_EMAIL = 'divya.n@grovyn.com';
const PROCUREMENT_APPROVER_EMAIL = 'suresh.b@grovyn.com';

const SITE_ADDRESSES: Record<string, string> = {
  'GRV-001': 'Whitefield IT Corridor Site, Block C Stores, Bengaluru 560066',
  'GRV-002': 'BBMP Zone 4 Yard, Indiranagar, Bengaluru 560038',
  'GRV-003': 'Sarjapur Smart Township, Central Stores, Bengaluru 562125',
};

type VendorSeed = {
  name: string; code: string; categories: string[]; status: VendorStatus; rating: number;
  performanceScore: number; deliveryAccuracy: number; qualityRating: number; responseTimeHours: number;
  contactPerson: string; phone: string; email: string; gstNumber: string;
  paymentTerms: string; city: string; state: string; aiRecommendation: string;
};

const VENDORS: VendorSeed[] = [
  { name: 'Tata Steel Ltd', code: 'VN-STL-01', categories: ['Steel', 'Equipment'], status: 'ACTIVE', rating: 4.7, performanceScore: 92, deliveryAccuracy: 96, qualityRating: 4.8, responseTimeHours: 6, contactPerson: 'Anil Bhaskar', phone: '+91 98450 11001', email: 'anil.bhaskar@tatasteel.com', gstNumber: '29AAACT2803M1ZK', paymentTerms: 'Net 45', city: 'Bengaluru', state: 'Karnataka', aiRecommendation: 'Preferred for structural steel — consistently on-time with premium quality.' },
  { name: 'UltraTech Cement', code: 'VN-CON-02', categories: ['Concrete'], status: 'ACTIVE', rating: 4.5, performanceScore: 88, deliveryAccuracy: 93, qualityRating: 4.6, responseTimeHours: 8, contactPerson: 'Reena Kapoor', phone: '+91 98450 11002', email: 'reena.k@ultratech.com', gstNumber: '27AAACL6442L1ZM', paymentTerms: 'Net 30', city: 'Mumbai', state: 'Maharashtra', aiRecommendation: 'Reliable RMC supplier; negotiate bulk pricing for Q3 pours.' },
  { name: 'Havells India', code: 'VN-ELE-03', categories: ['Electrical'], status: 'ACTIVE', rating: 4.3, performanceScore: 84, deliveryAccuracy: 91, qualityRating: 4.4, responseTimeHours: 10, contactPerson: 'Karthik Iyer', phone: '+91 98450 11003', email: 'karthik.iyer@havells.com', gstNumber: '06AAACH0553P1Z8', paymentTerms: 'Net 30', city: 'Chennai', state: 'Tamil Nadu', aiRecommendation: 'Good for switchgear; watch lead times during festive season.' },
  { name: 'Blue Star Ltd', code: 'VN-HVAC-04', categories: ['HVAC', 'Mechanical'], status: 'ACTIVE', rating: 4.1, performanceScore: 79, deliveryAccuracy: 88, qualityRating: 4.2, responseTimeHours: 14, contactPerson: 'Deepa Menon', phone: '+91 98450 11004', email: 'deepa.menon@bluestar.com', gstNumber: '27AAACB1234F1Z5', paymentTerms: 'Net 60', city: 'Pune', state: 'Maharashtra', aiRecommendation: 'Competitive on VRF systems; obtain firm delivery commitment before ordering.' },
  { name: 'Asian Paints', code: 'VN-PNT-05', categories: ['Paint', 'Tiles'], status: 'ACTIVE', rating: 4.6, performanceScore: 90, deliveryAccuracy: 95, qualityRating: 4.7, responseTimeHours: 5, contactPerson: 'Sanjay Rao', phone: '+91 98450 11005', email: 'sanjay.rao@asianpaints.com', gstNumber: '27AAACA6666G1ZN', paymentTerms: 'Net 30', city: 'Bengaluru', state: 'Karnataka', aiRecommendation: 'Top-rated finish quality; ideal for premium residential handover works.' },
  { name: 'Kirloskar Equipments', code: 'VN-EQP-06', categories: ['Equipment', 'Mechanical'], status: 'INACTIVE', rating: 3.4, performanceScore: 61, deliveryAccuracy: 74, qualityRating: 3.6, responseTimeHours: 22, contactPerson: 'Mahesh Kulkarni', phone: '+91 98450 11006', email: 'mahesh.k@kirloskar.com', gstNumber: '27AAACK5000H1ZP', paymentTerms: 'Advance 50%', city: 'Pune', state: 'Maharashtra', aiRecommendation: 'Under review — recent delays; request performance improvement plan before re-engaging.' },
  { name: 'Kajaria Ceramics', code: 'VN-TIL-07', categories: ['Tiles'], status: 'ACTIVE', rating: 4.4, performanceScore: 86, deliveryAccuracy: 92, qualityRating: 4.5, responseTimeHours: 9, contactPerson: 'Neha Saxena', phone: '+91 98450 11007', email: 'neha.saxena@kajaria.com', gstNumber: '09AAACK1234M1ZQ', paymentTerms: 'Net 30', city: 'Bengaluru', state: 'Karnataka', aiRecommendation: '' },
  { name: 'JCB India', code: 'VN-EQP-08', categories: ['Equipment'], status: 'ACTIVE', rating: 4.2, performanceScore: 83, deliveryAccuracy: 90, qualityRating: 4.3, responseTimeHours: 12, contactPerson: 'Arvind Pillai', phone: '+91 98450 11008', email: 'arvind.pillai@jcb.com', gstNumber: '06AAACJ2345K1ZT', paymentTerms: 'Net 15', city: 'Bengaluru', state: 'Karnataka', aiRecommendation: '' },
];

type PoItemSeed = { description: string; unit: string; quantity: number; rate: number; taxPercent: number; discountPercent: number };
type ReceiptSeed = { receivedOn: number; scheduledOn: number; quantities: number[]; trackingId?: string };
type OpenDeliverySeed = { status: 'SCHEDULED' | 'IN_TRANSIT'; scheduledOn: number; trackingId: string };
type PoSeed = {
  vendorCode: string; projectCode: string; category: string; priority: ProcurementPriority;
  status: PurchaseOrderStatus; requestedOn: number; expectedOn: number; notes: string;
  reviewedOn?: number; reviewNote?: string; items: PoItemSeed[];
  receipts?: ReceiptSeed[]; openDelivery?: OpenDeliverySeed;
};

/** Listed oldest first so PO and GRN numbers follow the calendar. */
const PURCHASE_ORDERS: PoSeed[] = [
  { vendorCode: 'VN-STL-01', projectCode: 'GRV-002', category: 'Steel', priority: 'HIGH', status: 'APPROVED', requestedOn: -150, reviewedOn: -148, expectedOn: -135, notes: 'Reinforcement for drainage culverts, package 1.', items: [
    { description: 'TMT Steel Bars Fe500D 12mm', unit: 'MT', quantity: 18, rate: 66500, taxPercent: 18, discountPercent: 2 },
    { description: 'Binding Wire 18 SWG', unit: 'kg', quantity: 450, rate: 78, taxPercent: 18, discountPercent: 0 },
  ], receipts: [{ receivedOn: -136, scheduledOn: -135, quantities: [18, 450], trackingId: 'TRK-STL-7720' }] },
  { vendorCode: 'VN-CON-02', projectCode: 'GRV-001', category: 'Concrete', priority: 'HIGH', status: 'APPROVED', requestedOn: -110, reviewedOn: -109, expectedOn: -100, notes: 'Podium slab pour.', items: [
    { description: 'Ready Mix Concrete M30', unit: 'cum', quantity: 160, rate: 6100, taxPercent: 18, discountPercent: 3 },
    { description: 'OPC 53 Grade Cement', unit: 'bag', quantity: 600, rate: 410, taxPercent: 28, discountPercent: 0 },
  ], receipts: [{ receivedOn: -98, scheduledOn: -100, quantities: [160, 600] }] },
  { vendorCode: 'VN-EQP-06', projectCode: 'GRV-002', category: 'Equipment', priority: 'MEDIUM', status: 'APPROVED', requestedOn: -95, reviewedOn: -93, expectedOn: -80, notes: 'Dewatering for manhole chambers.', items: [
    { description: 'Dewatering Pump 10 HP', unit: 'nos', quantity: 4, rate: 68000, taxPercent: 18, discountPercent: 0 },
    { description: 'Suction Hose 100mm', unit: 'm', quantity: 120, rate: 450, taxPercent: 18, discountPercent: 0 },
  ], receipts: [{ receivedOn: -75, scheduledOn: -80, quantities: [4, 120] }] },
  { vendorCode: 'VN-ELE-03', projectCode: 'GRV-003', category: 'Electrical', priority: 'MEDIUM', status: 'APPROVED', requestedOn: -75, reviewedOn: -73, expectedOn: -60, notes: 'Tower A & B rising mains.', items: [
    { description: 'XLPE Armoured Cable 4C x 70sqmm', unit: 'm', quantity: 650, rate: 540, taxPercent: 18, discountPercent: 4 },
    { description: 'MCB Distribution Board 8-Way', unit: 'nos', quantity: 24, rate: 3400, taxPercent: 18, discountPercent: 0 },
  ], receipts: [{ receivedOn: -60, scheduledOn: -60, quantities: [650, 24] }] },
  { vendorCode: 'VN-CON-02', projectCode: 'GRV-003', category: 'Concrete', priority: 'HIGH', status: 'APPROVED', requestedOn: -50, reviewedOn: -49, expectedOn: -42, notes: 'Tower C raft.', items: [
    { description: 'Ready Mix Concrete M25', unit: 'cum', quantity: 240, rate: 5800, taxPercent: 18, discountPercent: 3 },
  ], receipts: [{ receivedOn: -42, scheduledOn: -42, quantities: [240] }] },
  { vendorCode: 'VN-STL-01', projectCode: 'GRV-001', category: 'Steel', priority: 'HIGH', status: 'APPROVED', requestedOn: -40, reviewedOn: -38, expectedOn: -20, notes: 'Structural steel for floors 5-6.', items: [
    { description: 'TMT Steel Bars Fe500D 16mm', unit: 'MT', quantity: 45, rate: 68000, taxPercent: 18, discountPercent: 2 },
    { description: 'TMT Steel Bars Fe500D 20mm', unit: 'MT', quantity: 30, rate: 67500, taxPercent: 18, discountPercent: 2 },
    { description: 'MS Structural Angles', unit: 'MT', quantity: 8, rate: 62000, taxPercent: 18, discountPercent: 0 },
  ], receipts: [{ receivedOn: -21, scheduledOn: -20, quantities: [45, 30, 8], trackingId: 'TRK-STL-8891' }] },
  { vendorCode: 'VN-PNT-05', projectCode: 'GRV-003', category: 'Paint', priority: 'LOW', status: 'APPROVED', requestedOn: -20, reviewedOn: -19, expectedOn: -10, notes: 'Tower A & B interior finishing.', items: [
    { description: 'Premium Emulsion Paint (Interior)', unit: 'ltr', quantity: 1200, rate: 285, taxPercent: 18, discountPercent: 8 },
    { description: 'Wall Primer', unit: 'ltr', quantity: 600, rate: 180, taxPercent: 18, discountPercent: 8 },
  ], receipts: [{ receivedOn: -9, scheduledOn: -10, quantities: [1200, 600], trackingId: 'TRK-PNT-2210' }] },
  { vendorCode: 'VN-STL-01', projectCode: 'GRV-002', category: 'Steel', priority: 'CRITICAL', status: 'APPROVED', requestedOn: -14, reviewedOn: -12, expectedOn: -2, notes: 'Manhole cover frames — urgent, roads reopen next week.', items: [
    { description: 'Cast Iron Manhole Cover Heavy Duty', unit: 'nos', quantity: 120, rate: 4200, taxPercent: 18, discountPercent: 0 },
    { description: 'MS Grating Panels', unit: 'sqm', quantity: 60, rate: 3800, taxPercent: 18, discountPercent: 0 },
  ], receipts: [{ receivedOn: -3, scheduledOn: -4, quantities: [60, 0] }], openDelivery: { status: 'SCHEDULED', scheduledOn: -1, trackingId: 'TRK-STL-9002' } },
  { vendorCode: 'VN-HVAC-04', projectCode: 'GRV-003', category: 'HVAC', priority: 'MEDIUM', status: 'CHANGES_REQUESTED', requestedOn: -8, reviewedOn: -6, reviewNote: 'Indoor unit count should be 16 per the revised clubhouse layout. Update the BOQ and resubmit.', expectedOn: 20, notes: 'Clubhouse VRF system.', items: [
    { description: 'VRF Outdoor Unit 16HP', unit: 'nos', quantity: 4, rate: 340000, taxPercent: 18, discountPercent: 0 },
    { description: 'VRF Indoor Cassette Unit', unit: 'nos', quantity: 18, rate: 42000, taxPercent: 18, discountPercent: 2 },
    { description: 'Refrigerant Copper Piping Kit', unit: 'set', quantity: 18, rate: 8500, taxPercent: 18, discountPercent: 0 },
  ] },
  { vendorCode: 'VN-CON-02', projectCode: 'GRV-003', category: 'Concrete', priority: 'HIGH', status: 'APPROVED', requestedOn: -6, reviewedOn: -5, expectedOn: 4, notes: 'M30 RMC for Tower C slab.', items: [
    { description: 'Ready Mix Concrete M30', unit: 'cum', quantity: 220, rate: 6200, taxPercent: 18, discountPercent: 3 },
    { description: 'Ready Mix Concrete M25', unit: 'cum', quantity: 90, rate: 5800, taxPercent: 18, discountPercent: 3 },
  ], openDelivery: { status: 'IN_TRANSIT', scheduledOn: 2, trackingId: 'TRK-CON-4420' } },
  { vendorCode: 'VN-ELE-03', projectCode: 'GRV-001', category: 'Electrical', priority: 'MEDIUM', status: 'PENDING', requestedOn: -5, expectedOn: 10, notes: 'Main LT panel and cabling.', items: [
    { description: 'LT Distribution Panel 630A', unit: 'nos', quantity: 2, rate: 185000, taxPercent: 18, discountPercent: 0 },
    { description: 'XLPE Armoured Cable 4C x 95sqmm', unit: 'm', quantity: 800, rate: 620, taxPercent: 18, discountPercent: 5 },
  ] },
  { vendorCode: 'VN-ELE-03', projectCode: 'GRV-002', category: 'Electrical', priority: 'LOW', status: 'REJECTED', requestedOn: -2, reviewedOn: -1, reviewNote: 'Over budget for this package. Re-quote with an alternative sensor vendor.', expectedOn: 12, notes: 'Flow sensor wiring.', items: [
    { description: 'Smart Flow Sensor IP68', unit: 'nos', quantity: 24, rate: 28500, taxPercent: 18, discountPercent: 0 },
    { description: 'Signal Cable Shielded', unit: 'm', quantity: 1500, rate: 95, taxPercent: 18, discountPercent: 0 },
  ] },
  { vendorCode: 'VN-CON-02', projectCode: 'GRV-001', category: 'Concrete', priority: 'MEDIUM', status: 'PENDING', requestedOn: -1, expectedOn: 6, notes: 'Basement raft pour.', items: [
    { description: 'Ready Mix Concrete M35', unit: 'cum', quantity: 180, rate: 6600, taxPercent: 18, discountPercent: 2 },
    { description: 'Waterproofing Admixture', unit: 'ltr', quantity: 400, rate: 220, taxPercent: 18, discountPercent: 0 },
  ] },
];

type QuoteSeed = { vendorCode: string; status: RfqInvitationStatus; respondedOn?: number; leadTimeDays?: number; taxPercent?: number; rates?: number[] };
type RfqSeed = {
  projectCode: string; title: string; description: string; category: string; priority: ProcurementPriority;
  status: RfqStatus; issuedOn: number; closingOn: number; estimatedValue: number;
  items: { description: string; unit: string; quantity: number }[];
  invitations: QuoteSeed[];
  /** Awarding raises a draft purchase order for this vendor's quote. */
  awardTo?: string;
};

const RFQS: RfqSeed[] = [
  { projectCode: 'GRV-001', title: 'Curtain Wall Aluminium Glazing', description: 'Unitised double-glazed façade for Block C, levels 1-6.', category: 'Mechanical', priority: 'HIGH', status: 'EVALUATING', issuedOn: -10, closingOn: -1, estimatedValue: 8_500_000,
    items: [{ description: 'Double-glazed unitised panel', unit: 'sqm', quantity: 1200 }, { description: 'Aluminium mullion & transom', unit: 'm', quantity: 3200 }],
    invitations: [
      { vendorCode: 'VN-HVAC-04', status: 'QUOTED', respondedOn: -4, leadTimeDays: 45, taxPercent: 18, rates: [4200, 780] },
      { vendorCode: 'VN-STL-01', status: 'QUOTED', respondedOn: -3, leadTimeDays: 60, taxPercent: 18, rates: [4450, 720] },
      { vendorCode: 'VN-ELE-03', status: 'DECLINED', respondedOn: -6 },
    ] },
  { projectCode: 'GRV-003', title: 'Vitrified Floor Tiles Supply', description: 'Tower A & B apartment flooring.', category: 'Tiles', priority: 'MEDIUM', status: 'AWARDED', issuedOn: -12, closingOn: -4, estimatedValue: 3_200_000,
    items: [{ description: 'Vitrified tiles 800x800', unit: 'sqm', quantity: 4200 }, { description: 'Tile adhesive', unit: 'bag', quantity: 1400 }],
    invitations: [
      { vendorCode: 'VN-TIL-07', status: 'QUOTED', respondedOn: -6, leadTimeDays: 18, taxPercent: 18, rates: [640, 410] },
      { vendorCode: 'VN-PNT-05', status: 'QUOTED', respondedOn: -5, leadTimeDays: 25, taxPercent: 18, rates: [655, 395] },
    ],
    awardTo: 'VN-TIL-07' },
  { projectCode: 'GRV-002', title: 'De-silting Machinery Rental', description: 'Super-sucker and jetting machines for 30 working days.', category: 'Equipment', priority: 'CRITICAL', status: 'OPEN', issuedOn: -2, closingOn: 5, estimatedValue: 1_800_000,
    items: [{ description: 'Super-sucker machine rental', unit: 'day', quantity: 30 }, { description: 'Jetting machine rental', unit: 'day', quantity: 30 }],
    invitations: [
      { vendorCode: 'VN-EQP-08', status: 'QUOTED', respondedOn: -1, leadTimeDays: 3, taxPercent: 18, rates: [28000, 16500] },
      { vendorCode: 'VN-STL-01', status: 'INVITED' },
    ] },
  { projectCode: 'GRV-003', title: 'Rooftop Solar PV — 240 kWp', description: 'Clubhouse and amenity block rooftop plant.', category: 'Electrical', priority: 'HIGH', status: 'OPEN', issuedOn: -4, closingOn: 1, estimatedValue: 7_500_000,
    items: [{ description: 'Mono PERC module 545Wp', unit: 'nos', quantity: 440 }, { description: 'String inverter 80kW', unit: 'nos', quantity: 3 }],
    invitations: [
      { vendorCode: 'VN-ELE-03', status: 'QUOTED', respondedOn: -1, leadTimeDays: 30, taxPercent: 12, rates: [14500, 210000] },
      { vendorCode: 'VN-STL-01', status: 'INVITED' },
      { vendorCode: 'VN-HVAC-04', status: 'DECLINED', respondedOn: -2 },
    ] },
];

function dayOffset(days: number): Date {
  return addDays(new Date(), days);
}

function calendarDay(days: number): Date {
  return startOfUtcDay(addDays(new Date(), days));
}

function docNumber(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(4, '0')}`;
}

type TimelineSeed = { stage: string; actor: string; date: Date; note: string };

const REVIEW_STAGES: Partial<Record<PurchaseOrderStatus, string>> = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CHANGES_REQUESTED: 'Changes Requested',
};

function poTimeline(po: PoSeed, requester: string, approver: string, receiptNumbers: string[]): TimelineSeed[] {
  const events: TimelineSeed[] = [{ stage: 'Created', actor: requester, date: dayOffset(po.requestedOn), note: '' }];
  if (po.status !== 'DRAFT') events.push({ stage: 'Submitted', actor: requester, date: dayOffset(po.requestedOn), note: '' });
  const reviewStage = REVIEW_STAGES[po.status];
  if (po.reviewedOn !== undefined && reviewStage) {
    events.push({ stage: reviewStage, actor: approver, date: dayOffset(po.reviewedOn), note: po.reviewNote ?? '' });
  }
  po.receipts?.forEach((receipt, index) => {
    const lines = receipt.quantities.filter((quantity) => quantity > 0).length;
    events.push({ stage: 'Goods Received', actor: requester, date: dayOffset(receipt.receivedOn), note: `${receiptNumbers[index]} · ${lines} line${lines === 1 ? '' : 's'}` });
  });
  if (po.openDelivery && po.reviewedOn !== undefined) {
    events.push({ stage: 'Delivery Scheduled', actor: requester, date: dayOffset(po.reviewedOn + 1), note: `Tracking ${po.openDelivery.trackingId}` });
  }
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

async function findMemberId(orgId: string, email: string): Promise<string | null> {
  const membership = await prisma.userOrganization.findFirst({
    where: { organizationId: orgId, user: { email } },
    select: { userId: true },
  });
  return membership?.userId ?? null;
}

async function seedProcurement(orgId: string) {
  const count = await prisma.vendor.count({ where: { organizationId: orgId } });
  if (count > 0) {
    console.log('  → Procurement already seeded, skipping');
    return;
  }

  const vendorIdByCode: Record<string, string> = {};
  for (const v of VENDORS) {
    const vendor = await prisma.vendor.create({ data: { ...v, aiRecommendation: v.aiRecommendation || null, organizationId: orgId } });
    vendorIdByCode[v.code] = vendor.id;
  }

  const projects = await prisma.project.findMany({ where: { organizationId: orgId }, select: { id: true, code: true } });
  const projIdByCode: Record<string, string> = Object.fromEntries(projects.map((p) => [p.code, p.id]));
  const requesterId = await findMemberId(orgId, PROCUREMENT_REQUESTER_EMAIL);
  const approverId = await findMemberId(orgId, PROCUREMENT_APPROVER_EMAIL);
  const requester = TEAM_MEMBERS.find((member) => member.email === PROCUREMENT_REQUESTER_EMAIL)?.name ?? 'Procurement';
  const approver = TEAM_MEMBERS.find((member) => member.email === PROCUREMENT_APPROVER_EMAIL)?.name ?? 'Finance';

  let grnCount = 0;
  for (const [index, po] of PURCHASE_ORDERS.entries()) {
    const receiptNumbers = (po.receipts ?? []).map(() => docNumber('GRN', ++grnCount));
    const received = po.items.map((_, line) => (po.receipts ?? []).reduce((sum, receipt) => sum + (receipt.quantities[line] ?? 0), 0));
    const isReviewed = po.reviewedOn !== undefined;

    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber: docNumber('PO', index + 1),
        category: po.category,
        status: po.status,
        priority: po.priority,
        requestedDate: dayOffset(po.requestedOn),
        expectedDelivery: calendarDay(po.expectedOn),
        amount: orderTotal(po.items),
        deliveryAddress: SITE_ADDRESSES[po.projectCode] ?? '',
        notes: po.notes,
        submittedAt: po.status === 'DRAFT' ? null : dayOffset(po.requestedOn),
        reviewedAt: isReviewed ? dayOffset(po.reviewedOn ?? 0) : null,
        reviewNote: po.reviewNote ?? null,
        requestedById: requesterId,
        reviewedById: isReviewed ? approverId : null,
        projectId: projIdByCode[po.projectCode] ?? null,
        vendorId: vendorIdByCode[po.vendorCode] ?? null,
        organizationId: orgId,
        items: {
          create: po.items.map((item, line) => ({ ...item, category: po.category, receivedQuantity: received[line], sortOrder: line })),
        },
        timeline: {
          create: poTimeline(po, requester, approver, receiptNumbers).map((event, position) => ({ ...event, sortOrder: position })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    for (const [receiptIndex, receipt] of (po.receipts ?? []).entries()) {
      await prisma.delivery.create({
        data: {
          grnNumber: receiptNumbers[receiptIndex],
          purchaseOrderId: order.id,
          status: 'RECEIVED',
          scheduledDate: calendarDay(receipt.scheduledOn),
          receivedAt: dayOffset(receipt.receivedOn),
          trackingId: receipt.trackingId ?? null,
          receivedById: requesterId,
          organizationId: orgId,
          items: {
            create: receipt.quantities
              .map((quantity, line) => ({ poLineItemId: order.items[line].id, quantity }))
              .filter((item) => item.quantity > 0),
          },
        },
      });
    }

    if (po.openDelivery) {
      await prisma.delivery.create({
        data: {
          purchaseOrderId: order.id,
          status: po.openDelivery.status,
          scheduledDate: calendarDay(po.openDelivery.scheduledOn),
          trackingId: po.openDelivery.trackingId,
          organizationId: orgId,
        },
      });
    }
  }

  let poCount = PURCHASE_ORDERS.length;
  for (const [index, r] of RFQS.entries()) {
    const rfq = await prisma.rfq.create({
      data: {
        rfqNumber: docNumber('RFQ', index + 1),
        title: r.title,
        description: r.description,
        category: r.category,
        status: r.status,
        priority: r.priority,
        issuedDate: dayOffset(r.issuedOn),
        closingDate: calendarDay(r.closingOn),
        estimatedValue: r.estimatedValue,
        createdById: requesterId,
        projectId: projIdByCode[r.projectCode] ?? null,
        organizationId: orgId,
        items: { create: r.items.map((item, position) => ({ ...item, sortOrder: position })) },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    for (const invitation of r.invitations) {
      const rates = invitation.rates ?? [];
      const taxPercent = invitation.taxPercent ?? 0;
      const subtotal = rfq.items.reduce((sum, item, position) => sum + Number(item.quantity) * (rates[position] ?? 0), 0);
      await prisma.rfqInvitation.create({
        data: {
          rfqId: rfq.id,
          vendorId: vendorIdByCode[invitation.vendorCode],
          status: invitation.status,
          invitedAt: dayOffset(r.issuedOn),
          respondedAt: invitation.respondedOn !== undefined ? dayOffset(invitation.respondedOn) : null,
          leadTimeDays: invitation.leadTimeDays ?? null,
          validUntil: invitation.status === 'QUOTED' ? calendarDay(30) : null,
          taxPercent,
          quotedAmount: invitation.status === 'QUOTED' ? Math.round(subtotal * (1 + taxPercent / 100) * 100) / 100 : null,
          quoteItems: { create: rates.length ? rfq.items.map((item, position) => ({ rfqItemId: item.id, rate: rates[position] })) : [] },
        },
      });
    }

    const winner = r.invitations.find((invitation) => invitation.vendorCode === r.awardTo);
    if (!winner?.rates || !rfq.projectId) continue;
    const items = r.items.map((item, position) => ({
      ...item, category: r.category, rate: winner.rates?.[position] ?? 0, taxPercent: winner.taxPercent ?? 0, discountPercent: 0,
    }));
    const vendorName = VENDORS.find((vendor) => vendor.code === r.awardTo)?.name ?? '';
    const draft = await prisma.purchaseOrder.create({
      data: {
        poNumber: docNumber('PO', ++poCount),
        category: r.category,
        status: 'DRAFT',
        priority: r.priority,
        expectedDelivery: calendarDay(winner.leadTimeDays ?? 0),
        amount: orderTotal(items),
        deliveryAddress: SITE_ADDRESSES[r.projectCode] ?? '',
        notes: `Awarded from ${rfq.rfqNumber}: ${r.title}`,
        requestedById: requesterId,
        projectId: rfq.projectId,
        vendorId: vendorIdByCode[winner.vendorCode],
        organizationId: orgId,
        items: { create: items.map((item, position) => ({ ...item, sortOrder: position })) },
        timeline: { create: [{ stage: 'Created from RFQ', actor: requester, date: new Date(), note: `${rfq.rfqNumber} awarded to ${vendorName}`, sortOrder: 0 }] },
      },
    });
    await prisma.rfq.update({
      where: { id: rfq.id },
      data: { awardedAt: new Date(), awardedVendorId: vendorIdByCode[winner.vendorCode], purchaseOrderId: draft.id },
    });
  }

  console.log(`  → Seeded ${VENDORS.length} vendors, ${poCount} purchase orders, ${RFQS.length} RFQs, ${grnCount} goods receipts`);
}

async function seedInventory(orgId: string) {
  const count = await prisma.warehouse.count({ where: { organizationId: orgId } });
  if (count > 0) {
    console.log('  → Inventory already seeded, skipping');
    return;
  }

  const w1 = await prisma.warehouse.create({
    data: { name: 'Central Store', code: 'WH-CEN-01', type: 'CENTRAL', organizationId: orgId }
  });
  // The Whitefield site store serves that project, so goods received on its POs default here.
  const whitefield = await prisma.project.findFirst({ where: { organizationId: orgId, code: 'GRV-001' }, select: { id: true } });
  const w2 = await prisma.warehouse.create({
    data: { name: 'Site Store - Whitefield', code: 'WH-SIT-01', type: 'SITE_STORE', projectId: whitefield?.id ?? null, organizationId: orgId }
  });
  
  const materials = await prisma.material.findMany({ where: { organizationId: orgId } });
  
  for (const mat of materials) {
    const isSite = mat.name.includes('Site');
    const whId = isSite ? w2.id : w1.id;
    
    await prisma.inventoryItem.create({
      data: {
        materialId: mat.id,
        warehouseId: whId,
        quantity: mat.quantity,
        reserved: mat.reserved,
        incoming: mat.incoming,
        reorderLevel: mat.minStock,
        organizationId: orgId,
      }
    });
  }
  
  console.log(`  → Seeded 2 warehouses and ${materials.length} inventory items`);
}

// ─── Finance Seed Data ────────────────────────────────────────────────────────

async function seedFinance(orgId: string) {
  const count = await prisma.invoice.count({ where: { organizationId: orgId } });
  if (count > 0) { console.log('  → Finance already seeded, skipping'); return; }

  const projects = await prisma.project.findMany({ where: { organizationId: orgId }, select: { id: true, code: true } });
  const projIdByCode: Record<string, string> = Object.fromEntries(projects.map((p) => [p.code, p.id]));
  const vendors = await prisma.vendor.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } });
  const vendorIdByName: Record<string, string> = Object.fromEntries(vendors.map((v) => [v.name, v.id]));
  // Bills are entered by the finance team so the owner can approve them (maker-checker).
  const clerk = await prisma.user.findUnique({ where: { email: 'suresh.b@grovyn.com' }, select: { id: true } });

  // Budget heads use the same names as purchase order and bill categories; committed and spent are derived from those.
  const CATS = ['Steel', 'Concrete', 'Electrical', 'Mechanical', 'Labour', 'Equipment', 'Finishes'];
  const BD: Record<string, number[]> = {
    'GRV-001': [28e6, 18e6, 12e6, 10e6, 14e6, 6e6, 4e6],
    'GRV-002': [6e6, 5e6, 4e6, 3e6, 5e6, 3e6, 2e6],
    'GRV-003': [96e6, 64e6, 42e6, 38e6, 48e6, 18e6, 14e6],
    'GRV-004': [16e6, 10e6, 8e6, 6e6, 8e6, 4e6, 3e6],
  };
  for (const [code, items] of Object.entries(BD)) {
    const pid = projIdByCode[code]; if (!pid) continue;
    for (let i = 0; i < items.length; i++) {
      await prisma.budgetItem.create({ data: { projectId: pid, organizationId: orgId, category: CATS[i], allocated: items[i] } });
    }
  }

  type IS = { n: string; v: string; pc: string; cat: string; amt: number; tax: number; st: 'DRAFT'|'PENDING_APPROVAL'|'APPROVED'|'PAID'; io: number; duo: number; po: number|null; d: string };
  const INV: IS[] = [
    { n:'INV-001', v:'Tata Steel Ltd', pc:'GRV-001', cat:'Steel', amt:5610000, tax:1009800, st:'PAID', io:30, duo:-15, po:12, d:'TMT Steel 85MT - Floors 3-4' },
    { n:'INV-002', v:'UltraTech Cement', pc:'GRV-001', cat:'Concrete', amt:1364000, tax:245520, st:'PAID', io:22, duo:-8, po:5, d:'RMC M30 - 220 cum slab pour' },
    { n:'INV-003', v:'Bhagwati RMC', pc:'GRV-003', cat:'Concrete', amt:2132000, tax:383760, st:'APPROVED', io:8, duo:7, po:null, d:'M35 RMC - Tower C Floor 12' },
    { n:'INV-004', v:'Havells India', pc:'GRV-001', cat:'Electrical', amt:866000, tax:155880, st:'PENDING_APPROVAL', io:5, duo:25, po:null, d:'LT Panel + XLPE Cable' },
    { n:'INV-005', v:'Tata Steel Ltd', pc:'GRV-002', cat:'Steel', amt:732000, tax:131760, st:'APPROVED', io:45, duo:-15, po:null, d:'Manhole covers and gratings' },
    { n:'INV-006', v:'Asian Paints', pc:'GRV-003', cat:'Paint', amt:450000, tax:81000, st:'PAID', io:12, duo:-2, po:3, d:'Premium emulsion + primer' },
    { n:'INV-007', v:'Blue Star Ltd', pc:'GRV-003', cat:'HVAC', amt:2116000, tax:380880, st:'DRAFT', io:2, duo:30, po:null, d:'VRF system clubhouse' },
    { n:'INV-008', v:'Polycab Wires', pc:'GRV-001', cat:'Electrical', amt:620000, tax:111600, st:'APPROVED', io:6, duo:14, po:null, d:'Electrical cabling Floors 11-13' },
    { n:'INV-009', v:'Supreme Pipes', pc:'GRV-003', cat:'Plumbing', amt:340000, tax:61200, st:'PENDING_APPROVAL', io:4, duo:20, po:null, d:'PVC drainage stack' },
    { n:'INV-010', v:'Kajaria Ceramics', pc:'GRV-003', cat:'Finishes', amt:864000, tax:155520, st:'PAID', io:18, duo:-4, po:8, d:'Vitrified tiles Tower A' },
  ];
  const invIds: Record<string, string> = {};
  for (const inv of INV) {
    const c = await prisma.invoice.create({ data: { invoiceNumber: inv.n, vendorName: inv.v, vendorId: vendorIdByName[inv.v] ?? null, createdById: clerk?.id ?? null, submittedAt: inv.st === 'DRAFT' ? null : subDays(new Date(), inv.io), projectId: projIdByCode[inv.pc]??null, organizationId: orgId, category: inv.cat, description: inv.d, amount: inv.amt, taxAmount: inv.tax, totalAmount: inv.amt+inv.tax, status: inv.st, issuedDate: subDays(new Date(), inv.io), dueDate: subDays(new Date(), inv.duo), paidDate: inv.po!=null ? subDays(new Date(), inv.po) : null } });
    invIds[inv.n] = c.id;
  }

  type PS = { n: string; inv: string|null; v: string; pc: string; cat: string; amt: number; st: 'PENDING'|'APPROVED'|'PAID'|'REJECTED'; m: string; duo: number; po: number|null; ref: string };
  const PAY: PS[] = [
    { n:'PAY-001', inv:'INV-001', v:'Tata Steel Ltd', pc:'GRV-001', cat:'Steel', amt:6619800, st:'PAID', m:'bank_transfer', duo:-15, po:12, ref:'NEFT/2026/JUL/001' },
    { n:'PAY-002', inv:'INV-002', v:'UltraTech Cement', pc:'GRV-001', cat:'Concrete', amt:1609520, st:'PAID', m:'bank_transfer', duo:-8, po:5, ref:'NEFT/2026/JUL/002' },
    { n:'PAY-003', inv:'INV-003', v:'Bhagwati RMC', pc:'GRV-003', cat:'Concrete', amt:2515760, st:'APPROVED', m:'bank_transfer', duo:7, po:null, ref:'' },
    { n:'PAY-004', inv:'INV-005', v:'Tata Steel Ltd', pc:'GRV-002', cat:'Steel', amt:863760, st:'PENDING', m:'bank_transfer', duo:-15, po:null, ref:'' },
    { n:'PAY-005', inv:'INV-006', v:'Asian Paints', pc:'GRV-003', cat:'Paint', amt:531000, st:'PAID', m:'cheque', duo:-2, po:3, ref:'CHQ-440125' },
    { n:'PAY-006', inv:'INV-008', v:'Polycab Wires', pc:'GRV-001', cat:'Electrical', amt:731600, st:'PENDING', m:'bank_transfer', duo:14, po:null, ref:'' },
    { n:'PAY-007', inv:'INV-010', v:'Kajaria Ceramics', pc:'GRV-003', cat:'Finishes', amt:1019520, st:'PAID', m:'bank_transfer', duo:-4, po:8, ref:'NEFT/2026/JUN/018' },
    { n:'PAY-008', inv:null, v:'Labour Contractor', pc:'GRV-001', cat:'Labour', amt:2400000, st:'PAID', m:'bank_transfer', duo:-5, po:2, ref:'NEFT/2026/JUL/005' },
    { n:'PAY-009', inv:null, v:'Labour Contractor', pc:'GRV-003', cat:'Labour', amt:4800000, st:'PAID', m:'bank_transfer', duo:-5, po:2, ref:'NEFT/2026/JUL/006' },
    { n:'PAY-010', inv:null, v:'Equipment Rental Co', pc:'GRV-002', cat:'Equipment Hire', amt:850000, st:'APPROVED', m:'bank_transfer', duo:10, po:null, ref:'' },
  ];
  for (const p of PAY) {
    await prisma.payment.create({ data: { paymentNumber: p.n, invoiceId: p.inv ? invIds[p.inv]??null : null, vendorName: p.v, vendorId: vendorIdByName[p.v] ?? null, requestedById: clerk?.id ?? null, projectId: projIdByCode[p.pc]??null, organizationId: orgId, category: p.cat, amount: p.amt, status: p.st, method: p.m, reference: p.ref, dueDate: subDays(new Date(), p.duo), paidDate: p.po!=null ? subDays(new Date(), p.po) : null } });
  }

  const poBills = await seedPurchaseOrderBills(orgId, clerk?.id ?? null);

  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    await prisma.cashFlowEntry.create({ data: { organizationId: orgId, month: d.getMonth()+1, year: d.getFullYear(), inflow: i>=2 ? [42e6,38.5e6,45.2e6,51.8e6][i%4] : 0, outflow: i>=2 ? [36.4e6,41.2e6,39.8e6,44.6e6][i%4] : 0, forecastInflow: [40e6,42e6,44e6,48e6,50e6,52e6][i], forecastOutflow: [38e6,40e6,42e6,45e6,47e6,49e6][i] } });
  }

  console.log(`  → Seeded finance: ${INV.length + poBills} invoices (${poBills} against POs), ${PAY.length} payments, 28 budget items, 6 cash flow entries`);
}

/**
 * Bills against received purchase orders, so the 3-way match has something to show:
 * one priced exactly at the PO (approved), one billed 4% above the PO rate (awaiting approval).
 */
async function seedPurchaseOrderBills(orgId: string, clerkId: string | null): Promise<number> {
  const orders = await prisma.purchaseOrder.findMany({
    where: { organizationId: orgId, status: 'APPROVED', vendorId: { not: null }, items: { some: { receivedQuantity: { gt: 0 } } } },
    include: { vendor: true, items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { requestedDate: 'desc' },
    take: 2,
  });
  const scenarios = [
    { status: 'APPROVED' as const, rateUplift: 1, suffix: '0412', issuedAgo: 6, note: '' },
    { status: 'PENDING_APPROVAL' as const, rateUplift: 1.04, suffix: '0437', issuedAgo: 2, note: 'Vendor applied revised price list.' },
  ];

  for (const [index, order] of orders.entries()) {
    const scenario = scenarios[index];
    const vendor = order.vendor!;
    const lines = order.items
      .filter((item) => Number(item.receivedQuantity) > 0)
      .map((item, sortOrder) => {
        const rate = Math.round(Number(item.rate) * (1 - item.discountPercent / 100) * scenario.rateUplift * 100) / 100;
        const quantity = Number(item.receivedQuantity);
        return { poLineItemId: item.id, description: item.description, unit: item.unit, quantity, rate, taxPercent: item.taxPercent, sortOrder };
      });
    const amount = Math.round(lines.reduce((sum, line) => sum + line.quantity * line.rate, 0) * 100) / 100;
    const taxAmount = Math.round(lines.reduce((sum, line) => sum + line.quantity * line.rate * (line.taxPercent / 100), 0) * 100) / 100;
    const issuedDate = subDays(new Date(), scenario.issuedAgo);

    await prisma.invoice.create({
      data: {
        invoiceNumber: `${vendor.code}/26-27/${scenario.suffix}`,
        vendorName: vendor.name,
        vendorId: vendor.id,
        purchaseOrderId: order.id,
        projectId: order.projectId,
        organizationId: orgId,
        category: order.category,
        description: `Supply against ${order.poNumber}`,
        notes: scenario.note,
        amount,
        taxAmount,
        totalAmount: Math.round((amount + taxAmount) * 100) / 100,
        status: scenario.status,
        issuedDate,
        dueDate: subDays(new Date(), scenario.issuedAgo - 30),
        submittedAt: issuedDate,
        createdById: clerkId,
        items: { create: lines },
      },
    });
  }
  return orders.length;
}

async function main() {
  const orgs = await prisma.userOrganization.findMany({
    where: { role: 'OWNER' },
    include: { organization: true, user: true },
  });

  for (const membership of orgs) {
    console.log(`Seeding org: ${membership.organization.name} (${membership.organization.id})`);
    await seedOrg(membership.organization.id, membership.userId);
    await seedWorkers(membership.organization.id);
    await seedAttendance(membership.organization.id);
    await seedMaterials(membership.organization.id);
    await seedDailyReports(membership.organization.id);
    await seedNotifications(membership.organization.id);
    await seedProcurement(membership.organization.id);
    await seedInventory(membership.organization.id);
    await seedFinance(membership.organization.id);
    await seedReports(membership.organization.id);
    console.log(`  ✓ Done`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
// ─── Reports Seed Data ────────────────────────────────────────────────────────

async function seedReports(orgId: string) {
  const count = await prisma.reportSchedule.count({ where: { organizationId: orgId } });
  if (count > 0) { console.log('  → Reports already seeded, skipping'); return; }

  // Generated reports aren't seeded: they need real files, so generate one from the Reports page instead.
  const owner = await prisma.userOrganization.findFirstOrThrow({ where: { organizationId: orgId, role: 'OWNER' }, select: { userId: true } });
  const definition = await prisma.report.create({
    data: { name: 'Executive Summary', type: 'EXECUTIVE', description: '', projects: [], organizationId: orgId, createdBy: owner.userId },
  });
  const nextMonday = new Date();
  nextMonday.setUTCDate(nextMonday.getUTCDate() + ((8 - nextMonday.getUTCDay()) % 7 || 7));
  nextMonday.setUTCHours(3, 30, 0, 0); // 09:00 in Asia/Kolkata

  await prisma.reportSchedule.create({
    data: {
      reportId: definition.id,
      reportType: 'EXECUTIVE',
      name: 'Weekly Executive Summary',
      frequency: 'WEEKLY',
      time: '09:00',
      timezone: 'Asia/Kolkata',
      projects: [],
      recipients: ['OWNER', 'PROJECT_MANAGER'],
      emails: [],
      enabled: true,
      nextRunAt: nextMonday,
      organizationId: orgId,
      createdBy: owner.userId,
    },
  });

  console.log('  → Seeded reports: 1 weekly schedule');
}