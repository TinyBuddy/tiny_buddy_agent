# Important Memories API Documentation

## Overview

The Important Memories API is an interface for third-party systems to store important memories in the mem0 service based on conversation records and child ID. This API automatically extracts important information (such as interests, important events, family members, friends, dreams, etc.) from chat history and stores it in the mem0 memory repository.

## Key Features

- **English-Optimized Pattern Matching**: Enhanced regular expressions specifically designed for English content
- **Historical Data Integration**: Returns stored important information when no new information is extracted
- **Single Endpoint**: All mem0 functionality consolidated into `/api/important-memories`
- **Environment Variable Configuration**: Proper configuration through `.env` file

## Basic Information

- **API Endpoint**: `POST /api/important-memories`
- **Server Address**: `http://localhost:3142` (development environment)
- **Request Format**: JSON
- **Response Format**: JSON

## Request Parameters

### Request Body (JSON)

```json
{
  "child_id": "string (required)",
  "chat_history": [
    {
      "type": "string (required) - 'user' | 'agent' | 'system'",
      "content": "string (required)",
      "timestamp": "string (optional) - ISO 8601 format",
      "sender": "string (optional)",
      "recipient": "string (optional)",
      "emotions": ["string (optional)"],
      "intent": "string (optional)",
      "metadata": "object (optional)"
    }
  ]
}
```

### Parameter Description

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `child_id` | string | ✅ | Unique identifier for the child |
| `chat_history` | array | ✅ | Array of conversation history records |
| - `type` | string | ✅ | Message type: 'user', 'agent', 'system' |
| - `content` | string | ✅ | Message content (English recommended) |
| - `timestamp` | string | ❌ | Message timestamp (ISO 8601 format) |
| - `sender` | string | ❌ | Sender |
| - `recipient` | string | ❌ | Recipient |
| - `emotions` | array | ❌ | Emotion tags array |
| - `intent` | string | ❌ | Message intent |
| - `metadata` | object | ❌ | Additional metadata |

## Response Format

### Success Response (HTTP 200)

```json
{
  "success": true,
  "message": "Important memories created/updated successfully",
  "data": {
    "important_info": {
      "interests": ["string"],
      "importantEvents": ["string"],
      "familyMembers": ["string"],
      "friends": ["string"],
      "dreams": ["string"]
    },
    "stored_memory": {
      "id": "string",
      "content": "string",
      "metadata": {
        "child_id": "string",
        "important_info": "object",
        "created_at": "string",
        "updated_at": "string"
      }
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response (HTTP 400)

```json
{
  "success": false,
  "error": "Parameter validation failed",
  "details": [
    { "message": "child_id and chat_history are required parameters" }
  ]
}
```

### Error Response (HTTP 500)

```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Status Code Description

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 200 | Success | Important memories successfully created or updated |
| 400 | Parameter validation failed | Missing required parameters or parameter format error |
| 500 | Internal server error | Error occurred while processing the request |

## Usage Examples

### Example 1: Storing Important Memories for a Child

