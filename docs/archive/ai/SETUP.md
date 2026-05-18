# AI Agent Setup Guide - OpenRouter Integration

## ⚠️ PENTING: Keamanan API Key

**JANGAN PERNAH** share API key Anda di:

- ❌ Chat/conversation
- ❌ Screenshot
- ❌ Git commit
- ❌ Public repository
- ❌ Email/messaging
- ❌ Documentation

## 🔐 Setup OpenRouter API Key

### Step 1: Revoke Old Key (WAJIB!)

Karena API key sudah ter-expose di conversation sebelumnya:

1. Login ke https://openrouter.ai/keys
2. **HAPUS/REVOKE** key yang lama: `sk-or-v1-6da2290c...`
3. Generate key baru

### Step 2: Tambahkan Key Baru ke Backend

1. Buka file `backend/.env`
2. Isi `OPENROUTER_API_KEY` dengan key baru:

```env
# OpenRouter AI
# IMPORTANT: Get your API key from https://openrouter.ai/keys
# NEVER commit this file to git!
OPENROUTER_API_KEY=sk-or-v1-YOUR-NEW-KEY-HERE
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

3. **Jangan commit file `.env` ke git!**

### Step 3: Restart Backend

```bash
cd backend
npm run dev
```

Backend akan otomatis restart dan load API key baru.

## ✅ Fitur AI Agent

### 1. **Chat Interface**

- Real-time chat dengan AI
- Conversation history
- Loading states
- Error handling

### 2. **OpenRouter Integration**

- Model: Claude 3.5 Sonnet (default)
- Temperature: 0.7
- Max tokens: 1000
- System prompt: IoT-focused assistant

### 3. **Quick Actions**

- Analyze Performance
- Optimize Payload
- Detect Anomalies
- Best Practices

### 4. **Features**

- ✅ Real AI responses (bukan placeholder)
- ✅ Conversation history support
- ✅ Error handling dengan pesan user-friendly
- ✅ Rate limiting protection
- ✅ Authentication required

## 📡 API Endpoints

### POST `/api/ai-agent/chat`

Chat dengan AI Agent

**Request:**

```json
{
  "message": "How can I optimize my MQTT payload?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous message"
    },
    {
      "role": "assistant",
      "content": "Previous response"
    }
  ]
}
```

**Response:**

```json
{
  "message": "AI response here...",
  "model": "anthropic/claude-3.5-sonnet",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350
  }
}
```

**Errors:**

- `401`: Invalid API key
- `429`: Rate limit exceeded
- `500`: Server error

### GET `/api/ai-agent/models`

Get available models from OpenRouter

**Response:**

```json
{
  "data": [
    {
      "id": "anthropic/claude-3.5-sonnet",
      "name": "Claude 3.5 Sonnet",
      "pricing": {...}
    }
  ]
}
```

### GET `/api/ai-agent/usage`

Get usage statistics (placeholder)

**Response:**

```json
{
  "message": "Usage tracking coming soon",
  "currentModel": "anthropic/claude-3.5-sonnet"
}
```

## 🎯 System Prompt

AI Agent dikonfigurasi dengan system prompt khusus IoT:

```
You are an IoT AI Assistant for IoTKit-Studio platform. You help users with:
- Analyzing IoT simulation data
- Optimizing payload structures
- Suggesting best practices for IoT protocols (MQTT, HTTP, WebSocket)
- Troubleshooting simulation issues
- Providing insights on sensor data patterns
- Recommending improvements for data transmission

Be concise, helpful, and technical when needed. Focus on IoT and simulation topics.
```

## 🔧 Configuration

### Environment Variables

```env
# Required
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional (defaults)
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

### Supported Models

OpenRouter mendukung banyak model:

- `anthropic/claude-3.5-sonnet` (recommended)
- `anthropic/claude-3-opus`
- `openai/gpt-4-turbo`
- `openai/gpt-3.5-turbo`
- `google/gemini-pro`
- Dan banyak lagi...

Lihat: https://openrouter.ai/models

### Rate Limiting

OpenRouter memiliki rate limits:

- Free tier: Limited requests per minute
- Paid tier: Higher limits

Backend akan handle rate limit errors dengan graceful error messages.

## 🧪 Testing

### Test 1: Basic Chat

1. Login ke dashboard
2. Klik **AI Agent** di sidebar
3. Ketik: "Hello, can you help me?"
4. Tekan Enter atau klik Send
5. Tunggu response dari AI

### Test 2: IoT Question

1. Ketik: "How can I optimize my MQTT payload structure?"
2. AI akan memberikan saran spesifik untuk IoT

### Test 3: Quick Actions

1. Klik salah satu quick action button
2. Input akan otomatis terisi
3. Tekan Enter untuk send

### Test 4: Conversation History

1. Chat beberapa kali
2. AI akan mengingat context dari chat sebelumnya
3. Conversation history dikirim ke API

## ❌ Troubleshooting

### Error: "OpenRouter API key not configured"

