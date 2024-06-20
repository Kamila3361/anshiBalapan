import { Router } from 'express'
import authRouter from './auth/auth-router'
import songRouter from './songs/song-router'
// other routers can be imported here

const globalRouter = Router()

globalRouter.use('/auth', authRouter)
globalRouter.use('/song', songRouter)
// other routers can be added here

export default globalRouter
