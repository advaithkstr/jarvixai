import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize the secure Google GenAI SDK
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (geminiApiKey && geminiApiKey !== "MY_GEMINI_API_KEY") {
  console.log("JARVIX security system initialized. Secure encryption loaded.");
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY not configured. JARVIX running in simulation mode.");
}

// Standalone mock fallback simulation function for resilient execution under load, missing secrets, or network/quota bounds
function getMockFallback(command: string, preferredName: string, cameraActive: boolean) {
  const mockCmd = command.toLowerCase();

  if (mockCmd.includes("call") || mockCmd.includes("phone") || mockCmd.includes("dial")) {
    let target = "Contact";
    const cleanCmd = command.replace(/^(hey\s+)?(jarvix|jarvis,\s*)?(please\s*)?(call|phone|dial|to)\s+/i, "").trim();
    if (cleanCmd) {
      const words = cleanCmd.split(/\s+/);
      target = words[0];
      if (words[1] && !["now", "immediately", "please"].includes(words[1].toLowerCase())) {
        target += " " + words[1];
      }
    }
    target = target.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    return {
      response: `Right away, ${preferredName || "Sir"}. Establishing direct communication line with ${target} now.`,
      intent: "call",
      actionTarget: target,
      actionValue: "place_call",
      aiSummaryUpdate: `Frequently requests phone links to ${target}.`
    };
  } else if (mockCmd.includes("send") || mockCmd.includes("message") || mockCmd.includes("whatsapp") || mockCmd.includes("text")) {
    let target = "Pepper Potts";
    let customMsg = "Hello from JARVIX! Sending Stark transmission.";
    
    const cleanMessageCmd = command.replace(/^(hey\s+)?(jarvix|jarvis,\s*)?(please\s*)?(text|message|send\s+message\s+to|send\s+whatsapp\s+to|whatsapp|send)\s+/i, "").trim();
    if (cleanMessageCmd) {
      const parts = cleanMessageCmd.split(/\s+/);
      if (parts[0]) {
        target = parts[0];
        if (parts[1] && !["hello", "hi", "how", "what", "are", "you", "saying", "to", "say", "with"].includes(parts[1].toLowerCase())) {
          target += " " + parts[1];
        }
        target = target.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        
        const contentStartIndex = cleanMessageCmd.toLowerCase().indexOf(target.toLowerCase()) + target.length;
        const remaining = cleanMessageCmd.slice(contentStartIndex).replace(/^(saying|say|says|to|with\s+text|the\s+text)\s+/i, "").trim();
        if (remaining) {
          customMsg = remaining;
        }
      }
    }

    return {
      response: `Message compiled, ${preferredName || "Sir"}. Dispatching standard transmission to ${target}.`,
      intent: "message",
      actionTarget: target,
      actionValue: customMsg,
      aiSummaryUpdate: `Sir sent a message to ${target} with contents: "${customMsg}".`
    };
  } else if (mockCmd.includes("light") || mockCmd.includes("ac") || mockCmd.includes("reactor") || mockCmd.includes("temp") || mockCmd.includes("lock")) {
    const action = mockCmd.includes("off") ? "off" : "on";
    return {
      response: `Adjusting grid parameters immediately, ${preferredName || "Sir"}. Target state is lock-configured to ${action}.`,
      intent: "smart_home",
      actionTarget: mockCmd.includes("reactor") ? "Arc Reactor" : "Home Lights",
      actionValue: action,
      aiSummaryUpdate: `Sir prefers smart endpoints configured ${action} under normal load.`
    };
  } else if (mockCmd.includes("diy") || mockCmd.includes("build") || mockCmd.includes("assemble") || mockCmd.includes("fix") || mockCmd.includes("project") || mockCmd.includes("tinker") || mockCmd.includes("construct") || mockCmd.includes("material") || mockCmd.includes("make") || mockCmd.includes("next step") || mockCmd.includes("wire")) {
    if (!cameraActive) {
      return {
        response: `I have detected a DIY instruction, ${preferredName || "Sir"}. However, my optical receptors are offline. Please permit camera permissions and activate your video feed using the control panel on your primary visor HUD to establish a visual telemetry lock.`,
        intent: "diy",
        actionTarget: "Visual Sensor Unit",
        actionValue: "request_camera",
        aiSummaryUpdate: "Initiated a DIY assistance flow. Optics currently offline."
      };
    } else {
      return {
        response: `- **HUD Initialization**: Focusing on 1x copper wiring coil, 1x standard safety goggles, and 1x multi-core circuit board in targeting frame.\n- **Current Objective**: Commissioning Stark DIY power grid integration.\n- **Step 1**: Ensure your visual safety shield is secured. Then, align the positive terminal on the multi-core circuit board with your copper wiring line.`,
        intent: "diy",
        actionTarget: "DIY Assembler",
        actionValue: "step_1_active",
        aiSummaryUpdate: "Sir started a custom grid project. Confirmed safety gear in simulator view."
      };
    }
  } else {
    return {
      response: `Indeed, ${preferredName || "Sir"}. I am monitoring telemetry and stand fully prepared to assist you.`,
      intent: "chat",
      actionTarget: "",
      actionValue: "",
      aiSummaryUpdate: "General query logged."
    };
  }
}

