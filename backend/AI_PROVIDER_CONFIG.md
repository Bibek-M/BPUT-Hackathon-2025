# AI Provider Configuration

## Current Setup

### Provider Priority Order

#### For Chat/Completions/Quiz Generation:
1. **Puter.js** (Primary) ✅ NEW!
2. **OpenRouter** (Fallback)
3. **Gemini** (Fallback)
4. **Groq** (Fallback)
5. **OpenAI** (Last resort)

#### For Embeddings (RAG Feature):
1. **Gemini** (Primary) ⚠️ Currently at quota
2. **OpenAI** (Fallback) ⚠️ Currently at quota

> **Note**: OpenRouter and Groq don't support embeddings endpoints, so only Gemini and OpenAI are available for RAG features.

## Configuration

All providers are configured in `.env`:

```env
# Puter.js (Cloud OS with AI capabilities)
PUTER_ENABLED=true
PUTER_API_KEY=  # Optional

OPENROUTER_API_KEY=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
GEMINI_API_KEY=AIzaSyB3CQmRSsBI73mfwend-T8aVWjmp7r_Kgw
GROQ_API_KEY=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
OPENAI_API_KEY=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

AI_PROVIDER=puter
```

## Intelligent Fallback System

The system automatically tries providers in order and:
- ✅ Detects quota errors (429, RESOURCE_EXHAUSTED)
- ✅ Falls back to next provider automatically
- ✅ Logs which provider is being used
- ✅ Continues working even if primary provider fails

## Features Status

| Feature | Status | Provider Used |
|---------|--------|---------------|
| Chat/Messaging | ✅ Working | OpenRouter (with fallbacks) |
| Quiz Generation | ✅ Working | OpenRouter (with fallbacks) |
| Document Upload | ✅ Working | OpenRouter for quiz |
| RAG Q&A | ⚠️ Limited | Requires embeddings (quota issue) |
| Document Embeddings | ⚠️ Limited | Requires embeddings (quota issue) |

## Current Issues

### Embedding Quota Exceeded
Both Gemini and OpenAI free tier embedding quotas are currently exhausted.

**Impact:**
- RAG features (document-based Q&A) return quota error
- Document uploads work but embeddings fail gracefully
- All other features work normally

**Solutions:**
1. Wait for quota reset (usually resets daily/monthly)
2. Add credits to OpenAI or Gemini account
3. Use paid API tier for production

## Models Used

| Provider | Chat Model | Embedding Model | Additional Features |
|----------|-----------|-----------------|--------------------|
| Puter.js | Multiple (dynamic) | Not supported | Cloud storage, KV store |
| OpenRouter | `meta-llama/llama-3.1-8b-instruct:free` | Not supported |
| Gemini | `gemini-pro` | `embedding-001` |
| Groq | `llama-3.3-70b-versatile` | Not supported |
| OpenAI | `gpt-3.5-turbo` | `text-embedding-ada-002` |

## Testing

Server is confirmed working with:
- ✅ Successful startup
- ✅ MongoDB connection
- ✅ All routes registered
- ✅ Socket.io ready
- ✅ Intelligent provider fallback

## Puter.js Features

Puter.js provides additional cloud OS capabilities:

### AI Features
- ✅ Chat completions
- ✅ Text generation
- ✅ Automatic fallback to other providers

### Cloud Storage (NEW)
- Upload/download files
- List directory contents
- File management
- Access via `/api/puter/storage/*` endpoints

### Key-Value Storage (NEW)
- Simple persistent storage
- Set/get/delete operations
- Access via `/api/puter/kv/*` endpoints

## Next Steps

To restore full RAG functionality:
1. Monitor quota reset for Gemini/OpenAI
2. Consider upgrading to paid tier for production
3. Alternative: Implement local embeddings (Sentence Transformers, etc.)
4. Explore Puter's cloud storage for document management
