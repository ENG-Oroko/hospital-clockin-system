// src/data/departmentsData.ts
import { DepartmentRecord, StaffMember } from './types'

export const ALL_STAFF: StaffMember[] = [
  { id: '#EMP-0342', name: 'Sarah Njoku',      dept: 'Nursing'      },
  { id: '#EMP-0187', name: 'Kevin Osei',        dept: 'ICU'          },
  { id: '#EMP-0561', name: 'Aisha Mensah',      dept: 'Surgery'      },
  { id: '#EMP-0294', name: 'Tunde Dada',        dept: 'Emergency'    },
  { id: '#EMP-0103', name: 'James Addo',        dept: 'Radiology'    },
  { id: '#EMP-0448', name: 'Paula Kusi',        dept: 'ICU'          },
  { id: '#EMP-0729', name: 'Lena Boateng',      dept: 'Nursing'      },
  { id: '#EMP-0215', name: 'Mark Owusu',        dept: 'Emergency'    },
  { id: '#EMP-0388', name: 'Fatima Asante',     dept: 'Nursing'      },
  { id: '#EMP-0471', name: 'Ebo Kyei',          dept: 'ICU'          },
  { id: '#EMP-0602', name: 'Ruth Acheampong',   dept: 'Surgery'      },
  { id: '#EMP-0139', name: 'Ben Sarkodie',      dept: 'Radiology'    },
  { id: '#EMP-0844', name: 'Clara Nkrumah',     dept: 'General Ward' },
  { id: '#EMP-0912', name: 'Daniel Mensah',     dept: 'Pharmacy'     },
  { id: '#EMP-0055', name: 'Grace Ofori',       dept: 'Admin'        },
]

export const INITIAL_DEPARTMENTS: DepartmentRecord[] = [
  { id: 1, name: 'Nursing',      headId: '#EMP-0729', costCode: 'CC-001', floor: 'Floor 2'  },
  { id: 2, name: 'ICU',          headId: '#EMP-0471', costCode: 'CC-002', floor: 'Floor 3'  },
  { id: 3, name: 'Surgery',      headId: '#EMP-0602', costCode: 'CC-003', floor: 'Floor 4'  },
  { id: 4, name: 'Emergency',    headId: '#EMP-0294', costCode: 'CC-004', floor: 'Ground'   },
  { id: 5, name: 'Radiology',    headId: '#EMP-0103', costCode: 'CC-005', floor: 'Floor 1'  },
  { id: 6, name: 'General Ward', headId: '#EMP-0844', costCode: 'CC-006', floor: 'Floor 2'  },
  { id: 7, name: 'Pharmacy',     headId: '#EMP-0912', costCode: 'CC-007', floor: 'Ground'   },
  { id: 8, name: 'Admin',        headId: '#EMP-0055', costCode: 'CC-008', floor: 'Floor 1'  },
]

export const AVATAR_COLORS: [string, string][] = [
  ['#DBEAFE', '#2563EB'],
  ['#DCFCE7', '#16A34A'],
  ['#FFEDD5', '#EA580C'],
  ['#FEE2E2', '#DC2626'],
  ['#F3E8FF', '#7C3AED'],
  ['#CFFAFE', '#0891B2'],
]

/* ✅ Simple department list other pages can import */
export const departmentsList: { name: string; color: string }[] = [
  { name: 'Nursing',      color: '#2563EB' },
  { name: 'ICU',          color: '#DC2626' },
  { name: 'Surgery',      color: '#16A34A' },
  { name: 'Emergency',    color: '#EA580C' },
  { name: 'Radiology',    color: '#7C3AED' },
  { name: 'General Ward', color: '#0891B2' },
  { name: 'Pharmacy',     color: '#D97706' },
  { name: 'Admin',        color: '#6B7280' },
  { name: 'Pediatrics',   color: '#DB2777' },
]

/* ✅ Alias so old import { departmentsData } still works */
export const departmentsData = departmentsList