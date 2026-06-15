export const kpiData = [
  {
    id: 'total-employees',
    label: 'Total Employees',
    value: '1,248',
    delta: '↑ 18 this month',
    deltaType: 'up',
    color: 'blue',
    icon: 'Users',
  },
  {
    id: 'present-today',
    label: 'Present Today',
    value: '986',
    delta: '↑ 79% of staff',
    deltaType: 'up',
    color: 'green',
    icon: 'UserCheck',
  },
  {
    id: 'on-leave',
    label: 'On Leave Today',
    value: '174',
    delta: '↑ 12 more vs. avg',
    deltaType: 'neutral',
    color: 'amber',
    icon: 'Calendar',
  },
  {
    id: 'absent-today',
    label: 'Absent Today',
    value: '88',
    delta: '↓ 7% of staff',
    deltaType: 'down',
    color: 'red',
    icon: 'UserX',
  },
  {
    id: 'total-overtime',
    label: 'Total Overtime',
    value: '342',
    delta: '↑ hrs this month',
    deltaType: 'neutral',
    color: 'blue',
    icon: 'Clock',
  },
];

export const attendanceLineData = {
  labels: Array.from({ length: 31 }, (_, i) => {
    const d = i + 1;
    return (d - 1) % 5 === 0 ? `May ${d}` : '';
  }),
  present: [980,975,990,968,982,986,991,988,970,965,978,985,992,988,983,979,986,990,994,988,985,992,989,978,980,986,984,976,970,975,986],
  onLeave: [155,160,158,165,162,174,170,168,172,175,168,162,158,164,170,175,172,168,165,162,158,155,160,165,170,174,172,168,165,162,174],
  absent:  [113,113,100,115,104,88, 87, 92, 106,108,102,101,98, 96, 95, 94, 90, 90, 89, 98, 103,101,99, 105,98, 88, 92, 104,113,111,88],
};

export const deptDonutData = {
  labels: ['Nursing','Emergency','Surgery','ICU','Radiology','Others'],
  values: [320, 218, 195, 175, 140, 200],
  colors: ['#2563EB','#16A34A','#EA580C','#7C3AED','#0891B2','#9CA3AF'],
  total: 1248,
};

export const alerts = [
  {
    id: 1,
    icon: 'AlertCircle',
    color: 'red',
    title: 'Device Offline — Ward 3B',
    desc: 'SenseFace 2A terminal (SN: 94A7B2) unreachable for 14 min.',
    time: '14m ago',
  },
  {
    id: 2,
    icon: 'AlertTriangle',
    color: 'amber',
    title: 'Overtime Threshold Exceeded',
    desc: 'ICU dept. exceeded 40 overtime hrs this week.',
    time: '1h ago',
  },
  {
    id: 3,
    icon: 'XCircle',
    color: 'red',
    title: 'Missing Clock-Out — 12 Staff',
    desc: 'MISSING_OUT records flagged from yesterday\'s night shift.',
    time: '3h ago',
  },
  {
    id: 4,
    icon: 'Info',
    color: 'blue',
    title: 'Payroll Run Scheduled',
    desc: 'Monthly payroll compilation starts tonight at 23:00.',
    time: '5h ago',
  },
  {
    id: 5,
    icon: 'CheckCircle',
    color: 'green',
    title: 'Reconciliation Complete',
    desc: 'All 986 logs from morning shift matched successfully.',
    time: '6h ago',
  },
];


export const shifts = [
  { id: 1, name: 'Morning Shift',   start: '06:00', end: '14:00', color: '#2563EB', bg: '#DBEAFE', depts: ['Nursing', 'Emergency', 'Radiology'] },
  { id: 2, name: 'Afternoon Shift', start: '14:00', end: '22:00', color: '#EA580C', bg: '#FFEDD5', depts: ['ICU', 'Surgery', 'General Ward']     },
  { id: 3, name: 'Night Shift',     start: '22:00', end: '06:00', color: '#6B7280', bg: '#F3F4F6', depts: ['Nursing', 'ICU', 'Emergency']         },
  { id: 4, name: 'On-Call Pool',    start: '00:00', end: '23:59', color: '#16A34A', bg: '#DCFCE7', depts: ['Surgery', 'Radiology']                },
];

