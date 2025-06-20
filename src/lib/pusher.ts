import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// Enable Pusher logging in development
PusherClient.logToConsole = process.env.NODE_ENV === 'development';

// Server-side Pusher instance
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_APP_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Client-side Pusher instance
const pusherKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

if (!pusherKey || !pusherCluster) {
  throw new Error('Missing required Pusher configuration');
}

export const pusherClient = new PusherClient(pusherKey, {
  cluster: pusherCluster,
  forceTLS: true,
});

interface PusherError {
  error?: {
    type: string;
    data?: unknown;
  };
  message?: string;
}

interface PusherSubscriptionData {
  channel?: string;
  [key: string]: unknown;
}

// Debug logging in development
if (process.env.NODE_ENV === 'development') {
  pusherClient.connection.bind('connected', () => {
    console.log('Pusher connected successfully');
  });

  pusherClient.connection.bind('disconnected', () => {
    console.log('Pusher disconnected');
  });

  pusherClient.connection.bind('error', (err: PusherError) => {
    console.error('Pusher connection error:', err);
  });
}

// Make sure the connection is robust by setting up auto-reconnection
pusherClient.connection.bind('error', (err: PusherError) => {
  if (err.error?.type === 'WebSocketError') {
    console.log('Reconnecting to Pusher after WebSocket error');
    setTimeout(() => {
      pusherClient.connect();
    }, 1000);
  }
});

// Make sure every subscription has the member_added event
pusherClient.global_emitter.bind('pusher:subscription_succeeded', (data: PusherSubscriptionData) => {
  if (data?.channel) {
    console.log(`Successfully subscribed to ${data.channel}`);
  }
}); 