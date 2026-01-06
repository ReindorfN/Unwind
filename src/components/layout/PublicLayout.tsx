import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PublicHeader from './PublicHeader';


const PublicLayout = () => {
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  // Force white theme on public pages
  useEffect(() => {
    // Remove any existing theme classes and force light theme
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add('theme-light');
    
    // Clean up when component unmounts (user navigates to protected pages)
    return () => {
      // Don't remove theme class on unmount as it will be handled by ThemeProvider
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      
      <PublicHeader />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 rounded-full bg-primary-400 text-white shadow-medium 
            hover:bg-primary-500 transition-all duration-300 z-50"
          aria-label="Scroll to top"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default PublicLayout;