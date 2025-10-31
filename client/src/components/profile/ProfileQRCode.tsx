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
        onClose={() => setIsOpen(false)}
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
          }} onClick={() => setIsOpen(false)} />

          <div style={{
            position: 'relative',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            margin: '0 auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
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

            <div style={{ 
              backgroundColor: 'white', 
              padding: '16px', 
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <QRCodeSVG
                value={profileUrl}
                size={256}
                level="H"
                includeMargin
                style={{ width: '100%', height: '100%' }}
              />
            </div>

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
              Scan to view profile
            </p>
          </div>
        </div>
      </Dialog>
    </>
  );
};