**Request:**
```bash
curl -X POST http://localhost:3142/api/important-memories \
  -H "Content-Type: application/json" \
  -d '{
    "child_id": "child_001",
    "chat_history": [
      {
        "type": "user",
        "content": "I like blue, my birthday is June 15th, I have a sister named Lily, my best friend is Sarah from school, and I dream of becoming an astronaut to explore space."
      },
      {
        "type": "agent", 
        "content": "Wow, that\'s an amazing dream! Becoming an astronaut to explore space sounds very exciting."
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Important memories created successfully",
  "data": {
    "important_info": {
      "interests": ["blue"],
      "importantEvents": ["birthday is June 15th"],
      "familyMembers": ["sister Lily"],
      "friends": ["best friend Sarah"],
      "dreams": ["becoming an astronaut to explore space"]
    },
    "stored_memory": {
      "id": "mem_1234567890",
      "content": "Child Important Information Summary:\n\nInterests:\n- blue\n\nImportant Events:\n- birthday is June 15th\n\nFamily Members:\n- sister Lily\n\nFriends:\n- best friend Sarah\n\nDreams & Ambitions:\n- becoming an astronaut to explore space",
      "metadata": {
        "child_id": "child_001",
        "important_info": {
          "interests": ["blue"],
          "importantEvents": ["birthday is June 15th"],
          "familyMembers": ["sister Lily"],
          "friends": ["best friend Sarah"],
          "dreams": ["becoming an astronaut to explore space"]
        },
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Example 2: JavaScript Implementation

```javascript
async function updateImportantMemories(childId, chatHistory) {
  try {
    const response = await fetch('http://localhost:3142/api/important-memories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        child_id: childId,
        chat_history: chatHistory
      })
    });

    const result = await response.json();
    
    if (response.status === 200) {
      console.log('Important memories stored successfully:', result.data.stored_memory.id);
      return result.data;
    } else {
      console.error('Storage failed:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Usage example
const childId = 'child_001';
const chatHistory = [
  {
    type: 'user',
    content: 'My favorite color is red, and I have a cat named Snowball.',
    timestamp: new Date().toISOString()
  }
];

updateImportantMemories(childId, chatHistory);
```

### Example 3: Python Implementation

```python
import requests
import json

def update_important_memories(child_id, chat_history):
    url = "http://localhost:3142/api/important-memories"
    
    payload = {
        "child_id": child_id,
        "chat_history": chat_history
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        result = response.json()
        
        if response.status_code == 200:
            print("Important memories stored successfully:", result["data"]["stored_memory"]["id"])
            return result["data"]
        else:
            print("Storage failed:", result["error"])
            raise Exception(result["error"])
    except Exception as e:
        print("API call failed:", str(e))
        raise e

# Usage example
child_id = "child_001"
chat_history = [
    {
        "type": "user",
        "content": "I enjoy drawing, especially animals.",
        "timestamp": "2024-01-01T10:00:00Z"
    }
]

update_important_memories(child_id, chat_history)
```

## Features

### 1. Automatic Information Extraction
- Automatically extracts important information from conversation history
- Supports extraction of interests, important events, family members, friends, dreams, etc.
- Intelligent merging of new and existing important information
- **English-optimized pattern matching** for better accuracy with English content

### 2. Memory Management
- Automatically creates new important memories
- Supports updating existing important memories
- Each child has an independent memory space
- **Historical data integration** - returns stored information when no new info is extracted

### 3. Error Handling
- Comprehensive parameter validation
- Detailed error message responses
- Support for retry mechanisms

### 4. Simplified Interface
- **Single endpoint** (`/api/important-memories`) consolidates all mem0 functionality
- Clean API design focused on English content processing

## Deployment Instructions

### Development Environment
1. Ensure Node.js environment is installed
2. Install dependencies: `npm install`
3. Configure environment variables (refer to .env.example):
   ```bash
   MEM0_ENABLED=true
   MEM0_API_KEY=your_mem0_api_key_here
   MEM0_API_URL=https://api.mem0.ai
   ```
4. Start the server: `npm run dev`

### Production Environment
1. Build the project: `npm run build`
2. Start the service: `npm start`

## Important Notes

1. **Required Parameters**: `child_id` and `chat_history` are required parameters
2. **Chat History**: Must contain at least one user message
3. **Memory Storage**: Important memories for each child are merged and stored, avoiding duplicates
4. **Performance Considerations**: Recommended to batch process conversation history to avoid frequent calls
5. **Language Support**: **Optimized for English content** - provides best results with English conversation history
6. **Historical Data**: When no new information is extracted from chat history, the API returns previously stored important information

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MEM0_ENABLED` | ✅ | Enable/disable mem0 service (true/false) |
| `MEM0_API_KEY` | ✅ | Your mem0.ai API key |
| `MEM0_API_URL` | ✅ | mem0 service API URL |

## Technical Support

For issues or technical support, please contact the development team.