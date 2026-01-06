import { useEffect } from 'react';
import { PhoneCall, MessageSquare, ExternalLink, MapPin, Clock } from 'lucide-react';
import SectionHeading from '../components/common/SectionHeading';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const EmergencyHelp = () => {
  useEffect(() => {
    document.title = 'Emergency Help | Unwind';
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-error-50 p-6 rounded-lg mb-8 border-l-4 border-error-500">
        <h1 className="text-2xl font-bold text-error-700 mb-2">Need immediate help?</h1>
        <p className="text-error-600 mb-4">
          If you're in a crisis or experiencing suicidal thoughts, get help immediately.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-md shadow-soft">
            <div className="flex items-center mb-2">
              <PhoneCall size={20} className="text-error-500 mr-2" />
              <h3 className="font-semibold">Call 988</h3>
            </div>
            <p className="text-sm text-neutral-600 mb-3">
              The Suicide and Crisis Lifeline provides 24/7 support.
            </p>
            <a 
              href="tel:988" 
              className="inline-block w-full bg-error-500 text-white py-2 px-4 rounded-md font-medium text-center hover:bg-error-600 transition-colors"
            >
              Call Now
            </a>
          </div>
          
          <div className="bg-white p-4 rounded-md shadow-soft">
            <div className="flex items-center mb-2">
              <MessageSquare size={20} className="text-error-500 mr-2" />
              <h3 className="font-semibold">Text HOME to 741741</h3>
            </div>
            <p className="text-sm text-neutral-600 mb-3">
              Crisis Text Line provides free 24/7 support via text message.
            </p>
            <a 
              href="sms:741741?&body=HOME" 
              className="inline-block w-full bg-error-500 text-white py-2 px-4 rounded-md font-medium text-center hover:bg-error-600 transition-colors"
            >
              Text Now
            </a>
          </div>
        </div>
      </div>

      <SectionHeading
        title="Crisis Support Resources"
        subtitle="Find help for different situations and needs"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card>
          <h3 className="text-lg font-semibold mb-3">Suicide Prevention</h3>
          <ul className="space-y-3 mb-4">
            <li>
              <div className="font-medium">National Suicide Prevention Lifeline</div>
              <div className="text-sm text-neutral-600">Call: 988 or 1-800-273-8255</div>
              <div className="text-sm text-neutral-600">Available 24/7</div>
            </li>
            <li>
              <div className="font-medium">Trevor Project (LGBTQ+ Youth)</div>
              <div className="text-sm text-neutral-600">Call: 1-866-488-7386</div>
              <div className="text-sm text-neutral-600">Text: START to 678-678</div>
            </li>
          </ul>
          <a 
            href="https://988lifeline.org/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary-600 font-medium text-sm flex items-center"
          >
            <span>Visit website</span>
            <ExternalLink size={14} className="ml-1" />
          </a>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-3">Domestic Violence</h3>
          <ul className="space-y-3 mb-4">
            <li>
              <div className="font-medium">National Domestic Violence Hotline</div>
              <div className="text-sm text-neutral-600">Call: 1-800-799-7233</div>
              <div className="text-sm text-neutral-600">Text: START to 88788</div>
            </li>
            <li>
              <div className="font-medium">StrongHearts Native Helpline</div>
              <div className="text-sm text-neutral-600">Call: 1-844-762-8483</div>
              <div className="text-sm text-neutral-600">For Native Americans affected by domestic violence</div>
            </li>
          </ul>
          <a 
            href="https://www.thehotline.org/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary-600 font-medium text-sm flex items-center"
          >
            <span>Visit website</span>
            <ExternalLink size={14} className="ml-1" />
          </a>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-3">Substance Use Support</h3>
          <ul className="space-y-3 mb-4">
            <li>
              <div className="font-medium">SAMHSA's National Helpline</div>
              <div className="text-sm text-neutral-600">Call: 1-800-662-4357</div>
              <div className="text-sm text-neutral-600">Information and treatment referral</div>
            </li>
            <li>
              <div className="font-medium">Alcoholics Anonymous</div>
              <div className="text-sm text-neutral-600">Find local meetings and support groups</div>
            </li>
          </ul>
          <a 
            href="https://www.samhsa.gov/find-help/national-helpline" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary-600 font-medium text-sm flex items-center"
          >
            <span>Visit website</span>
            <ExternalLink size={14} className="ml-1" />
          </a>
        </Card>
      </div>

      <SectionHeading
        title="Find Local Resources"
        subtitle="Mental health services in your area"
      />

      <div className="bg-white rounded-lg shadow-soft p-6 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Community Mental Health Centers</h3>
            <p className="text-neutral-600 mb-4">
              Community mental health centers provide affordable services including therapy, medication management, and crisis intervention.
            </p>
            <div className="space-y-4">
              <div className="flex">
                <MapPin size={20} className="text-primary-500 mr-2 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium">Find centers near you:</h4>
                  <p className="text-sm text-neutral-600">
                    Use the SAMHSA Treatment Locator to find services in your area.
                  </p>
                </div>
              </div>
              <div className="flex">
                <Clock size={20} className="text-primary-500 mr-2 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium">Many offer walk-in services</h4>
                  <p className="text-sm text-neutral-600">
                    For urgent needs, check if your local center offers same-day appointments.
                  </p>
                </div>
              </div>
            </div>
            <a 
              href="https://findtreatment.samhsa.gov/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block mt-4"
            >
              <Button variant="primary">Find Treatment Near You</Button>
            </a>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4">Emergency Rooms</h3>
            <p className="text-neutral-600 mb-4">
              If you're experiencing a mental health emergency and can't wait for an appointment, you can go to your nearest emergency room.
            </p>
            <div className="bg-neutral-50 p-4 rounded-md">
              <h4 className="font-medium mb-2">When to go to the ER:</h4>
              <ul className="text-sm text-neutral-600 space-y-2">
                <li>• If you're thinking about harming yourself or others</li>
                <li>• If you're experiencing psychosis (hallucinations or delusions)</li>
                <li>• If you're unable to care for yourself due to mental illness</li>
                <li>• If you've overdosed or are experiencing severe withdrawal</li>
              </ul>
            </div>
            <p className="text-sm text-neutral-500 mt-4">
              In a life-threatening emergency, call 911 immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyHelp;