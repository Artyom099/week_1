import {body} from "express-validator";
import express, {Request, Response} from "express";
import {TPost} from "../types";
import {convertResultErrorCodeToHttp, HTTP_STATUS} from "../utils";
import {postsService} from "../domain/posts-service";
import {blogsService} from "../domain/blogs-service";
import {authMiddleware, inputValidationMiddleware} from "../middleware/input-validation-middleware";


const validationPost = [
    body('title').isString().isLength({min: 3, max: 30}).trim().not().isEmpty(),
    body('shortDescription').isString().isLength({min: 3, max: 100}).trim().notEmpty(),
    body('content').isString().isLength({min: 3, max: 1000}).trim().notEmpty(),
    body('blogId').isString().custom(async (value) => {
        const blog = await blogsService.findBlogById(value)
        if (!blog) {
            throw new Error('blog not found')
        }
        return true
    })]

export const getPostsRouter = () => {
    const router = express.Router()

    router.get('/', async (req: Request, res: Response) => {
        const foundPosts = await postsService.findExistPosts()
        res.status(HTTP_STATUS.OK_200).send(foundPosts)
    })

    router.post('/', validationPost, authMiddleware, inputValidationMiddleware,
        async (req: Request, res: Response) => {
            const {title, shortDescription, content, blogId} = req.body
            const blog = await blogsService.findBlogById(req.body.blogId)
            const createdPost = await postsService.createPost(title, shortDescription, content, blogId, blog)
            res.status(HTTP_STATUS.CREATED_201).json(createdPost)
    })

    router.get('/:id', async (req: Request, res: Response<TPost>) => {
        const findPost = await postsService.findPostById(req.params.id)
        if (!findPost) return res.sendStatus(HTTP_STATUS.NOT_FOUND_404)     // если не нашли блог по id, то выдаем ошибку и выходим из эндпоинта
        res.status(HTTP_STATUS.OK_200).json(findPost)
    })

    router.put('/:id', validationPost, authMiddleware, inputValidationMiddleware,
        async (req: Request, res: Response) => {
            const {title, shortDescription, content} = req.body
            const result = await postsService.updatePostById(req.params.id, title, shortDescription, content)

            if (!result.data) return res.sendStatus(convertResultErrorCodeToHttp(result.code))

            const updatedPost = await postsService.findPostById(req.params.id)
            res.status(HTTP_STATUS.NO_CONTENT_204).json(updatedPost)
    })

    router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
        const postForDelete = await postsService.findPostById(req.params.id)
        if (!postForDelete) return res.sendStatus(HTTP_STATUS.NOT_FOUND_404)

        await postsService.deletePostById(req.params.id)
        res.sendStatus(HTTP_STATUS.NO_CONTENT_204)
    })

    return router
}