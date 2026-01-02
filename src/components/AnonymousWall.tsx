import React, { useState, useEffect } from 'react';
import { Send, Heart, MessageCircle, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnonymousMessage } from '@/types';

interface AnonymousWallProps {
  isAdmin?: boolean;
}

const AnonymousWall: React.FC<AnonymousWallProps> = ({ isAdmin = false }) => {
  const [messages, setMessages] = useState<AnonymousMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

  const emojis = ['😍', '😂', '😢', '😡', '🤔', '👍', '❤️', '🔥', '🎉'];

  const handlePostMessage = async () => {
    if (!newMessage.trim()) return;

    const message: AnonymousMessage = {
      id: Math.random().toString(36),
      publisherId: 'anonymous-user',
      content: newMessage,
      emoji: selectedEmoji,
      publishedAt: new Date(),
      likes: 0,
      replies: [],
    };

    setMessages([message, ...messages]);
    setNewMessage('');
    setSelectedEmoji('');
    // TODO: Save to Firestore
  };

  const handleDeleteMessage = (messageId: string) => {
    if (isAdmin) {
      setMessages(messages.filter((msg) => msg.id !== messageId));
      // TODO: Delete from Firestore
    }
  };

  const handleLike = (messageId: string) => {
    setMessages(
      messages.map((msg) =>
        msg.id === messageId ? { ...msg, likes: msg.likes + 1 } : msg
      )
    );
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return 'long ago';
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-purple-600 to-pink-600 border-0">
        <CardHeader>
          <CardTitle className="text-white">Anonymous Message Wall</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Share your thoughts anonymously..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder-white/50 resize-none"
            rows={3}
          />

          <div className="flex gap-2 flex-wrap">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() =>
                  setSelectedEmoji(selectedEmoji === emoji ? '' : emoji)
                }
                className={`text-2xl p-2 rounded transition ${
                  selectedEmoji === emoji
                    ? 'bg-white/30 scale-125'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <Button
            className="w-full bg-white text-purple-600 hover:bg-slate-100 font-bold"
            onClick={handlePostMessage}
            disabled={!newMessage.trim()}
          >
            <Send className="w-4 h-4 mr-2" />
            Post Anonymously
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">
            Messages ({messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              No messages yet. Be the first!
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className="bg-slate-700 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        A
                      </div>
                      <span className="text-white font-medium">Anonymous</span>
                      <span className="text-slate-400 text-sm">
                        {formatTime(message.publishedAt)}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      {message.emoji && (
                        <span className="text-2xl">{message.emoji}</span>
                      )}
                      <p className="text-slate-300">{message.content}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => handleDeleteMessage(message.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <button
                    className="flex items-center gap-1 text-slate-400 hover:text-red-400 transition"
                    onClick={() => handleLike(message.id)}
                  >
                    <Heart className="w-4 h-4" />
                    <span>{message.likes}</span>
                  </button>
                  <button
                    className="flex items-center gap-1 text-slate-400 hover:text-blue-400 transition"
                    onClick={() =>
                      setExpandedMessage(
                        expandedMessage === message.id ? null : message.id
                      )
                    }
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{message.replies.length}</span>
                  </button>
                </div>

                {expandedMessage === message.id && (
                  <div className="mt-3 pt-3 border-t border-slate-600 space-y-2">
                    {message.replies.length === 0 ? (
                      <p className="text-slate-400 text-sm">No replies yet</p>
                    ) : (
                      message.replies.map((reply) => (
                        <div key={reply.id} className="text-sm ml-8">
                          <p className="text-slate-400">
                            <span className="text-slate-300">Anonymous:</span>{' '}
                            {reply.content}
                          </p>
                        </div>
                      ))
                    )}
                    <input
                      type="text"
                      placeholder="Reply anonymously..."
                      className="w-full bg-slate-600 border border-slate-500 text-white rounded px-2 py-1 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnonymousWall;
