
const { sequelize } = require('../config/db');
const AiModel = require('../models/ai-model');
const Project = require('../models/project');
const UsageLog = require('../models/usage-log');

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

const seed = async () => {
  await sequelize.authenticate();

  const modelCount = await AiModel.count();
  const projectCount = await Project.count();
  const usageCount = await UsageLog.count();

  if (modelCount > 0 && projectCount > 0 && usageCount > 0) {
    return { seeded: false };
  }

  const models = await AiModel.bulkCreate([
    {
      name: 'GPT-4o',
      modelId: 'gpt-4o',
      provider: 'OpenAI',
      version: '2025-01',
      description: '通用多模态模型',
      status: 'active',
      pricing: { inputTokenPrice: 0.005, outputTokenPrice: 0.015, currency: 'USD' }
    },
    {
      name: 'Claude 3.5',
      modelId: 'claude-3.5',
      provider: 'Anthropic',
      version: '2025-01',
      description: '高质量文本生成',
      status: 'active',
      pricing: { inputTokenPrice: 0.004, outputTokenPrice: 0.012, currency: 'USD' }
    },
    {
      name: 'Gemini',
      modelId: 'gemini-1.5',
      provider: 'Google',
      version: '2025-01',
      description: '快速与低成本',
      status: 'beta',
      pricing: { inputTokenPrice: 0.002, outputTokenPrice: 0.006, currency: 'USD' }
    }
  ]);

  const projects = await Project.bulkCreate([
    { name: 'AI Copilot', description: '研发助手', status: 'development', priority: 'high' },
    { name: 'Chat Analytics', description: '对话数据分析', status: 'testing', priority: 'medium' },
    { name: 'Prompt Lab', description: '提示词实验平台', status: 'planning', priority: 'medium' }
  ]);

  const requestTypes = ['text-generation', 'analysis', 'summarization', 'translation', 'code-generation'];

  const now = Date.now();
  const logs = [];
  for (let i = 0; i < 220; i++) {
    const daysAgo = rand(0, 29);
    const ts = new Date(now - daysAgo * 24 * 60 * 60 * 1000 - rand(0, 6) * 60 * 60 * 1000);

    const inputTokens = rand(50, 2200);
    const outputTokens = rand(30, 1800);
    const responseTime = rand(120, 1800);
    const cost = Number(((inputTokens * 0.000002) + (outputTokens * 0.000006)).toFixed(4));

    logs.push({
      projectId: String(pick(projects).id),
      aiModelId: String(pick(models).id),
      requestType: pick(requestTypes),
      inputTokens,
      outputTokens,
      responseTime,
      cost,
      success: Math.random() > 0.06,
      errorMessage: null,
      timestamp: ts
    });
  }

  await UsageLog.bulkCreate(logs);

  return { seeded: true };
};

module.exports = seed;
