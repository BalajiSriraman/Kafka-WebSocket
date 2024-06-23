import consola from "consola";
import kafkaClient from "../service/kafkaClient";
import { GLOBAL_VARIABLES } from "../constants";

export const initTopic = async () => {
  const admin = kafkaClient.admin();
  await admin.connect();
  consola.info("--------Admin Connected--------");
  await admin.createTopics({
    topics: [
      {
        topic: GLOBAL_VARIABLES.topic,
        numPartitions: 2,
      },
    ],
  });
  await admin.disconnect();
  consola.info("--------Admin Disconnected--------");
};
