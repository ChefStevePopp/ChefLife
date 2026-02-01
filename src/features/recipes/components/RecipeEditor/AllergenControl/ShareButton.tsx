import React, { useState } from 'react';
import { Share2, Link, QrCode, Copy, Check, Download, X } from 'lucide-react';

interface ShareButtonProps {
  recipeId: string;
  recipeName: string;
}

/**
 * Share Button with modal for link/QR code generation
 */
export const ShareButton: React.FC<ShareButtonProps> = ({
  recipeId,
  recipeName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Generate the public URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${baseUrl}/public/allergen/${recipeId}`;
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const handleDownloadQR = () => {
    // QR code generation will be handled by a library
    // For now, we'll use a free QR code API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}`;
    
    // Open in new tab (user can right-click to save)
    window.open(qrUrl, '_blank');
  };
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-colors"
      >
        <Share2 className="w-4 h-4" />
        <span className="text-sm font-medium">Share</span>
      </button>
      
      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Share Allergen Declaration</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Recipe Name */}
              <div className="text-center">
                <p className="text-sm text-gray-400">Sharing allergen info for</p>
                <p className="text-lg font-medium text-white">{recipeName}</p>
              </div>
              
              {/* URL Section */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <Link className="w-4 h-4" />
                  Public Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={publicUrl}
                    readOnly
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                  <button
                    onClick={handleCopy}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1 ${
                      copied 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span className="text-sm">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-sm">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* QR Code Section */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <QrCode className="w-4 h-4" />
                  QR Code
                </label>
                <div className="flex items-center gap-4">
                  {/* QR Preview */}
                  <div className="w-24 h-24 bg-white rounded-lg p-2 flex items-center justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(publicUrl)}`}
                      alt="QR Code"
                      className="w-full h-full"
                    />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-gray-400">
                      Scan to view allergen information on mobile
                    </p>
                    <button
                      onClick={handleDownloadQR}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm">Download QR</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Info Note */}
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-xs text-blue-300">
                  This link shows a read-only view of the allergen declaration. 
                  Customers can access it without logging in. The page shows your 
                  restaurant branding and a timestamp of when the information was last updated.
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-700 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
