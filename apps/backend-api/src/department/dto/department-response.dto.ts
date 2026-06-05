//department-response.dto.ts
export class DepartmentResponseDto {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  costCenterCode: string | null;
  children?: DepartmentResponseDto[]; 
}