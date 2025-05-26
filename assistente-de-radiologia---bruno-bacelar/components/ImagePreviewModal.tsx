import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  altText: string;
  onClose: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP_FACTOR = 0.1; // Each wheel step changes zoom by 10%

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, altText, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPan, setDragStartPan] = useState({ x: 0, y: 0 });
  const [dragStartMouse, setDragStartMouse] = useState({ x: 0, y: 0 });

  const imageViewportRef = useRef<HTMLDivElement>(null);

  const handleMouseMoveGlobal = useCallback((e: MouseEvent) => {
    // This global handler is active only when isDragging is true (implicitly, due to how it's added/removed)
    const dx = e.clientX - dragStartMouse.x;
    const dy = e.clientY - dragStartMouse.y;
    setPan({
      x: dragStartPan.x + dx,
      y: dragStartPan.y + dy,
    });
  }, [dragStartMouse, dragStartPan]);

  const handleMouseUpGlobal = useCallback(() => {
    setIsDragging(false);
    window.removeEventListener('mousemove', handleMouseMoveGlobal);
    window.removeEventListener('mouseup', handleMouseUpGlobal);
  }, [handleMouseMoveGlobal]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return; // Only allow panning if zoomed
    e.preventDefault();
    setIsDragging(true);
    setDragStartPan({ ...pan });
    setDragStartMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUpGlobal);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!imageViewportRef.current) return;

    const rect = imageViewportRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldZoom = zoom;
    const scaleMultiplier = e.deltaY < 0 ? (1 + ZOOM_STEP_FACTOR) : (1 / (1 + ZOOM_STEP_FACTOR));
    
    let newZoom = oldZoom * scaleMultiplier;
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    if (newZoom === oldZoom) return;

    const newPanX = mouseX - ((mouseX - pan.x) / oldZoom) * newZoom;
    const newPanY = mouseY - ((mouseY - pan.y) / oldZoom) * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Reset state and clean up listeners when imageUrl changes or component unmounts
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsDragging(false); // Ensure dragging state is reset
    
    // Clean up any potentially lingering global listeners
    window.removeEventListener('mousemove', handleMouseMoveGlobal);
    window.removeEventListener('mouseup', handleMouseUpGlobal);

    // Return a cleanup function for when the component unmounts or imageUrl changes again
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [imageUrl, handleMouseMoveGlobal, handleMouseUpGlobal]);


  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-preview-title"
    >
      <div 
        className="bg-white p-4 rounded-lg shadow-xl flex flex-col"
        style={{ width: '90vw', height: '90vh' }} // Define max size for the modal content
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-2 flex-shrink-0">
            <h2 id="image-preview-title" className="text-lg font-semibold text-gray-800 sr-only">Visualização Ampliada da Imagem</h2>
            <button
                onClick={onClose}
                className="text-gray-600 hover:text-gray-900 text-2xl font-bold"
                aria-label="Fechar visualização ampliada"
            >
                &times;
            </button>
        </div>
        <div 
          ref={imageViewportRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          className="rounded flex-grow relative" // Use flex-grow to take available space
          style={{
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'default'),
            touchAction: 'none', // Prevents scrolling on touch devices if mouse events are triggered
          }}
        >
          <img 
            src={imageUrl} 
            alt={altText} 
            draggable="false"
            style={{
              width: '100%', // Image element fills the viewport
              height: '100%',
              objectFit: 'contain', // Image content is contained, maintaining aspect ratio
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0', // Zoom and pan calculations are relative to top-left
              willChange: 'transform', // Hint for performance
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;