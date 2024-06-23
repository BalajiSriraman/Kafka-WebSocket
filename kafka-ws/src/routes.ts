import { Router } from 'express'

export const router = Router()
  // Health Check
  .get('/', (req, res) => {
    res.json({
      status: 'ok',
    })
  })
