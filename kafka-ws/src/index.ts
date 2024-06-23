import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { Socket_Server, startWSS } from './service/wsClient'

import { kafkaConsumer } from './composables/kafkaConsumer'
import { initTopic } from './scripts/topicHandler'
import { GLOBAL_VARIABLES } from './constants'
export const app = express().use(express.json())

app.use(cors())

const PORT = (process.env.PORT ?? '8000') as string

app.listen(PORT, async () => {
  await initTopic()
  await startWSS()
  await kafkaConsumer(GLOBAL_VARIABLES.group_id, GLOBAL_VARIABLES.topic, Socket_Server);
})
