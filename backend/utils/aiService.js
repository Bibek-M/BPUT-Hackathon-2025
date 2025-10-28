const axios = require('axios');
const puterService = require('./puterService');

class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'gemini';
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.openrouterApiKey = process.env.OPENROUTER_API_KEY;
    this.puterEnabled = process.env.PUTER_ENABLED === 'true';
  }

  async generateResponse(messages, context = '', userPreferences = {}) {
    const provider = userPreferences.aiProvider || this.provider;
    
    // Build provider chain with fallbacks: Puter > OpenRouter > Gemini > Groq > OpenAI
    const providerChain = [];
    
    // Add primary provider first
    if (provider === 'puter' && this.puterEnabled) {
      providerChain.push({ name: 'puter', fn: () => this.generatePuterResponse(messages, context, userPreferences) });
    } else if (provider === 'openrouter' && this.openrouterApiKey) {
      providerChain.push({ name: 'openrouter', fn: () => this.generateOpenRouterResponse(messages, context, userPreferences) });
    } else if (provider === 'gemini' && this.geminiApiKey) {
      providerChain.push({ name: 'gemini', fn: () => this.generateGeminiResponse(messages, context, userPreferences) });
    } else if (provider === 'groq' && this.groqApiKey) {
      providerChain.push({ name: 'groq', fn: () => this.generateGroqResponse(messages, context, userPreferences) });
    } else if (provider === 'openai' && this.openaiApiKey) {
      providerChain.push({ name: 'openai', fn: () => this.generateOpenAIResponse(messages, context, userPreferences) });
    }
    
    // Add fallbacks in priority order
    if (this.puterEnabled && !providerChain.some(p => p.name === 'puter')) {
      providerChain.push({ name: 'puter', fn: () => this.generatePuterResponse(messages, context, userPreferences) });
    }
    if (this.openrouterApiKey && !providerChain.some(p => p.name === 'openrouter')) {
      providerChain.push({ name: 'openrouter', fn: () => this.generateOpenRouterResponse(messages, context, userPreferences) });
    }
    if (this.geminiApiKey && !providerChain.some(p => p.name === 'gemini')) {
      providerChain.push({ name: 'gemini', fn: () => this.generateGeminiResponse(messages, context, userPreferences) });
    }
    if (this.groqApiKey && !providerChain.some(p => p.name === 'groq')) {
      providerChain.push({ name: 'groq', fn: () => this.generateGroqResponse(messages, context, userPreferences) });
    }
    if (this.openaiApiKey && !providerChain.some(p => p.name === 'openai')) {
      providerChain.push({ name: 'openai', fn: () => this.generateOpenAIResponse(messages, context, userPreferences) });
    }
    
    if (providerChain.length === 0) {
      throw new Error('No AI provider API keys configured');
    }
    
    // Try each provider in order
    for (const providerObj of providerChain) {
      try {
        const result = await providerObj.fn();
        if (providerObj.name !== provider) {
          console.log(`✅ Fallback successful: Using ${providerObj.name} instead of ${provider}`);
        }
        return result;
      } catch (error) {
        const isQuotaError = error.message.includes('quota') || 
                            error.message.includes('429') || 
                            error.message.includes('RESOURCE_EXHAUSTED') ||
                            error.message.includes('rate limit');
        
        if (isQuotaError && providerChain.indexOf(providerObj) < providerChain.length - 1) {
          console.log(`⚠️ ${providerObj.name} quota exceeded, trying next provider...`);
          continue; // Try next provider
        }
        
        // Last provider or non-quota error
        console.error(`AI Service Error (${providerObj.name}):`, error.message);
        throw new Error(`Failed to generate response: ${error.message}`);
      }
    }
    
    throw new Error('All AI providers failed or are unavailable');
  }

  async generatePuterResponse(messages, context, preferences) {
    if (!this.puterEnabled) {
      throw new Error('Puter is not enabled');
    }

    try {
      const systemMessage = this.buildSystemMessage(context);
      const formattedMessages = [systemMessage, ...messages];

      const response = await puterService.generateChatCompletion(formattedMessages, {
        model: preferences.model,
        temperature: preferences.temperature || 0.7,
        maxTokens: preferences.maxTokens || 1000
      });

      return {
        content: response.content,
        tokens: response.tokens,
        model: response.model || 'puter-ai'
      };
    } catch (error) {
      console.error('Puter AI Error:', error.message);
      throw error;
    }
  }

  async generateOpenAIResponse(messages, context, preferences) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemMessage = this.buildSystemMessage(context);
    const formattedMessages = [systemMessage, ...messages];

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: preferences.model || 'gpt-3.5-turbo',
        messages: formattedMessages,
        temperature: preferences.temperature || 0.7,
        max_tokens: preferences.maxTokens || 1000,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      content: response.data.choices[0].message.content,
      tokens: response.data.usage.total_tokens,
      model: response.data.model,
    };
  }

  async generateGeminiResponse(messages, context, preferences) {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = preferences.model || 'gemini-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;

    // Convert messages to Gemini format
    const prompt = this.buildGeminiPrompt(messages, context);

    try {
      const response = await axios.post(url, {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: preferences.temperature || 0.7,
          maxOutputTokens: preferences.maxTokens || 1000,
        }
      });

      const content = response.data.candidates[0].content.parts[0].text;
      
      return {
        content,
        tokens: content.length / 4, // Rough estimate
        model: model,
      };
    } catch (error) {
      console.error('Gemini API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async generateGroqResponse(messages, context, preferences) {
    if (!this.groqApiKey) {
      throw new Error('Groq API key not configured');
    }

    const systemMessage = this.buildSystemMessage(context);
    const formattedMessages = [systemMessage, ...messages];

    const requestBody = {
      model: preferences.model || 'llama-3.3-70b-versatile',
      messages: formattedMessages,
      temperature: preferences.temperature || 0.7,
      max_tokens: preferences.maxTokens || 2000
    };

    // Only add response_format if explicitly provided and valid
    if (preferences.responseFormat) {
      requestBody.response_format = preferences.responseFormat;
    }

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      content: response.data.choices[0].message.content,
      tokens: response.data.usage.total_tokens,
      model: response.data.model,
    };
  }

  async generateOpenRouterResponse(messages, context, preferences) {
    if (!this.openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const systemMessage = this.buildSystemMessage(context);
    const formattedMessages = [systemMessage, ...messages];

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: preferences.model || 'google/gemma-2-9b-it:free',
          messages: formattedMessages,
          temperature: preferences.temperature || 0.7,
          max_tokens: preferences.maxTokens || 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5000',
            'X-Title': 'AI Learning Assistant'
          },
        }
      );

      return {
        content: response.data.choices[0].message.content,
        tokens: response.data.usage?.total_tokens || 0,
        model: response.data.model,
      };
    } catch (error) {
      if (error.response) {
        console.error('OpenRouter API Error:', error.response.status, error.response.data);
        throw new Error(`OpenRouter error: ${error.response.data?.error?.message || error.response.statusText}`);
      }
      throw error;
    }
  }

  async generateQuiz(text, options = {}) {
    const {
      numQuestions = 5,
      difficulty = 'medium',
      questionTypes = ['multiple-choice']
    } = options;

    const prompt = `Based on the following text, generate ${numQuestions} multiple-choice questions at ${difficulty} difficulty level.

Each question should:
1. Test understanding of key concepts
2. Have 4 options
3. Have exactly one correct answer (index 0-3)
4. Include a brief explanation for the correct answer

Text to analyze:
${text}

IMPORTANT: Respond with ONLY a valid JSON array, no other text before or after. Use this exact structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

Return only the JSON array, nothing else.`;

    try {
      const response = await this.generateResponse([
        { role: 'user', content: prompt }
      ], '', { aiProvider: this.provider, temperature: 0.3 }); // Use current provider for quiz generation

      // Try to parse the JSON response
      let quizData;
      try {
        // Clean up the response - remove markdown code blocks if present
        let cleanedContent = response.content.trim();
        
        // Remove markdown code blocks
        cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Extract JSON array from response
        const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.error('No JSON array found in response:', cleanedContent.substring(0, 200));
          throw new Error('No JSON array found in AI response');
        }
        
        const jsonString = jsonMatch[0];
        quizData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Failed to parse quiz JSON:', parseError);
        console.error('Raw response:', response.content.substring(0, 500));
        throw new Error('AI response was not in valid JSON format');
      }

      // Validate the structure
      if (!Array.isArray(quizData)) {
        throw new Error('Quiz data should be an array');
      }

      if (quizData.length === 0) {
        throw new Error('Quiz data array is empty');
      }

      // Validate each question
      const validatedQuiz = quizData.map((q, index) => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
          console.error(`Invalid question at index ${index}:`, q);
          throw new Error(`Invalid question format at index ${index}`);
        }
        
        return {
          question: q.question,
          options: q.options,
          correctAnswer: Math.max(0, Math.min(3, parseInt(q.correctAnswer) || 0)),
          explanation: q.explanation || 'No explanation provided'
        };
      });

      return validatedQuiz;
    } catch (error) {
      console.error('Quiz generation error:', error);
      throw new Error(`Failed to generate quiz: ${error.message}`);
    }
  }

  buildSystemMessage(context) {
    let systemContent = `You are a helpful AI learning assistant. You provide clear, educational responses to help students learn.`;
    
    if (context && context.trim()) {
      systemContent += `\n\nAdditional context to consider in your responses:\n${context}`;
      systemContent += `\n\nBase your answers primarily on this context when relevant, but you can also draw from your general knowledge to provide comprehensive explanations.`;
    }

    return {
      role: 'system',
      content: systemContent
    };
  }

  async generateEmbedding(text) {
    // Priority order: Gemini > OpenAI (OpenRouter doesn't support embeddings)
    const providers = [];
    
    if (this.geminiApiKey) providers.push({ name: 'gemini', fn: () => this.generateGeminiEmbedding(text) });
    if (this.openaiApiKey) providers.push({ name: 'openai', fn: () => this.generateOpenAIEmbedding(text) });
    
    // If no embedding providers available but OpenRouter is, use hybrid RAG
    if (providers.length === 0 && this.openrouterApiKey) {
      console.log('⚠️ No embedding providers available, using hybrid RAG with OpenRouter');
      // Return null to signal hybrid RAG mode
      return null;
    }
    
    if (providers.length === 0) {
      throw new Error('No API key configured for embedding providers (Gemini or OpenAI required).');
    }

    let lastError = null;
    
    for (const provider of providers) {
      try {
        console.log(`🔄 Attempting embeddings with ${provider.name}...`);
        const result = await provider.fn();
        console.log(`✅ Successfully generated embedding with ${provider.name}`);
        return result;
      } catch (error) {
        const isQuotaError = error.message.includes('quota') || 
                            error.message.includes('429') || 
                            error.message.includes('RESOURCE_EXHAUSTED') ||
                            error.message.includes('rate limit');
        
        if (isQuotaError) {
          console.log(`⚠️ ${provider.name} quota exceeded, trying next provider...`);
          lastError = error;
          continue; // Try next provider
        }
        
        // Non-quota error, throw immediately
        console.error(`❌ ${provider.name} embedding error:`, error.message);
        throw error;
      }
    }
    
    // All providers failed - if OpenRouter available, use hybrid mode
    if (this.openrouterApiKey) {
      console.log('⚠️ All embedding providers exhausted, falling back to hybrid RAG with OpenRouter');
      return null; // Signal hybrid RAG mode
    }
    
    console.error('❌ All embedding providers exhausted');
    throw new Error(`All embedding providers have exceeded their quotas. Please wait for quota reset or add API credits.`);
  }

  // Hybrid RAG: Use LLM to find relevant chunks without embeddings
  async findRelevantChunksWithLLM(question, chunks, topK = 5) {
    if (!this.openrouterApiKey) {
      throw new Error('OpenRouter API key required for hybrid RAG');
    }

    try {
      // Create a prompt for the LLM to identify relevant chunks
      const chunksText = chunks.map((chunk, idx) => `[${idx}] ${chunk.substring(0, 200)}...`).join('\n\n');
      
      const prompt = `Given the following question and document chunks, identify the ${topK} most relevant chunk numbers (0-${chunks.length - 1}) that would help answer the question. Return ONLY a JSON array of numbers, nothing else.

Question: ${question}

Chunks:
${chunksText}

Return format: [0, 3, 5] (example)`;

      const response = await this.generateOpenRouterResponse(
        [{ role: 'user', content: prompt }],
        '',
        { temperature: 0.1, maxTokens: 100 }
      );

      // Parse the response to get chunk indices
      const matchResult = response.content.match(/\[(\d+(?:,\s*\d+)*)\]/);
      if (!matchResult) {
        // Fallback: return first topK chunks
        return chunks.slice(0, topK).map((chunk, idx) => ({ chunk, index: idx, similarity: 0.5 }));
      }

      const indices = matchResult[1].split(',').map(n => parseInt(n.trim())).filter(n => n >= 0 && n < chunks.length);
      return indices.slice(0, topK).map(idx => ({ chunk: chunks[idx], index: idx, similarity: 0.7 }));
    } catch (error) {
      console.error('Hybrid RAG error:', error.message);
      // Fallback: return first topK chunks
      return chunks.slice(0, topK).map((chunk, idx) => ({ chunk, index: idx, similarity: 0.5 }));
    }
  }

  async generateOpenRouterEmbedding(text) {
    if (!this.openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      // Try different model formats that OpenRouter might support
      const models = [
        'text-embedding-3-small',
        'openai/text-embedding-3-small',
        'sentence-transformers/all-MiniLM-L6-v2'
      ];

      let lastError = null;
      
      for (const model of models) {
        try {
          const response = await axios.post(
            'https://openrouter.ai/api/v1/embeddings',
            {
              model: model,
              input: text
            },
            {
              headers: {
                'Authorization': `Bearer ${this.openrouterApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5000',
                'X-Title': 'AI Learning Assistant'
              },
              timeout: 10000
            }
          );

          // Validate response structure
          if (response.data && response.data.data && response.data.data[0] && response.data.data[0].embedding) {
            return {
              embedding: response.data.data[0].embedding,
              tokens: response.data.usage?.total_tokens || Math.ceil(text.length / 4),
              model: response.data.model || model
            };
          }
        } catch (err) {
          lastError = err;
          continue;
        }
      }
      
      // If all models failed, throw error
      throw new Error('OpenRouter embeddings not supported or unavailable');
    } catch (error) {
      if (error.response) {
        const errorData = error.response.data;
        // Only log if it's actual JSON error data, not HTML
        if (typeof errorData === 'object' && errorData.error) {
          console.error('OpenRouter Embedding Error:', errorData.error.message);
          throw new Error(errorData.error.message || 'OpenRouter embedding request failed');
        }
      }
      
      // OpenRouter might not support embeddings endpoint yet
      throw new Error('OpenRouter embeddings endpoint not available');
    }
  }

  async generateOpenAIEmbedding(text) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: 'text-embedding-ada-002',
        input: text
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      embedding: response.data.data[0].embedding,
      tokens: response.data.usage.total_tokens,
      model: response.data.model
    };
  }


  async generateGeminiEmbedding(text) {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Use Gemini embedding model (v1beta for embedding)
    const model = 'models/embedding-001';
    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${this.geminiApiKey}`;

    try {
      const response = await axios.post(url, {
        model: model,
        content: {
          parts: [{ text: text }]
        }
      });

      return {
        embedding: response.data.embedding.values,
        tokens: Math.ceil(text.length / 4), // Rough estimate
        model: 'embedding-001'
      };
    } catch (error) {
      console.error('Gemini Embedding Error:', error.response?.data || error.message);
      throw error;
    }
  }

  buildGeminiPrompt(messages, context) {
    let prompt = '';
    
    if (context && context.trim()) {
      prompt += `Context: ${context}\n\n`;
    }

    prompt += `You are a helpful AI learning assistant. Provide clear, educational responses.\n\n`;

    // Add conversation history
    messages.forEach(msg => {
      const role = msg.role === 'user' ? 'Student' : 'Assistant';
      prompt += `${role}: ${msg.content}\n\n`;
    });

    prompt += 'Assistant: ';
    
    return prompt;
  }
}

module.exports = new AIService();