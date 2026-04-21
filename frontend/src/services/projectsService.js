import api from './api';

const ProjectsService = {
  // 获取列表
  getAll: (params = {}) => {
    return api.get(`/projects`, { params });
  },

  // 获取详情
  getById: (id) => {
    return api.get(`/projects/${id}`);
  },

  // 创建
  create: (data) => {
    return api.post(`/projects`, data);
  },

  // 更新
  update: (id, data) => {
    return api.put(`/projects/${id}`, data);
  },

  // 删除
  delete: (id) => {
    return api.delete(`/projects/${id}`);
  },

  // 获取统计
  getStats: (params = {}) => {
    return api.get(`/projects/stats`, { params });
  }
};

export default ProjectsService;