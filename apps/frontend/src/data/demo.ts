import { addDays, subDays } from 'date-fns';

export const company = {
  name: 'Nexus Infrastructure Pvt Ltd',
  logo: 'NX',
};

export const kpis = {
  activeProjects: 4,
  budgetUtilization: 68.5,
  workforceToday: 1240,
  pendingApprovals: 12,
};

export const activeProjects = [
  {
    id: 'p1',
    name: 'Marina Bay Residential Tower',
    status: 'on-track',
    progress: 45,
    budget: 120000000,
    spent: 54000000,
    manager: 'Sarah Jenkins',
    dueDate: addDays(new Date(), 180).toISOString(),
  },
  {
    id: 'p2',
    name: 'NH-48 Highway Extension',
    status: 'delayed',
    progress: 32,
    budget: 85000000,
    spent: 31000000,
    manager: 'Michael Chen',
    dueDate: addDays(new Date(), 240).toISOString(),
  },
  {
    id: 'p3',
    name: 'Smart City Sector 9',
    status: 'on-track',
    progress: 78,
    budget: 210000000,
    spent: 160000000,
    manager: 'Elena Rostova',
    dueDate: addDays(new Date(), 45).toISOString(),
  },
  {
    id: 'p4',
    name: 'Riverside Commercial Complex',
    status: 'at-risk',
    progress: 12,
    budget: 45000000,
    spent: 8000000,
    manager: 'David Kumar',
    dueDate: addDays(new Date(), 320).toISOString(),
  },
];

export const budgetTrendData = [
  { month: 'Jan', budget: 10000000, spend: 9500000 },
  { month: 'Feb', budget: 20000000, spend: 18000000 },
  { month: 'Mar', budget: 35000000, spend: 36000000 },
  { month: 'Apr', budget: 45000000, spend: 42000000 },
  { month: 'May', budget: 55000000, spend: 54000000 },
  { month: 'Jun', budget: 70000000, spend: 72000000 },
  { month: 'Jul', budget: 85000000, spend: 81000000 },
];

export const workforceTrendData = [
  { day: 'Mon', workers: 1150 },
  { day: 'Tue', workers: 1200 },
  { day: 'Wed', workers: 1220 },
  { day: 'Thu', workers: 1240 },
  { day: 'Fri', workers: 1180 },
  { day: 'Sat', workers: 850 },
  { day: 'Sun', workers: 400 },
];

export const recentActivity = [
  {
    id: 'a1',
    user: 'Sarah Jenkins',
    action: 'approved the revised structural drawings for',
    target: 'Marina Bay Residential Tower',
    time: '2 hours ago',
    type: 'approval',
  },
  {
    id: 'a2',
    user: 'System',
    action: 'flagged a potential budget overrun in',
    target: 'Riverside Commercial Complex',
    time: '4 hours ago',
    type: 'alert',
  },
  {
    id: 'a3',
    user: 'Michael Chen',
    action: 'submitted the daily progress report for',
    target: 'NH-48 Highway Extension',
    time: '5 hours ago',
    type: 'report',
  },
  {
    id: 'a4',
    user: 'Elena Rostova',
    action: 'requested an additional 50 tons of TMT steel for',
    target: 'Smart City Sector 9',
    time: '1 day ago',
    type: 'material',
  },
];

export const aiInsights = [
  {
    id: 'ai1',
    title: 'Schedule Risk',
    description: 'NH-48 Highway Extension is trending 12 days behind schedule due to recent weather delays. Reallocating 2 excavators from Smart City Sector 9 could recover 5 days.',
    type: 'warning',
  },
  {
    id: 'ai2',
    title: 'Budget Optimization',
    description: 'Bulk ordering cement for Marina Bay and Riverside complexes this week could save approximately $14,500 based on current supplier pricing trends.',
    type: 'opportunity',
  },
];

