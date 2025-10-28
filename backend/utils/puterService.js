const puter = require('puter');

class PuterService {
  constructor() {
    this.initialized = false;
    this.apiKey = process.env.PUTER_API_KEY;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Mark as initialized immediately to prevent blocking
      this.initialized = true;
      
      if (this.apiKey) {
        // Initialize with API key if available
        await puter.auth.signIn({ token: this.apiKey });
        console.log('✅ Puter service initialized');
      } else {
        console.log('🟡 Puter running without API key (guest mode)');
      }
    } catch (error) {
      console.error('⚠️ Puter initialization error:', error.message);
      // Keep initialized as true to allow fallback to other providers
    }
  }

  // AI Chat completion using Puter's AI API
  async generateChatCompletion(messages, options = {}) {
    await this.initialize();
    
    try {
      const response = await puter.ai.chat(messages, options.model);

      return {
        content: response.message?.content || response.text || response || '',
        tokens: response.usage?.total_tokens || 0,
        model: response.model || 'puter-ai'
      };
    } catch (error) {
      console.error('Puter AI error:', error.message);
      throw new Error(`Puter AI not available: ${error.message}`);
    }
  }

  // Text completion
  async generateCompletion(prompt, options = {}) {
    await this.initialize();
    
    try {
      const response = await puter.ai.txt({
        prompt: prompt,
        model: options.model,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000
      });

      return {
        content: response.text || response.message?.content || '',
        tokens: response.usage?.total_tokens || 0,
        model: response.model || 'unknown'
      };
    } catch (error) {
      console.error('Puter completion error:', error.message);
      throw new Error(`Puter completion failed: ${error.message}`);
    }
  }

  // File storage operations
  async uploadFile(fileName, content, path = '/') {
    await this.initialize();
    
    try {
      const file = await puter.fs.write(`${path}${fileName}`, content);
      console.log(`✅ File uploaded to Puter: ${fileName}`);
      return {
        name: file.name,
        path: file.path,
        size: file.size,
        url: file.url
      };
    } catch (error) {
      console.error('Puter file upload error:', error.message);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  async readFile(filePath) {
    await this.initialize();
    
    try {
      const content = await puter.fs.read(filePath);
      return content;
    } catch (error) {
      console.error('Puter file read error:', error.message);
      throw new Error(`File read failed: ${error.message}`);
    }
  }

  async listFiles(path = '/') {
    await this.initialize();
    
    try {
      const files = await puter.fs.readdir(path);
      return files.map(file => ({
        name: file.name,
        path: file.path,
        size: file.size,
        isDirectory: file.is_dir,
        modified: file.modified
      }));
    } catch (error) {
      console.error('Puter list files error:', error.message);
      throw new Error(`List files failed: ${error.message}`);
    }
  }

  async deleteFile(filePath) {
    await this.initialize();
    
    try {
      await puter.fs.delete(filePath);
      console.log(`✅ File deleted from Puter: ${filePath}`);
      return { success: true };
    } catch (error) {
      console.error('Puter file delete error:', error.message);
      throw new Error(`File delete failed: ${error.message}`);
    }
  }

  // Key-value storage
  async setValue(key, value) {
    await this.initialize();
    
    try {
      await puter.kv.set(key, value);
      return { success: true };
    } catch (error) {
      console.error('Puter KV set error:', error.message);
      throw new Error(`KV set failed: ${error.message}`);
    }
  }

  async getValue(key) {
    await this.initialize();
    
    try {
      const value = await puter.kv.get(key);
      return value;
    } catch (error) {
      console.error('Puter KV get error:', error.message);
      return null;
    }
  }

  async deleteValue(key) {
    await this.initialize();
    
    try {
      await puter.kv.del(key);
      return { success: true };
    } catch (error) {
      console.error('Puter KV delete error:', error.message);
      throw new Error(`KV delete failed: ${error.message}`);
    }
  }

  // Check if Puter is available
  isAvailable() {
    return this.initialized;
  }
}

module.exports = new PuterService();
