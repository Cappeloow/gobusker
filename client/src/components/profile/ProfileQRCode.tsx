import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { QrCode } from 'lucide-react';

interface ProfileQRCodeProps {
  profileUrl: string;
  profileName: string;
}

export const ProfileQRCode = ({ profileUrl, profileName }: ProfileQRCodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    setIsExpanded(false); // Reset expansion state on close
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '8px',
          borderRadius: '50%',
          cursor: 'pointer',
          border: 'none',
          backgroundColor: 'transparent',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        title="Show QR Code"
      >
        <QrCode style={{ width: '24px', height: '24px' }} />
      </button>

      <Dialog
        open={isOpen}
        onClose={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          overflowY: 'auto'
        }}
      >
        <div style={{
          minHeight: '100vh',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          }} onClick={handleClose} />

          <div style={{
            position: 'relative',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: isExpanded ? '0' : '32px',
            maxWidth: isExpanded ? 'none' : '400px',
            width: isExpanded ? '100vw' : '100%',
            height: isExpanded ? '100vh' : 'auto',
            margin: '0 auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease-in-out',
            cursor: isExpanded ? 'zoom-out' : 'default'
          }}>
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: isExpanded ? '20px' : '16px',
                right: isExpanded ? '20px' : '16px',
                color: '#666',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <span style={{ display: 'none' }}>Close</span>
              <svg style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div 
              style={{
                cursor: 'zoom-in',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <QRCodeSVG
                value={profileUrl}
                size={isExpanded ? Math.min(window.innerWidth, window.innerHeight) * 0.8 : 256}
                level="H"
                includeMargin
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto',
                  transition: 'width 0.3s ease-in-out, height 0.3s ease-in-out'
                }}
              />
            
            <h3 style={{
              marginTop: '16px',
              fontSize: '1.25rem',
              fontWeight: 600,
              textAlign: 'center',
              color: '#333'
            }}>
              {profileName}
            </h3>
            
            <p style={{
              marginTop: '8px',
              fontSize: '0.875rem',
              color: '#666',
              textAlign: 'center'
            }}>
              {isExpanded ? 'Click to shrink' : 'Scan to view profile'}
            </p>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};