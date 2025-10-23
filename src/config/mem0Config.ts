// mem0开源记忆库配置

// mem0配置接口
export interface Mem0Config {
  apiKey?: string;
  baseUrl?: string;
  enabled: boolean;
  memoryType: 'episodic' | 'semantic' | 'procedural';
  maxMemorySize?: number;
  autoSync: boolean;
}

// 默认mem0配置
export const defaultMem0Config: Mem0Config = {
  apiKey: process.env.MEM0_API_KEY || 'm0-hYC6qy3FowTYfpKdUmmHfmUhsDEazPedE670EKYl',
  baseUrl: process.env.MEM0_BASE_URL || 'https://api.mem0.ai',
  enabled: process.env.MEM0_ENABLED === 'true',
  memoryType: 'episodic',
  maxMemorySize: 1000, // 最大记忆数量
  autoSync: true,
};

// 当前mem0配置
export let currentMem0Config: Mem0Config = { ...defaultMem0Config };

// 更新mem0配置
export const updateMem0Config = (config: Partial<Mem0Config>): void => {
  currentMem0Config = {
    ...currentMem0Config,
    ...config,
  };
  console.log('mem0配置已更新:', currentMem0Config);
};

// 重置为默认配置
export const resetMem0Config = (): void => {
  currentMem0Config = { ...defaultMem0Config };
  console.log('mem0配置已重置为默认值');
};

// 获取mem0配置
export const getMem0Config = (): Mem0Config => {
  return { ...currentMem0Config };
};

// 检查mem0是否可用
export const isMem0Available = (): boolean => {
  return currentMem0Config.enabled && !!currentMem0Config.apiKey;
};

// mem0记忆类型映射
export const memoryTypeMapping = {
  episodic: 'episodic',
  semantic: 'semantic', 
  procedural: 'procedural',
} as const;

// mem0 API端点
export const mem0Endpoints = {
  memories: '/v1/memories',
  memoryById: (id: string) => `/v1/memories/${id}`,
  search: '/v2/memories/search/',
} as const;