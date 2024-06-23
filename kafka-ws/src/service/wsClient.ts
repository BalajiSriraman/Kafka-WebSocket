import { WebSocketServer, WebSocket } from 'ws';
import { consola } from "consola";
import { Core, coreSchema, } from '../models'
import { kafkaProducer } from '../composables/kafkaProducer';

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  isIdentified: boolean;
  identificationTimer?: NodeJS.Timeout;
}

export const Socket_Server = new WebSocketServer({ port: 8080 });

const connections: Map<string, ExtendedWebSocket[]> = new Map();

const IDENTIFICATION_TIMEOUT = 5000; // 5 seconds

export const startWSS = async () => {
  consola.box('Server: Starting WebSocket Server');

  Socket_Server.on('connection', (ws: ExtendedWebSocket) => {
    consola.log('Client connected');
    ws.isIdentified = false;

    // Set up identification timer
    ws.identificationTimer = setTimeout(() => {
      if (!ws.isIdentified) {
        ws.send(JSON.stringify({ type: 'error', message: 'Connection not identified. Please identify yourself.' }));
        ws.close();
      }
    }, IDENTIFICATION_TIMEOUT);

    ws.on('close', () => {
      consola.log('Client disconnected');
      clearTimeout(ws.identificationTimer);
      if (ws.userId) {
        removeConnection(ws);
      }
    });

    // TODO: Refactor this to use a message handler :()
    // TODO: Handle types better
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'identify') {
          handleIdentification(ws, data.userId);

          return
        }

        if (ws.isIdentified) {
          handleMessage(ws, data);
          return
        }

        ws.send(JSON.stringify({ type: 'error', message: 'Please identify yourself before sending messages.' }));

      } catch (error) {
        consola.error('Error processing message:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
  });

  Socket_Server.on('error', (err) => {
    consola.error('WebSocket server error:', err);
  });
};

function handleIdentification(ws: ExtendedWebSocket, userId: string) {
  if (!userId) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid user ID' }));
    return;
  }

  clearTimeout(ws.identificationTimer);
  ws.userId = userId;
  ws.isIdentified = true;
  const userConnections = connections.get(userId) || [];
  userConnections.push(ws);
  connections.set(userId, userConnections);
  ws.send(JSON.stringify({ type: 'success', message: 'Identification successful' }));
  consola.info(`Client identified with user ID: ${userId}`);
}

function handleMessage(ws: ExtendedWebSocket, data: Core) {
  if (ws.userId) {
    kafkaProducer(data).catch((error) => {
      consola.error('Error producing Kafka message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to process your message' }));
    });
    return
  }

  ws.send(JSON.stringify({ type: 'error', message: 'User ID not set' }));
}

function removeConnection(ws: ExtendedWebSocket) {
  if (ws.userId) {
    const userConnections = connections.get(ws.userId) || [];
    const index = userConnections.indexOf(ws);
    if (index !== -1) {
      userConnections.splice(index, 1);
    }
    if (userConnections.length === 0) {
      connections.delete(ws.userId);
    } else {
      connections.set(ws.userId, userConnections);
    }
  }
}

// TODO: type this properly
export const sendToUser = (payload: any) => {
  const parsedData = coreSchema.safeParse(JSON.parse(payload as any));

  if (!parsedData.success) {
    consola.error('Invalid data format:', parsedData.error);
    return;
  }

  const {
    data
  } = parsedData;

  try {
    const userConnections = connections.get(data.auth.userId);
    if (userConnections) {
      userConnections.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data))
        }
      });
    }
  } catch (error) {
    consola.error('Error sending message to user:', error);
  }
};