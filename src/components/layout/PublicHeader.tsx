import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogIn, UserPlus } from 'lucide-react';
import Logo from '../common/Logo';
import Button from '../common/Button';

const PublicHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    closeMenu();
  }, [location]);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    // { path: '/emergency', label: 'Crisis Support' },
  ]; 

  return (
    <header
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white shadow-soft py-2'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center" aria-label="Unwind Home">
          <Logo size={32} />
          <span className="ml-2 text-xl font-semibold text-primary-700">Unwind</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isActive(link.path)
                  ? 'text-primary-700 bg-primary-50'
                  : 'text-neutral-700 hover:text-primary-600 hover:bg-primary-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
          
          <div className="flex items-center space-x-2 ml-4">
            <Link to="/login">
              <Button variant="outline" size="sm" icon={<LogIn size={16} />}>
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary" size="sm" icon={<UserPlus size={16} />}>
                Get Started
              </Button>
            </Link>
          </div>
        </nav>

        {/* Mobile Navigation Toggle */}
        <button
          className="lg:hidden p-2 rounded-md text-neutral-700 hover:text-primary-600 hover:bg-primary-50 transition-colors duration-200"
          onClick={toggleMenu}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      <div
        className={`lg:hidden fixed inset-0 bg-white z-40 transition-transform duration-300 transform ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        } pt-20`}
      >
        <div className="container mx-auto px-4 py-4">
          <nav className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-3 rounded-md font-medium transition-colors duration-200 ${
                  isActive(link.path)
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-neutral-700'
                }`}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
            
            <div className="flex flex-col space-y-3 pt-4 border-t border-neutral-200">
              <Link to="/login" onClick={closeMenu}>
                <Button variant="outline" fullWidth icon={<LogIn size={18} />}>
                  Sign In
                </Button>
              </Link>
              <Link to="/signup" onClick={closeMenu}>
                <Button variant="primary" fullWidth icon={<UserPlus size={18} />}>
                  Get Started
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;