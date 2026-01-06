import { useEffect } from 'react';
import { Book, Brain, Heart, Lightbulb, Users } from 'lucide-react';
import SectionHeading from '../components/common/SectionHeading';
import Card from '../components/common/Card';

interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: JSX.Element;
  readTime: string;
}

const resources: Resource[] = [
  {
    id: '1',
    title: 'Understanding Anxiety: A Comprehensive Guide',
    description: 'Learn about the different types of anxiety, common triggers, and effective coping strategies.',
    category: 'Mental Health Education',
    icon: <Brain className="text-primary-500" />,
    readTime: '10 min read',
  },
  {
    id: '2',
    title: 'Building Healthy Relationships',
    description: 'Explore the foundations of strong relationships and learn communication skills for better connections.',
    category: 'Relationships',
    icon: <Heart className="text-primary-500" />,
    readTime: '8 min read',
  },
  {
    id: '3',
    title: 'Mindfulness for Beginners',
    description: 'Start your mindfulness journey with simple practices you can incorporate into your daily routine.',
    category: 'Mindfulness',
    icon: <Lightbulb className="text-primary-500" />,
    readTime: '12 min read',
  },
  {
    id: '4',
    title: 'Self-Care Fundamentals',
    description: 'Discover practical self-care strategies that go beyond basic advice to support your wellbeing.',
    category: 'Self Care',
    icon: <Users className="text-primary-500" />,
    readTime: '15 min read',
  },
  {
    id: '5',
    title: 'Stress Management Techniques',
    description: 'Learn evidence-based methods to manage stress and build resilience in challenging times.',
    category: 'Stress Management',
    icon: <Book className="text-primary-500" />,
    readTime: '7 min read',
  },
];

const ResourceLibrary = () => {
  useEffect(() => {
    document.title = 'Resource Library | Unwind';
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionHeading
        title="Resource Library"
        subtitle="Explore our collection of articles, guides, and tools to support your mental health journey"
        className="mb-8"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((resource) => (
          <Card key={resource.id} className="h-full">
            <div className="flex items-start">
              <div className="p-2 bg-primary-50 rounded-lg">
                {resource.icon}
              </div>
              <div className="ml-4">
                <span className="text-sm font-medium text-primary-600">{resource.category}</span>
                <h3 className="text-lg font-semibold text-neutral-900 mt-1 mb-2">{resource.title}</h3>
                <p className="text-neutral-600 text-sm mb-4">{resource.description}</p>
                <div className="flex items-center text-sm text-neutral-500">
                  <span>{resource.readTime}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-12 bg-primary-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Need Personalized Support?</h2>
        <p className="text-neutral-700 mb-6">
          Our resource library is just the beginning. Explore our specialized tools and community features 
          for more targeted support on your mental health journey.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-md shadow-soft">
            <h3 className="font-semibold text-neutral-900 mb-2">Track Your Progress</h3>
            <p className="text-sm text-neutral-600">Use our mood tracker to understand your emotional patterns.</p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-soft">
            <h3 className="font-semibold text-neutral-900 mb-2">Join the Community</h3>
            <p className="text-sm text-neutral-600">Connect with others who understand what you're going through.</p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-soft">
            <h3 className="font-semibold text-neutral-900 mb-2">Get Professional Help</h3>
            <p className="text-sm text-neutral-600">Find resources to connect with mental health professionals.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceLibrary;