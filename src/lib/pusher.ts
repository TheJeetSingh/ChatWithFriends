import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// Enable Pusher logging for debugging
// Comment this out in production
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
  console.error('Missing Pusher configuration:', { 
    key: pusherKey ? 'OK' : 'MISSING',
    cluster: pusherCluster ? 'OK' : 'MISSING'
  });
}

export const pusherClient = new PusherClient(
  pusherKey || '',
  {
    cluster: pusherCluster || 'ap2',
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
    wsHost: `ws-${pusherCluster || 'ap2'}.pusher.com`,
    httpHost: `sockjs-${pusherCluster || 'ap2'}.pusher.com`,
    disableStats: true,
    authEndpoint: '/api/pusher/auth',
  }
);

if (process.env.NODE_ENV === 'development') {
  // Debug initialization
  console.log('Pusher initialized with cluster:', pusherCluster);

  // Handle connection events
  pusherClient.connection.bind('connected', () => {
    console.log('Pusher connected successfully');
  });

  pusherClient.connection.bind('disconnected', () => {
    console.log('Pusher disconnected');
  });

  pusherClient.connection.bind('error', (err: any) => {
    console.error('Error connecting to Pusher:', err);
  });
}

// Make sure the connection is robust by setting up auto-reconnection
pusherClient.connection.bind('error', (err: any) => {
  if (err.error?.type === 'WebSocketError') {
    console.log('Reconnecting to Pusher after WebSocket error');
    setTimeout(() => {
      pusherClient.connect();
    }, 1000);
  }
});

// Make sure every subscription has the member_added event
pusherClient.global_emitter.bind('pusher:subscription_succeeded', (data: any) => {
  if (data?.channel) {
    console.log(`Successfully subscribed to ${data.channel}`);
  }
}); 