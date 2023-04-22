import request from 'supertest'
import {app} from "../../src/app"

describe('/blogs', () => {
    beforeAll(async () => {
        await request(app).delete ('/testing/all-data')
    })

    it('should return 200 and empty array', async () => {
        await request(app)
            .get('/blogs')
            .expect(200, { pagesCount: 0, page: 1, pageSize: 10, totalCount: 0, items: [] })
    })

    it('should return 404 for not existing blog', async () => {
        await request(app)
            .get('/blogs/1')
            .expect(404)
    })
})