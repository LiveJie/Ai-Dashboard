// ProjectsProps 接口定义
export interface ProjectsProps {
  name: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;

}

// 创建接口
export interface CreateProjectsPropsInput {
  name: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;

}

// 更新接口
export interface UpdateProjectsPropsInput extends Partial<CreateProjectsPropsInput> {
  id?: string;
}

// 查询参数接口
export interface ProjectsPropsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: any;
}

// 分页响应接口
export interface PaginatedProjectsPropsResponse {
  data: ProjectsProps[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}