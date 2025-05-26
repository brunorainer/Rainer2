
import { GoogleGenAI, GenerateContentResponse, Part, HarmCategory, HarmBlockThreshold, GenerationConfig } from "@google/genai";
import { SpeechConfig, TTSGenerationConfig } from '../types'; 

const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.warn("API_KEY environment variable not set. Gemini API calls will likely fail.");
}
// Initialize with a fallback key to prevent constructor error if API_KEY is undefined,
// though calls will fail without a valid key.
const ai = new GoogleGenAI({ apiKey: apiKey || "MISSING_API_KEY_DO_NOT_USE" });

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export async function generateReportFromImage(userPrompt: string, imageParts: Part[]): Promise<string> {
  if (imageParts.length === 0) {
    throw new Error("Nenhuma imagem fornecida para análise.");
  }
  if (imageParts.length > 10) { // Updated from 5 to 10
    throw new Error("A análise é limitada a um máximo de 10 imagens."); // Updated message
  }

  const currentDate = new Date();
  const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;

  const imageIdentifiers = imageParts.map((part, index) => {
    // Tenta extrair um nome de arquivo ou um segmento da URL para identificação
    // Isso é um placeholder; a API Gemini não recebe metadados de nome de arquivo diretamente com inlineData.
    // A referência a qual imagem é qual terá que ser inferida pela ordem ou descrita no prompt se necessário.
    return `Imagem ${index + 1}`; 
  }).join(', ');

  const systemInstruction = `
Você é um assistente de radiologia altamente qualificado, com conhecimento e capacidade de análise comparáveis aos modelos especializados em imagens médicas como o MedGemma.
Analise TODAS as imagens fornecidas (até 10, identificadas como ${imageIdentifiers}) e o prompt do usuário para gerar um laudo radiológico CONSOLIDADO e detalhado.
Siga ESTRITAMENTE o formato abaixo. Use a marcação Markdown '**TEXTO EM NEGRITO**' para os títulos dos campos principais, exatamente como mostrado no modelo.
O prompt do usuário para esta análise é: "${userPrompt}"

Utilize o prompt do usuário e as informações de TODAS as imagens para elaborar os campos 'ACHADOS' e 'IMPRESSÃO DIAGNÓSTICA'.
No campo 'ACHADOS', se houver múltiplas imagens e os achados forem distintos ou específicos para cada uma, tente referenciar qual imagem (ex: "Na Imagem 1...") exibe qual achado. Sintetize quando possível.
Tente inferir a 'Modalidade' principal das imagens (ex: Raio-X, Tomografia Computadorizada, Ressonância Magnética) ou liste as modalidades se forem diversas. Se não puder determinar, escreva 'Não especificado'.
Para o campo 'TÉCNICA:', descreva brevemente qualquer técnica de imagem observável ou considerações relevantes para a análise, ou escreva 'Não especificado'.

Modelo do Laudo:
**RELATÓRIO DE IMAGEM**
**Data do exame:** ${formattedDate}
**Modalidade:** <Preencha aqui com a(s) modalidade(s) inferida(s) ou 'Não especificado'>
**Processamento:** Análise assistida por IA
**TÉCNICA:** <Preencha aqui com base nas imagens e no prompt do usuário>
**ACHADOS:** <Preencha aqui detalhadamente com base em TODAS as imagens e no prompt do usuário. Referencie imagens específicas se necessário.>
**IMPRESSÃO DIAGNÓSTICA:** <Preencha aqui com base em TODAS as imagens e no prompt do usuário. Deve ser uma conclusão consolidada.>
`;

  const textPart: Part = {
    text: systemInstruction,
  };

  try {
    // FIX: Moved safetySettings into generationConfig
    const generationConfig: GenerationConfig = {
      temperature: 0.2, 
      maxOutputTokens: 4096, // Aumentado para acomodar laudos de múltiplas imagens
      safetySettings: safetySettings,
    };
    
    const contents = [{ parts: [textPart, ...imageParts] }];

    const result: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: contents, 
      config: generationConfig
    });
    return result.text;
  } catch (error) {
    console.error("Erro ao gerar laudo a partir da imagem:", error);
    throw new Error(`Falha ao gerar laudo: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateSpeechFromText(textToSynthesize: string): Promise<string> {
  if (!textToSynthesize || textToSynthesize.trim() === "") {
    throw new Error("Não é possível gerar fala a partir de texto vazio.");
  }
  
  // FIX: Moved safetySettings into ttsConfig which is used as the 'config' parameter
  const ttsConfig = {
    responseModalities: ["AUDIO"], 
    speechConfig: {               
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: "vindemiatrix", 
        },
      },
    },
    safetySettings: safetySettings,
  };
  
  try {
    const result: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts', 
        contents: textToSynthesize, 
        config: ttsConfig as any, 
    });

    if (
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0 &&
      result.candidates[0].content.parts[0].inlineData &&
      result.candidates[0].content.parts[0].inlineData.data 
    ) {
      const audioBase64 = result.candidates[0].content.parts[0].inlineData.data;
      if (!audioBase64 || audioBase64.trim() === "") {
        console.error("A resposta TTS continha dados de áudio vazios.", { result });
        throw new Error("Falha ao gerar fala: Recebidos dados de áudio vazios do serviço.");
      }
      const audioMimeType = result.candidates[0].content.parts[0].inlineData.mimeType || 'audio/wav'; 
      return `data:${audioMimeType};base64,${audioBase64}`;
    } else {
      const textFallback = result.text; 
      if (textFallback) {
         console.warn("Dados de áudio TTS não encontrados. O modelo pode ter retornado texto em vez disso. A configuração TTS pode não ser suportada ou o nome da voz é inválido.", {textFallback, result});
         throw new Error(`Falha ao gerar fala: Dados de áudio não encontrados. O modelo retornou o texto: "${textFallback.substring(0,100)}..." Isso pode indicar um problema com a configuração TTS ou a validade do nome da voz para o modelo selecionado.`);
      }
      console.error("A resposta TTS não continha dados de áudio nem texto alternativo:", result);
      throw new Error("Falha ao gerar fala: Sem dados de áudio na resposta e sem texto alternativo. Verifique as capacidades do modelo e a configuração TTS.");
    }
  } catch (error) {
    console.error("Erro ao gerar fala:", error);
    throw new Error(`Falha ao gerar fala: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Falha ao buscar imagem: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg'; // Default to jpeg if type is not present

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve({ base64: reader.result.split(',')[1], mimeType });
        } else {
          reject(new Error("Falha ao ler a imagem como string base64."));
        }
      };
      reader.onerror = () => {
        reject(new Error("Erro ao ler arquivo de imagem."));
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Erro ao buscar imagem da URL:", error);
    throw new Error(`Falha ao buscar imagem da URL: ${error instanceof Error ? error.message : String(error)}. Isso pode ser devido à política CORS no servidor da imagem.`);
  }
}