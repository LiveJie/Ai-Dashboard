import api from './api';

const AIModelsService = {
  // 获取列表
  getAll: (params = {}) => {
    return api.get(`/ai-models`, { params });
  },

  // 获取详情
  getById: (id) => {
    return api.get(`/ai-models/${id}`);
  },

  // 创建
  create: (data) => {
    return api.post(`/ai-models`, data);
  },

  // 更新
  update: (id, data) => {
    return api.put(`/ai-models/${id}`, data);
  },

  // 删除
  delete: (id) => {
    return api.delete(`/ai-models/${id}`);
  },

  // 获取统计
  getStats: (params = {}) => {
    return api.get(`/ai-models/stats`, { params });
  }
};

export default AIModelsService;