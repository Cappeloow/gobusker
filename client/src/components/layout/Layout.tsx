import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if user has a saved preference
    const saved = localStorage.getItem('gobusker-dark-mode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    // Save preference to localStorage
    localStorage.setItem('gobusker-dark-mode', JSON.stringify(isDarkMode));
    
    // Apply dark mode class to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#0D1117';
      document.documentElement.style.color = '#F0F6FC';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#ffffff';
      document.documentElement.style.color = '#000000';
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-white dark:bg-github-bg text-gray-900 dark:text-github-text">
      <Header isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />
      
      {/* Spacer for fixed header */}
      <div className="h-14 md:h-16 flex-shrink-0"></div>
      
      <main className="flex-1 relative">
        {children}
      </main>
    </div>
  );
}
