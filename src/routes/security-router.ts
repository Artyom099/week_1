import express, {Request, Response} from "express";
import {cookieMiddleware} from "../middleware/cookie-middleware";
import {HTTP_STATUS} from "../types/constants";
import {securityService} from "../application/security-service";
import {ReqParamsType} from "../types/types";
import {jwtService} from "../application/jwt-service";


export const securityRouter = () => {
    const router = express.Router()

    router.get('/devices', cookieMiddleware, async (req: Request, res: Response) => {
        // Returns all devices with active sessions for current user
        const refreshToken = req.cookies.refreshToken
        const tokenPayload = await jwtService.getPayloadByToken(refreshToken)
        const activeSessions = await securityService.finaAllActiveSessionsByUserId(tokenPayload.userId)

        res.status(HTTP_STATUS.OK_200).json(activeSessions)
    })

    router.delete('/devices', cookieMiddleware, async (req: Request, res: Response) => {
        // Terminate all other (exclude current) device's sessions
        const refreshToken = req.cookies.refreshToken
        const tokenPayload = await jwtService.getPayloadByToken(refreshToken)

        await securityService.deleteOtherActiveSessionsByUserId(tokenPayload!.userId)
        res.sendStatus(HTTP_STATUS.NO_CONTENT_204)
    })

    router.delete('/devices/:deviceId', cookieMiddleware, async (req: ReqParamsType<{ deviceId: string }>, res: Response) => {
        // Terminate specified device session
        const refreshToken = req.cookies.refreshToken
        const tokenPayload = await jwtService.getPayloadByToken(refreshToken)

        const currentSession = await securityService.findActiveSessionByDeviceId(req.params.deviceId)
        if (!currentSession) return res.sendStatus(HTTP_STATUS.NOT_FOUND_404)

        const activeSessions = await securityService.finaAllActiveSessionsByUserId(tokenPayload.userId)
        // console.log('current - ', currentSession)
        // console.log('active - ', activeSessions)
        // console.log(activeSessions.filter(session => session.deviceId !== currentSession.deviceId).length === 0)
        // console.log(!activeSessions.includes(currentSession))
        // todo - !activeSessions.includes(currentSession) - не работает, возвращает true

        if (!activeSessions.includes(currentSession)) {
            res.sendStatus(HTTP_STATUS.FORBIDDEN_403)
        } else {
            await securityService.deleteCurrentSessionByDeviceId(req.params.deviceId)
            res.sendStatus(HTTP_STATUS.NO_CONTENT_204)
        }
    })

    return router
}