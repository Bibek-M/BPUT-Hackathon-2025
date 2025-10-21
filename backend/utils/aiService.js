const axios = require('axios');

class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'gemini';
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.geminiApiKey = process.env.GEMINI_API_KEY;
  }

  async generateResponse(messages, context = '', userPreferences = {}) {
    const provider = userPreferences.aiProvider || this.provider;
    
    try {
      if (provider === 'openai') {
        return await this.generateOpenAIResponse(messages, context, userPreferences);
      } else {
        return await this.generateGeminiResponse(messages, context, userPreferences);
      }
    } catch (error) {
      console.error(`AI Service Error (${provider}):`, error.message);
      throw new Error(`Failed to generate response: ${error.message}`);
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

    const model = preferences.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;

    // Convert messages to Gemini format
    const prompt = this.buildGeminiPrompt(messages, context);

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
2. Have 4 options (A, B, C, D)
3. Have exactly one correct answer
4. Include a brief explanation for the correct answer

Text to analyze:
${text}

Please format your response as a JSON array with this structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

Make sure the JSON is valid and complete.`;

    try {
      const response = await this.generateResponse([
        { role: 'user', content: prompt }
      ], '', { temperature: 0.3 }); // Lower temperature for more consistent formatting

      // Try to parse the JSON response
      let quizData;
      try {
        // Extract JSON from response if it contains other text
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        const jsonString = jsonMatch ? jsonMatch[0] : response.content;
        quizData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Failed to parse quiz JSON:', parseError);
        throw new Error('AI response was not in valid JSON format');
      }

      // Validate the structure
      if (!Array.isArray(quizData)) {
        throw new Error('Quiz data should be an array');
      }

      // Validate each question
      const validatedQuiz = quizData.map((q, index) => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
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
    const provider = this.provider;
    
    try {
      if (provider === 'openai') {
        return await this.generateOpenAIEmbedding(text);
      } else {
        return await this.generateGeminiEmbedding(text);
      }
    } catch (error) {
      console.error(`Embedding Service Error (${provider}):`, error.message);
      throw new Error(`Failed to generate embedding: ${error.message}`);
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

    // Use Gemini embedding model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.geminiApiKey}`;

    const response = await axios.post(url, {
      model: 'models/text-embedding-004',
      content: {
        parts: [{ text: text }]
      }
    });

    return {
      embedding: response.data.embedding.values,
      tokens: Math.ceil(text.length / 4), // Rough estimate
      model: 'text-embedding-004'
    };
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