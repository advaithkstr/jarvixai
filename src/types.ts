export interface UserProfile {
  userId: string;
  email: string;
  preferredName: string;
  aiSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  contactId: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  whatsappNumber: string;
  createdAt: string;
}

export interface SmartDevice {
  deviceId: string;
  name: string;
  type: 'light' | 'thermostat' | 'lock' | 'security' | 'speaker' | string;
  status: 'on' | 'off' | 'locked' | 'unlocked' | 'open' | string;
  value: string; // e.g. "72°F", "80% brightness", "Locked"
  updatedAt: string;
}

export interface Interaction {
  interactionId: string;
  command: string;
  response: string;
  intent: 'call' | 'message' | 'smart_home' | 'chat' | 'unknown' | string;
  timestamp: string;
}
