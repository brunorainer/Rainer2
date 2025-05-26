import React, { useState, useCallback } from 'react';
import { ReportData, ProcessedImageFile, UrlImageEntry } from './types';
import FileUploadSection from './components/FileUploadSection';
import UrlInputSection from './components/UrlInputSection';
import ReportOutput from './components/ReportOutput';
import { generateReportFromImage, generateSpeechFromText, fetchImageAsBase64 } from './services/geminiService';
import { Part } from '@google/genai';

const rainerLogoBase64 = "data:image/png;base64,PLACEHOLDER_FOR_RAINER_LOGO_BASE64_STRING"; 

const MAX_IMAGES = 10; // Updated from 5 to 10

interface AppState {
  prompt: string;
  processedFiles: ProcessedImageFile[];
  urlEntries: UrlImageEntry[];
  reportData: ReportData | null;
  isLoading: boolean; // True if any backend operation (text or audio generation) is in progress
  error: string | null;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    prompt: "Descreva este Raio-x",
    processedFiles: [],
    urlEntries: [{ id: crypto.randomUUID(), value: '' }],
    reportData: null,
    isLoading: false,
    error: null,
  });

  const handleFileSelectionChange = useCallback((newFilesFromInput: ProcessedImageFile[]) => {
    setState(prev => ({ ...prev, processedFiles: newFilesFromInput, error: null }));
  }, []);

  const addUrlEntry = useCallback(() => {
    setState(prev => {
      const currentFileCount = prev.processedFiles.length;
      const currentUrlFieldsCount = prev.urlEntries.length;
      const currentFilledUrlCount = prev.urlEntries.filter(u => u.value.trim()).length;
      const totalStagedImages = currentFileCount + currentFilledUrlCount;

      if (currentUrlFieldsCount < MAX_IMAGES && totalStagedImages < MAX_IMAGES) {
        return { ...prev, urlEntries: [...prev.urlEntries, { id: crypto.randomUUID(), value: '' }] };
      }
      return prev;
    });
  }, []);

  const removeUrlEntry = useCallback((idToRemove: string) => {
    setState(prev => ({ 
      ...prev, 
      urlEntries: prev.urlEntries.filter(entry => entry.id !== idToRemove) 
    }));
  }, []);

  const updateUrlEntryValue = useCallback((idToUpdate: string, newValue: string) => {
    setState(prev => ({
      ...prev,
      urlEntries: prev.urlEntries.map(entry => 
        entry.id === idToUpdate ? { ...entry, value: newValue } : entry
      )
    }));
  }, []);


  const handleSubmit = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null, reportData: null }));
    
    const imageParts: Part[] = [];
    let processingError: string | null = null;

    for (const file of state.processedFiles) {
      if (imageParts.length < MAX_IMAGES) {
        imageParts.push({ inlineData: { mimeType: file.mimeType, data: file.base64 } });
      }
    }

    for (const entry of state.urlEntries) {
      if (imageParts.length < MAX_IMAGES && entry.value.trim()) {
        try {
          const fetchedImage = await fetchImageAsBase64(entry.value.trim());
          imageParts.push({ inlineData: { mimeType: fetchedImage.mimeType, data: fetchedImage.base64 } });
        } catch (err) {
          processingError = `Falha ao carregar imagem da URL "${entry.value.substring(0,30)}...": ${err instanceof Error ? err.message : String(err)}`;
          break; 
        }
      }
    }

    if (processingError) {
      setState(prev => ({ ...prev, isLoading: false, error: processingError }));
      return;
    }

    if (imageParts.length === 0) {
      setState(prev => ({ ...prev, isLoading: false, error: "Nenhuma imagem fornecida. Adicione arquivos ou URLs." }));
      return;
    }
     if (imageParts.length > MAX_IMAGES) {
      setState(prev => ({ ...prev, isLoading: false, error: `Você pode fornecer no máximo ${MAX_IMAGES} imagens.` }));
      return;
    }

    if (!state.prompt.trim()) {
      setState(prev => ({ ...prev, isLoading: false, error: "Por favor, insira um prompt." }));
      return;
    }

    try {
      const reportText = await generateReportFromImage(state.prompt, imageParts);
      // Set text first, audio will be generated next. isLoading remains true.
      setState(prev => ({ ...prev, reportData: { text: reportText, audioDataUrl: null } })); 

      if (reportText) {
        const audioDataUrl = await generateSpeechFromText(reportText);
        setState(prev => ({ ...prev, reportData: { text: reportText, audioDataUrl }, isLoading: false }));
      } else {
        setState(prev => ({ ...prev, isLoading: false, error: "Falha ao gerar o texto do laudo."}));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      setState(prev => ({ ...prev, isLoading: false, error: `Ocorreu um erro: ${errorMessage}` }));
    }
  };

  const handleSaveEditedReport = useCallback((newText: string) => {
    setState(prev => ({
      ...prev,
      reportData: {
        text: newText,
        audioDataUrl: null // Invalidate existing audio
      },
      isLoading: false, // Finished editing text part
      error: null
    }));
  }, []);

  const handleGenerateAudioForEditedReport = useCallback(async () => {
    if (!state.reportData?.text) {
      setState(prev => ({ ...prev, error: "Não há texto de laudo para gerar áudio."}));
      return;
    }
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const audioDataUrl = await generateSpeechFromText(state.reportData.text);
      setState(prev => ({
        ...prev,
        reportData: { ...prev.reportData!, audioDataUrl },
        isLoading: false
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      setState(prev => ({ ...prev, isLoading: false, error: `Falha ao gerar áudio: ${errorMessage}` }));
    }
  }, [state.reportData?.text]);
  
  const numFilledUrlEntries = state.urlEntries.filter(u => u.value.trim()).length;
  const totalImagesProvided = state.processedFiles.length + numFilledUrlEntries;

  // Determine if the main submit button should be for initial generation or new report
  const submitButtonText = state.reportData?.text 
    ? `Gerar Novo Laudo com Imagens (Substituir Atual)` 
    : `Gerar Laudo e Áudio (${totalImagesProvided} imagem(s))`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-5xl w-full bg-white shadow-2xl rounded-xl overflow-hidden">
        <header className="bg-indigo-600 p-6 flex items-center space-x-4">
          {rainerLogoBase64 !== "data:image/png;base64,PLACEHOLDER_FOR_RAINER_LOGO_BASE64_STRING" && (
            <img 
              src={rainerLogoBase64} 
              alt="RAIner Logo" 
              className="h-16 w-auto flex-shrink-0"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Assistente de Radiologia com Gemini
            </h1>
            <p className="text-sm text-indigo-200 mt-2">
              Análise de múltiplas imagens radiológicas (até {MAX_IMAGES}) e laudos por voz com IA.
            </p>
          </div>
        </header>

        <main className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Coluna 1: Prompt */}
            <div className="p-4 border border-gray-300 rounded-lg shadow-sm bg-white flex flex-col">
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
                Seu Prompt / Instruções
              </label>
              <textarea
                id="prompt"
                rows={6} 
                value={state.prompt}
                onChange={(e) => setState(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="Ex: Descreva estas imagens, focando em..."
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50 text-black flex-grow"
                disabled={state.isLoading}
                aria-label="Prompt de entrada para análise de imagem"
              />
            </div>

            {/* Coluna 2: File Upload */}
            <FileUploadSection
              processedFiles={state.processedFiles}
              onFileSelectionChange={handleFileSelectionChange}
              disabled={state.isLoading}
              maxOverallImages={MAX_IMAGES}
              numCurrentUrlImages={numFilledUrlEntries}
            />
            
            {/* Coluna 3: URL Input */}
            <UrlInputSection
              urlEntries={state.urlEntries}
              onAddUrlEntry={addUrlEntry}
              onRemoveUrlEntry={removeUrlEntry}
              onUpdateUrlEntryValue={updateUrlEntryValue}
              disabled={state.isLoading}
              maxOverallImages={MAX_IMAGES}
              numCurrentFileImages={state.processedFiles.length}
            />
          </div>

          <div className="mt-1 p-3 bg-indigo-50 rounded-md text-sm text-indigo-800 text-center shadow">
            Total de imagens para análise: <strong>{totalImagesProvided} / {MAX_IMAGES}</strong>
             <span className="block text-xs text-indigo-600 mt-1">
                A contagem total de arquivos e URLs preenchidas não deve exceder {MAX_IMAGES}.
            </span>
          </div>
              
          <button
            onClick={handleSubmit}
            disabled={state.isLoading || !state.prompt.trim() || totalImagesProvided === 0 || totalImagesProvided > MAX_IMAGES}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            aria-live="polite"
          >
            {state.isLoading && !state.reportData?.text ? ( // Show "Processando..." only for initial report gen
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processando Laudo Inicial...
              </>
            ) : submitButtonText}
          </button>
          
          {/* Full width Report Output */}
          <div className="mt-6">
            <ReportOutput
              reportText={state.reportData?.text ?? null}
              audioDataUrl={state.reportData?.audioDataUrl ?? null}
              isLoadingReport={state.isLoading && !state.reportData?.text} // True when initial text is loading
              isLoadingAudio={state.isLoading && !!state.reportData?.text && !state.reportData?.audioDataUrl} // True when audio is loading for existing text
              error={state.error}
              onSaveEditedReport={handleSaveEditedReport}
              onGenerateAudioRequest={handleGenerateAudioForEditedReport}
            />
          </div>
        </main>

        <footer className="p-6 border-t border-gray-200 bg-gray-50">
            <h3 className="text-md font-semibold text-gray-700 mb-2">Aviso Legal</h3>
            <p className="text-xs text-gray-600">
                Este aplicativo é apenas para fins de demonstração e ilustração. 
                As informações geradas não se destinam a diagnosticar, tratar, curar ou prevenir qualquer doença ou condição, 
                e não devem ser usadas como substituto de aconselhamento médico profissional. 
                Sempre consulte um profissional de saúde qualificado para quaisquer preocupações de saúde ou antes de tomar qualquer decisão relacionada à sua saúde ou tratamento.
                A interpretação das imagens pela IA pode não ser precisa ou completa.
            </p>
             <p className="text-xs text-gray-500 mt-4 text-center">
                Desenvolvido com Google Gemini. A chave de API para os serviços Gemini deve ser configurada no ambiente.
            </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
