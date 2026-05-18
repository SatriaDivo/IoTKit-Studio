# AI Agent - Autonomous Execution Guide

## 🤖 Overview

The AI Agent is an **autonomous assistant** that doesn't just suggest - it **executes**! When you ask it to create a project, it will automatically:

1. ✅ Create the project with proper configuration
2. ✅ Set up the payload structure
3. ✅ Show real-time progress with visual feedback
4. ✅ Handle errors gracefully

## 🎯 Features

### Autonomous Execution

- **No manual steps required** - Just describe what you want
- **Real-time progress tracking** - See each task as it executes
- **Visual feedback** - Spinner while running, green checkmark when done
- **Error handling** - Red X if something fails, with error details

### Task Status Indicators

- ⚪ **Pending** - Empty circle (task waiting to start)
- 🔄 **Running** - Blue spinner (task in progress)
- ✅ **Completed** - Green checkmark (task successful)
- ❌ **Failed** - Red X (task failed with error message)

### Multi-language Support

- 🇮🇩 **Indonesian** - "Buatkan project monitoring suhu dengan MQTT"
- 🇬🇧 **English** - "Create a temperature monitoring project with MQTT"

## 📝 Example Prompts

### Indonesian Examples

```
Buatkan project monitoring suhu ruangan dengan sensor DHT22 menggunakan MQTT
```

**Result**: Creates project + payload for temperature monitoring

```
Buat project smart home untuk kontrol lampu dan AC dengan WebSocket
```

**Result**: Creates smart home project with WebSocket protocol

```
Buatkan project tracking GPS kendaraan dengan HTTP
```

**Result**: Creates GPS tracking project with HTTP protocol

### English Examples

```
Create a temperature sensor project with MQTT protocol
```

**Result**: Creates project + payload for temperature sensors

```
Create industrial sensor monitoring project with MQTT for pressure and vibration
```

**Result**: Creates industrial monitoring project with multiple sensors

```
Build a smart agriculture project to monitor soil moisture and temperature
```

**Result**: Creates agriculture monitoring project

## 🔧 Technical Details

### Available Actions

1. **CREATE_PROJECT**
   - Creates a new IoT project
   - Parses endpoint to extract host and port
   - Sets default ports based on protocol
   - Configures SSL for secure protocols (HTTPS, MQTTS, WSS)

2. **CREATE_PAYLOAD**
   - Creates payload structure for a project
   - Supports multiple field types (string, number, boolean, object, array)
   - Supports generation modes (static, random, incremental, timestamp)
   - Can reference project by name or ID

3. **START_SIMULATION** (Coming Soon)
   - Will start simulation for a project
   - Integration with simulation service

4. **ANALYZE_DATA** (Coming Soon)
   - Will analyze logs and simulation data
   - Provide insights and recommendations

### Supported Protocols

| Protocol | Default Port | SSL Enabled |
| -------- | ------------ | ----------- |
| HTTP     | 80           | No          |
| HTTPS    | 443          | Yes         |
| MQTT     | 1883         | No          |
| MQTTS    | 8883         | Yes         |
| WS       | 80           | No          |
| WSS      | 443          | Yes         |

### Endpoint Format

The AI Agent accepts endpoints in multiple formats:

1. **Full URL**: `mqtt://103.217.145.187:1883`
2. **Host:Port**: `103.217.145.187:1883`
3. **Host only**: `103.217.145.187` (uses default port)

The system automatically:

- Extracts host and port from URL
- Sets default port based on protocol if not specified
- Enables SSL for secure protocols (HTTPS, MQTTS, WSS)

## 🎨 UI Components

### Chat Interface

- Clean, modern design with light blue theme
- Message bubbles for user and assistant
- Real-time typing indicator
- Timestamp for each message

### Task List

- Embedded in assistant messages
- Shows all tasks in the action plan
- Updates in real-time as tasks execute
- Color-coded status indicators

### Quick Start Suggestions

- Pre-made prompts for common use cases
- Click to populate input field
- Categorized by use case (Temperature, GPS, Smart Home, Industrial)

