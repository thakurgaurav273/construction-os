import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { subDays, subMonths, addMonths, addDays } from 'date-fns';
import {
  dateKeyToDbDate, lastDateKeys, toLocalDateKey,
} from '../src/modules/workforce/attendance-dates';

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

const CV_C = { name: 'Safety Induction Certificate',  expiryDate: '2027-01-15', status: 'valid'    };
const CV_E = { name: 'Safety Induction Certificate',  expiryDate: '2026-08-05', status: 'expiring' };
const CV_X = { name: 'Safety Induction Certificate',  expiryDate: '2026-06-10', status: 'expired'  };
const FA_C = { name: 'First Aid & CPR',               expiryDate: '2027-03-20', status: 'valid'    };
const FA_E = { name: 'First Aid & CPR',               expiryDate: '2026-07-28', status: 'expiring' };
const HS_C = { name: 'Height Safety Training',        expiryDate: '2027-06-30', status: 'valid'    };
const HS_E = { name: 'Height Safety Training',        expiryDate: '2026-08-12', status: 'expiring' };
const EL_C = { name: 'Electrical Safety Certificate', expiryDate: '2027-02-28', status: 'valid'    };
const EL_E = { name: 'Electrical Safety Certificate', expiryDate: '2026-08-01', status: 'expiring' };
const EL_X = { name: 'Electrical Safety Certificate', expiryDate: '2026-05-14', status: 'expired'  };
const EQ_C = { name: 'Equipment Operation License',   expiryDate: '2027-09-30', status: 'valid'    };
const OS_C = { name: 'OSHA 10-Hour Safety',           expiryDate: '2027-12-31', status: 'valid'    };
const MF_C = { name: 'Medical Fitness Certificate',   expiryDate: '2027-07-01', status: 'valid'    };
const MF_E = { name: 'Medical Fitness Certificate',   expiryDate: '2026-07-22', status: 'expiring' };
const MF_X = { name: 'Medical Fitness Certificate',   expiryDate: '2026-04-10', status: 'expired'  };
const PP_C = { name: 'PPE Compliance Certificate',    expiryDate: '2027-05-15', status: 'valid'    };
const PP_X = { name: 'PPE Compliance Certificate',    expiryDate: '2026-03-30', status: 'expired'  };

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
  supervisor: string; emergencyContact: object; skills: string[]; certifications: object[];
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
        certifications:   w.certifications,
        ppeCompliant:     w.ppeCompliant,
        organizationId:   orgId,
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

type VendorSeed = {
  name: string; code: string; categories: string[]; status: string; rating: number;
  performanceScore: number; onTimeDeliveryPercent: number; deliveryAccuracy: number;
  qualityRating: number; responseTimeHours: number; projectCount: number; totalOrders: number;
  outstandingBalance: number; lastOrderOffset: number; contactPerson: string; phone: string;
  email: string; gstNumber: string; paymentTerms: string; city: string; state: string;
  aiRecommendation: string;
};

