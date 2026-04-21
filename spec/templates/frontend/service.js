import api from './api';

const {{PAGE_NAME}}Service = {
  // 获取列表
  getAll: (params = {}) => {
    return api.get(`/{{MODEL_LOWER}}`, { params });
  },

  // 获取详情
  getById: (id) => {
    return api.get(`/{{MODEL_LOWER}}/${id}`);
  },

  // 创建
  create: (data) => {
    return api.post(`/{{MODEL_LOWER}}`, data);
  },

  // 更新
  update: (id, data) => {
    return api.put(`/{{MODEL_LOWER}}/${id}`, data);
  },

  // 删除
  delete: (id) => {
    return api.delete(`/{{MODEL_LOWER}}/${id}`);
  },

  // 获取统计
  getStats: (params = {}) => {
    return api.get(`/{{MODEL_LOWER}}/stats`, { params });
  }
};

export default {{PAGE_NAME}}Service;