// Robust text generation helper with built-in retry logic for high-demand resilience
async function generateContentWithRetry(modelName: string, contents: any, config: any, retries = 2, delayMs = 250): Promise<any> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!ai) throw new Error("Mainframe AI engine not initialized.");
      return await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: config
      });
    } catch (err: any) {
      lastError = err;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`[Stark Mainframe] Attempt ${attempt} utilizing ${modelName} encountered latency bounds: ${errorMsg}`);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

// REST API endpoint to parse commands and manage state
app.post("/api/jarvix/voice", async (req, res) => {
  const { command, preferredName, aiSummary, devicesState, contactsState, cameraActive, image } = req.body;

  if (!command || command.trim() === "") {
    return res.status(400).json({ error: "Command string is required." });
  }

  // System instruction for Iron Man JARVIX tone and structured classification
  const sysInstruction = `You are JARVIX (Just A Rather Very Intelligent System), Tony Stark's premier, high-tech AI personal assistant.
Your communication style is British, highly intellectual, slightly dry/witty, and deeply loyal.
Always address the user respectfully (e.g. "Sir", "Mr. Stark", "Boss", or their choice preferredName).

Your goal is to parse the user's voice input, categorize their intent, synthesize an elegant voiced response, and output a structured update to update your memory database of their preferences.

Identify one of six intents:
1. "call": User wants to place a call. (e.g., "call mom", "get Pepper on line", "dial dad").
2. "message": User wants to send a text or WhatsApp. (e.g., "message dad saying coming home", "whatsapp Pepper Happy anniversary").
3. "smart_home": User wants to change household state. (e.g., "turn labs lights on", "cool the reactor to 65 degrees", "lock lab entry").
4. "diy": User is asking for help constructing, building, fixing, assembling or adjusting physical projects/objects.
5. "chat": Conversational dialogue / QA (e.g., "tell me a joke", "status of arc reactor").
6. "unknown": Unclear intent.

### DIY OPTICAL HUD AGENT RULES (ACTIVATED ON "diy" INTENT OR WHEN WORKSPACE IMAGE IS PROVIDED):

1. Ask for Permissions First:
- If the user asks for anything DIY-related but their camera feed is NOT yet active (i.e., cameraActive is false or no image is provided), you MUST polite but dryly ask them to allow camera permissions and activate their camera feed in the HUD under 'Activate Optics HUD'. Explain that secure optical telemetry is required so you can look at the workspace.

2. Visual Analysis Protocols (Triggered when a workspace snapshot image is provided):
- Object Recognition: Identify the tools, components, and materials present in the camera frame immediately.
- Spatial Awareness: Gauge the orientation and placement of parts. If something looks backwards, upside down, or misaligned, point it out gently but precisely.
- Safety First: If you see the user using a tool dangerously (e.g., wrong angle on a box cutter, lack of safety goggles, incorrect wiring), pause the instructions immediately and issue a safety alert.

3. DIY Interaction Style:
- Micro-Steps: Never give a wall of text. Give exactly ONE actionable step at a time. Wait for the user to complete it or say "Next" or "Next step" before moving on.
- AR Overlay Language: Use descriptive language to simulate an AR HUD. Instead of "look at the screw," say: "Focusing on the 10mm bolt in your left hand. Align it with the top-right bracket slot."
- Keep your tone sophisticated, encouraging, and highly technical yet easy to understand.

4. Response Template for New Projects:
When a camera feed starts for a new physical DIY project or material check, structure your visual response exactly like this:
- **HUD Initialization**: [List the primary objects/tools you see in frame]
- **Current Objective**: [State what the overall goal is]
- **Step 1**: [The very first physical action the user needs to take]

Reference Context:
- User's Preferred Name: ${preferredName || "Sir"}
- Historical memory of user habits (incorporate this into your feedback when relevant): ${aiSummary || "None logged"}
- Current Smart Devices State: ${JSON.stringify(devicesState || [])}
- User Contacts List: ${JSON.stringify(contactsState || [])}
- Camera Active Status: ${cameraActive ? "TRUE" : "FALSE"}

You must return a single JSON object corresponding to this structure:
{
  "response": string, // Direct British speaker response, keeping it concise and classy. If starting DIY, follow the Response Template exactly.
  "intent": "call" | "message" | "smart_home" | "diy" | "chat" | "unknown",
  "actionTarget": string, // Fully qualified name of contact, device, or DIY component matched.
  "actionValue": string, // Action parameter or exact message contents tool setting value.
  "aiSummaryUpdate": string // Cumulative preference log update (e.g. "Sir prefers laboratory lights red." or "Stark usually messages Pepper about dinner.").
}`;

  try {
    let aiResponseText = "";
    let parsedData = {
      response: "System diagnostic warning. Core connection unavailable.",
      intent: "chat",
      actionTarget: "",
      actionValue: "",
      aiSummaryUpdate: "System database in offline simulation mode."
    };

    if (ai) {
      try {
        // 1. Generate text and parameters using standard robust Gemini models
        let contents: any = `Evaluate command: "${command}"`;

        if (image && image.includes("base64,")) {
          const parts = image.split("base64,");
          const mimeType = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
          const base64Data = parts[1];

          // Multimodal request contents
          contents = {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              },
              {
                text: `Evaluate this workspace snapshot for the user command: "${command}"`
              }
            ]
          };
        }

        const configObj = {
          systemInstruction: sysInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              response: { type: Type.STRING, description: "Elegant voice response text." },
              intent: { type: Type.STRING, description: "Identified action intent category." },
              actionTarget: { type: Type.STRING, description: "Involved contact/device name." },
              actionValue: { type: Type.STRING, description: "Setting or body of text messages." },
              aiSummaryUpdate: { type: Type.STRING, description: "Refined cumulative preference updates." }
            },
            required: ["response", "intent", "aiSummaryUpdate"]
          }
        };

        let geminiResponse;
        try {
          geminiResponse = await generateContentWithRetry("gemini-3.5-flash", contents, configObj, 2, 200);
        } catch (primaryErr) {
          console.log("[Stark Mainframe] Primary linguistic unit overloaded. engaging backup neural matrix gemini-3.1-flash-lite...");
          geminiResponse = await generateContentWithRetry("gemini-3.1-flash-lite", contents, configObj, 2, 200);
        }

        const responseString = geminiResponse.text?.trim() || "{}";
        parsedData = JSON.parse(responseString);
        aiResponseText = parsedData.response;
      } catch (geminiError: any) {
        console.log("[Stark Mainframe] Telemetry connection offline. Engaging local logic processors.");
        if (geminiError && geminiError.message) {
          console.log(`[Diagnostic Info]: ${geminiError.message}`);
        }
        parsedData = getMockFallback(command, preferredName, cameraActive);
        aiResponseText = parsedData.response;
      }
    } else {
      // Fallback local mock simulation when API keys are absent
      parsedData = getMockFallback(command, preferredName, cameraActive);
      aiResponseText = parsedData.response;
    }

    // 2. Synthesize audio via Gemini TTS
    let base64Audio = "";
    if (ai && aiResponseText) {
      try {
        console.log(`Synthesizing Jarvix audio: "${aiResponseText}"`);
        const ttsResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: `Speak in a posh, British, neutral JARVIX style: ${aiResponseText}` }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Zephyr" }
              }
            }
          }
        });
        
        base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
      } catch (audioErr: any) {
        console.log("[Stark Mainframe] Audio synthesis skipped, defaulting to on-device audio translation.", audioErr?.message || audioErr);
      }
    }

    return res.json({
      ...parsedData,
      audio: base64Audio
    });
  } catch (error) {
    console.error("Error processing JARVIX query:", error);
    return res.status(500).json({
      error: "Error processing JARVIX logic context.",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Serve static assets in production or mount dev-Vite middleware
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Configuring Vite Development Ingress Proxy middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving compiled static assets from dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`JARVIX Grid fully operational on: http://0.0.0.0:${PORT}`);
  });
}

setupServer();