const VENDORS: VendorSeed[] = [
  { name: 'Tata Steel Ltd', code: 'VN-STL-01', categories: ['Steel', 'Equipment'], status: 'active', rating: 4.7, performanceScore: 92, onTimeDeliveryPercent: 94, deliveryAccuracy: 96, qualityRating: 4.8, responseTimeHours: 6, projectCount: 3, totalOrders: 42, outstandingBalance: 1_845_000, lastOrderOffset: 4, contactPerson: 'Anil Bhaskar', phone: '+91 98450 11001', email: 'anil.bhaskar@tatasteel.com', gstNumber: '29AAACT2803M1ZK', paymentTerms: 'Net 45', city: 'Bengaluru', state: 'Karnataka', aiRecommendation: 'Preferred for structural steel — consistently on-time with premium quality.' },
  { name: 'UltraTech Cement', code: 'VN-CON-02', categories: ['Concrete'], status: 'active', rating: 4.5, performanceScore: 88, onTimeDeliveryPercent: 90, deliveryAccuracy: 93, qualityRating: 4.6, responseTimeHours: 8, projectCount: 4, totalOrders: 58, outstandingBalance: 920_000, lastOrderOffset: 2, contactPerson: 'Reena Kapoor', phone: '+91 98450 11002', email: 'reena.k@ultratech.com', gstNumber: '27AAACL6442L1ZM', paymentTerms: 'Net 30', city: 'Mumbai', state: 'Maharashtra', aiRecommendation: 'Reliable RMC supplier; negotiate bulk pricing for Q3 pours.' },
  { name: 'Havells India', code: 'VN-ELE-03', categories: ['Electrical'], status: 'active', rating: 4.3, performanceScore: 84, onTimeDeliveryPercent: 86, deliveryAccuracy: 91, qualityRating: 4.4, responseTimeHours: 10, projectCount: 2, totalOrders: 27, outstandingBalance: 640_000, lastOrderOffset: 9, contactPerson: 'Karthik Iyer', phone: '+91 98450 11003', email: 'karthik.iyer@havells.com', gstNumber: '06AAACH0553P1Z8', paymentTerms: 'Net 30', city: 'Chennai', state: 'Tamil Nadu', aiRecommendation: 'Good for switchgear; watch lead times during festive season.' },
  { name: 'Blue Star Ltd', code: 'VN-HVAC-04', categories: ['HVAC', 'Mechanical'], status: 'active', rating: 4.1, performanceScore: 79, onTimeDeliveryPercent: 82, deliveryAccuracy: 88, qualityRating: 4.2, responseTimeHours: 14, projectCount: 2, totalOrders: 18, outstandingBalance: 1_210_000, lastOrderOffset: 15, contactPerson: 'Deepa Menon', phone: '+91 98450 11004', email: 'deepa.menon@bluestar.com', gstNumber: '27AAACB1234F1Z5', paymentTerms: 'Net 60', city: 'Pune', state: 'Maharashtra', aiRecommendation: 'Competitive on VRF systems; obtain firm delivery commitment before ordering.' },
  { name: 'Asian Paints', code: 'VN-PNT-05', categories: ['Paint', 'Tiles'], status: 'active', rating: 4.6, performanceScore: 90, onTimeDeliveryPercent: 93, deliveryAccuracy: 95, qualityRating: 4.7, responseTimeHours: 5, projectCount: 3, totalOrders: 34, outstandingBalance: 315_000, lastOrderOffset: 6, contactPerson: 'Sanjay Rao', phone: '+91 98450 11005', email: 'sanjay.rao@asianpaints.com', gstNumber: '27AAACA6666G1ZN', paymentTerms: 'Net 30', city: 'Bengaluru', state: 'Karnataka', aiRecommendation: 'Top-rated finish quality; ideal for premium residential handover works.' },
  { name: 'Kirloskar Equipments', code: 'VN-EQP-06', categories: ['Equipment', 'Mechanical'], status: 'inactive', rating: 3.4, performanceScore: 61, onTimeDeliveryPercent: 68, deliveryAccuracy: 74, qualityRating: 3.6, responseTimeHours: 22, projectCount: 1, totalOrders: 9, outstandingBalance: 0, lastOrderOffset: 78, contactPerson: 'Mahesh Kulkarni', phone: '+91 98450 11006', email: 'mahesh.k@kirloskar.com', gstNumber: '27AAACK5000H1ZP', paymentTerms: 'Advance 50%', city: 'Pune', state: 'Maharashtra', aiRecommendation: 'Under review — recent delays; request performance improvement plan before re-engaging.' },
];

type PoItemSeed = { description: string; category: string; unit: string; quantity: number; rate: number; taxPercent: number; discountPercent: number };
type PoStepSeed = { stage: string; actor: string; dayOffset: number | null; note: string };
type PoSeed = {
  poNumber: string; vendorCode: string; projectCode: string; category: string; createdBy: string;
  approver: string; requestedOffset: number; expectedOffset: number; approvalStatus: string;
  deliveryStatus: string; priority: string; deliveryAddress: string; notes: string;
  items: PoItemSeed[]; timeline: PoStepSeed[];
};

