import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  data?: any;
  messageId?: string;
  userId?: string;
  timestamp?: Date;
  conversationId?: string;
  doctorId?: string;
  patientId?: string;
  [key: string]: any;
}

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const messageHandlers = useRef<Map<string, (data: any) => void>>(new Map());

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found, skipping WebSocket connection');
          return;
        }

        // Use the current location's protocol and host for WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        // Build host with port - CRITICAL FIX for development
        let host = window.location.hostname;
        const port = window.location.port;
        
        console.log('WebSocket setup - hostname:', host, 'port:', port);
        
        // In development, explicitly use port 8080
        if (host === 'localhost' || host === '127.0.0.1') {
          host = 'localhost:8080';
          console.log('Development mode - using default port 8080');
        } else if (port && port !== '' && port !== 'undefined' && port !== '80' && port !== '443') {
          host = `${host}:${port}`;
        }
        
        const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;
        console.log('Attempting WebSocket connection to:', wsUrl);

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log('WebSocket connected');
          setConnected(true);
        };

        ws.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('WebSocket message received:', message);

            // Call relevant handlers based on message type
            const handler = messageHandlers.current.get(message.type);
            if (handler) {
              handler(message);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          console.error('WebSocket URL that failed:', ws.current?.url);
        };

        ws.current.onclose = () => {
          console.log('WebSocket disconnected');
          setConnected(false);
          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          hostname: window.location.hostname,
          port: window.location.port,
          protocol: window.location.protocol
        });
      }
    };

    connectWebSocket();

    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, []);

  const subscribe = (eventType: string, handler: (data: any) => void) => {
    messageHandlers.current.set(eventType, handler);
  };

  const unsubscribe = (eventType: string) => {
    messageHandlers.current.delete(eventType);
  };

  const send = (message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  const joinConversation = (conversationId: string) => {
    send({
      type: 'join:conversation',
      conversationId,
    });
  };

  const sendMessage = (conversationId: string, data: any) => {
    send({
      type: 'message:send',
      conversationId,
      data,
    });
  };

  const reportUploaded = (conversationId: string, doctorId: string, data: any) => {
    send({
      type: 'report:uploaded',
      conversationId,
      doctorId,
      data,
    });
  };

  const markMessageAsRead = (conversationId: string, messageId: string) => {
    send({
      type: 'message:read',
      conversationId,
      messageId,
    });
  };

  const reportReviewed = (patientId: string, data: any) => {
    send({
      type: 'report:reviewed',
      patientId,
      data,
    });
  };

  return {
    connected,
    send,
    subscribe,
    unsubscribe,
    joinConversation,
    sendMessage,
    reportUploaded,
    markMessageAsRead,
    reportReviewed,
  };
}
