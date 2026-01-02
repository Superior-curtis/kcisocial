import React, { useState } from 'react';
import { Send, Heart, MessageCircle, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AnonymousMessage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface AnonymousWallProps {
  isAdmin?: boolean;
  compact?: boolean;
}

const AnonymousWall: React.FC<AnonymousWallProps> = ({ isAdmin = false, compact = false }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AnonymousMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [messageAuthors, setMessageAuthors] = useState<Map<string, string>>(new Map()); // Track who posted what

  const handlePostMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const messageId = `${Date.now()}-${Math.random()}`;
      const message: AnonymousMessage = {
        id: messageId,
        publisherId: 'anonymous',
        content: newMessage,
        emoji: undefined,
        publishedAt: new Date(),
        likes: 0,
        replies: [],
      };

      setMessages([message, ...messages]);
      // Track the author for this message
      setMessageAuthors(new Map(messageAuthors).set(messageId, user?.id || 'guest'));
      setNewMessage('');
    } catch (error) {
      console.error('Failed to post message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    const messageAuthor = messageAuthors.get(messageId);
    // Allow deletion if user is admin or is the author of the message
    if (isAdmin || user?.role === 'admin' || messageAuthor === user?.id) {
      setMessages(messages.filter((msg) => msg.id !== messageId));
      const newAuthors = new Map(messageAuthors);
      newAuthors.delete(messageId);
      setMessageAuthors(newAuthors);
    }
  };

  const handleLike = (messageId: string) => {
    if (likedMessages.has(messageId)) {
      likedMessages.delete(messageId);
      setMessages(
        messages.map((msg) =>
          msg.id === messageId ? { ...msg, likes: Math.max(0, msg.likes - 1) } : msg
        )
      );
    } else {
      likedMessages.add(messageId);
      setMessages(
        messages.map((msg) =>
          msg.id === messageId ? { ...msg, likes: msg.likes + 1 } : msg
        )
      );
    }
    setLikedMessages(new Set(likedMessages));
  };

  if (compact) {
    // Compact mode for Messages page
    return (
      <div className="flex flex-col h-full">
        {/* Info Banner */}
        <div className="bg-blue-50 border-b border-blue-200 p-3">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-medium">Anonymous Message Wall</p>
              <p>Everyone sees the same conversation. Be respectful!</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className="bg-accent rounded-lg p-3 border-l-4 border-l-purple-500"
              >
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-purple-500 text-white text-xs font-bold">
                      🔒
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">
                      Anonymous User
                    </p>
                    <p className="text-sm mt-1 break-words">
                      {message.content}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <button
                        onClick={() => handleLike(message.id)}
                        className="flex items-center gap-1 hover:text-primary transition"
                      >
                        <Heart
                          className={`w-3 h-3 ${
                            likedMessages.has(message.id)
                              ? 'fill-red-500 text-red-500'
                              : ''
                          }`}
                        />
                        <span>{message.likes > 0 ? message.likes : ''}</span>
                      </button>
                      {(isAdmin || user?.role === 'admin' || messageAuthors.get(message.id) === user?.id) && (
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="text-destructive hover:text-destructive/80 ml-auto"
                          title={messageAuthors.get(message.id) === user?.id ? 'Delete your message' : 'Delete (admin)'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="border-t p-3 space-y-2">
          <Textarea
            placeholder="Say something... (anonymous)"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="resize-none min-h-12 text-sm"
            maxLength={200}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {newMessage.length}/200
            </span>
            <Button
              size="sm"
              onClick={handlePostMessage}
              disabled={!newMessage.trim() || sending}
              className="gap-1"
            >
              <Send className="w-3 h-3" />
              Post
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Full mode for dedicated page
  return (
    <div className="space-y-4 pb-20 px-4 max-w-2xl mx-auto">
      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Anonymous Message Wall</p>
            <p className="text-blue-700">Share your thoughts anonymously. Be respectful and kind!</p>
          </div>
        </CardContent>
      </Card>

      {/* Post Form */}
      <Card className="border border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Share Something</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="What's on your mind? (anonymous)"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="resize-none min-h-20"
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {newMessage.length}/500
            </span>
            <Button
              onClick={handlePostMessage}
              disabled={!newMessage.trim() || sending}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Post Anonymously
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <div className="space-y-3">
        {messages.length === 0 ? (
          <Card className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">No messages yet. Be the first to share!</p>
          </Card>
        ) : (
          messages.map((message) => (
            <Card
              key={message.id}
              className="hover:shadow-md transition border-l-4 border-l-purple-500"
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {/* Avatar */}
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-purple-500 text-white text-sm font-semibold">
                      🔒
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        Anonymous User
                      </p>
                      {(isAdmin || user?.role === 'admin' || messageAuthors.get(message.id) === user?.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMessage(message.id)}
                          className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                          title={messageAuthors.get(message.id) === user?.id ? 'Delete your message' : 'Delete (admin)'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {/* Message Text */}
                    <p className="text-sm mt-2 leading-relaxed break-words">
                      {message.content}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <button
                        onClick={() => handleLike(message.id)}
                        className="flex items-center gap-1 hover:text-primary transition group"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            likedMessages.has(message.id)
                              ? 'fill-red-500 text-red-500'
                              : 'group-hover:text-red-500'
                          }`}
                        />
                        <span>{message.likes > 0 ? message.likes : ''}</span>
                      </button>
                      <button className="flex items-center gap-1 hover:text-primary transition">
                        <MessageCircle className="w-4 h-4" />
                        <span>{message.replies?.length || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AnonymousWall;
