import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if user has a saved preference
    const saved = localStorage.getItem('gobusker-dark-mode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('gobusker-sidebar-expanded');
    return saved ? JSON.parse(saved) : true;
  });

  // Listen for sidebar state changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('gobusker-sidebar-expanded');
      if (saved) {
        setSidebarExpanded(JSON.parse(saved));
      }
    };
    
    // Check periodically for changes (storage event doesn't fire in same tab)
    const interval = setInterval(handleStorageChange, 100);
    return () => clearInterval(interval);
  }, []);

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
    <div className="h-[100dvh] flex bg-white dark:bg-github-bg text-gray-900 dark:text-github-text">
      {/* Sidebar - Desktop only */}
      <Sidebar isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />
      
      {/* Main Content Area */}
      <div className={`
        flex-1 flex flex-col
        transition-all duration-300
        ${sidebarExpanded ? 'md:ml-56' : 'md:ml-16'}
      `}>
        {/* Mobile Header */}
        <div className="md:hidden">
          <Header isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />
          {/* Spacer for fixed header */}
          <div className="h-14 flex-shrink-0"></div>
        </div>
        
        <main className="flex-1 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
