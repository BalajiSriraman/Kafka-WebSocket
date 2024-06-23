import { GLOBAL_VARIABLES } from "../constants";
import { Core } from "../models";
import kafkaClient from "../service/kafkaClient";
import { Partitioners } from "kafkajs";

const producer = kafkaClient.producer({
  createPartitioner: Partitioners.LegacyPartitioner
});

export const kafkaProducer = async (data: Core) => {
  await producer.connect();
  await producer.send({
    topic: GLOBAL_VARIABLES.topic,
    messages: [
      {
        partition: parseInt('0'),
        value: JSON.stringify(data),
      },
    ],
  });

  await producer.disconnect();
};