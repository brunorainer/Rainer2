import React, { useState, useCallback, useEffect } from 'react';

interface ReportOutputProps {
  reportText: string | null;
  audioDataUrl: string | null;
  isLoadingReport: boolean; // For initial report text loading
  isLoadingAudio: boolean;  // For audio generation (initial or subsequent)
  error: string | null;
  onSaveEditedReport: (newText: string) => void;
  onGenerateAudioRequest: () => void; // Changed: App.tsx knows the text
}

const ReportOutput: React.FC<ReportOutputProps> = ({ 
  reportText, 
  audioDataUrl, 
  isLoadingReport, 
  isLoadingAudio,
  error,
  onSaveEditedReport,
  onGenerateAudioRequest 
}) => {
  const [copyButtonText, setCopyButtonText] = useState<string>("Copiar Laudo");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>("");

  useEffect(() => {
    // When reportText prop changes (e.g., initial load or saved edit),
    // and not currently editing, update the editable text.
    if (reportText && !isEditing) {
      setEditedText(reportText);
    }
    // If reportText becomes null (e.g. new analysis starts), clear editedText
    if (reportText === null) {
      setEditedText("");
      setIsEditing(false); // Exit editing mode if a new analysis clears the report
    }
  }, [reportText, isEditing]);

  const handleCopyText = useCallback(() => {
    const textToCopy = isEditing ? editedText : reportText;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          setCopyButtonText("Copiado!");
          setTimeout(() => setCopyButtonText("Copiar Laudo"), 2000);
        })
        .catch(err => {
          console.error("Falha ao copiar o texto: ", err);
          setCopyButtonText("Falha ao copiar");
          setTimeout(() => setCopyButtonText("Copiar Laudo"), 2000);
        });
    }
  }, [reportText, editedText, isEditing]);

  const renderFormattedReportText = (text: string | null) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <span key={index} dangerouslySetInnerHTML={{ __html: formattedLine + "<br />" }} />
      );
    });
  };

  const handleEditClick = () => {
    if (reportText) {
      setEditedText(reportText); // Initialize editor with current report text
      setIsEditing(true);
    }
  };

  const handleSaveClick = () => {
    onSaveEditedReport(editedText);
    setIsEditing(false);
  };

  const handleCancelClick = () => {
    if (reportText) {
        setEditedText(reportText); // Reset to original on cancel
    }
    setIsEditing(false);
  };

  if (isLoadingReport) {
    return (
      <div className="p-6 border border-gray-300 rounded-lg shadow-sm bg-white animate-pulse min-h-[200px]">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-6"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-300 rounded-lg shadow-sm bg-red-50 text-red-700 min-h-[200px]">
        <h3 className="text-lg font-semibold mb-2">Erro</h3>
        <p className="whitespace-pre-wrap">{error}</p>
      </div>
    );
  }

  if (!reportText && !audioDataUrl && !isEditing) { // Ensure no display if actively editing an empty (new) report
    return (
      <div className="p-6 border border-gray-300 rounded-lg shadow-sm bg-white text-center text-gray-500 min-h-[200px] flex items-center justify-center">
        <p>O laudo gerado e o áudio aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="p-6 border border-gray-300 rounded-lg shadow-sm bg-white space-y-6 min-h-[200px]">
      {reportText !== null && ( // Only show section if there is or was report text
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Laudo Radiológico</h3>
          {isEditing ? (
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full h-64 p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 bg-white"
              aria-label="Editor de Laudo Radiológico"
            />
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md max-h-80 overflow-y-auto prose prose-sm text-gray-700">
              {renderFormattedReportText(reportText)}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {isEditing ? (
          <div className="flex space-x-3">
            <button
              onClick={handleSaveClick}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Salvar Alterações
            </button>
            <button
              onClick={handleCancelClick}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <>
            {reportText && (
                 <button
                    onClick={handleEditClick}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                 >
                    Editar Laudo
                 </button>
            )}

            {reportText && !audioDataUrl && (
              <button
                onClick={onGenerateAudioRequest}
                disabled={isLoadingAudio}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400 flex items-center justify-center"
              >
                {isLoadingAudio ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Gerando Áudio...
                  </>
                ) : "Gerar Áudio para Laudo"}
              </button>
            )}
            
            {audioDataUrl && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Laudo em Áudio</h3>
                <audio controls src={audioDataUrl} className="w-full" aria-label="Reprodutor de áudio do laudo">
                  Seu navegador não suporta o elemento de áudio.
                </audio>
              </div>
            )}

            {reportText && (
                <button
                    onClick={handleCopyText}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    {copyButtonText}
                </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportOutput;