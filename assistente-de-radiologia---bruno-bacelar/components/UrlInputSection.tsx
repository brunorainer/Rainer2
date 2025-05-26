import React from 'react';
import { UrlImageEntry } from '../types';

interface UrlInputSectionProps {
  urlEntries: UrlImageEntry[];
  onAddUrlEntry: () => void;
  onRemoveUrlEntry: (id: string) => void;
  onUpdateUrlEntryValue: (id: string, value: string) => void;
  disabled: boolean;
  maxOverallImages: number;
  numCurrentFileImages: number;
}

const UrlInputSection: React.FC<UrlInputSectionProps> = ({
  urlEntries,
  onAddUrlEntry,
  onRemoveUrlEntry,
  onUpdateUrlEntryValue,
  disabled,
  maxOverallImages,
  numCurrentFileImages,
}) => {

  const numFilledUrlEntries = urlEntries.filter(entry => entry.value.trim() !== '').length;
  const totalImagesSoFar = numCurrentFileImages + numFilledUrlEntries;
  
  // Can add more URL *fields* if not exceeding maxOverallImages for fields, 
  // AND if adding one more (empty) field doesn't make total images exceed limit (relevant if all current fields are filled)
  const canAddMoreUrlFields = urlEntries.length < maxOverallImages;
  // Can add more images via URL if total images so far is less than max overall
  const canSubmitMoreImagesViaUrl = totalImagesSoFar < maxOverallImages;

  const addButtonDisabled = disabled || !canAddMoreUrlFields || !canSubmitMoreImagesViaUrl;


  return (
    <div className="space-y-4 p-4 border border-gray-300 rounded-lg shadow-sm bg-white h-full flex flex-col">
      <h3 className="text-lg font-medium text-gray-800 mb-1">Adicionar Imagens (URLs)</h3>
      <div className="space-y-2 flex-grow overflow-y-auto pr-1 max-h-60">
        {urlEntries.map((entry, index) => (
          <div key={entry.id} className="flex items-center space-x-2">
            <input
              type="url"
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
              className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50 flex-shrink-0"
              aria-label={`Remover URL ${index + 1}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
        {urlEntries.length === 0 && !addButtonDisabled && (
            <p className="text-xs text-gray-400 mt-2 flex-grow flex items-center justify-center">Nenhuma URL adicionada.</p>
        )}
         {urlEntries.length === 0 && addButtonDisabled && (
             <p className="text-xs text-gray-400 mt-2 flex-grow flex items-center justify-center">Limite de imagens atingido ou adição de URL desabilitada.</p>
        )}
      </div>
      
      <button
        onClick={onAddUrlEntry}
        disabled={addButtonDisabled}
        className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed self-start"
      >
        + Adicionar outra URL
      </button>
    </div>
  );
};

export default UrlInputSection;
