import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { subDays, subMonths, addMonths, addDays } from 'date-fns';

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

const ATT_ON = [{ day: 'Mon', present: true, late: false }, { day: 'Tue', present: true, late: false }, { day: 'Wed', present: true, late: false }, { day: 'Thu', present: true, late: false }, { day: 'Fri', present: false, late: false }];
const ATT_LT = [{ day: 'Mon', present: true, late: false }, { day: 'Tue', present: true, late: false }, { day: 'Wed', present: true, late: false }, { day: 'Thu', present: true, late: true  }, { day: 'Fri', present: false, late: false }];
const ATT_AB = [{ day: 'Mon', present: true, late: false }, { day: 'Tue', present: true, late: false }, { day: 'Wed', present: true, late: false }, { day: 'Thu', present: false, late: false }, { day: 'Fri', present: false, late: false }];
const ATT_LV = [{ day: 'Mon', present: false, late: false }, { day: 'Tue', present: false, late: false }, { day: 'Wed', present: false, late: false }, { day: 'Thu', present: false, late: false }, { day: 'Fri', present: false, late: false }];

function act(action: string, time: string, type: string) { return { action, time, type }; }

// projectCode -> Worker[] (projects will be resolved by code at seed time)
type WorkerSeedEntry = {
  name: string; initials: string; role: string; trade: string; type: 'EMPLOYEE' | 'SUBCONTRACTOR';
  projectCode: string; phone: string; email: string; status: 'ACTIVE' | 'LATE' | 'ABSENT' | 'ON_LEAVE';
  experienceYears: number; shift: 'DAY' | 'NIGHT'; attendancePercent: number; lastCheckIn: string;
  supervisor: string; emergencyContact: object; skills: string[]; certifications: object[];
  ppeCompliant: boolean; weeklyAttendance: object[]; recentActivity: object[];
};