export const weatherAlerts = {
  location: 'Multiple Sites',
  current: 'Partly Cloudy',
  temp: '28°C',
  forecast: 'Heavy rain expected on Thursday. NH-48 earthworks may be delayed.',
};

export const projectDetails: Record<string, any> = {
  p1: {
    id: 'p1',
    name: 'Marina Bay Residential Tower',
    status: 'on-track',
    progress: 45,
    budget: 120000000,
    spent: 54000000,
    manager: 'Sarah Jenkins',
    startDate: subDays(new Date(), 120).toISOString(),
    dueDate: addDays(new Date(), 180).toISOString(),
    location: 'Marina Bay, South District',
    description: 'A 42-story luxury residential tower featuring 240 units, underground parking, and a rooftop infinity pool.',
    team: [
      { id: 'u1', name: 'Sarah Jenkins', role: 'Project Manager', email: 'sarah.j@nexus.com', avatar: 'SJ' },
      { id: 'u2', name: 'Marcus Cole', role: 'Lead Architect', email: 'marcus.c@nexus.com', avatar: 'MC' },
      { id: 'u3', name: 'David Chen', role: 'Site Supervisor', email: 'david.c@nexus.com', avatar: 'DC' },
      { id: 'u4', name: 'Elena Rodriguez', role: 'Safety Officer', email: 'elena.r@nexus.com', avatar: 'ER' },
    ],
    budgetBreakdown: [
      { category: 'Materials', allocated: 45000000, spent: 22000000 },
      { category: 'Labor', allocated: 40000000, spent: 18000000 },
      { category: 'Equipment', allocated: 20000000, spent: 11000000 },
      { category: 'Permits & Misc', allocated: 15000000, spent: 3000000 },
    ],
    timeline: [
      { id: 't1', title: 'Site Preparation & Excavation', status: 'completed', start: subDays(new Date(), 120).toISOString(), end: subDays(new Date(), 90).toISOString() },
      { id: 't2', title: 'Foundation & Substructure', status: 'completed', start: subDays(new Date(), 90).toISOString(), end: subDays(new Date(), 30).toISOString() },
      { id: 't3', title: 'Superstructure (Floors 1-20)', status: 'in-progress', start: subDays(new Date(), 30).toISOString(), end: addDays(new Date(), 60).toISOString() },
      { id: 't4', title: 'Superstructure (Floors 21-42)', status: 'pending', start: addDays(new Date(), 60).toISOString(), end: addDays(new Date(), 120).toISOString() },
      { id: 't5', title: 'Interior Finishing', status: 'pending', start: addDays(new Date(), 90).toISOString(), end: addDays(new Date(), 180).toISOString() },
    ],
    documents: [
      { id: 'd1', name: 'Architectural Blueprints v2.pdf', type: 'PDF', size: '14.2 MB', date: subDays(new Date(), 14).toISOString() },
      { id: 'd2', name: 'Structural Engineering Report.docx', type: 'DOCX', size: '2.4 MB', date: subDays(new Date(), 30).toISOString() },
      { id: 'd3', name: 'Environmental Permit.pdf', type: 'PDF', size: '1.1 MB', date: subDays(new Date(), 110).toISOString() },
      { id: 'd4', name: 'Q3 Budget Revision.xlsx', type: 'XLSX', size: '850 KB', date: subDays(new Date(), 5).toISOString() },
    ],
    activity: [
      { id: 'act1', user: 'Sarah Jenkins', action: 'approved', target: 'Q3 Budget Revision.xlsx', time: '2 hours ago' },
      { id: 'act2', user: 'David Chen', action: 'completed milestone', target: 'Foundation & Substructure', time: '2 days ago' },
      { id: 'act3', user: 'Elena Rodriguez', action: 'uploaded', target: 'Weekly Safety Audit.pdf', time: '3 days ago' },
      { id: 'act4', user: 'Marcus Cole', action: 'updated', target: 'Architectural Blueprints v2.pdf', time: '14 days ago' },
    ]
  }
};