**Solusi:**

1. Pastikan `OPENROUTER_API_KEY` ada di `backend/.env`
2. Restart backend: `npm run dev`

### Error: "Invalid OpenRouter API key"

**Solusi:**

1. Key salah atau sudah di-revoke
2. Generate key baru di https://openrouter.ai/keys
3. Update `backend/.env`
4. Restart backend

### Error: "Rate limit exceeded"

**Solusi:**

1. Tunggu beberapa menit
2. Atau upgrade ke paid tier di OpenRouter

### Error: "Failed to get AI response"

**Solusi:**

1. Check internet connection
2. Check OpenRouter status: https://status.openrouter.ai
3. Check backend logs untuk detail error

### AI tidak merespons

**Solusi:**

1. Buka browser console (F12)
2. Check network tab untuk error
3. Check backend logs
4. Pastikan authenticated (login)

## 💰 Pricing

OpenRouter menggunakan pay-per-use model:

**Claude 3.5 Sonnet:**

- Input: ~$3 per 1M tokens
- Output: ~$15 per 1M tokens

**Estimasi:**

- 1 chat message: ~500 tokens
- 1000 messages: ~$0.50 - $1.00

Lihat pricing terbaru: https://openrouter.ai/models

## 🔒 Security Best Practices

### 1. **API Key Storage**

✅ Store di `.env` file
✅ Add `.env` to `.gitignore`
❌ Never hardcode in source code
❌ Never commit to git

### 2. **Access Control**

✅ Require authentication (`authMiddleware`)
✅ Rate limiting enabled
✅ Input validation
❌ Don't expose API key to frontend

### 3. **Error Handling**

✅ Don't expose API key in error messages
✅ Log errors server-side only
✅ Return user-friendly messages

### 4. **Monitoring**

- Monitor API usage di OpenRouter dashboard
- Set up alerts untuk unusual activity
- Review logs regularly

## 📊 Usage Monitoring

### OpenRouter Dashboard

1. Login ke https://openrouter.ai
2. Go to Dashboard
3. View:
   - Total requests
   - Token usage
   - Cost breakdown
   - Model usage

### Backend Logs

Backend logs setiap AI request:

```
[INFO] AI Agent chat request from user: user@example.com
[INFO] OpenRouter response: 200 OK
[ERROR] AI Agent Error: Rate limit exceeded
```

## 🚀 Advanced Features (Future)

### Coming Soon:

- [ ] Streaming responses (real-time typing)
- [ ] File upload support (analyze logs/data)
- [ ] Voice input/output
- [ ] Multi-language support
- [ ] Custom system prompts per user
- [ ] Conversation export
- [ ] AI-powered analytics
- [ ] Automated recommendations
- [ ] Integration dengan simulation data

## 📝 Example Conversations

### Example 1: Payload Optimization

**User:** "How can I reduce my MQTT payload size?"

**AI:** "Here are some strategies to reduce MQTT payload size:

1. Use binary formats (Protocol Buffers, MessagePack) instead of JSON
2. Remove unnecessary fields
3. Use shorter field names
4. Compress data with gzip
5. Send deltas instead of full state

For IoTKit-Studio, you can use the Payload Builder to optimize your structure."

### Example 2: Protocol Selection

**User:** "Should I use MQTT or HTTP for my temperature sensors?"

**AI:** "For temperature sensors, MQTT is generally better because:

1. Lower overhead (smaller packets)
2. Persistent connections (less battery drain)
3. QoS levels for reliability
4. Better for frequent updates

Use HTTP if you need:

- RESTful API integration
- Request/response pattern
- Firewall-friendly protocol"

### Example 3: Troubleshooting

**User:** "My simulation keeps disconnecting"

**AI:** "Common causes for simulation disconnections:

1. Network issues - Check your internet connection
2. Broker timeout - Increase keep-alive interval
3. Rate limiting - Reduce message frequency
4. Authentication - Verify credentials
5. Firewall - Check port access

In IoTKit-Studio, check the Logs page for specific error messages."

## 📚 Resources

- **OpenRouter Docs**: https://openrouter.ai/docs
- **Claude API**: https://docs.anthropic.com/claude/reference
- **MQTT Best Practices**: https://www.hivemq.com/mqtt-essentials/
- **IoT Protocols**: https://www.iotforall.com/iot-protocols

## ✅ Checklist

Sebelum production:

- [ ] Revoke old API key
- [ ] Generate new API key
- [ ] Add key to `.env`
- [ ] Verify `.env` in `.gitignore`
- [ ] Test chat functionality
- [ ] Set up usage monitoring
- [ ] Configure rate limits
- [ ] Review security settings
- [ ] Test error handling
- [ ] Document for team

---

## 🎉 Ready to Use!

Setelah setup API key, AI Agent siap digunakan untuk:

- Konsultasi IoT
- Optimasi payload
- Troubleshooting
- Best practices
- Dan banyak lagi!

**Enjoy your AI-powered IoT assistant! 🤖**
