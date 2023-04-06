import express, {Request, Response} from "express";
import {body} from "express-validator";
import {HTTP_STATUS} from "../utils";
import {PostDTO, RequestBodyType, TDataBase, TPost} from "../types";
import {postsRepository} from "../repositories/posts-repository";
import {blogsRepository} from "../repositories/blogs-repository";
import {inputValidationMiddleware} from "../middleware/input-validation-middleware";


const titleValidation = body('title').isString().isLength({min: 3, max: 30})
const shortDescriptionValidation = body('shortDescription').isString().isLength({min: 10, max: 100})
const contentValidation = body('content').isString().isLength({min: 20, max: 1000})
//TODO добавить проверку наличия blogId
const blogIdValidation = body('blogId').isString().custom((req: express.Request) => {
    if (!blogsRepository.findBlogById(req.body.blogId)) return
})

export const getPostsRouter = (db: TDataBase) => {
    const router = express.Router()
    router.get('/', (req: express.Request, res: express.Response) => {
        const foundPosts = postsRepository.findExistPosts()
        res.status(HTTP_STATUS.OK_200).send(foundPosts)
    })
    router.post('/', titleValidation, shortDescriptionValidation, contentValidation, blogIdValidation, inputValidationMiddleware,
    (req: express.Request, res: express.Response) => {
        const {title, shortDescription, content, blogId} = req.body
        const blogName = blogsRepository.findBlogById(req.body.blogId)?.name
        const dateNow = new Date()
        const createdPost: TPost = {
            id: (+dateNow).toString(),
            title,
            shortDescription,
            content,
            blogId,
            blogName: blogName.toString()
        }

        const createPost = postsRepository.createPost(createdPost)
        res.status(HTTP_STATUS.CREATED_201).json(createPost)
    })
    router.get('/:id', (req: Request, res: Response) => {       //TODO добавить типизацию на Response !
        const findPost = postsRepository.findPostById(req.params.id)
        if (!findPost) return res.sendStatus(HTTP_STATUS.NOT_FOUND_404)     // если не нашли блог по id, то выдаем ошибку и выходим из эндпоинта
        res.status(HTTP_STATUS.OK_200).json(findPost)
    })
    router.put('/:id', titleValidation, shortDescriptionValidation, contentValidation, blogIdValidation, inputValidationMiddleware,
    (req: Request, res: Response) => {
        const foundPost = postsRepository.findPostById(req.params.id)
        if (!foundPost) return res.sendStatus(HTTP_STATUS.NOT_FOUND_404)    // если не нашли блог по id, выдаем ошибку и выходим из эндпоинта

        const {title, shortDescription, content} = req.body
        const updatedPost = postsRepository.updatePost(foundPost, title, shortDescription, content)
        res.status(HTTP_STATUS.NO_CONTENT_204).json(updatedPost)
    })
    router.delete('/:id', (req: Request, res: Response) => {
        const postForDelete = postsRepository.findPostById(req.params.id)
        if (!postForDelete) return res.sendStatus(HTTP_STATUS.NOT_FOUND_404)

        postsRepository.deletePostById(req.params.id)
        res.sendStatus(HTTP_STATUS.NO_CONTENT_204)
    })
    return router
}