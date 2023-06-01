import {BlogsService} from "../domain/blogs-service";
import {
    BlogPostDTO, BlogPutDTO, BlogViewModel,
    IdDTO,
    PagingDTO,
    PagingWithSearchDTO,
    ReqParamsBodyType,
    ReqParamsQueryType,
    ReqQueryType
} from "../types/types";
import {Request, Response} from "express";
import {DEFAULT_SORT_BY, DEFAULT_SORT_DIRECTION, HTTP_STATUS} from "../utils/constants";
import {queryRepository} from "../repositories/query-repository";
import {postsService} from "../domain/posts-service";


export class BlogsController {
    constructor(protected blogsService: BlogsService) {}
    async getBlogs(req: ReqQueryType<PagingWithSearchDTO>, res: Response) {
        const searchNameTerm = req.query.searchNameTerm ?? null
        const pageNumber = req.query.pageNumber ?? 1
        const pageSize = req.query.pageSize ?? 10
        const sortBy = req.query.sortBy ?? DEFAULT_SORT_BY
        const sortDirection = req.query.sortDirection ?? DEFAULT_SORT_DIRECTION

        const foundSortedBlogs = await queryRepository.findBlogsAndSort(searchNameTerm, Number(pageNumber), Number(pageSize), sortBy, sortDirection)
        res.status(HTTP_STATUS.OK_200).json(foundSortedBlogs)
    }
    async createBlog(req: Request, res: Response) {
        const {name, description, websiteUrl} = req.body
        const createdBlog = await this.blogsService.createBlog(name, description, websiteUrl)
        res.status(HTTP_STATUS.CREATED_201).json(createdBlog)
    }
    async getPostCurrentBlog(req: ReqParamsQueryType<IdDTO, PagingDTO>, res: Response) {
        const findBlog = await this.blogsService.findBlogById(req.params.id)
        if (!findBlog) {
            res.sendStatus(HTTP_STATUS.NOT_FOUND_404)
        } else {
            const pageNumber = req.query.pageNumber ?? 1
            const pageSize = req.query.pageSize ?? 10
            const sortBy = req.query.sortBy ?? DEFAULT_SORT_BY
            const sortDirection = req.query.sortDirection ?? DEFAULT_SORT_DIRECTION
            const postsThisBlog = await queryRepository.findPostsThisBlogById(findBlog.id, Number(pageNumber), Number(pageSize), sortBy, sortDirection)
            res.status(HTTP_STATUS.OK_200).json(postsThisBlog)
        }
    }
    async createPostCurrentBlog(req: ReqParamsBodyType<IdDTO, BlogPostDTO>, res: Response) {
        const findBlog = await this.blogsService.findBlogById(req.params.id)
        if (!findBlog) {
            res.sendStatus(HTTP_STATUS.NOT_FOUND_404)
        } else {
            const {title, shortDescription, content} = req.body
            const createdPostThisBlog = await postsService.createPost(title, shortDescription, content, findBlog)
            res.status(HTTP_STATUS.CREATED_201).json(createdPostThisBlog)
        }
    }
    async getBlog(req: Request, res: Response<BlogViewModel>) {
        const findBlog = await this.blogsService.findBlogById(req.params.id)
        if (!findBlog) {    // если не нашли блог по id, то выдаем ошибку и выходим из эндпоинта
            res.sendStatus(HTTP_STATUS.NOT_FOUND_404)
        }  else {
            res.status(HTTP_STATUS.OK_200).json(findBlog)
        }
    }
    async updateBlog(req: ReqParamsBodyType<IdDTO, BlogPutDTO>, res: Response) {
        const {name, description, websiteUrl} = req.body
        const result = await this.blogsService.updateBlogById(req.params.id, name, description, websiteUrl)
        if (!result) {
            res.sendStatus(HTTP_STATUS.NOT_FOUND_404)
        } else {
            const updatedBlog = await this.blogsService.findBlogById(req.params.id)
            res.status(HTTP_STATUS.NO_CONTENT_204).json(updatedBlog)
        }
    }
    async deleteBlog(req: Request, res: Response) {
        const blogForDelete = await this.blogsService.findBlogById(req.params.id)
        if (!blogForDelete) {
            res.sendStatus(HTTP_STATUS.NOT_FOUND_404)
        } else {
            await this.blogsService.deleteBlogById(req.params.id)
            res.sendStatus(HTTP_STATUS.NO_CONTENT_204)
        }
    }
}