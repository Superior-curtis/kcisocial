import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, Trash2, RotateCcw, Archive } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { chatWithAI } from '@/lib/openai';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isEditing?: boolean;
}

export default function AIChat() {
  const { user } = useAuth();
  const [persistentMode, setPersistentMode] = useState(() => {
    return localStorage.getItem('ai-chat-persistent') !== 'false';
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (persistentMode) {
      const saved = localStorage.getItem('ai-chat-history');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
        } catch (e) {
          console.error('Failed to load chat history', e);
        }
      }
    }
    return [
      {
        id: '0',
        role: 'assistant',
        content: 'Hi! I\'m your KCIS AI assistant. I can help with homework, math problems, science questions, language learning, study tips, and more.\n\n💡 Tip: Try asking me anything to get started! (Note: AI service requires API key configuration)',
        timestamp: new Date(),
      },
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (persistentMode) {
      localStorage.setItem('ai-chat-history', JSON.stringify(messages));
    }
  }, [messages, persistentMode]);

  useEffect(() => {
    localStorage.setItem('ai-chat-persistent', persistentMode.toString());
    if (!persistentMode) {
      localStorage.removeItem('ai-chat-history');
    }
  }, [persistentMode]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = messages
        .filter(m => m.id !== '0')
        .map(m => ({ role: m.role, content: m.content }));
      conversationHistory.push({ role: 'user', content: input });
      
      const response = await chatWithAI(conversationHistory);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Failed to get AI response:', error);
      let errorContent = 'Sorry, I encountered an error. Please try again.';
      
      if (error?.message === 'AI_NOT_CONFIGURED') {
        errorContent = `❌ AI 服務尚未配置\n\nThis feature requires an AI API key. Please contact the administrator to enable AI chat.\n\n💡 Free option: Get a Google Gemini API key at:\nhttps://makersuite.google.com/app/apikey\n\nThen add to .env file:\nVITE_GEMINI_API_KEY=your_key_here`;
      }
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear all chat history?')) {
      const welcomeMsg: ChatMessage = {
        id: '0',
        role: 'assistant',
        content: 'Hi! I\'m your KCIS AI assistant. I can help with homework, math problems, science questions, language learning, study tips, and more.\n\n💡 Tip: Try asking me anything to get started! (Note: AI service requires API key configuration)',
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
      localStorage.removeItem('ai-chat-history');
    }
  };

  const handleEdit = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editContent.trim()) return;
    
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    const updatedMessages = messages.slice(0, msgIndex);
    const editedMessage: ChatMessage = {
      ...messages[msgIndex],
      content: editContent,
      timestamp: new Date(),
    };
    updatedMessages.push(editedMessage);
    
    setMessages(updatedMessages);
    setEditingId(null);
    setEditContent('');
    
    if (messages[msgIndex].role === 'user') {
      setLoading(true);
      try {
        const conversationHistory = updatedMessages
          .filter(m => m.id !== '0')
          .map(m => ({ role: m.role, content: m.content }));
        
        const response = await chatWithAI(conversationHistory);
        
        const aiMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        console.error('AI response error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteMessage = (msgId: string) => {
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex > 0) {
      setMessages(messages.slice(0, msgIndex));
    }
  };

  return (
    <AppLayout title="AI Assistant" showSearch={false} showCreate={false}>
      <div className="flex flex-col h-[calc(100vh-3.5rem-5rem)]">
        <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-semibold">KCIS AI Assistant</h2>
                <p className="text-xs text-muted-foreground">Powered by GPT-4</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={handleClearChat}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Switch id="persistent" checked={persistentMode} onCheckedChange={setPersistentMode} />
              <Label htmlFor="persistent" className="text-xs cursor-pointer">
                {persistentMode ? <Archive className="w-3 h-3 inline mr-1" /> : <RotateCcw className="w-3 h-3 inline mr-1" />}
                {persistentMode ? 'Persistent History' : 'Temporary Chat'}
              </Label>
            </div>
            <span className="text-[10px] text-muted-foreground">{messages.length - 1} messages</span>
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              ) : (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={user?.avatar} alt={user?.displayName} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`flex flex-col flex-1 ${msg.role === 'user' ? 'items-end' : ''}`}>
                {editingId === msg.id ? (
                  <div className="w-full max-w-[80%]">
                    <Input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(msg.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="mb-1"
                    />
                    <div className="flex gap-1">
                      <Button size="xs" onClick={() => handleSaveEdit(msg.id)}>Save</Button>
                      <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                      </span>
                      {msg.id !== '0' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(msg)}
                            className="text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="text-[10px] text-destructive hover:text-destructive/80"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-accent rounded-2xl px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border/50">
          <div className="flex gap-2">
            <Input
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
            />
            <Button size="icon" onClick={handleSend} disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
