import {blogCollection} from "../db/db";
import {Result, TBlog} from "../types/types";
import {ResultCode} from "../types/constants";


export const blogsRepository = {
    async findExistBlogs(): Promise<TBlog[]> {      // get
        return await blogCollection.find({}, {projection: {_id: false}}).toArray()
    },

    async createBlog(createdBlog: TBlog): Promise<TBlog> {    // post
        await blogCollection.insertOne(createdBlog)
        return {
            id: createdBlog.id,
            name: createdBlog.name,
            description: createdBlog.description,
            websiteUrl: createdBlog.websiteUrl,
            createdAt: createdBlog.createdAt,
            isMembership: createdBlog.isMembership
        }
    },

    async findBlogById(blogId: string): Promise<TBlog | null> {    // get, put, delete
        const blog = await blogCollection.findOne({id: blogId}, {projection: {_id: false}})
        if (blog) return blog
        else return null
    },

    async updateBlogById(blogId: string, name: string,
               description: string, websiteUrl: string): Promise<Result<boolean>> {   // put
        const updatedResult = await blogCollection.updateOne({id: blogId},
        {$set: {name: name, description: description, websiteUrl: websiteUrl}})
        if(updatedResult.matchedCount < 1) {
            return {
                data: false,
                code: ResultCode.NotFound
            }
        } else {
            return {
                data: true,
                code: ResultCode.Success
            }
        }
    },

    async deleteBlogById(blogId: string) {    // delete
        return await blogCollection.deleteOne({id: blogId})
    }
}