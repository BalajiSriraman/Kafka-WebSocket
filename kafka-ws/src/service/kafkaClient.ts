import { Kafka } from 'kafkajs'

const HOST = process.env.HOST_IP
const kafkaClient = new Kafka({
  clientId: "realtime-data",
  brokers: [`${HOST}:9092`],
  logLevel: 1
})

export default kafkaClient