// AIModelsProps 接口定义
export interface AIModelsProps {
  name: string;
  modelId: string;
  provider: string;
  version: string;
  description: string;
  capabilities: any[];
  status: string;
  testSyncField: string;
  createdAt: string;
  updatedAt: string;

}

// 创建接口
export interface CreateAIModelsPropsInput {
  name: string;
  modelId: string;
  provider: string;
  version: string;
  description: string;
  capabilities: any[];
  status: string;
  testSyncField: string;
  createdAt: string;
  updatedAt: string;

}

// 更新接口
export interface UpdateAIModelsPropsInput extends Partial<CreateAIModelsPropsInput> {
  id?: string;
}

// 查询参数接口
export interface AIModelsPropsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: any;
}

// 分页响应接口
export interface PaginatedAIModelsPropsResponse {
  data: AIModelsProps[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}