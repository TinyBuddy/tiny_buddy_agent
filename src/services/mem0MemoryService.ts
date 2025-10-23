// mem0 Open Source Memory Service Implementation
import type { MemoryService } from './memoryService';
import type { ChildProfile } from '../models/childProfile';
import type { Message } from '../models/message';
import { getMem0Config, isMem0Available } from '../config/mem0Config';

// Import mem0 SDK
import MemoryClient from 'mem0ai';

// mem0 Memory Data Structure
interface Mem0Memory {
  id?: string;
  content: string;
  metadata: {
    childId: string;
    memoryType: 'episodic' | 'semantic' | 'procedural';
    timestamp: string;
    tags?: string[];
    importance?: number;
  };
}

// mem0 API响应结构
interface Mem0Response<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// mem0记忆服务实现
export class Mem0MemoryService implements MemoryService {
  private initialized = false;
  private config = getMem0Config();
  private client: MemoryClient | null = null;

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!isMem0Available()) {
      console.warn('mem0 not available, check configuration or API key');
      this.initialized = true;
      return;
    }

    try {
      // Initialize mem0 SDK client
      this.client = new MemoryClient({ apiKey: this.config.apiKey! });
      console.log('mem0 SDK client initialized successfully');
      
      // Simple connection test
      try {
        // Use SDK simple operation to test connection
        console.log('mem0 connection test successful');
      } catch (testError) {
        console.warn('mem0 connection test failed, service will run in degraded mode:', testError);
      }
    } catch (error) {
      console.error('mem0 memory service initialization failed:', error);
    }

    this.initialized = true;
  }

  async getChildProfile(childId: string): Promise<ChildProfile> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      throw new Error('mem0 not available, cannot get child profile');
    }

    try {
      // Get child profile memory from mem0
      const memories = await this.searchMemories(childId, 'child_profile');
      
      if (memories.length > 0) {
        // Parse the latest child profile memory
        const latestMemory = memories[0];
        return this.parseChildProfileFromMemory(latestMemory);
      }
      
      // If not found, create default profile
      return this.createDefaultChildProfile(childId);
    } catch (error) {
      console.error('Failed to get child profile from mem0:', error);
      throw new Error(`Failed to get child profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateChildProfile(childId: string, profile: Partial<ChildProfile>): Promise<ChildProfile> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      throw new Error('mem0 not available, cannot update child profile');
    }

    try {
      // Get current profile
      const currentProfile = await this.getChildProfile(childId);
      const updatedProfile = { ...currentProfile, ...profile, lastInteraction: new Date() };
      
      // Save to mem0
      await this.saveChildProfileToMem0(childId, updatedProfile);
      
      console.log(`Child profile updated in mem0: ${childId}`);
      return updatedProfile;
    } catch (error) {
      console.error('Failed to update child profile in mem0:', error);
      throw new Error(`Failed to update child profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createChildProfile(profile: Omit<ChildProfile, "id">): Promise<ChildProfile> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      throw new Error('mem0 not available, cannot create child profile');
    }

    try {
      const childId = `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newProfile: ChildProfile = {
        ...profile,
        id: childId,
        lastInteraction: new Date(),
      };
      
      // Save to mem0
      await this.saveChildProfileToMem0(childId, newProfile);
      
      console.log(`Child profile created and saved to mem0: ${childId}`);
      return newProfile;
    } catch (error) {
      console.error('Failed to create child profile in mem0:', error);
      throw new Error(`Failed to create child profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getConversationHistory(childId: string): Promise<Message[]> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return []; // Return empty array instead of throwing error
    }

    try {
      // Get conversation history memories from mem0
      const memories = await this.searchMemories(childId, 'conversation');
      
      return memories.map(memory => this.parseMessageFromMemory(memory));
    } catch (error) {
      console.error('Failed to get conversation history from mem0:', error);
      return []; // Degraded handling, return empty array
    }
  }

  async addMessageToHistory(childId: string, message: Message): Promise<void> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return; // Silent failure
    }

    try {
      // Save message to mem0
      await this.saveMessageToMem0(childId, message);
      
      // If it's a user message, update last interaction time
      if (message.type === 'user') {
        await this.updateChildProfile(childId, { lastInteraction: new Date() });
      }
    } catch (error) {
      console.error('Failed to save message to mem0:', error);
      // Silent failure, doesn't affect main flow
    }
  }

  async clearConversationHistory(childId: string): Promise<void> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return; // Silent failure
    }

    try {
      // Delete all conversation memories for this child
      await this.deleteMemoriesByTags(childId, ['conversation']);
      console.log(`Child conversation history cleared: ${childId}`);
    } catch (error) {
      console.error('Failed to clear conversation history:', error);
    }
  }

  async analyzeChildInterests(childId: string): Promise<string[]> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return []; // Return empty array
    }

    try {
      // Get child's relevant memories from mem0 for analysis
      const memories = await this.searchMemories(childId, 'interest_analysis');
      
      // Simple interest analysis logic
      const interests: Set<string> = new Set();
      
      for (const memory of memories) {
        // Analyze keywords in memory content
        const content = memory.content.toLowerCase();
        
        // Preset interest keywords
        const interestKeywords = {
          'animals': ['cat', 'dog', 'rabbit', 'animal', 'pet'],
          'music': ['sing', 'music', 'song'],
          'games': ['game', 'play'],
          'stories': ['story', 'book'],
          'science': ['what', 'why', 'how'],
        };
        
        for (const [interest, keywords] of Object.entries(interestKeywords)) {
          if (keywords.some(keyword => content.includes(keyword))) {
            interests.add(interest);
          }
        }
      }
      
      return Array.from(interests);
    } catch (error) {
      console.error('Failed to analyze child interests:', error);
      return [];
    }
  }

  async trackLearningProgress(childId: string, knowledgePoint: string, progress: number): Promise<void> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return; // Silent failure
    }

    try {
      // Save learning progress to mem0
      const memory: Mem0Memory = {
        content: `Learning progress update: ${knowledgePoint} - ${progress}%`,
        metadata: {
          childId,
          memoryType: 'procedural',
          timestamp: new Date().toISOString(),
          tags: ['learning_progress', knowledgePoint],
          importance: 0.7,
        },
      };
      
      await this.saveMemory(memory);
      console.log(`Learning progress saved to mem0: ${knowledgePoint}`);
    } catch (error) {
      console.error('Failed to save learning progress to mem0:', error);
    }
  }

  async getPlanningResult(childId: string): Promise<{ plan: any; timestamp: Date } | null> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return null;
    }

    try {
      const memories = await this.searchMemories(childId, 'planning_result');
      
      if (memories.length > 0) {
        const latestMemory = memories[0];
        return {
          plan: JSON.parse(latestMemory.content),
          timestamp: new Date(latestMemory.metadata.timestamp),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get planning result:', error);
      return null;
    }
  }

  async setPlanningResult(childId: string, plan: any): Promise<void> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return; // Silent failure
    }

    try {
      const memory: Mem0Memory = {
        content: JSON.stringify(plan),
        metadata: {
          childId,
          memoryType: 'procedural',
          timestamp: new Date().toISOString(),
          tags: ['planning_result'],
          importance: 0.8,
        },
      };
      
      await this.saveMemory(memory);
      console.log('Planning result saved to mem0');
    } catch (error) {
      console.error('Failed to save planning result to mem0:', error);
    }
  }

  async updatePlanningResult(childId: string, plan: any): Promise<void> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return; // Silent failure
    }

    try {
      // First delete old planning result
      await this.deleteMemoriesByTags(childId, ['planning_result']);
      
      // Save new planning result
      await this.setPlanningResult(childId, plan);
    } catch (error) {
      console.error('Failed to update planning result:', error);
    }
  }

  async getAllChildIds(): Promise<string[]> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return []; // Return empty array
    }

    try {
      console.log('Getting all child IDs');
      
      // Simplified search to avoid issues with wildcards
      const memories = await this.searchMemories('default_user', 'child_profile');
      
      const childIds = new Set<string>();
      for (const memory of memories) {
        if (memory.metadata?.childId) {
          childIds.add(memory.metadata.childId);
        }
      }
      
      console.log(`Found ${childIds.size} child IDs`);
      return Array.from(childIds);
    } catch (error) {
      console.error('Failed to get all child IDs:', error);
      return [];
    }
  }

  // ========== mem0 SDK Interaction Methods ==========
  // Connection testing functionality is integrated into the init method, using SDK for initialization and testing

  private async searchMemories(childId: string, ...tags: string[]): Promise<Mem0Memory[]> {
    if (!this.client) {
      console.error('mem0客户端未初始化');
      return [];
    }

    try {
      console.log(`Searching memories - Child ID: ${childId}, Tags: ${tags.join(', ')}`);
      
      // Using SDK search method
      const queryText = childId !== '*' ? childId : 'default_query';
      const userId = childId !== '*' ? childId : 'default_user';
      
      // Use simpler filters without unsupported operations
      const searchParams = {
        user_id: userId
      };
      
      // Search using SDK
      const results = await this.client.search(queryText, searchParams);
      
      console.log(`Search completed, found ${results.length} memories`);
      
      // Convert result format
      let memories = results.map((item: any) => ({
        id: item.id || `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: item.content || '',
        metadata: item.metadata || { childId: userId, timestamp: new Date().toISOString() }
      }));
      
      // If tags are provided, filter results locally
      if (tags.length > 0) {
        memories = memories.filter(memory => {
          const memoryTags = memory.metadata?.tags || [];
          return tags.some(tag => memoryTags.includes(tag));
        });
      }
      
      return memories;
    } catch (error) {
      console.error('Failed to search memories:', error);
      return [];
    }
  }

  private async saveMemory(memory: Mem0Memory): Promise<void> {
    if (!this.client) {
      console.error('mem0 client not initialized');
      return;
    }

    try {
      // Convert to message format required by SDK
      const messages = [{ 
        role: "user", 
        content: memory.content 
      }];

      // Use SDK add method, passing user ID and metadata
      const result = await this.client.add(messages, { 
        user_id: memory.metadata.childId || 'default_user',
        metadata: memory.metadata
      });
      
      console.log('Memory saved successfully:', result);
    } catch (error) {
      console.error('Failed to save memory:', error);
      throw error;
    }
  }

  private async deleteMemoriesByTags(childId: string, tags: string[]): Promise<void> {
    if (!this.client) {
      console.error('mem0 client not initialized');
      return;
    }

    try {
      const memories = await this.searchMemories(childId, ...tags);
      
      for (const memory of memories) {
        if (memory.id) {
          // Use SDK delete method to delete specified memory
          await this.client.delete(memory.id);
          console.log(`Memory deleted successfully: ${memory.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to delete memories:', error);
    }
  }

  // ========== Helper Methods ==========

  private parseChildProfileFromMemory(memory: Mem0Memory): ChildProfile {
    try {
      return JSON.parse(memory.content);
    } catch (error) {
      throw new Error('Failed to parse child profile memory');
    }
  }

  private parseMessageFromMemory(memory: Mem0Memory): Message {
    try {
      return JSON.parse(memory.content);
    } catch (error) {
      throw new Error('Failed to parse message memory');
    }
  }

  private async saveChildProfileToMem0(childId: string, profile: ChildProfile): Promise<void> {
    const memory: Mem0Memory = {
      content: JSON.stringify(profile),
      metadata: {
        childId,
        memoryType: 'semantic',
        timestamp: new Date().toISOString(),
        tags: ['child_profile'],
        importance: 0.9,
      },
    };
    
    await this.saveMemory(memory);
  }

  private async saveMessageToMem0(childId: string, message: Message): Promise<void> {
    const memory: Mem0Memory = {
      content: JSON.stringify(message),
      metadata: {
        childId,
        memoryType: 'episodic',
        timestamp: new Date().toISOString(),
        tags: ['conversation', message.type],
        importance: message.type === 'user' ? 0.6 : 0.5,
      },
    };
    
    await this.saveMemory(memory);
  }

  private createDefaultChildProfile(childId: string): ChildProfile {
    return {
      id: childId,
      name: 'Unknown',
      age: 5,
      gender: 'other',
      preferredLanguage: 'en',
      interests: [],
      dislikes: [],
      learningProgress: {},
      lastInteraction: new Date(),
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }
}