// 前端组件类型定义
export interface PageConfig {
  path: string;
  title: string;
  icon?: string;
  component: React.ComponentType;
  exact?: boolean;
}

export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: number;
  align?: 'left' | 'center' | 'right';
  sorter?: boolean;
  filters?: Array<{ text: string; value: any }>;
  onFilter?: (value: any, record: T) => boolean;
}

export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'input' | 'textarea' | 'select' | 'date' | 'number' | 'switch';
  required?: boolean;
  rules?: Array<{
    required?: boolean;
    message: string;
    type?: string;
    min?: number;
    max?: number;
  }>;
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
  disabled?: boolean;
  initialValue?: any;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface LineChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface BarChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface PieChartData {
  name: string;
  value: number;
  [key: string]: any;
}

// 状态管理类型
export interface AppState {
  user: {
    id?: string;
    name?: string;
    email?: string;
    token?: string;
  };
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US' | 'ja-JP';
  sidebarCollapsed: boolean;
}

// API 服务类型
export interface ApiService {
  get: <T>(url: string, params?: any) => Promise<T>;
  post: <T>(url: string, data: any) => Promise<T>;
  put: <T>(url: string, data: any) => Promise<T>;
  delete: <T>(url: string) => Promise<T>;
}

// 图表配置类型
export interface ChartConfig {
  width?: number | string;
  height?: number | string;
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  colors?: string[];
  xAxis?: {
    type?: 'category' | 'value';
    dataKey?: string;
    label?: string;
  };
  yAxis?: {
    type?: 'category' | 'value';
    dataKey?: string;
    label?: string;
  };
  tooltip?: {
    trigger?: 'item' | 'axis';
    formatter?: (params: any) => string;
  };
  legend?: {
    show?: boolean;
    data?: string[];
  };
}

// 组件 Props 类型
export interface DashboardCardProps {
  title: string;
  value: number | string;
  prefix?: React.ReactNode;
  suffix?: string;
  trend?: {
    value: number;
    type: 'up' | 'down' | 'stable';
  };
  style?: React.CSSProperties;
}

export interface FilterBarProps {
  onFilter: (filters: any) => void;
  loading?: boolean;
}

export interface DataTableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  rowKey?: string;
  scroll?: { x?: number; y?: number };
}

export interface ModalFormProps {
  visible: boolean;
  title: string;
  data?: any;
  onSubmit: (values: any) => void;
  onCancel: () => void;
  fields: FormFieldConfig[];
}