const WORKER_SEEDS: WorkerSeedEntry[] = [
  { name: 'Rajesh Kumar', initials: 'RK', role: 'Site Supervisor', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43210', email: 'rajesh.kumar@sitepilot.in', status: 'ACTIVE', experienceYears: 12, shift: 'DAY', attendancePercent: 95, lastCheckIn: 'Today, 07:32 AM', supervisor: 'Ananya Krishnan', emergencyContact: { name: 'Sunita Kumar', phone: '+91 98766 00001', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, FA_C, HS_C, OS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:32 AM', 'checkin'), act('Submitted daily progress report', 'Yesterday, 05:45 PM', 'report'), act('Attended safety briefing', '2 days ago', 'training')] },
  { name: 'Suresh Sharma', initials: 'SS', role: 'Foundation Specialist', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-002', phone: '+91 98765 43211', email: 'suresh.sharma@sitepilot.in', status: 'ACTIVE', experienceYears: 8, shift: 'DAY', attendancePercent: 89, lastCheckIn: 'Today, 07:55 AM', supervisor: 'Rajesh Kumar', emergencyContact: { name: 'Kavita Sharma', phone: '+91 98766 00002', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, FA_C, HS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 2', 'Today, 07:55 AM', 'checkin'), act('Foundation pour completed – Grid F4', 'Yesterday, 04:00 PM', 'report'), act('PPE inspection passed', '3 days ago', 'inspection')] },
  { name: 'Dinesh Patel', initials: 'DP', role: 'Excavation Operator', trade: 'Civil', type: 'SUBCONTRACTOR', projectCode: 'GRV-003', phone: '+91 98765 43212', email: 'dinesh.patel@sitepilot.in', status: 'ACTIVE', experienceYears: 6, shift: 'DAY', attendancePercent: 91, lastCheckIn: 'Today, 07:48 AM', supervisor: 'Rajesh Kumar', emergencyContact: { name: 'Meena Patel', phone: '+91 98766 00003', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 3', 'Today, 07:48 AM', 'checkin'), act('Excavation at B-block completed', 'Yesterday, 06:00 PM', 'report'), act('Assigned to Phase 2', '5 days ago', 'assignment')] },
  { name: 'Mahesh Yadav', initials: 'MY', role: 'Grading Specialist', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43213', email: 'mahesh.yadav@sitepilot.in', status: 'LATE', experienceYears: 10, shift: 'DAY', attendancePercent: 82, lastCheckIn: 'Today, 09:20 AM', supervisor: 'Rajesh Kumar', emergencyContact: { name: 'Priya Yadav', phone: '+91 98766 00004', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, FA_E, HS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_LT, recentActivity: [act('Checked in late (09:20 AM)', 'Today, 09:20 AM', 'checkin'), act('First Aid cert expiring in 11 days', '2 days ago', 'alert'), act('Grading report submitted', '3 days ago', 'report')] },
  { name: 'Ramesh Singh', initials: 'RS', role: 'Civil Supervisor', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-002', phone: '+91 98765 43214', email: 'ramesh.singh@sitepilot.in', status: 'ACTIVE', experienceYears: 15, shift: 'DAY', attendancePercent: 97, lastCheckIn: 'Today, 07:15 AM', supervisor: 'Ananya Krishnan', emergencyContact: { name: 'Geeta Singh', phone: '+91 98766 00005', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, FA_C, HS_C, OS_C, MF_C, PP_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:15 AM', 'checkin'), act('Approved daily work plan', 'Today, 08:00 AM', 'approval'), act('Safety walkthrough completed', 'Yesterday, 03:00 PM', 'inspection')] },
  { name: 'Arun Mishra', initials: 'AM', role: 'Formwork Carpenter', trade: 'Civil', type: 'SUBCONTRACTOR', projectCode: 'GRV-004', phone: '+91 98765 43215', email: 'arun.mishra@sitepilot.in', status: 'ACTIVE', experienceYears: 5, shift: 'DAY', attendancePercent: 87, lastCheckIn: 'Today, 08:02 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Rekha Mishra', phone: '+91 98766 00006', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 08:02 AM', 'checkin'), act('Column formwork assembled – Grid A5', 'Yesterday, 05:00 PM', 'report'), act('Submitted weekly timesheet', '5 days ago', 'report')] },
  { name: 'Narendra Kumar', initials: 'NK', role: 'Ground Leveling Worker', trade: 'Civil', type: 'SUBCONTRACTOR', projectCode: 'GRV-001', phone: '+91 98765 43216', email: 'narendra.kumar@sitepilot.in', status: 'ABSENT', experienceYears: 3, shift: 'DAY', attendancePercent: 71, lastCheckIn: 'Yesterday, 05:30 PM', supervisor: 'Rajesh Kumar', emergencyContact: { name: 'Lata Kumar', phone: '+91 98766 00007', relation: 'Wife' }, skills: W_CIVIL.slice(0,3), certifications: [CV_X, MF_X, PP_X], ppeCompliant: false, weeklyAttendance: ATT_AB, recentActivity: [act('Absent – no notification', 'Today', 'alert'), act('Safety cert expired 37 days ago', '37 days ago', 'alert'), act('PPE non-compliance flagged', '40 days ago', 'alert')] },
  { name: 'Pankaj Verma', initials: 'PV', role: 'Civil Technician', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43217', email: 'pankaj.verma@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'NIGHT', attendancePercent: 88, lastCheckIn: 'Today, 08:30 PM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Anita Verma', phone: '+91 98766 00008', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, FA_C, HS_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Night shift check-in', 'Today, 08:30 PM', 'checkin'), act('Slab pour at Level 4 completed', 'Yesterday, 06:00 AM', 'report'), act('Safety equipment checked', '2 days ago', 'inspection')] },
  { name: 'Santosh Gupta', initials: 'SG', role: 'Foundation Inspector', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43218', email: 'santosh.gupta@sitepilot.in', status: 'ACTIVE', experienceYears: 11, shift: 'DAY', attendancePercent: 94, lastCheckIn: 'Today, 07:40 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Shanti Gupta', phone: '+91 98766 00009', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, FA_C, OS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 2', 'Today, 07:40 AM', 'checkin'), act('Foundation inspection report filed', 'Yesterday, 04:30 PM', 'report'), act('Concrete quality test passed', '3 days ago', 'inspection')] },
  { name: 'Vinod Chauhan', initials: 'VC', role: 'Drain Layer', trade: 'Civil', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43219', email: 'vinod.chauhan@sitepilot.in', status: 'ACTIVE', experienceYears: 7, shift: 'DAY', attendancePercent: 83, lastCheckIn: 'Today, 08:05 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Savita Chauhan', phone: '+91 98766 00010', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Site Gate', 'Today, 08:05 AM', 'checkin'), act('Storm drain installation – Zone 4 Ch 14-16', 'Yesterday, 05:15 PM', 'report'), act('Attended toolbox talk', '2 days ago', 'training')] },
  { name: 'Mohan Lal', initials: 'ML', role: 'Site Helper', trade: 'Civil', type: 'SUBCONTRACTOR', projectCode: 'GRV-004', phone: '+91 98765 43220', email: 'mohan.lal@sitepilot.in', status: 'ON_LEAVE', experienceYears: 2, shift: 'DAY', attendancePercent: 78, lastCheckIn: '5 days ago', supervisor: 'Arun Mishra', emergencyContact: { name: 'Maya Lal', phone: '+91 98766 00011', relation: 'Wife' }, skills: W_CIVIL.slice(0,3), certifications: [CV_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_LV, recentActivity: [act('Leave approved – personal', '5 days ago', 'leave'), act('Returned tools to store', '5 days ago', 'general'), act('Last attendance: Friday', '5 days ago', 'checkin')] },
  { name: 'Deepak Rawat', initials: 'DR', role: 'Concreting Worker', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43221', email: 'deepak.rawat@sitepilot.in', status: 'ACTIVE', experienceYears: 4, shift: 'DAY', attendancePercent: 85, lastCheckIn: 'Today, 07:52 AM', supervisor: 'Rajesh Kumar', emergencyContact: { name: 'Nisha Rawat', phone: '+91 98766 00012', relation: 'Wife' }, skills: W_CIVIL, certifications: [CV_C, FA_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:52 AM', 'checkin'), act('Column pour at Level 8 – complete', 'Yesterday, 06:30 PM', 'report'), act('PPE full compliance – spot check', '4 days ago', 'inspection')] },
  { name: 'Rohit Kumar', initials: 'RoK', role: 'Survey Assistant', trade: 'Civil', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43222', email: 'rohit.kumar@sitepilot.in', status: 'ACTIVE', experienceYears: 3, shift: 'DAY', attendancePercent: 88, lastCheckIn: 'Today, 07:58 AM', supervisor: 'Pankaj Verma', emergencyContact: { name: 'Pooja Kumar', phone: '+91 98766 00013', relation: 'Sister' }, skills: W_CIVIL, certifications: [CV_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 3', 'Today, 07:58 AM', 'checkin'), act('Survey data uploaded for Phase 1', 'Yesterday, 04:00 PM', 'report'), act('Total station calibrated', '3 days ago', 'general')] },
  { name: 'Alok Pandey', initials: 'AP', role: 'Ground Worker', trade: 'Civil', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43223', email: 'alok.pandey@sitepilot.in', status: 'LATE', experienceYears: 5, shift: 'DAY', attendancePercent: 79, lastCheckIn: 'Today, 09:45 AM', supervisor: 'Vinod Chauhan', emergencyContact: { name: 'Sarla Pandey', phone: '+91 98766 00014', relation: 'Mother' }, skills: W_CIVIL.slice(0,3), certifications: [CV_E, HS_E, MF_E], ppeCompliant: true, weeklyAttendance: ATT_LT, recentActivity: [act('Checked in late (09:45 AM)', 'Today, 09:45 AM', 'checkin'), act('3 certs expiring within 30 days', '1 day ago', 'alert'), act('Excavation – Zone 4 access road', 'Yesterday, 05:00 PM', 'report')] },
  { name: 'Vikram Reddy', initials: 'VR', role: 'Lead Electrician', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43224', email: 'vikram.reddy@sitepilot.in', status: 'ACTIVE', experienceYears: 14, shift: 'DAY', attendancePercent: 96, lastCheckIn: 'Today, 07:28 AM', supervisor: 'Srinivasa Rao', emergencyContact: { name: 'Padmaja Reddy', phone: '+91 98766 00015', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, FA_C, OS_C, MF_C, PP_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:28 AM', 'checkin'), act('Main DB panel Level 10 commissioned', 'Yesterday, 05:00 PM', 'report'), act('Electrical safety audit passed', '2 days ago', 'inspection')] },
  { name: 'Chandrasekhar Rao', initials: 'CR', role: 'Panel Technician', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43225', email: 'chandrasekhar.rao@sitepilot.in', status: 'ACTIVE', experienceYears: 10, shift: 'DAY', attendancePercent: 93, lastCheckIn: 'Today, 07:42 AM', supervisor: 'Vikram Reddy', emergencyContact: { name: 'Vasantha Rao', phone: '+91 98766 00016', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, FA_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 3', 'Today, 07:42 AM', 'checkin'), act('LV panel installation – Phase 1', 'Yesterday, 04:30 PM', 'report'), act('Cable tray installation complete', '2 days ago', 'report')] },
  { name: 'Venkatesh Pillai', initials: 'VP', role: 'Wiring Specialist', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43226', email: 'venkatesh.pillai@sitepilot.in', status: 'ACTIVE', experienceYears: 8, shift: 'DAY', attendancePercent: 91, lastCheckIn: 'Today, 07:50 AM', supervisor: 'Vikram Reddy', emergencyContact: { name: 'Lalitha Pillai', phone: '+91 98766 00017', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, HS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:50 AM', 'checkin'), act('Conduit wiring Floors 11-13 complete', 'Yesterday, 06:00 PM', 'report'), act('Attended earthing training', '4 days ago', 'training')] },
  { name: 'Murugan Ramasamy', initials: 'MR', role: 'Cable Technician', trade: 'Electrical', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43227', email: 'murugan.ramasamy@sitepilot.in', status: 'LATE', experienceYears: 6, shift: 'DAY', attendancePercent: 84, lastCheckIn: 'Today, 09:10 AM', supervisor: 'Vikram Reddy', emergencyContact: { name: 'Kavitha Ramasamy', phone: '+91 98766 00018', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_E, MF_C], ppeCompliant: true, weeklyAttendance: ATT_LT, recentActivity: [act('Checked in late (09:10 AM)', 'Today, 09:10 AM', 'checkin'), act('Electrical cert expiring in 15 days', '1 day ago', 'alert'), act('HV cable pulling – Zone 4', 'Yesterday, 05:30 PM', 'report')] },
  { name: 'Krishnan Nair', initials: 'KN', role: 'Electrical Inspector', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43228', email: 'krishnan.nair@sitepilot.in', status: 'ACTIVE', experienceYears: 12, shift: 'DAY', attendancePercent: 95, lastCheckIn: 'Today, 07:35 AM', supervisor: 'Srinivasa Rao', emergencyContact: { name: 'Sreelekha Nair', phone: '+91 98766 00019', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, OS_C, FA_C, MF_C, PP_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 3', 'Today, 07:35 AM', 'checkin'), act('Electrical inspection report filed', 'Yesterday, 04:00 PM', 'report'), act('IR testing complete – Block C', '2 days ago', 'inspection')] },
  { name: 'Subramanian Menon', initials: 'SM', role: 'LV Electrician', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-004', phone: '+91 98765 43229', email: 'subramanian.menon@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'DAY', attendancePercent: 89, lastCheckIn: 'Today, 07:55 AM', supervisor: 'Vikram Reddy', emergencyContact: { name: 'Vimala Menon', phone: '+91 98766 00020', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, FA_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 2', 'Today, 07:55 AM', 'checkin'), act('LV wiring – Floors 2 & 3 complete', 'Yesterday, 05:00 PM', 'report'), act('Attended electrical safety module', '3 days ago', 'training')] },
  { name: 'Balaji Hegde', initials: 'BH', role: 'Electrician Helper', trade: 'Electrical', type: 'SUBCONTRACTOR', projectCode: 'GRV-001', phone: '+91 98765 43230', email: 'balaji.hegde@sitepilot.in', status: 'ABSENT', experienceYears: 3, shift: 'DAY', attendancePercent: 72, lastCheckIn: 'Yesterday, 05:30 PM', supervisor: 'Venkatesh Pillai', emergencyContact: { name: 'Shantala Hegde', phone: '+91 98766 00021', relation: 'Mother' }, skills: W_ELEC.slice(0,3), certifications: [EL_X, MF_X, PP_X], ppeCompliant: false, weeklyAttendance: ATT_AB, recentActivity: [act('Absent – no notification', 'Today', 'alert'), act('Electrical cert expired 64 days ago', '64 days ago', 'alert'), act('PPE non-compliance recorded', '70 days ago', 'alert')] },
  { name: 'Nagaraju Naidu', initials: 'NN', role: 'HV Technician', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43231', email: 'nagaraju.naidu@sitepilot.in', status: 'ACTIVE', experienceYears: 11, shift: 'NIGHT', attendancePercent: 87, lastCheckIn: 'Today, 08:00 PM', supervisor: 'Vikram Reddy', emergencyContact: { name: 'Sarada Naidu', phone: '+91 98766 00022', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, OS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Night shift check-in', 'Today, 08:00 PM', 'checkin'), act('HV substation energisation complete', 'Yesterday, 05:00 AM', 'report'), act('Thermography scan submitted', '3 days ago', 'inspection')] },
  { name: 'Ramakrishna Iyer', initials: 'RI', role: 'Testing Specialist', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-002', phone: '+91 98765 43232', email: 'ramakrishna.iyer@sitepilot.in', status: 'ACTIVE', experienceYears: 16, shift: 'DAY', attendancePercent: 98, lastCheckIn: 'Today, 07:20 AM', supervisor: 'Ananya Krishnan', emergencyContact: { name: 'Gomathi Iyer', phone: '+91 98766 00023', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, FA_C, OS_C, MF_C, PP_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:20 AM', 'checkin'), act('PAT testing – 200 units cleared', 'Yesterday, 04:00 PM', 'report'), act('Weekly quality report submitted', '5 days ago', 'report')] },
  { name: 'Srinivasa Rao', initials: 'SR', role: 'Commissioning Engineer', trade: 'Electrical', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43233', email: 'srinivasa.rao@sitepilot.in', status: 'ON_LEAVE', experienceYears: 13, shift: 'DAY', attendancePercent: 90, lastCheckIn: '3 days ago', supervisor: 'Ananya Krishnan', emergencyContact: { name: 'Durga Rao', phone: '+91 98766 00024', relation: 'Wife' }, skills: W_ELEC, certifications: [CV_C, EL_C, OS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_LV, recentActivity: [act('Leave approved – family', '3 days ago', 'leave'), act('Commissioning plan shared', '4 days ago', 'report'), act('Handover to Vikram Reddy', '3 days ago', 'general')] },
  { name: 'Arjun Thakur', initials: 'AT', role: 'Lead Steel Fixer', trade: 'Steel Fixing', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43234', email: 'arjun.thakur@sitepilot.in', status: 'ACTIVE', experienceYears: 13, shift: 'DAY', attendancePercent: 94, lastCheckIn: 'Today, 07:30 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Priti Thakur', phone: '+91 98766 00025', relation: 'Wife' }, skills: W_STEEL, certifications: [CV_C, FA_C, HS_C, OS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:30 AM', 'checkin'), act('Column rebar – Level 14 tied', 'Yesterday, 05:30 PM', 'report'), act('Rebar delivery inspected', '2 days ago', 'inspection')] },
  { name: 'Bharat Bhushan', initials: 'BB', role: 'Rebar Specialist', trade: 'Steel Fixing', type: 'SUBCONTRACTOR', projectCode: 'GRV-003', phone: '+91 98765 43235', email: 'bharat.bhushan@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'DAY', attendancePercent: 88, lastCheckIn: 'Today, 07:52 AM', supervisor: 'Arjun Thakur', emergencyContact: { name: 'Usha Bhushan', phone: '+91 98766 00026', relation: 'Wife' }, skills: W_STEEL, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 3', 'Today, 07:52 AM', 'checkin'), act('Slab rebar Phase 1C – 60% complete', 'Yesterday, 05:00 PM', 'report'), act('Approved BBS for Block D', '3 days ago', 'approval')] },
  { name: 'Devendra Mehra', initials: 'DM', role: 'Structural Steel Fixer', trade: 'Steel Fixing', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43236', email: 'devendra.mehra@sitepilot.in', status: 'ACTIVE', experienceYears: 7, shift: 'DAY', attendancePercent: 85, lastCheckIn: 'Today, 08:00 AM', supervisor: 'Arjun Thakur', emergencyContact: { name: 'Kamla Mehra', phone: '+91 98766 00027', relation: 'Wife' }, skills: W_STEEL, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Site Gate', 'Today, 08:00 AM', 'checkin'), act('Culvert rebar Zone 4 – top slab done', 'Yesterday, 04:30 PM', 'report'), act('Steel quantity reconciliation submitted', '4 days ago', 'report')] },
  { name: 'Lokesh Bajpai', initials: 'LB', role: 'Steel Inspector', trade: 'Steel Fixing', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43237', email: 'lokesh.bajpai@sitepilot.in', status: 'LATE', experienceYears: 11, shift: 'DAY', attendancePercent: 80, lastCheckIn: 'Today, 09:35 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Meena Bajpai', phone: '+91 98766 00028', relation: 'Wife' }, skills: W_STEEL, certifications: [CV_C, HS_E, FA_E, MF_C], ppeCompliant: true, weeklyAttendance: ATT_LT, recentActivity: [act('Checked in late (09:35 AM)', 'Today, 09:35 AM', 'checkin'), act('2 certifications expiring soon', '2 days ago', 'alert'), act('Rebar inspection report – Level 13', 'Yesterday, 05:00 PM', 'report')] },
  { name: 'Tarun Thakur', initials: 'TT', role: 'Rebar Bender', trade: 'Steel Fixing', type: 'SUBCONTRACTOR', projectCode: 'GRV-003', phone: '+91 98765 43238', email: 'tarun.thakur@sitepilot.in', status: 'ACTIVE', experienceYears: 5, shift: 'DAY', attendancePercent: 82, lastCheckIn: 'Today, 08:10 AM', supervisor: 'Arjun Thakur', emergencyContact: { name: 'Ritu Thakur', phone: '+91 98766 00029', relation: 'Sister' }, skills: W_STEEL, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 3', 'Today, 08:10 AM', 'checkin'), act('200 stirrups fabricated', 'Yesterday, 05:30 PM', 'report'), act('Assigned to foundation rebar', '4 days ago', 'assignment')] },
  { name: 'Harish Garg', initials: 'HG', role: 'Structural Welder', trade: 'Steel Fixing', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43239', email: 'harish.garg@sitepilot.in', status: 'ACTIVE', experienceYears: 10, shift: 'DAY', attendancePercent: 91, lastCheckIn: 'Today, 07:45 AM', supervisor: 'Arjun Thakur', emergencyContact: { name: 'Seema Garg', phone: '+91 98766 00030', relation: 'Wife' }, skills: W_STEEL, certifications: [CV_C, FA_C, HS_C, OS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:45 AM', 'checkin'), act('Shear connector welding – Level 9 done', 'Yesterday, 06:00 PM', 'report'), act('Welding procedure qualification passed', '3 days ago', 'inspection')] },
  { name: 'Sunil Shukla', initials: 'SSh', role: 'Rebar Fixer', trade: 'Steel Fixing', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43240', email: 'sunil.shukla@sitepilot.in', status: 'ABSENT', experienceYears: 4, shift: 'DAY', attendancePercent: 75, lastCheckIn: 'Yesterday, 05:30 PM', supervisor: 'Arjun Thakur', emergencyContact: { name: 'Pushpa Shukla', phone: '+91 98766 00031', relation: 'Mother' }, skills: W_STEEL.slice(0,3), certifications: [CV_X, MF_X, PP_X], ppeCompliant: false, weeklyAttendance: ATT_AB, recentActivity: [act('Absent – no notification', 'Today', 'alert'), act('Safety cert expired 37 days ago', '37 days ago', 'alert'), act('PPE non-compliance flagged', '42 days ago', 'alert')] },
  { name: 'Nitin Singh', initials: 'NS', role: 'Steel Rigger', trade: 'Steel Fixing', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43241', email: 'nitin.singh@sitepilot.in', status: 'ACTIVE', experienceYears: 8, shift: 'DAY', attendancePercent: 87, lastCheckIn: 'Today, 07:58 AM', supervisor: 'Arjun Thakur', emergencyContact: { name: 'Anjali Singh', phone: '+91 98766 00032', relation: 'Wife' }, skills: W_STEEL, certifications: [CV_C, FA_C, HS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 3', 'Today, 07:58 AM', 'checkin'), act('Steel beam erection – Grid J3 to J7', 'Yesterday, 05:15 PM', 'report'), act('Rigging inspection passed', '2 days ago', 'inspection')] },
  { name: 'Mohammed Shaikh', initials: 'MS', role: 'Concrete Foreman', trade: 'Concrete', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43242', email: 'mohammed.shaikh@sitepilot.in', status: 'ACTIVE', experienceYears: 15, shift: 'DAY', attendancePercent: 97, lastCheckIn: 'Today, 07:25 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Fatima Shaikh', phone: '+91 98766 00033', relation: 'Wife' }, skills: W_CONCRETE, certifications: [CV_C, FA_C, OS_C, MF_C, PP_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:25 AM', 'checkin'), act('Concrete pour Level 15 – 240 m³ complete', 'Yesterday, 08:00 PM', 'report'), act('Batching plant inspection done', '2 days ago', 'inspection')] },
  { name: 'Salim Khan', initials: 'SK', role: 'Pump Operator', trade: 'Concrete', type: 'SUBCONTRACTOR', projectCode: 'GRV-003', phone: '+91 98765 43243', email: 'salim.khan@sitepilot.in', status: 'ACTIVE', experienceYears: 8, shift: 'DAY', attendancePercent: 86, lastCheckIn: 'Today, 07:50 AM', supervisor: 'Mohammed Shaikh', emergencyContact: { name: 'Reshma Khan', phone: '+91 98766 00034', relation: 'Wife' }, skills: W_CONCRETE, certifications: [CV_C, EQ_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 3', 'Today, 07:50 AM', 'checkin'), act('Concrete pump serviced and ready', 'Yesterday, 07:00 AM', 'general'), act('Phase 1 slabs – pumping complete', '2 days ago', 'report')] },
  { name: 'Raza Hussain', initials: 'RH', role: 'Concrete Finisher', trade: 'Concrete', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43244', email: 'raza.hussain@sitepilot.in', status: 'ACTIVE', experienceYears: 11, shift: 'DAY', attendancePercent: 93, lastCheckIn: 'Today, 07:40 AM', supervisor: 'Mohammed Shaikh', emergencyContact: { name: 'Zarina Hussain', phone: '+91 98766 00035', relation: 'Wife' }, skills: W_CONCRETE, certifications: [CV_C, FA_C, MF_C, OS_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:40 AM', 'checkin'), act('Floor finishing Level 12 – 80% done', 'Yesterday, 05:00 PM', 'report'), act('Concrete cube test results filed', '3 days ago', 'report')] },
  { name: 'Imran Ali', initials: 'IA', role: 'Batching Technician', trade: 'Concrete', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43245', email: 'imran.ali@sitepilot.in', status: 'LATE', experienceYears: 6, shift: 'NIGHT', attendancePercent: 81, lastCheckIn: 'Today, 09:50 PM', supervisor: 'Mohammed Shaikh', emergencyContact: { name: 'Sabina Ali', phone: '+91 98766 00036', relation: 'Wife' }, skills: W_CONCRETE, certifications: [CV_E, FA_E, MF_E], ppeCompliant: true, weeklyAttendance: ATT_LT, recentActivity: [act('Checked in late (09:50 PM)', 'Today, 09:50 PM', 'checkin'), act('3 certifications expiring this month', '2 days ago', 'alert'), act('Batching plant calibration', 'Yesterday, 10:00 PM', 'general')] },
  { name: 'Noor Ahmed', initials: 'NA', role: 'Quality Inspector', trade: 'Concrete', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43246', email: 'noor.ahmed@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'DAY', attendancePercent: 89, lastCheckIn: 'Today, 07:48 AM', supervisor: 'Mohammed Shaikh', emergencyContact: { name: 'Ayesha Ahmed', phone: '+91 98766 00037', relation: 'Wife' }, skills: W_CONCRETE, certifications: [CV_C, FA_C, OS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:48 AM', 'checkin'), act('Concrete QC report submitted', 'Yesterday, 04:00 PM', 'report'), act('Compression test batch – all passed', '3 days ago', 'inspection')] },
  { name: 'Yusuf Khan', initials: 'YK', role: 'Concreting Helper', trade: 'Concrete', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43247', email: 'yusuf.khan@sitepilot.in', status: 'ABSENT', experienceYears: 7, shift: 'DAY', attendancePercent: 77, lastCheckIn: 'Yesterday, 05:30 PM', supervisor: 'Raza Hussain', emergencyContact: { name: 'Hina Khan', phone: '+91 98766 00038', relation: 'Wife' }, skills: W_CONCRETE.slice(0,3), certifications: [CV_X, MF_X], ppeCompliant: false, weeklyAttendance: ATT_AB, recentActivity: [act('Absent – no notification', 'Today', 'alert'), act('Safety cert expired 37 days ago', '37 days ago', 'alert'), act('Medical fitness expired 3 months ago', '90 days ago', 'alert')] },
  { name: 'Kuldeep Arora', initials: 'KA', role: 'Mechanical Engineer', trade: 'Mechanical', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43248', email: 'kuldeep.arora@sitepilot.in', status: 'ACTIVE', experienceYears: 14, shift: 'DAY', attendancePercent: 96, lastCheckIn: 'Today, 07:30 AM', supervisor: 'Ananya Krishnan', emergencyContact: { name: 'Neha Arora', phone: '+91 98766 00039', relation: 'Wife' }, skills: W_MECH, certifications: [CV_C, FA_C, OS_C, MF_C, PP_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:30 AM', 'checkin'), act('HVAC duct installation – Floors 5-7', 'Yesterday, 05:30 PM', 'report'), act('Pressure test – all systems passed', '2 days ago', 'inspection')] },
  { name: 'Gurpreet Singh', initials: 'GS', role: 'HVAC Technician', trade: 'Mechanical', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43249', email: 'gurpreet.singh@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'DAY', attendancePercent: 92, lastCheckIn: 'Today, 07:45 AM', supervisor: 'Kuldeep Arora', emergencyContact: { name: 'Harpreet Kaur', phone: '+91 98766 00040', relation: 'Wife' }, skills: W_MECH, certifications: [CV_C, FA_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 3', 'Today, 07:45 AM', 'checkin'), act('AHU installation Phase 1', 'Yesterday, 04:30 PM', 'report'), act('Refrigerant certification renewed', '3 days ago', 'general')] },
  { name: 'Harjinder Dhillon', initials: 'HD', role: 'Pipe Fitter', trade: 'Mechanical', type: 'SUBCONTRACTOR', projectCode: 'GRV-001', phone: '+91 98765 43250', email: 'harjinder.dhillon@sitepilot.in', status: 'ACTIVE', experienceYears: 7, shift: 'DAY', attendancePercent: 88, lastCheckIn: 'Today, 07:58 AM', supervisor: 'Kuldeep Arora', emergencyContact: { name: 'Amrit Kaur', phone: '+91 98766 00041', relation: 'Wife' }, skills: W_MECH, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:58 AM', 'checkin'), act('Chilled water piping – Floor 6 done', 'Yesterday, 05:00 PM', 'report'), act('Hydro test – no leaks confirmed', '2 days ago', 'inspection')] },
  { name: 'Paramjit Bains', initials: 'PB', role: 'Mechanical Helper', trade: 'Mechanical', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43251', email: 'paramjit.bains@sitepilot.in', status: 'ON_LEAVE', experienceYears: 4, shift: 'DAY', attendancePercent: 79, lastCheckIn: '4 days ago', supervisor: 'Harjinder Dhillon', emergencyContact: { name: 'Jaswinder Bains', phone: '+91 98766 00042', relation: 'Brother' }, skills: W_MECH.slice(0,3), certifications: [CV_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_LV, recentActivity: [act('Leave approved – wedding', '4 days ago', 'leave'), act('Tools returned to store', '4 days ago', 'general'), act('Last check-in: Monday', '4 days ago', 'checkin')] },
  { name: 'Sukhwinder Gill', initials: 'SGi', role: 'Equipment Technician', trade: 'Mechanical', type: 'EMPLOYEE', projectCode: 'GRV-004', phone: '+91 98765 43252', email: 'sukhwinder.gill@sitepilot.in', status: 'ACTIVE', experienceYears: 11, shift: 'DAY', attendancePercent: 91, lastCheckIn: 'Today, 07:40 AM', supervisor: 'Kuldeep Arora', emergencyContact: { name: 'Mandeep Kaur', phone: '+91 98766 00043', relation: 'Wife' }, skills: W_MECH, certifications: [CV_C, FA_C, OS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 2', 'Today, 07:40 AM', 'checkin'), act('Generator maintenance log submitted', 'Yesterday, 04:00 PM', 'report'), act('Compressor oil change – Site machinery', '3 days ago', 'general')] },
  { name: 'Manpreet Kaur', initials: 'MK', role: 'HVAC Inspector', trade: 'Mechanical', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43253', email: 'manpreet.kaur@sitepilot.in', status: 'ACTIVE', experienceYears: 8, shift: 'DAY', attendancePercent: 90, lastCheckIn: 'Today, 07:52 AM', supervisor: 'Kuldeep Arora', emergencyContact: { name: 'Gurjeet Kaur', phone: '+91 98766 00044', relation: 'Mother' }, skills: W_MECH, certifications: [CV_C, FA_C, MF_C, PP_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 3', 'Today, 07:52 AM', 'checkin'), act('Duct leakage test Phase 1B – pass', 'Yesterday, 04:30 PM', 'inspection'), act('HVAC commissioning plan reviewed', '2 days ago', 'report')] },
  { name: 'Ramesh Nair', initials: 'RN', role: 'Lead Mason', trade: 'Masonry', type: 'EMPLOYEE', projectCode: 'GRV-004', phone: '+91 98765 43254', email: 'ramesh.nair@sitepilot.in', status: 'ACTIVE', experienceYears: 16, shift: 'DAY', attendancePercent: 95, lastCheckIn: 'Today, 07:35 AM', supervisor: 'Ananya Krishnan', emergencyContact: { name: 'Saritha Nair', phone: '+91 98766 00045', relation: 'Wife' }, skills: W_MASONRY, certifications: [CV_C, FA_C, OS_C, MF_C, PP_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 2', 'Today, 07:35 AM', 'checkin'), act('Block work – Level 3 complete', 'Yesterday, 05:30 PM', 'report'), act('Masonry quality check submitted', '2 days ago', 'inspection')] },
  { name: 'Pradeep Pillai', initials: 'PP2', role: 'Block Layer', trade: 'Masonry', type: 'SUBCONTRACTOR', projectCode: 'GRV-001', phone: '+91 98765 43255', email: 'pradeep.pillai@sitepilot.in', status: 'ACTIVE', experienceYears: 8, shift: 'DAY', attendancePercent: 84, lastCheckIn: 'Today, 08:00 AM', supervisor: 'Ramesh Nair', emergencyContact: { name: 'Lissy Pillai', phone: '+91 98766 00046', relation: 'Wife' }, skills: W_MASONRY, certifications: [CV_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 08:00 AM', 'checkin'), act('AAC block partition – Level 8 done', 'Yesterday, 05:00 PM', 'report'), act('Mortar mix ratio verified', '3 days ago', 'inspection')] },
  { name: 'Sanjay Menon', initials: 'SjM', role: 'Tile Expert', trade: 'Masonry', type: 'SUBCONTRACTOR', projectCode: 'GRV-003', phone: '+91 98765 43256', email: 'sanjay.menon@sitepilot.in', status: 'ACTIVE', experienceYears: 10, shift: 'DAY', attendancePercent: 87, lastCheckIn: 'Today, 07:55 AM', supervisor: 'Ramesh Nair', emergencyContact: { name: 'Sheela Menon', phone: '+91 98766 00047', relation: 'Wife' }, skills: W_MASONRY, certifications: [CV_C, FA_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 3', 'Today, 07:55 AM', 'checkin'), act('Vitrified tile work – Tower B lobby done', 'Yesterday, 04:30 PM', 'report'), act('Tile layout approved by architect', '3 days ago', 'approval')] },
  { name: 'Anil Krishnan', initials: 'AK', role: 'Plasterer', trade: 'Masonry', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43257', email: 'anil.krishnan@sitepilot.in', status: 'LATE', experienceYears: 6, shift: 'DAY', attendancePercent: 80, lastCheckIn: 'Today, 09:30 AM', supervisor: 'Ramesh Nair', emergencyContact: { name: 'Sindhu Krishnan', phone: '+91 98766 00048', relation: 'Wife' }, skills: W_MASONRY, certifications: [CV_E, MF_E], ppeCompliant: true, weeklyAttendance: ATT_LT, recentActivity: [act('Checked in late (09:30 AM)', 'Today, 09:30 AM', 'checkin'), act('Safety cert expiring in 29 days', '2 days ago', 'alert'), act('External wall plaster – Zone 4', 'Yesterday, 05:30 PM', 'report')] },
  { name: 'Babu Thomas', initials: 'BT', role: 'Mason Helper', trade: 'Masonry', type: 'SUBCONTRACTOR', projectCode: 'GRV-004', phone: '+91 98765 43258', email: 'babu.thomas@sitepilot.in', status: 'ABSENT', experienceYears: 3, shift: 'DAY', attendancePercent: 71, lastCheckIn: 'Yesterday, 05:30 PM', supervisor: 'Ramesh Nair', emergencyContact: { name: 'Mariamma Thomas', phone: '+91 98766 00049', relation: 'Mother' }, skills: W_MASONRY.slice(0,3), certifications: [CV_X, MF_X, PP_X], ppeCompliant: false, weeklyAttendance: ATT_AB, recentActivity: [act('Absent – no notification', 'Today', 'alert'), act('Cert expired – needs renewal', '45 days ago', 'alert'), act('PPE non-compliant – no helmet', '50 days ago', 'alert')] },
  { name: 'Gurdeep Singh', initials: 'GuS', role: 'Crane Operator', trade: 'Equipment Operation', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43259', email: 'gurdeep.singh@sitepilot.in', status: 'ACTIVE', experienceYears: 18, shift: 'DAY', attendancePercent: 98, lastCheckIn: 'Today, 07:10 AM', supervisor: 'Ananya Krishnan', emergencyContact: { name: 'Baljit Kaur', phone: '+91 98766 00050', relation: 'Wife' }, skills: W_EQUIP, certifications: [CV_C, EQ_C, OS_C, FA_C, MF_C, PP_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:10 AM', 'checkin'), act('Tower crane pre-shift inspection done', 'Today, 07:30 AM', 'inspection'), act('Lifted 12 rebar bundles to Level 14', 'Yesterday, 05:00 PM', 'report')] },
  { name: 'Ravinder Yadav', initials: 'RY', role: 'Excavator Operator', trade: 'Equipment Operation', type: 'EMPLOYEE', projectCode: 'GRV-002', phone: '+91 98765 43260', email: 'ravinder.yadav@sitepilot.in', status: 'ACTIVE', experienceYears: 12, shift: 'DAY', attendancePercent: 94, lastCheckIn: 'Today, 07:25 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Kamla Yadav', phone: '+91 98766 00051', relation: 'Wife' }, skills: W_EQUIP, certifications: [CV_C, EQ_C, OS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Site Gate', 'Today, 07:25 AM', 'checkin'), act('Soil excavation – 400 m³ moved', 'Yesterday, 05:30 PM', 'report'), act('Excavator serviced – 250 hr check done', '3 days ago', 'general')] },
  { name: 'Jagdish Prasad', initials: 'JP', role: 'Forklift Operator', trade: 'Equipment Operation', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43261', email: 'jagdish.prasad@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'DAY', attendancePercent: 89, lastCheckIn: 'Today, 07:48 AM', supervisor: 'Gurdeep Singh', emergencyContact: { name: 'Mridula Prasad', phone: '+91 98766 00052', relation: 'Wife' }, skills: W_EQUIP, certifications: [CV_C, EQ_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 3', 'Today, 07:48 AM', 'checkin'), act('Material movement – 80 pallet loads', 'Yesterday, 05:00 PM', 'report'), act('Forklift tyre inspection done', '2 days ago', 'inspection')] },
  { name: 'Ashok Dubey', initials: 'AD', role: 'JCB Operator', trade: 'Equipment Operation', type: 'SUBCONTRACTOR', projectCode: 'GRV-004', phone: '+91 98765 43262', email: 'ashok.dubey@sitepilot.in', status: 'LATE', experienceYears: 7, shift: 'DAY', attendancePercent: 82, lastCheckIn: 'Today, 09:55 AM', supervisor: 'Ravinder Yadav', emergencyContact: { name: 'Reena Dubey', phone: '+91 98766 00053', relation: 'Wife' }, skills: W_EQUIP, certifications: [CV_C, EQ_C, MF_E], ppeCompliant: true, weeklyAttendance: ATT_LT, recentActivity: [act('Checked in late (09:55 AM)', 'Today, 09:55 AM', 'checkin'), act('Medical cert expiring in 5 days', '1 day ago', 'alert'), act('Trenching work – basement', 'Yesterday, 05:30 PM', 'report')] },
  { name: 'Vivek Trivedi', initials: 'VT', role: 'Senior Plumber', trade: 'Plumbing', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43263', email: 'vivek.trivedi@sitepilot.in', status: 'ACTIVE', experienceYears: 11, shift: 'DAY', attendancePercent: 93, lastCheckIn: 'Today, 07:38 AM', supervisor: 'Kuldeep Arora', emergencyContact: { name: 'Swati Trivedi', phone: '+91 98766 00054', relation: 'Wife' }, skills: W_PLUMBING, certifications: [CV_C, FA_C, OS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:38 AM', 'checkin'), act('CPVC pipe installation – Level 9 complete', 'Yesterday, 05:30 PM', 'report'), act('Pressure test – 30 bar, no leaks', '2 days ago', 'inspection')] },
  { name: 'Gaurav Saxena', initials: 'GaS', role: 'Pipe Fitter', trade: 'Plumbing', type: 'EMPLOYEE', projectCode: 'GRV-003', phone: '+91 98765 43264', email: 'gaurav.saxena@sitepilot.in', status: 'ACTIVE', experienceYears: 7, shift: 'DAY', attendancePercent: 88, lastCheckIn: 'Today, 07:52 AM', supervisor: 'Vivek Trivedi', emergencyContact: { name: 'Megha Saxena', phone: '+91 98766 00055', relation: 'Wife' }, skills: W_PLUMBING, certifications: [CV_C, FA_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 3', 'Today, 07:52 AM', 'checkin'), act('Sprinkler pipe layout Phase 1A done', 'Yesterday, 05:00 PM', 'report'), act('Attended plumbing coordination meeting', '3 days ago', 'general')] },
  { name: 'Manoj Bhatt', initials: 'MBh', role: 'Drainage Specialist', trade: 'Plumbing', type: 'SUBCONTRACTOR', projectCode: 'GRV-002', phone: '+91 98765 43265', email: 'manoj.bhatt@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'DAY', attendancePercent: 86, lastCheckIn: 'Today, 07:58 AM', supervisor: 'Vivek Trivedi', emergencyContact: { name: 'Poonam Bhatt', phone: '+91 98766 00056', relation: 'Wife' }, skills: W_PLUMBING, certifications: [CV_C, HS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Site Gate', 'Today, 07:58 AM', 'checkin'), act('Manholes and inspection chambers – Zone 4', 'Yesterday, 05:30 PM', 'report'), act('Drain CCTV inspection report submitted', '4 days ago', 'report')] },
  { name: 'Ramendra Singh', initials: 'RmS', role: 'Lead Carpenter', trade: 'Carpentry', type: 'EMPLOYEE', projectCode: 'GRV-001', phone: '+91 98765 43266', email: 'ramendra.singh@sitepilot.in', status: 'ACTIVE', experienceYears: 13, shift: 'DAY', attendancePercent: 94, lastCheckIn: 'Today, 07:32 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Usha Singh', phone: '+91 98766 00057', relation: 'Wife' }, skills: W_CARPENTRY, certifications: [CV_C, FA_C, OS_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 07:32 AM', 'checkin'), act('Shuttering for Level 16 columns done', 'Yesterday, 05:30 PM', 'report'), act('Plywood quality inspection passed', '2 days ago', 'inspection')] },
  { name: 'Bittu Sharma', initials: 'BiS', role: 'Carpenter Helper', trade: 'Carpentry', type: 'SUBCONTRACTOR', projectCode: 'GRV-003', phone: '+91 98765 43267', email: 'bittu.sharma@sitepilot.in', status: 'ON_LEAVE', experienceYears: 4, shift: 'DAY', attendancePercent: 75, lastCheckIn: '6 days ago', supervisor: 'Ramendra Singh', emergencyContact: { name: 'Rita Sharma', phone: '+91 98766 00058', relation: 'Wife' }, skills: W_CARPENTRY.slice(0,3), certifications: [CV_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_LV, recentActivity: [act('Leave approved – sick leave', '6 days ago', 'leave'), act('Medical documents submitted', '6 days ago', 'general'), act('Expected return: Monday', '6 days ago', 'general')] },
  { name: 'Lalit Gupta', initials: 'LG', role: 'Senior Painter', trade: 'Painting', type: 'SUBCONTRACTOR', projectCode: 'GRV-001', phone: '+91 98765 43268', email: 'lalit.gupta@sitepilot.in', status: 'ACTIVE', experienceYears: 9, shift: 'DAY', attendancePercent: 86, lastCheckIn: 'Today, 08:05 AM', supervisor: 'Ramesh Singh', emergencyContact: { name: 'Savita Gupta', phone: '+91 98766 00059', relation: 'Wife' }, skills: W_PAINTING, certifications: [CV_C, FA_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 1', 'Today, 08:05 AM', 'checkin'), act('Interior primer coat – Floors 4 & 5 done', 'Yesterday, 05:00 PM', 'report'), act('Paint material issued from store', '2 days ago', 'general')] },
  { name: 'Prakash Yadav', initials: 'PrY', role: 'Painter Helper', trade: 'Painting', type: 'SUBCONTRACTOR', projectCode: 'GRV-004', phone: '+91 98765 43269', email: 'prakash.yadav@sitepilot.in', status: 'ACTIVE', experienceYears: 5, shift: 'DAY', attendancePercent: 81, lastCheckIn: 'Today, 08:12 AM', supervisor: 'Lalit Gupta', emergencyContact: { name: 'Sarita Yadav', phone: '+91 98766 00060', relation: 'Wife' }, skills: W_PAINTING, certifications: [CV_C, MF_C], ppeCompliant: true, weeklyAttendance: ATT_ON, recentActivity: [act('Checked in at Gate 2', 'Today, 08:12 AM', 'checkin'), act('Waterproof coat – terrace done', 'Yesterday, 05:30 PM', 'report'), act('Surface preparation – Level 2 complete', '3 days ago', 'report')] },
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
        status:           w.status,
        experienceYears:  w.experienceYears,
        shift:            w.shift,
        attendancePercent: w.attendancePercent,
        lastCheckIn:      w.lastCheckIn,
        supervisor:       w.supervisor,
        projectId,
        emergencyContact: w.emergencyContact,
        skills:           w.skills,
        certifications:   w.certifications,
        ppeCompliant:     w.ppeCompliant,
        weeklyAttendance: w.weeklyAttendance,
        recentActivity:   w.recentActivity,
        organizationId:   orgId,
      },
    });
  }

  console.log(`  → Seeded ${WORKER_SEEDS.length} workers`);
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
    console.log(`  ✓ Done`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
