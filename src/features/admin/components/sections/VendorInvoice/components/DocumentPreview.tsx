import React, { useState, useEffect, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Download,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// =============================================================================
// DOCUMENT PREVIEW - L5 Design
// =============================================================================
// Two-column import workspace: Source document always visible
// Philosophy: "No neck patterns, no tab switching"
// =============================================================================

interface Props {
  file: File | null;
  fileType: "pdf" | "photo";
  onTextExtracted?: (text: string) => void;
  className?: string;
}

export const DocumentPreview: React.FC<Props> = ({
  file,
  fileType,
  onTextExtracted,
  className = "",
}) => {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<HTMLCanvasElement[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Pan/drag state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

  // ---------------------------------------------------------------------------
  // PDF RENDERING
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      setPdfPages([]);
      setError(null);
      return;
    }

    const loadFile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (fileType === "photo") {
          // Load image
          const url = URL.createObjectURL(file);
          setImageUrl(url);
          setTotalPages(1);
          setCurrentPage(1);
        } else {
          // Load PDF
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
          
          setTotalPages(pdf.numPages);
          setCurrentPage(1);

          // Render all pages and extract text
          const pages: HTMLCanvasElement[] = [];
          let fullText = "";

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });

            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const context = canvas.getContext("2d");
            if (context) {
              await page.render({
                canvasContext: context,
                viewport: viewport,
              }).promise;
            }

            pages.push(canvas);

            // Extract text for parsing
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join("\n");
            fullText += pageText + "\n";
          }

          setPdfPages(pages);
          
          // Send extracted text to parent for parsing
          if (onTextExtracted) {
            onTextExtracted(fullText);
          }
        }
      } catch (err: any) {
        console.error("Error loading document:", err);
        setError(err.message || "Failed to load document");
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();

    // Cleanup
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [file, fileType]);

  // ---------------------------------------------------------------------------
  // DRAW CURRENT PAGE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (fileType === "pdf" && pdfPages.length > 0 && canvasRef.current) {
      const sourceCanvas = pdfPages[currentPage - 1];
      if (sourceCanvas) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          canvasRef.current.width = sourceCanvas.width;
          canvasRef.current.height = sourceCanvas.height;
          ctx.drawImage(sourceCanvas, 0, 0);
        }
      }
    }
  }, [currentPage, pdfPages, fileType]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

  // Pan/drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1 && containerRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setScrollStart({ 
        x: containerRef.current.scrollLeft, 
        y: containerRef.current.scrollTop 
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && containerRef.current) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      containerRef.current.scrollLeft = scrollStart.x - dx;
      containerRef.current.scrollTop = scrollStart.y - dy;
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  const handleDownload = () => {
    if (file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER: Empty State
  // ---------------------------------------------------------------------------
  if (!file) {
    return (
      <div className={`bg-gray-800/50 rounded-lg border border-gray-700/50 p-6 flex flex-col items-center justify-center min-h-[400px] ${className}`}>
        <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center mb-4">
          {fileType === "pdf" ? (
            <FileText className="w-8 h-8 text-gray-500" />
          ) : (
            <ImageIcon className="w-8 h-8 text-gray-500" />
          )}
        </div>
        <p className="text-gray-400 text-center">
          {fileType === "pdf" 
            ? "Upload a PDF invoice to preview"
            : "Upload a photo of your invoice"
          }
        </p>
        <p className="text-xs text-gray-600 mt-2">
          Document will appear here for verification
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Loading State
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className={`bg-gray-800/50 rounded-lg border border-gray-700/50 p-6 flex flex-col items-center justify-center min-h-[400px] ${className}`}>
        <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Loading document...</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Error State
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div className={`bg-gray-800/50 rounded-lg border border-rose-500/30 p-6 flex flex-col items-center justify-center min-h-[400px] ${className}`}>
        <AlertCircle className="w-12 h-12 text-rose-400 mb-4" />
        <p className="text-rose-400 text-center mb-2">Failed to load document</p>
        <p className="text-xs text-gray-500">{error}</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Document Preview
  // ---------------------------------------------------------------------------
  return (
    <div className={`bg-gray-800/50 rounded-lg border border-gray-700/50 flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-700/50">
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-700 mx-1" />
          <button
            onClick={handleRotate}
            className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            title="Rotate"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Page Navigation (PDF only) */}
        {fileType === "pdf" && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 min-w-[4rem] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          onClick={handleDownload}
          className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
          title="Download original"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Document Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 min-h-[300px] max-h-[400px]"
        style={{ 
          cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="inline-block select-none"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: "top left",
            transition: isPanning ? "none" : "transform 0.2s ease-out",
            pointerEvents: zoom > 1 ? "none" : "auto",
          }}
        >
          {fileType === "photo" && imageUrl ? (
            <img
              src={imageUrl}
              alt="Invoice"
              className="rounded shadow-lg"
              draggable={false}
            />
          ) : (
            <canvas
              ref={canvasRef}
              className="rounded shadow-lg"
            />
          )}
        </div>
      </div>

      {/* File Info Footer */}
      <div className="px-3 py-2 border-t border-gray-700/50 flex items-center justify-between">
        <span className="text-xs text-gray-500 truncate max-w-[200px]" title={file.name}>
          {file.name}
        </span>
        <span className="text-xs text-gray-600">
          {(file.size / 1024).toFixed(1)} KB
        </span>
      </div>
    </div>
  );
};
