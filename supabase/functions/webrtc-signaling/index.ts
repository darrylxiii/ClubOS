import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { publicCorsHeaders } from "../_shared/cors-config.ts";

const corsHeaders = publicCorsHeaders;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  // Store active connections per channel
  const connections = new Map<string, Set<WebSocket>>();

  socket.onopen = () => {
    console.log("WebRTC signaling connection opened");
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("Received signaling message:", message.type);

      switch (message.type) {
        case 'join': {
          const { channelId, userId } = message;
          if (!connections.has(channelId)) {
            connections.set(channelId, new Set());
          }
          connections.get(channelId)?.add(socket);
          
          // Notify others in channel
          broadcastToChannel(channelId, {
            type: 'peer-joined',
            userId,
            peerId: userId
          }, socket);
          break;
        }

        case 'offer':
        case 'answer':
        case 'ice-candidate': {
          const { channelId, targetUserId, ...data } = message;
          // Forward to specific peer
          forwardToPeer(channelId, targetUserId, {
            type: message.type,
            ...data
          });
          break;
        }

        case 'leave': {
          const { channelId, userId } = message;
          const channelSockets = connections.get(channelId);
          if (channelSockets) {
            channelSockets.delete(socket);
            broadcastToChannel(channelId, {
              type: 'peer-left',
              userId
            }, socket);
          }
          break;
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  };

  socket.onclose = () => {
    console.log("WebRTC signaling connection closed");
    // Clean up connections
    connections.forEach((sockets, channelId) => {
      sockets.delete(socket);
      if (sockets.size === 0) {
        connections.delete(channelId);
      }
    });
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  function broadcastToChannel(channelId: string, message: any, excludeSocket?: WebSocket) {
    const channelSockets = connections.get(channelId);
    if (channelSockets) {
      channelSockets.forEach(sock => {
        if (sock !== excludeSocket && sock.readyState === WebSocket.OPEN) {
          sock.send(JSON.stringify(message));
        }
      });
    }
  }

  function forwardToPeer(channelId: string, targetUserId: string, message: any) {
    // In a real implementation, you'd map userId to socket
    // For now, broadcast to channel (peers will filter by targetUserId)
    broadcastToChannel(channelId, message);
  }

  return response;
});
