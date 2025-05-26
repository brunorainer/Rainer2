import React, { useState, useCallback } from 'react';
import { ProcessedImageFile } from '../types';
import ImagePreviewModal from './ImagePreviewModal'; // Import the modal

const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface FileUploadSectionProps {
  processedFiles: ProcessedImageFile[];
  onFileSelectionChange: (files: ProcessedImageFile[]) => void;
  disabled: boolean;
  maxOverallImages: number;
  numCurrentUrlImages: number;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  processedFiles,
  onFileSelectionChange,
  disabled,
  maxOverallImages,
  numCurrentUrlImages,
}) => {
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedImageForPreview, setSelectedImageForPreview] = useState<string | null>(null);
  const [previewModalAltText, setPreviewModalAltText] = useState<string>('');


  const canAddMoreFiles = (maxOverallImages - numCurrentUrlImages - processedFiles.length) > 0;
  const fileInputDisabled = disabled || !canAddMoreFiles || (numCurrentUrlImages + processedFiles.length >= maxOverallImages);


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

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = event.target.files;
    if (!files) {
      onFileSelectionChange([]); 
      return;
    }

    const selectedFilesArray = Array.from(files);
    const slotsAvailableForNewFiles = maxOverallImages - numCurrentUrlImages;

    if (selectedFilesArray.length > slotsAvailableForNewFiles) {
      setFileError(`Você pode carregar no máximo ${slotsAvailableForNewFiles} arquivo(s) no total (considerando as URLs). Apenas os primeiros ${slotsAvailableForNewFiles} arquivos foram considerados.`);
    }
    
    const filesToProcess = selectedFilesArray.slice(0, Math.max(0, slotsAvailableForNewFiles));
    const newProcessedFiles: ProcessedImageFile[] = [];

    for (const file of filesToProcess) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(prevError => (prevError ? prevError + "\n" : "") + `O arquivo "${file.name}" é muito grande (>${MAX_FILE_SIZE_MB}MB). Ele não será incluído.`);
        continue; 
      }

      try {
        const base64 = await readFileAsBase64(file);
        newProcessedFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          mimeType: file.type,
          base64: base64.split(',')[1],
          previewUrl: base64,
        });
      } catch (error) {
        setFileError(prevError => (prevError ? prevError + "\n" : "") + `Erro ao processar o arquivo "${file.name}".`);
      }
    }
    onFileSelectionChange(newProcessedFiles);
    event.target.value = ''; 
  }, [onFileSelectionChange, maxOverallImages, numCurrentUrlImages]);

  const handleRemoveFile = (fileIdToRemove: string) => {
    const updatedFiles = processedFiles.filter(file => file.id !== fileIdToRemove);
    onFileSelectionChange(updatedFiles);
  };

  const openImagePreview = (imageUrl: string, altText: string) => {
    setSelectedImageForPreview(imageUrl);
    setPreviewModalAltText(altText);
  };

  const closeImagePreview = () => {
    setSelectedImageForPreview(null);
    setPreviewModalAltText('');
  };

  return (
    <>
      <div className="space-y-4 p-4 border border-gray-300 rounded-lg shadow-sm bg-white h-full flex flex-col">
        <h3 className="text-lg font-medium text-gray-800 mb-1">Carregar Imagens (Arquivos)</h3>
        <p className="text-xs text-gray-500 mb-1">
          PNG, JPG, WEBP, GIF (Máx {MAX_FILE_SIZE_MB}MB/arquivo).
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
                     hover:file:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={fileInputDisabled}
          aria-label="Carregar arquivos de imagem"
        />
        {fileError && <p className="text-sm text-red-600 mt-2 whitespace-pre-line">{fileError}</p>}
        
        {processedFiles.length > 0 && (
          <div className="mt-3 space-y-2 flex-grow overflow-hidden">
            <p className="text-sm font-medium text-gray-700">Arquivos selecionados:</p>
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {processedFiles.map((file) => (
                <li key={file.id} className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                  <button 
                    onClick={() => openImagePreview(file.previewUrl, `Pré-visualização de ${file.name}`)}
                    className="flex items-center space-x-2 overflow-hidden cursor-pointer group focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                    aria-label={`Ampliar imagem ${file.name}`}
                  >
                    <img 
                        src={file.previewUrl} 
                        alt={file.name} 
                        className="h-10 w-10 object-cover rounded border group-hover:ring-2 group-hover:ring-indigo-500 transition-all" 
                    />
                    <span className="text-xs text-gray-600 truncate group-hover:text-indigo-600" title={file.name}>{file.name}</span>
                  </button>
                  <button 
                    onClick={() => handleRemoveFile(file.id)} 
                    disabled={disabled}
                    className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50 ml-2 flex-shrink-0 p-1"
                    aria-label={`Remover arquivo ${file.name}`}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!fileInputDisabled && processedFiles.length === 0 && (
          <p className="text-xs text-gray-400 mt-2 flex-grow flex items-center justify-center">Nenhum arquivo carregado.</p>
        )}
        {fileInputDisabled && processedFiles.length === 0 && (
            <p className="text-xs text-gray-400 mt-2 flex-grow flex items-center justify-center">Limite de imagens atingido ou upload desabilitado.</p>
        )}
      </div>
      
      <ImagePreviewModal 
        imageUrl={selectedImageForPreview}
        altText={previewModalAltText}
        onClose={closeImagePreview}
      />
    </>
  );
};

export default FileUploadSection;