function poTimeline(created: string, approver: string, vendor: string, reviewedOff: number | null, approvedOff: number | null, deliveredOff: number | null): PoStepSeed[] {
  return [
    { stage: 'Created', actor: created, dayOffset: 12, note: 'Purchase order created' },
    { stage: 'Submitted', actor: created, dayOffset: 11, note: 'Submitted for approval' },
    { stage: 'Reviewed', actor: approver, dayOffset: reviewedOff, note: reviewedOff != null ? 'Reviewed by procurement' : '' },
    { stage: 'Approved', actor: approver, dayOffset: approvedOff, note: approvedOff != null ? 'Purchase order approved' : '' },
    { stage: 'Delivered', actor: vendor, dayOffset: deliveredOff, note: deliveredOff != null ? 'Materials delivered to site' : '' },
  ];
}

const PURCHASE_ORDERS: PoSeed[] = [
  { poNumber: 'PO-0001', vendorCode: 'VN-STL-01', projectCode: 'GRV-001', category: 'Steel', createdBy: 'Divya Nair', approver: 'Suresh Babu', requestedOffset: 12, expectedOffset: -3, approvalStatus: 'approved', deliveryStatus: 'delivered', priority: 'high', deliveryAddress: 'Whitefield IT Corridor Site, Bengaluru', notes: 'Structural steel for floors 5-6.', items: [
    { description: 'TMT Steel Bars Fe500D 16mm', category: 'Steel', unit: 'MT', quantity: 45, rate: 68000, taxPercent: 18, discountPercent: 2 },
    { description: 'TMT Steel Bars Fe500D 20mm', category: 'Steel', unit: 'MT', quantity: 30, rate: 67500, taxPercent: 18, discountPercent: 2 },
    { description: 'MS Structural Angles', category: 'Steel', unit: 'MT', quantity: 8, rate: 62000, taxPercent: 18, discountPercent: 0 },
  ], timeline: poTimeline('Divya Nair', 'Suresh Babu', 'Tata Steel Ltd', 10, 9, 3) },
  { poNumber: 'PO-0002', vendorCode: 'VN-CON-02', projectCode: 'GRV-003', category: 'Concrete', createdBy: 'Divya Nair', approver: 'Suresh Babu', requestedOffset: 6, expectedOffset: 4, approvalStatus: 'approved', deliveryStatus: 'in_transit', priority: 'high', deliveryAddress: 'Sarjapur Smart Township, Bengaluru', notes: 'M30 RMC for Tower C slab.', items: [
    { description: 'Ready Mix Concrete M30', category: 'Concrete', unit: 'cum', quantity: 220, rate: 6200, taxPercent: 18, discountPercent: 3 },
    { description: 'Ready Mix Concrete M25', category: 'Concrete', unit: 'cum', quantity: 90, rate: 5800, taxPercent: 18, discountPercent: 3 },
  ], timeline: poTimeline('Divya Nair', 'Suresh Babu', 'UltraTech Cement', 5, 4, null) },
  { poNumber: 'PO-0003', vendorCode: 'VN-ELE-03', projectCode: 'GRV-001', category: 'Electrical', createdBy: 'Divya Nair', approver: 'Suresh Babu', requestedOffset: 3, expectedOffset: 10, approvalStatus: 'pending', deliveryStatus: 'not_started', priority: 'medium', deliveryAddress: 'Whitefield IT Corridor Site, Bengaluru', notes: 'Main LT panel and cabling.', items: [
    { description: 'LT Distribution Panel 630A', category: 'Electrical', unit: 'nos', quantity: 2, rate: 185000, taxPercent: 18, discountPercent: 0 },
    { description: 'XLPE Armoured Cable 4C x 95sqmm', category: 'Electrical', unit: 'm', quantity: 800, rate: 620, taxPercent: 18, discountPercent: 5 },
  ], timeline: poTimeline('Divya Nair', 'Suresh Babu', 'Havells India', null, null, null) },
  { poNumber: 'PO-0004', vendorCode: 'VN-HVAC-04', projectCode: 'GRV-003', category: 'HVAC', createdBy: 'Divya Nair', approver: 'Suresh Babu', requestedOffset: 8, expectedOffset: 20, approvalStatus: 'changes_requested', deliveryStatus: 'not_started', priority: 'medium', deliveryAddress: 'Sarjapur Smart Township, Bengaluru', notes: 'Clubhouse VRF system — revise BOQ.', items: [
    { description: 'VRF Outdoor Unit 16HP', category: 'HVAC', unit: 'nos', quantity: 4, rate: 340000, taxPercent: 18, discountPercent: 0 },
    { description: 'VRF Indoor Cassette Unit', category: 'HVAC', unit: 'nos', quantity: 18, rate: 42000, taxPercent: 18, discountPercent: 2 },
    { description: 'Refrigerant Copper Piping Kit', category: 'HVAC', unit: 'set', quantity: 18, rate: 8500, taxPercent: 18, discountPercent: 0 },
  ], timeline: poTimeline('Divya Nair', 'Suresh Babu', 'Blue Star Ltd', 6, null, null) },
  { poNumber: 'PO-0005', vendorCode: 'VN-PNT-05', projectCode: 'GRV-003', category: 'Paint', createdBy: 'Divya Nair', approver: 'Suresh Babu', requestedOffset: 5, expectedOffset: 2, approvalStatus: 'approved', deliveryStatus: 'delivered', priority: 'low', deliveryAddress: 'Sarjapur Smart Township, Bengaluru', notes: 'Tower A & B interior finishing.', items: [
    { description: 'Premium Emulsion Paint (Interior)', category: 'Paint', unit: 'ltr', quantity: 1200, rate: 285, taxPercent: 18, discountPercent: 8 },
    { description: 'Wall Primer', category: 'Paint', unit: 'ltr', quantity: 600, rate: 180, taxPercent: 18, discountPercent: 8 },
  ], timeline: poTimeline('Divya Nair', 'Suresh Babu', 'Asian Paints', 4, 4, 2) },
  { poNumber: 'PO-0006', vendorCode: 'VN-STL-01', projectCode: 'GRV-002', category: 'Steel', createdBy: 'Divya Nair', approver: 'Suresh Babu', requestedOffset: 14, expectedOffset: -1, approvalStatus: 'approved', deliveryStatus: 'delayed', priority: 'critical', deliveryAddress: 'BBMP Zone 4 Yard, Indiranagar, Bengaluru', notes: 'Manhole cover frames — urgent.', items: [
    { description: 'Cast Iron Manhole Cover Heavy Duty', category: 'Steel', unit: 'nos', quantity: 120, rate: 4200, taxPercent: 18, discountPercent: 0 },
    { description: 'MS Grating Panels', category: 'Steel', unit: 'sqm', quantity: 60, rate: 3800, taxPercent: 18, discountPercent: 0 },
  ], timeline: poTimeline('Divya Nair', 'Suresh Babu', 'Tata Steel Ltd', 12, 11, null) },
  { poNumber: 'PO-0007', vendorCode: 'VN-ELE-03', projectCode: 'GRV-002', category: 'Electrical', createdBy: 'Divya Nair', approver: 'Suresh Babu', requestedOffset: 2, expectedOffset: 12, approvalStatus: 'rejected', deliveryStatus: 'not_started', priority: 'low', deliveryAddress: 'BBMP Zone 4 Yard, Indiranagar, Bengaluru', notes: 'Flow sensor wiring — rejected, over budget.', items: [
    { description: 'Smart Flow Sensor IP68', category: 'Electrical', unit: 'nos', quantity: 24, rate: 28500, taxPercent: 18, discountPercent: 0 },
    { description: 'Signal Cable Shielded', category: 'Electrical', unit: 'm', quantity: 1500, rate: 95, taxPercent: 18, discountPercent: 0 },
  ], timeline: poTimeline('Divya Nair', 'Suresh Babu', 'Havells India', 1, null, null) },
  { poNumber: 'PO-0008', vendorCode: 'VN-CON-02', projectCode: 'GRV-001', category: 'Concrete', createdBy: 'Divya Nair', approver: 'Suresh Babu', requestedOffset: 1, expectedOffset: 6, approvalStatus: 'pending', deliveryStatus: 'not_started', priority: 'medium', deliveryAddress: 'Whitefield IT Corridor Site, Bengaluru', notes: 'Basement raft pour.', items: [
    { description: 'Ready Mix Concrete M35', category: 'Concrete', unit: 'cum', quantity: 180, rate: 6600, taxPercent: 18, discountPercent: 2 },
    { description: 'Waterproofing Admixture', category: 'Concrete', unit: 'ltr', quantity: 400, rate: 220, taxPercent: 18, discountPercent: 0 },
  ], timeline: poTimeline('Divya Nair', 'Suresh Babu', 'UltraTech Cement', null, null, null) },
];

