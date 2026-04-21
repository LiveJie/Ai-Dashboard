// AnalyticsProps 接口定义
export interface AnalyticsProps {
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
export interface CreateAnalyticsPropsInput {
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
export interface UpdateAnalyticsPropsInput extends Partial<CreateAnalyticsPropsInput> {
  id?: string;
}

// 查询参数接口
export interface AnalyticsPropsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: any;
}

// 分页响应接口
export interface PaginatedAnalyticsPropsResponse {
  data: AnalyticsProps[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}