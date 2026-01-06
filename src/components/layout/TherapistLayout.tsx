import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import TherapistNavigationDrawer from './TherapistNavigationDrawer';
import Footer from './Footer';

const TherapistLayout = () => {
  const [showScrollToTop, setShowScrollToTop] = useState(false);

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
      <div className="flex flex-1">
        <TherapistNavigationDrawer />
        {/* Desktop: 75% width with 25% left margin, Mobile: full width */}
        <main className="flex-1 lg:w-3/4 lg:ml-[25%] w-full">
          <Outlet />
        </main>
      </div>
      <Footer />
      
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

export default TherapistLayout;