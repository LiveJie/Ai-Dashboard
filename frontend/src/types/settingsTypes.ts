// SettingsProps 接口定义
export interface SettingsProps {
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
export interface CreateSettingsPropsInput {
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
export interface UpdateSettingsPropsInput extends Partial<CreateSettingsPropsInput> {
  id?: string;
}

// 查询参数接口
export interface SettingsPropsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: any;
}

// 分页响应接口
export interface PaginatedSettingsPropsResponse {
  data: SettingsProps[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}