type RfqSeed = { rfqNumber: string; projectCode: string; title: string; category: string; vendorsInvited: number; responsesReceived: number; issuedOffset: number; closingOffset: number; status: string; priority: string; estimatedValue: number; createdBy: string };

const RFQS: RfqSeed[] = [
  { rfqNumber: 'RFQ-0001', projectCode: 'GRV-001', title: 'Curtain Wall Aluminium Glazing', category: 'Mechanical', vendorsInvited: 5, responsesReceived: 3, issuedOffset: 10, closingOffset: 4, status: 'evaluating', priority: 'high', estimatedValue: 8_500_000, createdBy: 'Divya Nair' },
  { rfqNumber: 'RFQ-0002', projectCode: 'GRV-003', title: 'Vitrified Floor Tiles Supply', category: 'Tiles', vendorsInvited: 4, responsesReceived: 4, issuedOffset: 8, closingOffset: -1, status: 'awarded', priority: 'medium', estimatedValue: 3_200_000, createdBy: 'Divya Nair' },
  { rfqNumber: 'RFQ-0003', projectCode: 'GRV-002', title: 'De-silting Machinery Rental', category: 'Equipment', vendorsInvited: 6, responsesReceived: 1, issuedOffset: 2, closingOffset: 5, status: 'open', priority: 'critical', estimatedValue: 1_800_000, createdBy: 'Divya Nair' },
  { rfqNumber: 'RFQ-0004', projectCode: 'GRV-003', title: 'Solar PV Panels 24MW', category: 'Electrical', vendorsInvited: 7, responsesReceived: 5, issuedOffset: 4, closingOffset: 1, status: 'closing_soon', priority: 'high', estimatedValue: 42_000_000, createdBy: 'Divya Nair' },
];