export const pendingLeave = [
  { id: 1, name: 'Sarah Njoku', empId: '#EMP-0342', dept: 'Nursing', type: 'Annual', dates: 'Jun 2–9', avatarBg: '#DBEAFE', avatarColor: '#2563EB', initials: 'SN' },
  { id: 2, name: 'Kevin Osei', empId: '#EMP-0187', dept: 'ICU', type: 'Sick', dates: 'May 31', avatarBg: '#DCFCE7', avatarColor: '#16A34A', initials: 'KO' },
  { id: 3, name: 'Aisha Mensah', empId: '#EMP-0561', dept: 'Surgery', type: 'Annual', dates: 'Jun 15–22', avatarBg: '#FFEDD5', avatarColor: '#EA580C', initials: 'AM' },
  { id: 4, name: 'Tunde Dada', empId: '#EMP-0294', dept: 'Emergency', type: 'Maternity', dates: 'Jun 1 – Aug 31', avatarBg: '#FEE2E2', avatarColor: '#DC2626', initials: 'TD' },
];

export const pendingOvertime = [
  { id: 1, name: 'James Addo', empId: '#EMP-0103', dept: 'Radiology', type: 'Overtime', dates: '+6 hrs', avatarBg: '#DBEAFE', avatarColor: '#2563EB', initials: 'JA' },
  { id: 2, name: 'Paula Kusi', empId: '#EMP-0448', dept: 'ICU', type: 'Overtime', dates: '+4 hrs', avatarBg: '#DCFCE7', avatarColor: '#16A34A', initials: 'PK' },
];

export const pendingShiftSwap = [
  { id: 1, name: 'Lena Boateng', empId: '#EMP-0729', dept: 'Nursing', type: 'Swap', dates: 'Jun 4', avatarBg: '#DCFCE7', avatarColor: '#16A34A', initials: 'LB' },
];

export const latenessData = [
  { rank: 1, name: 'Mark Owusu', empId: '#EMP-0215', dept: 'Emergency', count: '11×', avgMins: '28 min', barWidth: 92, avatarBg: '#FEE2E2', avatarColor: '#DC2626', initials: 'MO' },
  { rank: 2, name: 'Fatima Asante', empId: '#EMP-0388', dept: 'Nursing', count: '9×', avgMins: '22 min', barWidth: 75, avatarBg: '#FFEDD5', avatarColor: '#EA580C', initials: 'FA' },
  { rank: 3, name: 'Ebo Kyei', empId: '#EMP-0471', dept: 'ICU', count: '8×', avgMins: '19 min', barWidth: 67, avatarBg: '#DBEAFE', avatarColor: '#2563EB', initials: 'EK' },
  { rank: 4, name: 'Ruth Acheampong', empId: '#EMP-0602', dept: 'Surgery', count: '7×', avgMins: '16 min', barWidth: 58, avatarBg: '#DCFCE7', avatarColor: '#16A34A', initials: 'RA' },
  { rank: 5, name: 'Ben Sarkodie', empId: '#EMP-0139', dept: 'Radiology', count: '6×', avgMins: '14 min', barWidth: 50, avatarBg: '#FFEDD5', avatarColor: '#EA580C', initials: 'BS' },
  { rank: 6, name: 'Clara Nkrumah', empId: '#EMP-0844', dept: 'General Ward', count: '5×', avgMins: '11 min', barWidth: 42, avatarBg: '#FEE2E2', avatarColor: '#DC2626', initials: 'CN' },
];

export const heatmapDepts = ['Nursing','Emergency','ICU','Surgery','Radiology','Gen. Ward','Pharmacy','Admin'];

function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function generateHeatmapData() {
  const rand = seededRand(42);
  const statuses = ['present','leave','absent','nodata'];
  const weights = [0.75, 0.12, 0.08, 0.05];
  const data = {};
  heatmapDepts.forEach(dept => {
    data[dept] = Array.from({ length: 31 }, () => {
      const r = rand();
      let cum = 0;
      for (let i = 0; i < weights.length; i++) {
        cum += weights[i];
        if (r < cum) return statuses[i];
      }
      return 'present';
    });
  });
  return data;
}

export const quickActions = [
  { label: 'Add Employee', icon: 'UserPlus', toast: 'Opening Add Employee form…' },
  { label: 'Export Report', icon: 'FileText', toast: 'Generating attendance report…' },
  { label: 'Schedule Shift', icon: 'CalendarPlus', toast: 'Opening shift scheduling…' },
  { label: 'Register Device', icon: 'Monitor', toast: 'Opening device registration…' },
  { label: 'Broadcast', icon: 'Phone', toast: 'Sending broadcast message…' },
  { label: 'Payroll Setup', icon: 'Settings', toast: 'Opening payroll settings…' },
];