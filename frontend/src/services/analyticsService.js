import api from './api';

const AnalyticsService = {
  // 获取列表
  getAll: (params = {}) => {
    return api.get(`/usage`, { params });
  },

  // 获取详情
  getById: (id) => {
    return api.get(`/usage/${id}`);
  },

  // 创建
  create: (data) => {
    return api.post(`/usage`, data);
  },

  // 更新
  update: (id, data) => {
    return api.put(`/usage/${id}`, data);
  },

  // 删除
  delete: (id) => {
    return api.delete(`/usage/${id}`);
  },

  // 获取统计
  getStats: (params = {}) => {
    return api.get(`/usage/stats`, { params });
  }
};

export default AnalyticsService;