## 🔐 Security

### API Key Management

- OpenRouter API key stored in `.env` file
- Never exposed in frontend code
- Validated on each request
- Clear error messages if key is invalid or missing

### Important Security Notes

⚠️ **NEVER commit your API key to version control**
⚠️ **Revoke exposed keys immediately at https://openrouter.ai/keys**
⚠️ **Generate new keys if compromised**

## 🚀 Getting Started

### 1. Configure API Key

Add your OpenRouter API key to `backend/.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

### 2. Start Backend

```bash
cd backend
npm run dev
```

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

### 4. Open AI Agent

Navigate to: http://localhost:3000/ai-agent

### 5. Try a Prompt

Type in Indonesian or English:

```
Buatkan project monitoring suhu dengan MQTT
```

Watch as the AI:

1. 🔄 Creates the project (spinner)
2. ✅ Project created (green checkmark)
3. 🔄 Creates the payload (spinner)
4. ✅ Payload created (green checkmark)
5. 🎉 All tasks completed!

## 📊 Task Execution Flow

```
User Input
    ↓
AI Analyzes Request
    ↓
Generates Action Plan (JSON)
    ↓
Frontend Displays Task List
    ↓
Execute Task 1 (CREATE_PROJECT)
    ├─ Status: pending → running → completed
    ├─ Visual: ⚪ → 🔄 → ✅
    └─ Result: Project ID returned
    ↓
Execute Task 2 (CREATE_PAYLOAD)
    ├─ Status: pending → running → completed
    ├─ Visual: ⚪ → 🔄 → ✅
    └─ Result: Payload ID returned
    ↓
All Tasks Completed 🎉
```

## 🐛 Troubleshooting

### "OpenRouter API key not configured"

**Solution**: Add `OPENROUTER_API_KEY` to `backend/.env`

### "Invalid OpenRouter API key"

**Solution**: Check your API key at https://openrouter.ai/keys

### "Rate limit exceeded"

**Solution**: Wait a few minutes or upgrade your OpenRouter plan

### Task fails with "Project not found"

**Solution**: Make sure the project name matches exactly, or use projectId

### Backend compilation error

**Solution**: Run `npm run build` in backend folder to check for TypeScript errors

## 🎯 Best Practices

1. **Be Specific**: Include protocol, endpoint, and sensor types in your prompt
2. **Use Real Endpoints**: Provide actual MQTT broker or API endpoints
3. **Check Progress**: Watch the task list to see what's happening
4. **Handle Errors**: If a task fails, read the error message and try again
5. **Test Incrementally**: Start with simple projects, then add complexity

## 📈 Future Enhancements

- [ ] START_SIMULATION integration with simulation service
- [ ] ANALYZE_DATA with real data analysis
- [ ] Multi-step workflows (create → configure → test → deploy)
- [ ] Project templates (agriculture, industrial, smart home, etc.)
- [ ] Conversation memory across sessions
- [ ] Export action plans as reusable templates
- [ ] Batch operations (create multiple projects at once)

## 💡 Tips

- **Use natural language**: The AI understands context and intent
- **Mix languages**: You can use Indonesian and English in the same conversation
- **Ask questions**: The AI can explain concepts before executing
- **Iterate**: If the result isn't perfect, ask the AI to modify it
- **Explore**: Try different prompts to see what the AI can do

## 🎉 Success Stories

### Example 1: Temperature Monitoring

**Prompt**: "Buatkan project monitoring suhu ruangan dengan MQTT"

**Result**:

- ✅ Project created: "Temperature Monitoring"
- ✅ Payload configured with temperature, humidity, deviceId
- ✅ MQTT protocol with default broker
- ⏱️ Total time: ~2 seconds

### Example 2: GPS Tracking

**Prompt**: "Create GPS tracking project with HTTP"

**Result**:

- ✅ Project created: "GPS Tracking"
- ✅ Payload configured with latitude, longitude, speed, timestamp
- ✅ HTTP protocol with REST API endpoint
- ⏱️ Total time: ~2 seconds

---

**Built with ❤️ for IoTKit-Studio**
