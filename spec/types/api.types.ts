// API 响应类型定义
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: any[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// AI 模型相关类型
export interface AIModel {
  _id: string
  name: string
  modelId: string
  provider: 'OpenAI' | 'Anthropic' | 'Google' | 'Meta' | 'Custom'
  version: string
  description?: string
  capabilities: string[]
  parameters: {
    maxTokens?: number
    temperature?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
  }
  pricing: {
    inputTokenPrice: number
    outputTokenPrice: number
    currency: string
  }
  status: 'active' | 'inactive' | 'deprecated'
  usageStats: {
    totalRequests: number
    totalTokens: number
    lastUsed?: string
  }
  createdAt: string
  updatedAt: string
}

export interface CreateAIModelInput {
  name: string
  modelId: string
  provider: 'OpenAI' | 'Anthropic' | 'Google' | 'Meta' | 'Custom'
  version: string
  description?: string
  capabilities?: string[]
  parameters?: {
    maxTokens?: number
    temperature?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
  }
  pricing?: {
    inputTokenPrice: number
    outputTokenPrice: number
    currency: string
  }
  status?: 'active' | 'inactive' | 'deprecated'
}

export interface UpdateAIModelInput extends Partial<CreateAIModelInput> {
  status?: 'active' | 'inactive' | 'deprecated'
}

// 项目相关类型
export interface Project {
  _id: string
  name: string
  description?: string
  status: 'planning' | 'development' | 'testing' | 'deployment' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  aiModels: string[]
  teamMembers: Array<{
    userId: string
    role: 'owner' | 'developer' | 'reviewer' | 'viewer'
  }>
  metrics?: {
    accuracy?: number
    performance?: number
    cost?: number
    developmentTime?: number
  }
  createdAt: string
  updatedAt: string
}

export interface CreateProjectInput {
  name: string
  description?: string
  status?: 'planning' | 'development' | 'testing' | 'deployment' | 'completed'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  aiModels?: string[]
  metrics?: {
    accuracy?: number
    performance?: number
    cost?: number
    developmentTime?: number
  }
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  status?: 'planning' | 'development' | 'testing' | 'deployment' | 'completed'
  priority?: 'low' | 'medium' | 'high' | 'critical'
}

// 使用日志相关类型
export interface UsageLog {
  _id: string
  projectId: string
  aiModelId: string
  requestType:
    | 'text-generation'
    | 'image-generation'
    | 'code-generation'
    | 'analysis'
    | 'translation'
    | 'summarization'
  inputTokens: number
  outputTokens: number
  responseTime: number
  cost: number
  success: boolean
  errorMessage?: string
  timestamp: string
  userId?: string
}

export interface CreateUsageLogInput {
  projectId: string
  aiModelId: string
  requestType:
    | 'text-generation'
    | 'image-generation'
    | 'code-generation'
    | 'analysis'
    | 'translation'
    | 'summarization'
  inputTokens: number
  outputTokens: number
  responseTime: number
  cost: number
  success?: boolean
  errorMessage?: string
  userId?: string
}

// 分析相关类型
export interface OverviewData {
  models: {
    total: number
    active: number
  }
  projects: {
    total: number
  }
  recent: {
    totalRequests: number
    totalCost: number
    averageResponseTime: number
    successRate: number
  }
  recentUsage?: UsageLog[]
}

export interface ModelPerformance {
  _id: string
  modelId: string
  provider: string
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  averageResponseTime: number
  successRate: number
}

export interface CostTrend {
  _id: {
    date: string
  }
  dailyCost: number
  dailyRequests: number
  dailyTokens: number
}

export interface RequestTypeDistribution {
  _id: string
  count: number
  totalCost: number
}

export interface ProjectMetric {
  _id: string
  name: string
  status: string
  usageCount: number
  totalCost: number
  averageResponseTime: number
  successRate: number
}

// 查询参数类型
export interface PaginationParams {
  page?: number
  limit?: number
}

export interface AIModelFilters extends PaginationParams {
  provider?: string
  status?: string
  search?: string
}

export interface ProjectFilters extends PaginationParams {
  status?: string
  priority?: string
  search?: string
}

export interface UsageFilters extends PaginationParams {
  projectId?: string
  aiModelId?: string
  startDate?: string
  endDate?: string
}

export interface AnalyticsFilters extends PaginationParams {
  days?: number
}
