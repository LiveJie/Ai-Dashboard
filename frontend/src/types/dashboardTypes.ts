// DashboardProps 接口定义
export interface DashboardProps {
  projectId: string;
  aiModelId: string;
  requestType: string;
  inputTokens: number;
  outputTokens: number;
  responseTime: number;
  cost: number;
  success: boolean;
  timestamp: string;

}

// 创建接口
export interface CreateDashboardPropsInput {
  projectId: string;
  aiModelId: string;
  requestType: string;
  inputTokens: number;
  outputTokens: number;
  responseTime: number;
  cost: number;
  success: boolean;
  timestamp: string;

}

// 更新接口
export interface UpdateDashboardPropsInput extends Partial<CreateDashboardPropsInput> {
  id?: string;
}

// 查询参数接口
export interface DashboardPropsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: any;
}

// 分页响应接口
export interface PaginatedDashboardPropsResponse {
  data: DashboardProps[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}