import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Paperclip, Clock, CheckCircle } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface MessageData {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text?: string;
  attachments?: Array<{ reportId: string; fileName: string; fileUrl: string }>;
  type: 'chat' | 'system' | 'report_shared';
  readAt?: Date;
  createdAt: Date;
}

interface ConversationData {
  _id: string;
  participants: Array<{ userId: string; role: string }>;
  lastMessage?: MessageData;
  lastMessageText?: string;
  unreadCountForPatient?: number;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // CRITICAL: Call useWebSocket hook at the top, before any useEffect
  const ws = useWebSocket();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) setUserId(storedUserId);

    if (token) {
      fetchConversations(token);
    }
  }, []);

  // Subscribe to real-time message events
  useEffect(() => {
    if (selectedConversation && ws.connected) {
      // Fetch messages when conversation is selected
      fetchMessages(selectedConversation._id);
      
      ws.joinConversation(selectedConversation._id);

      // Listen for new messages
      ws.subscribe('message:new', (event) => {
        setMessages((prev) => [...prev, event.data]);
      });

      // Listen for report uploads
      ws.subscribe('message:new', (event) => {
        if (event.data.type === 'report_shared') {
          setMessages((prev) => [...prev, event.data]);
        }
      });
    }
  }, [selectedConversation, ws.connected]);

  // Update conversation list in real-time
  useEffect(() => {
    if (ws.connected) {
      ws.subscribe('conversation:updated', (event) => {
        setConversations((prev) =>
          prev.map((c) =>
            c._id === event.data._id ? event.data : c
          )
        );
      });
    }
  }, [ws.connected]);

  const fetchConversations = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/conversations/${conversationId}/messages?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSendingMessage(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: selectedConversation._id,
          text: newMessage,
          type: 'chat',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([...messages, data.data]);
        setNewMessage('');
        // Also emit via WebSocket for real-time broadcast
        ws.sendMessage(selectedConversation._id, data.data);
        // Update conversation's last message
        setSelectedConversation({
          ...selectedConversation,
          lastMessage: data.data,
          lastMessageText: newMessage,
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doctorId', selectedConversation.participants.find((p) => p.role === 'doctor')?.userId || '');

      const token = localStorage.getItem('token');
      const response = await fetch('/api/reports/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const reportData = await response.json();
        // Emit report uploaded event via WebSocket
        const doctorId = selectedConversation.participants.find((p) => p.role === 'doctor')?.userId;
        if (doctorId) {
          ws.reportUploaded(selectedConversation._id, doctorId, {
            reportId: reportData.data._id,
            fileName: file.name,
            fileUrl: reportData.data.fileUrl,
          });
        }
        // Refresh messages to show the report
        await fetchMessages(selectedConversation._id);
      }
    } catch (error) {
      console.error('Failed to upload report:', error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getOtherParticipant = (conv: ConversationData) => {
    return conv.participants.find((p) => p.userId !== userId);
  };

  return (
    <div className="flex h-screen gap-4 p-4" style={{ backgroundColor: '#0f172a' }}>
      {/* Conversations List */}
      <div className="w-80 border border-emerald-900/30 rounded-lg overflow-hidden" style={{ backgroundColor: '#142033' }}>
        <div className="p-4 border-b border-emerald-900/30">
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        </div>
        <div className="overflow-y-auto h-[calc(100%-80px)]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No conversations yet</div>
          ) : (
            conversations.map((conv) => {
              const otherParticipant = getOtherParticipant(conv);
              return (
                <button
                  key={conv._id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full text-left p-4 border-b border-emerald-900/20 transition-colors ${
                    selectedConversation?._id === conv._id ? 'bg-emerald-900/20' : 'hover:bg-emerald-900/10'
                  }`}
                >
                  <p className="font-semibold text-foreground truncate">{otherParticipant?.userId}</p>
                  <p className="text-sm text-muted-foreground truncate">{conv.lastMessageText || 'Start conversation'}</p>
                  {conv.unreadCountForPatient ? (
                    <span className="text-xs text-emerald-400 font-semibold">{conv.unreadCountForPatient} unread</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col border border-emerald-900/30 rounded-lg overflow-hidden" style={{ backgroundColor: '#142033' }}>
          {/* Chat Header */}
          <div className="p-4 border-b border-emerald-900/30">
            <p className="text-xl font-semibold text-foreground">
              {getOtherParticipant(selectedConversation)?.userId}
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg._id} className={`flex ${msg.fromUserId === userId ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.fromUserId === userId
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-emerald-900/20 text-foreground rounded-bl-none'
                  }`}
                >
                  {msg.type === 'report_shared' && msg.attachments ? (
                    <div>
                      <p className="text-sm font-semibold mb-2">📄 Report Shared</p>
                      {msg.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.fileUrl}
                          className="text-sm underline hover:opacity-80"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {att.fileName}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm">{msg.text}</p>
                  )}
                  <p className="text-xs opacity-75 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-emerald-900/30 flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="border-emerald-600/50"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-emerald-900/10 border-emerald-600/30"
            />
            <Button
              type="submit"
              disabled={sendingMessage || !newMessage.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a conversation to start messaging
        </div>
      )}
    </div>
  );
}