type DeliverySeed = { poNumber: string; vendorName: string; projectName: string; category: string; status: string; scheduledOffset: number; actualOffset: number | null; itemSummary: string; delayDays: number; trackingId: string };

const DELIVERIES: DeliverySeed[] = [
  { poNumber: 'PO-0001', vendorName: 'Tata Steel Ltd', projectName: 'Whitefield IT Corridor - Block C', category: 'Steel', status: 'delivered', scheduledOffset: 3, actualOffset: 3, itemSummary: '83 MT TMT + structural steel', delayDays: 0, trackingId: 'TRK-STL-8891' },
  { poNumber: 'PO-0002', vendorName: 'UltraTech Cement', projectName: 'Sarjapur Smart Township - Phase 1', category: 'Concrete', status: 'in_transit', scheduledOffset: -4, actualOffset: null, itemSummary: '310 cum RMC (M30 + M25)', delayDays: 0, trackingId: 'TRK-CON-4420' },
  { poNumber: 'PO-0005', vendorName: 'Asian Paints', projectName: 'Sarjapur Smart Township - Phase 1', category: 'Paint', status: 'delivered', scheduledOffset: 2, actualOffset: 2, itemSummary: '1800 ltr paint + primer', delayDays: 0, trackingId: 'TRK-PNT-2210' },
  { poNumber: 'PO-0006', vendorName: 'Tata Steel Ltd', projectName: 'BBMP Drainage Rehabilitation - Zone 4', category: 'Steel', status: 'delayed', scheduledOffset: 1, actualOffset: null, itemSummary: '120 manhole covers + gratings', delayDays: 5, trackingId: 'TRK-STL-9002' },
  { poNumber: 'PO-0003', vendorName: 'Havells India', projectName: 'Whitefield IT Corridor - Block C', category: 'Electrical', status: 'pending', scheduledOffset: -10, actualOffset: null, itemSummary: 'LT panels + XLPE cable', delayDays: 0, trackingId: 'TRK-ELE-5567' },
];

function poItemTotal(it: PoItemSeed): number {
  return it.quantity * it.rate * (1 + it.taxPercent / 100) * (1 - it.discountPercent / 100);
}

