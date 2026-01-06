import { Link } from 'react-router-dom';
import { Mail, Phone, Heart, ExternalLink } from 'lucide-react';
import Logo from '../common/Logo';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-100 pt-12 pb-6 lg:ml-[25%] lg:w-[75%] w-full">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/home" className="flex items-center">
              <Logo size={32} />
              <span className="ml-2 text-xl font-semibold text-primary-700">Unwind</span>
            </Link>
            <p className="text-neutral-600 text-sm">
              A supportive space for your mental wellbeing.
            </p>
          </div>
        </div>
        


        <div className="border-t border-neutral-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-neutral-500 text-sm">
            &copy; {currentYear} Unwind. All rights reserved. |  <Link to="/privacy" className="text-neutral-500 text-sm hover:text-primary-600 transition-colors duration-200">
              Privacy Policy
            </Link>  |  <Link to="/terms" className="text-neutral-500 text-sm hover:text-primary-600 transition-colors duration-200">
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;