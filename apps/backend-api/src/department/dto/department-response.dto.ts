//department-response.dto.ts
export class DepartmentResponseDto {
  id: string;
  name: string;
  code: string;
  status: string;
  parentId: string | null;
  costCenterCode: string | null;
  children?: DepartmentResponseDto[]; 
}
