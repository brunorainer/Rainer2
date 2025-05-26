export interface ReportData {
  text: string;
  audioDataUrl: string | null;
}

export interface ProcessedImageFile {
  id: string; // Para keys em listas React
  name: string;
  mimeType: string;
  base64: string;
  previewUrl: string; // Data URL para <img src>
}

export interface UrlImageEntry {
  id: string; // Para keys em listas React
  value: string;
}


// These types are based on the Python example for Gemini TTS configuration.
// They are defined here as their direct export from @google/genai JS SDK
// for this specific configuration path (responseModalities, speechConfig) is not explicitly
// detailed in the provided general SDK guidelines, but is crucial for replicating
// the "Gemini Native TTS" functionality shown in the Python script.

export interface PrebuiltVoiceConfig {
  voiceName: string; // Corresponds to Python 'nome_da_voz'
}

export interface VoiceConfig {
  prebuiltVoiceConfig?: PrebuiltVoiceConfig;
  // customVoiceConfig could be added if needed
}

export interface SpeechConfig {
  voiceConfig: VoiceConfig;
  // audioEncoding?: string; // e.g., 'LINEAR16', 'MP3'. Python example implies PCM default.
}

// This is to augment the standard GenerationConfig from @google/genai
// to include TTS specific parameters if the API supports them via this route.
// It combines TTS-specific fields with common GenerationConfig fields.
export interface TTSGenerationConfig {
  responseModalities?: string[];
  speechConfig?: SpeechConfig;
  candidateCount?: number;
  stopSequences?: string[];
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  responseMimeType?: string; 
}