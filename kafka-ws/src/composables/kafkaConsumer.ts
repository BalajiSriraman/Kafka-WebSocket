import kafkaClient from "../service/kafkaClient";
import consola from "consola";
import { WebSocketServer } from 'ws';
import { sendToUser } from '../service/wsClient';

export const kafkaConsumer = async (
  groupId: string,
  topic: string,
  wss: WebSocketServer
) => {
  const consumer = kafkaClient.consumer({
    groupId: groupId,
  });

  await consumer.connect();
  await consumer.subscribe({ topics: [topic] });

  try {
    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          if (message.value) {
            sendToUser(message.value?.toString()! as any);
          }
        } catch (error) {
          consola.error(error);
        }
      }
    });
  } catch (error) {
    consola.error(error);
  }
};