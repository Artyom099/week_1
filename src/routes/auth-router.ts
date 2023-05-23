import express, {Request, Response} from "express";
import {usersService} from "../domain/users-service";
import {HTTP_STATUS} from "../types/constants";
import {AuthDTO, ReqBodyType, UserRegDTO} from "../types/types";
import {body} from "express-validator";
import {inputValidationMiddleware} from "../middleware/input-validation-middleware";
import {jwtService} from "../application/jwt-service";
import {authMiddlewareBearer} from "../middleware/auth-middleware";
import {authService} from "../domain/auth-service";
import {emailManager} from "../managers/email-manager";
import {cookieMiddleware} from "../middleware/cookie-middleware";
import {rateLimitMiddleware} from "../middleware/rate-limit-middleware";
import {randomUUID} from "crypto";
import {securityService} from "../application/security-service";

const validationAuth = [
    body('loginOrEmail').isString().trim().notEmpty(),
    body('password').isString().trim().notEmpty()
]
const validationEmail = [
    body('email').isString().trim().notEmpty().isEmail()
]
const validationReg = [
    ...validationEmail,
    body('login').isString().trim().notEmpty().isLength({min: 3, max: 10}).matches('^[a-zA-Z0-9_-]*$'),
    body('password').isString().trim().notEmpty().isLength({min: 6, max: 20}),
]


export const authRouter = () => {
    const router = express.Router()

    router.post('/login', validationAuth, inputValidationMiddleware, rateLimitMiddleware, async (req: ReqBodyType<AuthDTO>, res: Response) => {
        const userId = await usersService.checkCredentials(req.body.loginOrEmail, req.body.password)
        if (userId) {
            const title = req.headers['user-agent']
            const deviceId = randomUUID()
            const token = await jwtService.createJWT(userId, deviceId)
            const tokenPayload = await jwtService.getPayloadByToken(token.refreshToken)
            const lastActiveDate = (tokenPayload.iat * 1000).toString()
            await securityService.addActiveSession(req.ip, title!, lastActiveDate, deviceId, userId)

            res.cookie('refreshToken', token.refreshToken, {httpOnly: true, secure: true})
            res.status(HTTP_STATUS.OK_200).json({'accessToken': token.accessToken})
        } else {
            res.sendStatus(HTTP_STATUS.UNAUTHORIZED_401)
        }
    })

    router.post('/refresh-token', cookieMiddleware, async (req: Request, res: Response) => {
        const refreshToken = req.cookies.refreshToken
        const refreshTokenPayload = await jwtService.getPayloadByToken(refreshToken)
        const tokenIssuedAt = (refreshTokenPayload.iat * 1000).toString()
        const lastActiveSession = await securityService.findActiveSessionByDeviceId(refreshTokenPayload.deviceId)

        if (tokenIssuedAt === lastActiveSession!.lastActiveDate) {
            const token = await jwtService.createJWT(refreshTokenPayload.userId, refreshTokenPayload.deviceId)
            const newTokenPayload = await jwtService.getPayloadByToken(token.refreshToken)
            const lastActiveDate = (newTokenPayload.iat * 1000).toString()
            await securityService.updateLastActiveDateByDeviceId(refreshTokenPayload.deviceId, lastActiveDate)
            res.cookie('refreshToken', token.refreshToken, {httpOnly: true, secure: true})
            res.status(HTTP_STATUS.OK_200).json({'accessToken': token.accessToken})
        } else {
            res.sendStatus(HTTP_STATUS.UNAUTHORIZED_401)
        }
    })

    router.post('/registration-confirmation', rateLimitMiddleware, async (req: Request, res: Response) => {
        // код приходит на почту, если он верный, то 204, иначе 400 и текст ошибки
        const verifyEmail = await authService.checkConfirmationCode(req.body.code)
        if (!verifyEmail) {
            res.status(HTTP_STATUS.BAD_REQUEST_400).json({
                errorsMessages: [
                    {
                        message: 'code is incorrect, expired or already been applied',
                        field: 'code'
                    }
                ]
            })
        } else {    // todo добавить тест для этого пути - надо мокать ф-ю, чтобы перать сюда реальный код с почты
            res.sendStatus(HTTP_STATUS.NO_CONTENT_204)
        }
    })

    router.post('/registration', validationReg, inputValidationMiddleware, rateLimitMiddleware, async (req: ReqBodyType<UserRegDTO>, res: Response) => {
        // если входные данные для регистрции правильные, то создаем пользователя
        const existUserEmail = await usersService.findUserByLoginOrEmail(req.body.email)
        if (existUserEmail) {
            return res.status(HTTP_STATUS.BAD_REQUEST_400).json({
                errorsMessages: [
                    {
                        message: 'user with the given email already exists',
                        field: 'email'
                    }
                ]
            })
        }
        const existUserLogin = await usersService.findUserByLoginOrEmail(req.body.login)
        if (existUserLogin) {
            res.status(HTTP_STATUS.BAD_REQUEST_400).json({
                errorsMessages: [
                    {
                        message: 'user with the given login already exists',
                        field: 'login'
                    }
                ]
            })
        } else {
            await authService.createUser(req.body.login, req.body.password, req.body.email)
            res.sendStatus(HTTP_STATUS.NO_CONTENT_204)
        }
    })

    router.post('/registration-email-resending', validationEmail, inputValidationMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
        // проверяем, существует ли пользователь, подтверждена ли почта, и потом отправляем код
        const existUser = await usersService.findUserByLoginOrEmail(req.body.email)
        if (!existUser || existUser.emailConfirmation.isConfirmed) {
            return res.status(HTTP_STATUS.BAD_REQUEST_400).json({
                errorsMessages: [
                    {
                        message: 'email is already confirmed or doesn\'t exist',
                        field: 'email'
                    }
                ]
            })
        } else {
            const newCode = await authService.updateConfirmationCode(req.body.email)
            await emailManager.sendEmailConfirmationMessage(req.body.email, newCode)
            res.sendStatus(HTTP_STATUS.NO_CONTENT_204)
        }
    })

    router.post('/logout', cookieMiddleware, async (req: Request, res: Response) => {
        res.sendStatus(HTTP_STATUS.NO_CONTENT_204)
    })

    router.get('/me', authMiddlewareBearer, async (req: Request, res: Response) => {
        res.status(HTTP_STATUS.OK_200).json({   // todo добавить тест для этого пути
            email: req.user!.email,
            login: req.user!.login,
            userId: req.user!.id
        })
    })

    return router
}