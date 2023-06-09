import {
    PagingViewModel,
    BlogViewModel,
    CommentViewModel,
    PostViewModel,
    UserAccountDBType,
    CommentBDType
} from "../types/types"
import {userCollection} from "../db/db";
import {Filter} from "mongodb"
import {BlogModel} from "../shemas/blogs-schema";
import {PostModel} from "../shemas/posts-schema";
import {CommentModel} from "../shemas/feedback-schema";
import {LikeStatus} from "../utils/constants";


export const queryRepository = {
    async findBlogsAndSort(searchNameTerm: string | null, pageNumber: number, pageSize: number, sortBy: string,
                           sortDirection: 'asc'|'desc'): Promise<PagingViewModel<BlogViewModel[]>> {
        const filter = searchNameTerm ? {name: {$regex: searchNameTerm, $options: 'i'}} : {}
        const totalCount: number = await BlogModel.countDocuments(filter)
        const sortedBlogs: BlogViewModel[] = await BlogModel.find(filter,{ _id: 0, __v: 0 })
            .sort({[sortBy]: sortDirection}).skip((pageNumber - 1) * pageSize).limit(pageSize)
        return {
            pagesCount: Math.ceil(totalCount / pageSize),    // общее количество страниц
            page: pageNumber,                                   // текущая страница
            pageSize,                                           // количество блогов на странице
            totalCount,                                         // общее количество блогов
            items: sortedBlogs
        }
    },

    async findPostsThisBlogById(blogId: string, pageNumber: number, pageSize: number, sortBy: string,
                                sortDirection: 'asc'|'desc'): Promise<PagingViewModel<PostViewModel[]>> {   // get
        const filter: {blogId: string} = {blogId: blogId}
        const totalCount: number = await PostModel.countDocuments(filter)
        const sortedPosts: PostViewModel[] = await PostModel.find(filter, {projection: {_id: 0, __v: 0}})
            .sort({[sortBy]: sortDirection}).skip((pageNumber - 1) * pageSize).limit(pageSize).lean()
        return {
            pagesCount: Math.ceil(totalCount / pageSize),    // общее количество страниц
            page: pageNumber,                                   // текущая страница
            pageSize,                                           // количество постов на странице
            totalCount,                                         // общее количество постов
            items: sortedPosts          // выводить pageSize постов на pageNumber странице
        }
    },

    async findPostsAndSort(pageNumber: number, pageSize: number, sortBy: string, sortDirection: 'asc'|'desc'):
                           Promise<PagingViewModel<PostViewModel[]>> {

        const totalCount: number = await PostModel.countDocuments()
        const sortedPosts: PostViewModel[] = await PostModel.find({}, {projection: {_id: 0, __v: 0}})
            .sort({[sortBy]: sortDirection}).skip((pageNumber - 1) * pageSize).limit(pageSize).lean()
        return {
            pagesCount: Math.ceil(totalCount / pageSize),    // общее количество страниц
            page: pageNumber,                                   // текущая страница
            pageSize,                                           // количество постов на странице
            totalCount,                                         // общее количество постов
            items: sortedPosts          // выводить pageSize постов на pageNumber странице
        }
    },

    async findUsersAndSort(searchEmailTerm: string | null, searchLoginTerm: string | null, pageNumber: number, pageSize: number, sortBy: string,
                           sortDirection: 'asc'|'desc'): Promise<PagingViewModel<UserAccountDBType[]>> {
        const filter: Filter<UserAccountDBType> = { $or: [
            { 'accountData.login': {$regex: searchLoginTerm ?? '', $options: "i"} },
            { 'accountData.email': {$regex: searchEmailTerm ?? '', $options: "i"} }
        ]}
        const totalCount: number = await userCollection.countDocuments(filter)
        const sortedUsers: UserAccountDBType[] = await userCollection
            .find(filter, {projection: {_id: 0, id: 1, login: '$accountData.login', email: '$accountData.email', createdAt: '$accountData.createdAt'}})
            .sort({[sortBy]: sortDirection}).skip((pageNumber - 1) * pageSize).limit(pageSize).toArray()
        return {
            pagesCount: Math.ceil(totalCount / pageSize),    // общее количество страниц
            page: pageNumber,                                   // текущая страница
            pageSize,                                           // количество пользователей на странице
            totalCount,                                         // общее количество пользователей
            items: sortedUsers  //todo здесь тип TUser!
        }
    },

    async findCommentsThisPostAndSort(currentUserId: string | null, postId: string, pageNumber: number, pageSize: number, sortBy: string,
                                      sortDirection: 'asc'|'desc'): Promise<PagingViewModel<CommentViewModel[]>> {
        const filter: {postId: string} = {postId: postId}
        const totalCount: number = await CommentModel.countDocuments(filter)
        let sortedComments: CommentBDType[] = await CommentModel.find(filter, {_id: 0, __v: 0, postId: 0})
            .sort({[sortBy]: sortDirection}).skip((pageNumber - 1) * pageSize).limit(pageSize).lean()

        const items = sortedComments.map(c => {
            let myStatus = LikeStatus.None
            let likesCount = 0
            let dislikesCount = 0
            c.likesInfo.statuses.forEach(s => {
                if (s.userId === currentUserId) myStatus = s.status
                if (s.status === LikeStatus.Like) likesCount++
                if (s.status === LikeStatus.Dislike) dislikesCount++
            })
            return {
                id: c.id,
                content: c.content,
                commentatorInfo: {
                    userId: c.commentatorInfo.userId,
                    userLogin: c.commentatorInfo.userLogin
                },
                createdAt: c.createdAt,
                likesInfo: {
                    likesCount,
                    dislikesCount,
                    myStatus
                }
            }
        })

        return {
            pagesCount: Math.ceil(totalCount / pageSize),    // общее количество страниц
            page: pageNumber,                                   // текущая страница
            pageSize,                                           // количество комментариев на странице
            totalCount,                                         // общее количество комментариев
            items
        }
    }
}