import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Send, Book, MessageSquare, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export default function HelpCenter() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Please sign in to submit a help request' });
      return;
    }
    if (!subject.trim() || !message.trim()) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(firestore, 'helpRequests'), {
        userId: user.id,
        userEmail: user.email,
        userName: user.displayName,
        subject: subject.trim(),
        message: message.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      
      toast({ title: 'Help request submitted', description: 'An admin will respond soon' });
      setSubject('');
      setMessage('');
    } catch (error) {
      console.error('Failed to submit help request:', error);
      toast({ title: 'Failed to submit', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout title="Help Center" showSearch={false} showCreate={false}>
      <div className="max-w-4xl mx-auto p-6 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Help Center</h1>
          <p className="text-muted-foreground">Find answers or contact support</p>
        </div>

        {/* FAQ Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Book className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
          </div>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How do I create a post?</AccordionTrigger>
              <AccordionContent>
                Click the "+" button at the bottom navigation bar. You can add text, images, videos, or GIFs. 
                Teachers and admins can also create announcements or official posts.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2">
              <AccordionTrigger>How do I create or join a group chat?</AccordionTrigger>
              <AccordionContent>
                Go to Messages page and click the group icon at the top right. Search and add members 
                to create a new group chat. To start a private conversation, simply search for a user and click their name.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3">
              <AccordionTrigger>How do I use the /gpt command for text correction?</AccordionTrigger>
              <AccordionContent>
                In any message conversation, type "/gpt " followed by your text (e.g., "/gpt hello how r u"). 
                The AI will correct grammar and improve your message before sending it automatically.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4">
              <AccordionTrigger>What is the AI Assistant?</AccordionTrigger>
              <AccordionContent>
                The AI Assistant is an intelligent chatbot powered by GPT-4. Find it at the top of your Messages page 
                with the robot icon. It can help with homework, study questions, explain concepts, and provide general assistance.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5">
              <AccordionTrigger>How do I create or join a club?</AccordionTrigger>
              <AccordionContent>
                <strong>To create a club:</strong> Go to Clubs page and click "Apply". Fill in club details and wait for admin approval.<br/>
                <strong>To join a club:</strong> Browse clubs and click "Join" on any club you're interested in. 
                Some clubs may require approval from club admins.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-6">
              <AccordionTrigger>How do I view someone's profile?</AccordionTrigger>
              <AccordionContent>
                Tap on any user's avatar or name throughout the app. In messages, tap the user's name/avatar 
                at the top of the chat to view their profile, see their posts, and follow them.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-7">
              <AccordionTrigger>What are Official posts vs regular posts?</AccordionTrigger>
              <AccordionContent>
                <strong>Official posts</strong> can only be created by admins, teachers, and official accounts. These appear 
                on the Official page and are important school-wide announcements.<br/>
                <strong>Regular posts</strong> are created by students and appear in the main Feed.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-8">
              <AccordionTrigger>How do I save posts?</AccordionTrigger>
              <AccordionContent>
                Click the bookmark icon on any post to save it. View all your saved posts 
                in your Profile under the "Saved" tab. This is perfect for saving important announcements or interesting content.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-9">
              <AccordionTrigger>Can I upload videos and GIFs?</AccordionTrigger>
              <AccordionContent>
                Yes! You can upload images, videos, and GIFs when creating posts or sending messages. 
                Maximum file size is 20MB. Videos will auto-play in feeds with controls.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-10">
              <AccordionTrigger>How do I report inappropriate content?</AccordionTrigger>
              <AccordionContent>
                Use the contact form below to report any inappropriate content, bullying, or concerning behavior. 
                Include specific details (post ID, user name, etc.) and our admin team will investigate immediately. 
                All reports are confidential.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-11">
              <AccordionTrigger>Who can see my posts and messages?</AccordionTrigger>
              <AccordionContent>
                <strong>Posts:</strong> All KCIS students, teachers, and staff can see your posts in the Feed.<br/>
                <strong>Messages:</strong> Only you and the recipient(s) can see your private messages. 
                Group chats are visible only to members of that group.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-12">
              <AccordionTrigger>How do I edit my profile?</AccordionTrigger>
              <AccordionContent>
                Go to your Profile page and click the "Edit Profile" button. You can change your display name, 
                bio, profile picture, and other settings. Changes are saved automatically.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Contact Form */}
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Contact Support</h2>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            Can't find what you're looking for? Send us a message and we'll get back to you soon.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Subject</label>
              <Input 
                placeholder="Brief description of your issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">Message</label>
              <Textarea 
                placeholder="Describe your issue in detail..."
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
              />
            </div>
            
            <Button 
              onClick={handleSubmit} 
              disabled={sending || !subject.trim() || !message.trim()}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </div>

        {/* Admin Contact Info */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 text-center">
          <Shield className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            For urgent issues, contact the admin directly at{' '}
            <a href="mailto:huachen0625@gmail.com" className="text-primary hover:underline">
              huachen0625@gmail.com
            </a>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
