// src/data/departmentsData.ts
import { Department } from './types'

export const departmentsData: Department[] = [
  { id: 1, name: 'Surgery',    headId: 1,    color: '#2563EB', description: 'Surgical procedures and post-operative care'         },
  { id: 2, name: 'ICU',        headId: 8,    color: '#DC2626', description: 'Intensive care unit for critical patients'            },
  { id: 3, name: 'Emergency',  headId: 3,    color: '#EA580C', description: 'Emergency and trauma response unit'                   },
  { id: 4, name: 'Nursing',    headId: 14,   color: '#16A34A', description: 'General nursing care across all wards'               },
  { id: 5, name: 'Radiology',  headId: 4,    color: '#7C3AED', description: 'Imaging, X-ray, MRI and diagnostic radiology'        },
  { id: 6, name: 'Pharmacy',   headId: 12,   color: '#0891B2', description: 'Medication dispensing and pharmaceutical services'    },
  { id: 7, name: 'Admin',      headId: 10,   color: '#6B7280', description: 'Hospital administration and operations'               },
  { id: 8, name: 'Pediatrics', headId: 13,   color: '#DB2777', description: 'Child healthcare and paediatric services'             },
]