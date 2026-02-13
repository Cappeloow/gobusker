import QRCodeStyling from 'qr-code-styling';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { QrCode } from 'lucide-react';

interface ProfileQRCodeProps {
  profileUrl: string;
  profileName: string;
  username?: string;
}

export const ProfileQRCode = ({ profileUrl, profileName, username }: ProfileQRCodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [qrElement, setQrElement] = useState<HTMLDivElement | null>(null);

  const handleClose = () => {
    setIsOpen(false);
    setIsExpanded(false);
  };

  // Extract username from profileName if not provided
  const displayUsername = username || `@${profileName.toLowerCase().replace(/\s+/g, '')}`;

  const qrSize = isExpanded ? Math.min(window.innerWidth, window.innerHeight) * 0.6 : 256;

  // Callback ref to handle QR code rendering
  const qrRef = useCallback((node: HTMLDivElement | null) => {
    if (node && isOpen && profileUrl) {
      setQrElement(node);
      
      // Clear any existing content
      node.innerHTML = '';
      
      // Create and render QR code
      const qrCode = new QRCodeStyling({
        width: qrSize,
        height: qrSize,
        type: "svg" as const,
        data: profileUrl,
        margin: 10,
        qrOptions: {
          typeNumber: 0,
          mode: "Byte" as const,
          errorCorrectionLevel: "H" as const
        },
        dotsOptions: {
          color: "#B8956F",
          type: "rounded" as const
        },
        backgroundOptions: {
          color: "#ffffff",
        },
        cornersSquareOptions: {
          color: "#D2B48C",
          type: "extra-rounded" as const,
        },
        cornersDotOptions: {
          color: "#B8956F",
          type: "dot" as const,
        }
      });
      
      qrCode.append(node);
    }
  }, [isOpen, profileUrl, qrSize]);

  // Handle size updates when expanding
  useEffect(() => {
    if (qrElement && isOpen && profileUrl) {
      qrElement.innerHTML = '';
      
      const qrCode = new QRCodeStyling({
        width: qrSize,
        height: qrSize,
        type: "svg" as const,
        data: profileUrl,
        margin: 10,
        qrOptions: {
          typeNumber: 0,
          mode: "Byte" as const,
          errorCorrectionLevel: "H" as const
        },
        dotsOptions: {
          color: "#B8956F",
          type: "rounded" as const
        },
        backgroundOptions: {
          color: "#ffffff",
        },
        cornersSquareOptions: {
          color: "#D2B48C",
          type: "extra-rounded" as const,
        },
        cornersDotOptions: {
          color: "#B8956F",
          type: "dot" as const,
        }
      });
      
      qrCode.append(qrElement);
    }
  }, [isExpanded, qrSize, qrElement, isOpen, profileUrl]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-github-bg transition-colors border-none bg-transparent cursor-pointer"
        title="Show QR Code"
      >
        <QrCode className="w-6 h-6 text-light-text dark:text-github-text" />
      </button>

      <Dialog
        open={isOpen}
        onClose={handleClose}
        className="fixed inset-0 z-50 overflow-y-auto"
      >
        <div className="min-h-screen p-4 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={handleClose} 
          />

          <div className={`
            relative bg-light-card dark:bg-github-card rounded-2xl shadow-2xl
            ${isExpanded 
              ? 'w-screen h-screen p-0 m-0 rounded-none' 
              : 'p-8 max-w-md w-full mx-auto'
            }
            flex flex-col items-center justify-center
            transition-all duration-300 ease-in-out
            ${isExpanded ? 'cursor-zoom-out' : 'cursor-default'}
          `}>
            <button
              onClick={handleClose}
              className={`
                absolute ${isExpanded ? 'top-5 right-5' : 'top-4 right-4'}
                text-light-text-muted dark:text-github-text-muted
                hover:text-light-text dark:hover:text-github-text
                transition-colors p-1 rounded-full
                hover:bg-light-bg dark:hover:bg-github-bg
              `}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div 
              className="flex flex-col items-center cursor-zoom-in"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {/* BUSKER Title */}
              <div className="mb-6 text-center">
                <h2 
                  className="text-4xl font-bold tracking-[0.2em]"
                  style={{ 
                    fontFamily: '"Tan Pearl", serif', 
                    color: '#D2B48C'
                  }}
                >
                  BUSKER
                </h2>
              </div>

              {/* QR Code with Custom Styling */}
              <div className="relative">
                {/* Decorative border */}
                <div 
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, #D2B48C 0%, #B8956F 100%)`,
                    padding: '8px',
                    margin: '-8px'
                  }}
                >
                  <div className="w-full h-full bg-white dark:bg-github-card rounded-lg"></div>
                </div>
                
                <div className="relative bg-white p-4 rounded-lg">
                  <div ref={qrRef} className="flex justify-center items-center" style={{ minHeight: qrSize, minWidth: qrSize }} />
                </div>
              </div>

              {/* Username */}
              <div className="mt-6 text-center">
                <p className="text-lg font-semibold text-light-text dark:text-github-text">
                  {displayUsername}
                </p>
                <p className="text-sm text-light-text-secondary dark:text-github-text-secondary mt-1">
                  {profileName}
                </p>
              </div>
              
              <p className="mt-4 text-sm text-light-text-muted dark:text-github-text-muted text-center">
                {isExpanded ? 'Click to shrink' : 'Scan to view profile • Click to expand'}
              </p>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};