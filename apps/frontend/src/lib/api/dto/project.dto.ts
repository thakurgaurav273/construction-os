export interface ProjectDto {
  id: string;
  name: string;
  status: 'active' | 'planning' | 'completed';
  progress: number;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  manager: string;
  location: string;
}
