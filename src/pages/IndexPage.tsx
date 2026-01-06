import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Brain, 
  Users, 
  Shield, 
  ArrowRight, 
  CheckCircle,
  Star,
  MessageCircle,
  LineChart,
  BookOpen
} from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

const IndexPage = () => {
  useEffect(() => {
    document.title = 'Unwind | Your Mental Health Journey Starts Here';
  }, []);

  const features = [
    {
      icon: <LineChart className="text-primary-500" size={32} />,
      title: 'Mood Tracking',
      description: 'Monitor your emotional patterns and gain insights into your mental health journey.'
    },
    {
      icon: <BookOpen className="text-primary-500" size={32} />,
      title: 'Guided Journaling',
      description: 'Express yourself with therapeutic writing prompts designed for healing and growth.'
    },
    {
      icon: <Users className="text-primary-500" size={32} />,
      title: 'Supportive Community',
      description: 'Connect with others who understand your experiences in a safe, moderated environment.'
    },
    {
      icon: <Brain className="text-primary-500" size={32} />,
      title: 'Expert Resources',
      description: 'Access evidence-based tools and information curated by mental health professionals.'
    },
    {
      icon: <Shield className="text-primary-500" size={32} />,
      title: 'Crisis Support',
      description: 'Immediate access to emergency resources and professional help when you need it most.'
    },
    {
      icon: <Heart className="text-primary-500" size={32} />,
      title: 'Specialized Care',
      description: 'Targeted support for specific challenges like heartbreak, burnout, and identity exploration.'
    }
  ];

  

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 leading-tight mb-6">
                Your mental health journey{' '}
                <span className="text-primary-500">starts here</span>
              </h1>
              <p className="text-xl text-neutral-700 mb-8 max-w-3xl mx-auto">
                Discover a supportive platform designed to help you navigate life's challenges 
                with evidence-based tools, community support, and professional resources.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup">
                  <Button 
                    variant="primary" 
                    size="lg"
                    icon={<Heart size={20} />}
                  >
                    Start Your Journey
                  </Button>
                </Link>

              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">
              Everything you need for mental wellness
            </h2>
            <p className="text-neutral-600 max-w-2xl mx-auto">
              Our comprehensive platform provides tools, resources, and support 
              to help you build resilience and maintain your mental health.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary-50 rounded-full">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      
      <div className="w-full bg-primary-50 border-t border-primary-200 py-4 px-6 text-center shadow-sm animate-fade-in">
  <p className="text-primary-700 text-base md:text-lg font-semibold animate-pulse">
    Built with{' '}
    <a
      href="https://bolt.new"
      target="_blank"
      rel="noopener noreferrer"
      className="underline text-primary-700 hover:text-primary-900 transition-colors duration-200"
    >
      bolt.new
    </a>
  </p>
</div>


      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary-500 to-secondary-500 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to prioritize your mental health?
          </h2>
          <p className="text-white/90 max-w-2xl mx-auto mb-8 text-lg">
            Join thousands of people who have found support, healing, and growth through Unwind. 
            Your journey to better mental health starts with a single step.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/signup">
              <Button 
                variant="accent" 
                size="lg"
                icon={<ArrowRight size={20} />}
              >
                Get Started Here
              </Button>
            </Link>
            <Link to="/login">
              <Button 
                variant="outline" 
                size="lg"
                className="bg-white/10 border-white text-white hover:bg-white/20"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust & Safety Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-neutral-900 mb-4">
                Your safety and privacy matter
              </h2>
              <p className="text-neutral-600">
                We're committed to providing a secure, confidential environment for your mental health journey.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <Shield className="text-primary-500" size={32} />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">Secure & Private</h3>
                <p className="text-sm text-neutral-600">End-to-end encryption protects your data</p>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <CheckCircle className="text-primary-500" size={32} />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">Evidence-Based</h3>
                <p className="text-sm text-neutral-600">Tools backed by mental health research</p>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <Users className="text-primary-500" size={32} />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">Moderated Community</h3>
                <p className="text-sm text-neutral-600">Safe spaces with trained moderators</p>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <MessageCircle className="text-primary-500" size={32} />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">24/7 Crisis Support</h3>
                <p className="text-sm text-neutral-600">Immediate help when you need it most</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default IndexPage;