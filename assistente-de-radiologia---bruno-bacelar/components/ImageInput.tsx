import React, { useState, useCallback } from 'react';
import { ProcessedImageFile, UrlImageEntry } from '../types';

const MAX_IMAGES = 10; // Updated from 5 to 10
const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface ImageInputProps {
  onFileSelectionChange: (files: ProcessedImageFile[]) => void;
  processedFiles: ProcessedImageFile[];
  
  urlEntries: UrlImageEntry[];
  onAddUrlEntry: () => void;
  onRemoveUrlEntry: (id: string) => void;
  onUpdateUrlEntryValue: (id: string, value: string) => void;
  
  disabled: boolean;
}

const ImageInput: React.FC<ImageInputProps> = ({ 
  onFileSelectionChange,
  processedFiles,
  urlEntries,
  onAddUrlEntry,
  onRemoveUrlEntry,
  onUpdateUrlEntryValue,
  disabled
}) => {
  const [fileError, setFileError] = useState<string | null>(null);

  const totalImagesStaged = processedFiles.length + urlEntries.filter(entry => entry.value.trim() !== '').length;
  const canAddMoreImages = totalImagesStaged < MAX_IMAGES;
  const canAddMoreUrlEntries = urlEntries.length < MAX_IMAGES && canAddMoreImages;


  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = event.target.files;
    if (!files) {
      onFileSelectionChange([]); // Clear if no files
      return;
    }

    const selectedFilesArray = Array.from(files);
    if (selectedFilesArray.length + urlEntries.filter(u => u.value.trim()).length > MAX_IMAGES) {
        setFileError(`Você pode selecionar no máximo ${MAX_IMAGES} imagens no total (arquivos + URLs).`);
        onFileSelectionChange([]);
        event.target.value = ''; // Clear the input
        return;
    }
    
    const newProcessedFiles: ProcessedImageFile[] = [];
    for (const file of selectedFilesArray) {
      if (newProcessedFiles.length >= MAX_IMAGES) break;

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(`O arquivo "${file.name}" é muito grande (>${MAX_FILE_SIZE_MB}MB). Ele não será incluído.`);
        continue; 
      }

      try {
        const base64 = await readFileAsBase64(file);
        newProcessedFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          mimeType: file.type,
          base64: base64.split(',')[1], // Remove "data:mime/type;base64," prefix
          previewUrl: base64,
        });
      } catch (error) {
        setFileError(`Erro ao processar o arquivo "${file.name}".`);
      }
    }
    onFileSelectionChange(newProcessedFiles);
    event.target.value = ''; // Clear the input to allow re-selecting the same file if needed
  }, [onFileSelectionChange, urlEntries]);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error("Falha ao ler dados da imagem."));
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler o arquivo."));
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (fileIdToRemove: string) => {
    const updatedFiles = processedFiles.filter(file => file.id !== fileIdToRemove);
    onFileSelectionChange(updatedFiles);
  };


  return (
    <div className="space-y-6 p-4 border border-gray-300 rounded-lg shadow-sm bg-white">
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">Carregar Imagens (Arquivos)</h3>
        <p className="text-xs text-gray-500 mb-2">
          Selecione até {MAX_IMAGES} imagens (PNG, JPG, WEBP, GIF - Máx {MAX_FILE_SIZE_MB}MB por arquivo).
          A contagem total de arquivos e URLs não deve exceder {MAX_IMAGES}.
        </p>
        <input
          id="image-file-upload"
          type="file"
          accept="image/png, image/jpeg, image/webp, image/gif"
          multiple
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-md file:border-0
                     file:text-sm file:font-semibold
                     file:bg-indigo-50 file:text-indigo-700
                     hover:file:bg-indigo-100 disabled:opacity-50"
          disabled={disabled || !canAddMoreImages || processedFiles.length >= MAX_IMAGES}
        />
        {fileError && <p className="text-sm text-red-600 mt-2">{fileError}</p>}
        {processedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Arquivos selecionados:</p>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {processedFiles.map((file) => (
                <li key={file.id} className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <img src={file.previewUrl} alt={file.name} className="h-10 w-10 object-cover rounded border" />
                    <span className="text-xs text-gray-600 truncate" title={file.name}>{file.name}</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveFile(file.id)} 
                    disabled={disabled}
                    className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                    aria-label={`Remover ${file.name}`}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <hr className="my-4 border-gray-200" />

      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">Adicionar Imagens (URLs)</h3>
         {urlEntries.map((entry, index) => (
          <div key={entry.id} className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={entry.value}
              onChange={(e) => onUpdateUrlEntryValue(entry.id, e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
              className="flex-grow mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
              disabled={disabled}
              aria-label={`URL da Imagem ${index + 1}`}
            />
            <button 
              onClick={() => onRemoveUrlEntry(entry.id)}
              disabled={disabled}
              className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50"
              aria-label={`Remover URL ${index + 1}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
        {canAddMoreUrlEntries && (
          <button
            onClick={onAddUrlEntry}
            disabled={disabled || !canAddMoreImages}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            + Adicionar outra URL de imagem
          </button>
        )}
      </div>
      
      <div className="mt-4 p-2 bg-indigo-50 rounded-md text-sm text-indigo-700">
        Total de imagens para análise: {totalImagesStaged} / {MAX_IMAGES}
      </div>

    </div>
  );
};

export default ImageInput;
