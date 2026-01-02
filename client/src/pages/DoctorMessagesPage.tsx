import { useState, useEffect, useRef } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, CheckCircle, Clock, FileText, AlertCircle, MessageSquare } from 'lucide-react';
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
  unreadCountForDoctor?: number;
}

interface ReportData {
  _id: string;
  patientId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  reviewStatus: 'pending' | 'reviewed';
  aiSummary?: string;
  extractedData?: any;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export default function DoctorMessagesPage() {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'reports'>('messages');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState('');
  const ws = useWebSocket();

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) setUserId(storedUserId);

    const token = localStorage.getItem('token');
    if (token) {
      fetchConversations(token);
      fetchReports(token);
    }
  }, []);

  // Real-time message updates
  useEffect(() => {
    if (selectedConversation && ws.connected) {
      ws.joinConversation(selectedConversation._id);
      ws.subscribe('message:new', (event) => {
        if (event.data && event.data.conversationId === selectedConversation._id) {
          setMessages((prev) => [...prev, event.data]);
        }
      });
    }
  }, [selectedConversation, ws.connected]);

  // Real-time report updates
  useEffect(() => {
    if (ws.connected) {
      ws.subscribe('report:new', (event) => {
        setReports((prev) => [event.data, ...prev]);
      });
      ws.subscribe('report:updated', (event) => {
        setReports((prev) =>
          prev.map((r) => (r._id === event.data._id ? event.data : r))
        );
      });
    }
  }, [ws.connected]);

  // Cleanup
  useEffect(() => {
    return () => {
      ws.unsubscribe('message:new');
      ws.unsubscribe('report:new');
      ws.unsubscribe('report:updated');
    };
  }, []);

  // Conversation list updates in real-time
  useEffect(() => {
    if (ws.connected) {
      ws.subscribe('conversation:updated', (event) => {
        setConversations((prev) =>
          prev.map((c) => (c._id === event.data._id ? event.data : c))
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

  const fetchReports = async (token: string) => {
    try {
      const response = await fetch('/api/reports/doctor', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
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
        // Emit via WebSocket
        ws.sendMessage(selectedConversation._id, data.data);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleReviewReport = async (reportId: string, newStatus: 'reviewed') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/${reportId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reviewStatus: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        setReports(reports.map((r) => (r._id === reportId ? data.data : r)));
        // Emit report reviewed event via WebSocket
        const patientId = data.data.patientId;
        ws.reportReviewed(patientId, {
          reportId: data.data._id,
          fileName: data.data.fileName,
          reviewStatus: newStatus,
          reviewedBy: userId,
        });
      }
    } catch (error) {
      console.error('Failed to update report:', error);
    }
  };

  const getOtherParticipant = (conv: ConversationData) => {
    return conv.participants.find((p) => p.userId !== userId);
  };

  const pendingReports = reports.filter((r) => r.reviewStatus === 'pending');
  const reviewedReports = reports.filter((r) => r.reviewStatus === 'reviewed');

  return (
    <div className="flex h-screen w-full relative overflow-hidden animate-in fade-in duration-300" style={{ backgroundColor: '#0b111b' }}>
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px', backgroundColor: '#0f172a' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <MessageSquare className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-semibold">Messages & Reports</h2>
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden">
      {/* Sidebar - Conversations & Reports List */}
      <div className="w-80 border border-cyan-900/30 rounded-lg overflow-hidden flex flex-col" style={{ backgroundColor: '#0f172a' }}>
        {/* Tabs */}
        <div className="flex border-b border-cyan-900/30">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-3 text-center font-semibold transition-colors ${
              activeTab === 'messages'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-muted-foreground hover:text-cyan-300'
            }`}
          >
            Messages
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-3 text-center font-semibold transition-colors ${
              activeTab === 'reports'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-muted-foreground hover:text-cyan-300'
            }`}
          >
            Reports ({pendingReports.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto flex-1">
          {activeTab === 'messages' ? (
            loading ? (
              <div className="p-4 text-center text-muted-foreground">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No conversations yet</div>
            ) : (
              conversations.map((conv) => {
                const otherParticipant = getOtherParticipant(conv);
                const unreadCount = conv.unreadCountForDoctor || 0;
                return (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full text-left p-4 border-b border-cyan-900/20 transition-colors ${
                      selectedConversation?._id === conv._id ? 'bg-cyan-900/20' : 'hover:bg-cyan-900/10'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground truncate">{otherParticipant?.userId}</p>
                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessageText || 'Start conversation'}</p>
                      </div>
                      {unreadCount > 0 && (
                        <span className="ml-2 px-2 py-1 text-xs text-white bg-cyan-600 rounded-full font-semibold">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )
          ) : (
            <div className="divide-y divide-cyan-900/20">
              {pendingReports.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No pending reports</div>
              ) : (
                pendingReports.map((report) => (
                  <div key={report._id} className="p-4 hover:bg-cyan-900/10 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <p className="font-semibold text-foreground text-sm truncate">{report.fileName}</p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-orange-900/30 text-orange-300 rounded">Pending</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {new Date(report.uploadedAt).toLocaleDateString()}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleReviewReport(report._id, 'reviewed')}
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      Mark as Reviewed
                    </Button>
                  </div>
                ))
              )}
              {reviewedReports.length > 0 && (
                <div className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Reviewed</p>
                  {reviewedReports.slice(0, 3).map((report) => (
                    <div key={report._id} className="text-xs text-muted-foreground mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span className="truncate">{report.fileName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeTab === 'messages' ? (
        selectedConversation ? (
          <div className="flex-1 flex flex-col border border-cyan-900/30 rounded-lg overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
            {/* Chat Header */}
            <div className="p-4 border-b border-cyan-900/30">
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
                        ? 'bg-cyan-600 text-white rounded-br-none'
                        : 'bg-cyan-900/20 text-foreground rounded-bl-none'
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
            <form onSubmit={handleSendMessage} className="p-4 border-t border-cyan-900/30 flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-cyan-900/10 border-cyan-600/30"
              />
              <Button
                type="submit"
                disabled={sendingMessage || !newMessage.trim()}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )
      ) : (
        <div className="flex-1 border border-cyan-900/30 rounded-lg overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-6">Patient Reports</h2>

            {pendingReports.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-semibold text-orange-400">Pending Review</h3>
                </div>
                <div className="grid gap-4">
                  {pendingReports.map((report) => (
                    <Card key={report._id} style={{ backgroundColor: '#142033', borderColor: 'rgba(251, 191, 36, 0.2)' }}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-semibold text-foreground">{report.fileName}</p>
                            <p className="text-sm text-muted-foreground">
                              Uploaded: {new Date(report.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="px-3 py-1 text-sm bg-orange-900/30 text-orange-300 rounded-full">Pending</span>
                        </div>
                        {report.aiSummary && (
                          <div className="mb-4 p-3 rounded bg-cyan-900/10 border border-cyan-600/20">
                            <p className="text-sm text-muted-foreground">{report.aiSummary}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <a
                            href={report.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-center text-sm font-semibold transition"
                          >
                            View Report
                          </a>
                          <Button
                            onClick={() => handleReviewReport(report._id, 'reviewed')}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            Mark Reviewed
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {reviewedReports.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-emerald-400">Reviewed</h3>
                </div>
                <div className="grid gap-4">
                  {reviewedReports.map((report) => (
                    <Card key={report._id} style={{ backgroundColor: '#142033', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-foreground">{report.fileName}</p>
                            <p className="text-sm text-muted-foreground">
                              Reviewed: {report.reviewedAt ? new Date(report.reviewedAt).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <span className="px-3 py-1 text-sm bg-emerald-900/30 text-emerald-300 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Reviewed
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
        </main>
      </div>
    </div>
  );
}