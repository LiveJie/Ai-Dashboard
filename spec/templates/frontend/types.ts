// {{INTERFACE_NAME}} 接口定义
export interface {{INTERFACE_NAME}} {
{{SCHEMA_PROPERTIES}}
}

// 创建接口
export interface Create{{INTERFACE_NAME}}Input {
{{SCHEMA_PROPERTIES}}
}

// 更新接口
export interface Update{{INTERFACE_NAME}}Input extends Partial<Create{{INTERFACE_NAME}}Input> {
  id?: string;
}

// 查询参数接口
export interface {{INTERFACE_NAME}}QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: any;
}

// 分页响应接口
export interface Paginated{{INTERFACE_NAME}}Response {
  data: {{INTERFACE_NAME}}[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}