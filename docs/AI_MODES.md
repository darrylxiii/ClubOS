# Club AI Interaction Modes

The Quantum Club AI now supports multiple interaction modes, each optimized for different use cases.

## 🌐 Search Mode

**When to use:** Need current information, news, or real-time data

**Features:**
- Web search tool access for up-to-date information
- Source citations
- Current events and market data

**How it works:** Activates `google/gemini-2.5-flash` with web search capabilities

## 🧠 Deep Think Mode

**When to use:** Complex problems requiring detailed reasoning

**Features:**
- Uses more powerful `google/gemini-2.5-pro` model
- Step-by-step reasoning process
- Multi-perspective analysis
- Chain-of-thought explanations

**How it works:** Switches to premium model with deep reasoning prompts

## 🎨 Canvas Mode

**When to use:** Creative projects, design work, code generation

**Features:**
- Creative collaboration focus
- Code and design assistance
- Visual planning and layouts
- Technical architecture guidance

**How it works:** Optimized system prompts for creative/technical work

## 📎 Image/Document Upload

**Features:**
- Upload images for visual analysis
- Ask questions about uploaded content
- Works across all modes
- Supports: JPG, PNG, WEBP (up to 10MB)

**How it works:** Images are converted to base64 and sent with multimodal capabilities

## Usage

1. **Toggle modes** using the icons in the input bar:
   - 🌐 Globe = Search Mode
   - 🧠 Brain = Think Mode  
   - 📁 Canvas = Canvas Mode

2. **Upload files** using the paperclip icon

3. **Voice input** using the microphone button (when no text is entered)

## Technical Details

- **Normal mode**: `google/gemini-2.5-flash`
- **Search mode**: `google/gemini-2.5-flash` + web search tool
- **Think mode**: `google/gemini-2.5-pro` 
- **Canvas mode**: `google/gemini-2.5-flash` with specialized prompts

All modes maintain full context of your conversation history and profile data.