async function seedProcurement(orgId: string) {
  const count = await prisma.vendor.count({ where: { organizationId: orgId } });
  if (count > 0) {
    console.log('  → Procurement already seeded, skipping');
    return;
  }

  const vendorIdByCode: Record<string, string> = {};
  for (const v of VENDORS) {
    const vendor = await prisma.vendor.create({
      data: {
        name: v.name, code: v.code, categories: v.categories, status: v.status, rating: v.rating,
        performanceScore: v.performanceScore, onTimeDeliveryPercent: v.onTimeDeliveryPercent,
        deliveryAccuracy: v.deliveryAccuracy, qualityRating: v.qualityRating,
        responseTimeHours: v.responseTimeHours, projectCount: v.projectCount, totalOrders: v.totalOrders,
        outstandingBalance: v.outstandingBalance, lastOrderDate: subDays(new Date(), v.lastOrderOffset),
        contactPerson: v.contactPerson, phone: v.phone, email: v.email, gstNumber: v.gstNumber,
        paymentTerms: v.paymentTerms, city: v.city, state: v.state, aiRecommendation: v.aiRecommendation,
        organizationId: orgId,
      },
    });
    vendorIdByCode[v.code] = vendor.id;
  }

  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    select: { id: true, code: true },
  });
  const projIdByCode: Record<string, string> = Object.fromEntries(projects.map((p) => [p.code, p.id]));

  for (const po of PURCHASE_ORDERS) {
    const amount = po.items.reduce((sum, it) => sum + poItemTotal(it), 0);
    await prisma.purchaseOrder.create({
      data: {
        poNumber: po.poNumber, category: po.category, createdBy: po.createdBy, approver: po.approver,
        requestedDate: subDays(new Date(), po.requestedOffset),
        expectedDelivery: subDays(new Date(), po.expectedOffset),
        amount, approvalStatus: po.approvalStatus, deliveryStatus: po.deliveryStatus,
        priority: po.priority, deliveryAddress: po.deliveryAddress, notes: po.notes,
        projectId: projIdByCode[po.projectCode] ?? null,
        vendorId: vendorIdByCode[po.vendorCode] ?? null,
        organizationId: orgId,
        items: {
          create: po.items.map((it, index) => ({
            description: it.description, category: it.category, unit: it.unit, quantity: it.quantity,
            rate: it.rate, taxPercent: it.taxPercent, discountPercent: it.discountPercent, sortOrder: index,
          })),
        },
        timeline: {
          create: po.timeline.map((step, index) => ({
            stage: step.stage, actor: step.actor,
            date: step.dayOffset == null ? null : subDays(new Date(), step.dayOffset),
            note: step.note, sortOrder: index,
          })),
        },
      },
    });
  }

  for (const r of RFQS) {
    await prisma.rfq.create({
      data: {
        rfqNumber: r.rfqNumber, title: r.title, category: r.category, vendorsInvited: r.vendorsInvited,
        responsesReceived: r.responsesReceived, issuedDate: subDays(new Date(), r.issuedOffset),
        closingDate: subDays(new Date(), r.closingOffset), status: r.status, priority: r.priority,
        estimatedValue: r.estimatedValue, createdBy: r.createdBy,
        projectId: projIdByCode[r.projectCode] ?? null, organizationId: orgId,
      },
    });
  }

  for (const d of DELIVERIES) {
    await prisma.delivery.create({
      data: {
        poNumber: d.poNumber, vendorName: d.vendorName, projectName: d.projectName, category: d.category,
        status: d.status, scheduledDate: subDays(new Date(), d.scheduledOffset),
        actualDate: d.actualOffset == null ? null : subDays(new Date(), d.actualOffset),
        itemSummary: d.itemSummary, delayDays: d.delayDays, trackingId: d.trackingId, organizationId: orgId,
      },
    });
  }

  console.log(`  → Seeded ${VENDORS.length} vendors, ${PURCHASE_ORDERS.length} purchase orders, ${RFQS.length} RFQs, ${DELIVERIES.length} deliveries`);
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
  const w2 = await prisma.warehouse.create({
    data: { name: 'Site Store - Whitefield', code: 'WH-SIT-01', type: 'SITE_STORE', organizationId: orgId }
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

  const CATS = ['Steel & Rebar', 'Cement & Concrete', 'Electrical', 'Mechanical', 'Labour', 'Equipment Hire', 'Overheads'];
  const BD: Record<string, number[][]> = {
    'GRV-001': [[28e6,14.2e6,4.8e6],[18e6,9.4e6,2.2e6],[12e6,5.8e6,1.9e6],[10e6,4.2e6,2.1e6],[14e6,8.64e6,1.2e6],[6e6,3.4e6,.8e6],[4e6,2.2e6,.4e6]],
    'GRV-002': [[6e6,2.1e6,.9e6],[5e6,1.8e6,.6e6],[4e6,1.2e6,.5e6],[3e6,.8e6,.4e6],[5e6,2.02e6,.3e6],[3e6,1e6,.2e6],[2e6,.6e6,.1e6]],
    'GRV-003': [[96e6,74.88e6,8e6],[64e6,49.92e6,5.2e6],[42e6,32.76e6,3.8e6],[38e6,29.64e6,2.6e6],[48e6,37.44e6,4e6],[18e6,14.04e6,1.5e6],[14e6,10.92e6,.9e6]],
    'GRV-004': [[16e6,3.52e6,.5e6],[10e6,2.2e6,.3e6],[8e6,1.76e6,.2e6],[6e6,1.32e6,.1e6],[8e6,1.76e6,.2e6],[4e6,.88e6,.1e6],[3e6,.66e6,.05e6]],
  };
  for (const [code, items] of Object.entries(BD)) {
    const pid = projIdByCode[code]; if (!pid) continue;
    for (let i = 0; i < items.length; i++) {
      await prisma.budgetItem.create({ data: { projectId: pid, organizationId: orgId, category: CATS[i], allocated: items[i][0], spent: items[i][1], committed: items[i][2] } });
    }
  }

  type IS = { n: string; v: string; pc: string; cat: string; amt: number; tax: number; st: 'DRAFT'|'SENT'|'APPROVED'|'PAID'|'OVERDUE'; io: number; duo: number; po: number|null; d: string };
  const INV: IS[] = [
    { n:'INV-001', v:'Tata Steel Ltd', pc:'GRV-001', cat:'Steel', amt:5610000, tax:1009800, st:'PAID', io:30, duo:-15, po:12, d:'TMT Steel 85MT - Floors 3-4' },
    { n:'INV-002', v:'UltraTech Cement', pc:'GRV-001', cat:'Concrete', amt:1364000, tax:245520, st:'PAID', io:22, duo:-8, po:5, d:'RMC M30 - 220 cum slab pour' },
    { n:'INV-003', v:'Bhagwati RMC', pc:'GRV-003', cat:'Concrete', amt:2132000, tax:383760, st:'APPROVED', io:8, duo:7, po:null, d:'M35 RMC - Tower C Floor 12' },
    { n:'INV-004', v:'Havells India', pc:'GRV-001', cat:'Electrical', amt:866000, tax:155880, st:'SENT', io:5, duo:25, po:null, d:'LT Panel + XLPE Cable' },
    { n:'INV-005', v:'Tata Steel Ltd', pc:'GRV-002', cat:'Steel', amt:732000, tax:131760, st:'OVERDUE', io:45, duo:-15, po:null, d:'Manhole covers and gratings' },
    { n:'INV-006', v:'Asian Paints', pc:'GRV-003', cat:'Paint', amt:450000, tax:81000, st:'PAID', io:12, duo:-2, po:3, d:'Premium emulsion + primer' },
    { n:'INV-007', v:'Blue Star Ltd', pc:'GRV-003', cat:'HVAC', amt:2116000, tax:380880, st:'DRAFT', io:2, duo:30, po:null, d:'VRF system clubhouse' },
    { n:'INV-008', v:'Polycab Wires', pc:'GRV-001', cat:'Electrical', amt:620000, tax:111600, st:'APPROVED', io:6, duo:14, po:null, d:'Electrical cabling Floors 11-13' },
    { n:'INV-009', v:'Supreme Pipes', pc:'GRV-003', cat:'Plumbing', amt:340000, tax:61200, st:'SENT', io:4, duo:20, po:null, d:'PVC drainage stack' },
    { n:'INV-010', v:'Kajaria Ceramics', pc:'GRV-003', cat:'Finishes', amt:864000, tax:155520, st:'PAID', io:18, duo:-4, po:8, d:'Vitrified tiles Tower A' },
  ];
  const invIds: Record<string, string> = {};
  for (const inv of INV) {
    const c = await prisma.invoice.create({ data: { invoiceNumber: inv.n, vendorName: inv.v, projectId: projIdByCode[inv.pc]??null, organizationId: orgId, category: inv.cat, description: inv.d, amount: inv.amt, taxAmount: inv.tax, totalAmount: inv.amt+inv.tax, status: inv.st, issuedDate: subDays(new Date(), inv.io), dueDate: subDays(new Date(), inv.duo), paidDate: inv.po!=null ? subDays(new Date(), inv.po) : null } });
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
    await prisma.payment.create({ data: { paymentNumber: p.n, invoiceId: p.inv ? invIds[p.inv]??null : null, vendorName: p.v, projectId: projIdByCode[p.pc]??null, organizationId: orgId, category: p.cat, amount: p.amt, status: p.st, method: p.m, reference: p.ref, dueDate: subDays(new Date(), p.duo), paidDate: p.po!=null ? subDays(new Date(), p.po) : null } });
  }

  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    await prisma.cashFlowEntry.create({ data: { organizationId: orgId, month: d.getMonth()+1, year: d.getFullYear(), inflow: i>=2 ? [42e6,38.5e6,45.2e6,51.8e6][i%4] : 0, outflow: i>=2 ? [36.4e6,41.2e6,39.8e6,44.6e6][i%4] : 0, forecastInflow: [40e6,42e6,44e6,48e6,50e6,52e6][i], forecastOutflow: [38e6,40e6,42e6,45e6,47e6,49e6][i] } });
  }

  console.log(`  → Seeded finance: ${INV.length} invoices, ${PAY.length} payments, 28 budget items, 6 cash flow entries`);
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
  const count = await prisma.generatedReport.count({ where: { organizationId: orgId } });
  if (count > 0) { console.log('  → Reports already seeded, skipping'); return; }

  const templates = [
    { type: 'EXECUTIVE', name: 'Executive Summary - Q3', desc: 'High-level overview' },
    { type: 'COST', name: 'Cost Analysis - September', desc: 'Budget tracking' },
    { type: 'WORKFORCE', name: 'Workforce Report - Week 38', desc: 'Attendance trends' },
    { type: 'FINANCIAL', name: 'Financial Report - September', desc: 'Invoices and payments' },
  ];

  const reports = await Promise.all(
    templates.map((t, i) =>
      prisma.report.create({
        data: { name: t.name, type: t.type, description: t.desc, projects: [], organizationId: orgId, createdBy: 'system' },
      })
    )
  );

  const history = [
    { name: 'Executive Summary - Q3', type: 'EXECUTIVE', format: 'PDF', size: 4200000, daysAgo: 3, by: 'Automated Schedule' },
    { name: 'Cost Analysis - September', type: 'COST', format: 'EXCEL', size: 1800000, daysAgo: 18, by: 'Alex Manager' },
    { name: 'Workforce Report - Week 36', type: 'WORKFORCE', format: 'PDF', size: 2400000, daysAgo: 25, by: 'Sarah HR' },
    { name: 'Safety Audit - Marina Bay', type: 'SAFETY', format: 'PDF', size: 3100000, daysAgo: 30, by: 'Mike Safety' },
  ];

  for (const h of history) {
    await prisma.generatedReport.create({
      data: {
        reportId: reports[Math.floor(Math.random() * reports.length)].id,
        organizationId: orgId,
        name: h.name,
        type: h.type,
        format: h.format,
        status: 'COMPLETED',
        fileSize: h.size,
        generatedBy: h.by,
        generatedAt: new Date(Date.now() - h.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Seed one schedule
  await prisma.reportSchedule.create({
    data: {
      reportId: reports[0].id,
      reportType: reports[0].type,
      name: 'Weekly Executive Summary',
      frequency: 'WEEKLY',
      projects: [],
      recipients: ['manager@grovyn.com'],
      enabled: true,
      nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      organizationId: orgId,
      createdBy: 'system',
    },
  });

  console.log(`  → Seeded reports: ${templates.length} templates, ${history.length} history, 1 schedule`);
}