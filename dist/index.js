"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// create express app
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const jsonBodyMiddleware = express_1.default.json();
app.use(jsonBodyMiddleware);
const HTTP_STATUS = {
    OK_200: 200,
    CREATED_201: 201,
    NO_CONTENT_204: 204,
    BAD_REQUEST_400: 400,
    NOT_FOUND_404: 404
};
const db = {
    videos: [
        {
            id: 1,
            title: 'vid_1',
            author: 'writer_1',
            canBeDownloaded: false,
            minAgeRestriction: null,
            createdAt: new Date().toISOString(),
            publicationDate: new Date().toISOString(),
            availableResolutions: ['P144']
        },
        {
            id: 2,
            title: 'vid_2',
            author: 'writer_2',
            canBeDownloaded: true,
            minAgeRestriction: null,
            createdAt: '2023-03-30T14:56:02.264Z',
            publicationDate: '2023-03-30T14:56:02.264Z',
            availableResolutions: ['P144']
        },
    ]
};
const videoResolutions = ['P144', 'P240', 'P360', 'P480', 'P720', 'P1080', 'P1440', 'P2160'];
// testing:
app.delete('/testing/all-data', (req, res) => {
    // очистить db
    res.status(HTTP_STATUS.NO_CONTENT_204).send('All data is deleted');
});
// videos:
app.get('/videos', (req, res) => {
    res.status(HTTP_STATUS.OK_200).send(db);
});
app.post('/videos', (req, res) => {
    const title = req.body.title;
    const author = req.body.author;
    const availableResolutions = req.body.availableResolutions;
    const createdAt = new Date();
    const publicationDate = createdAt.setDate(createdAt.getDate() + 1); // ругется на тип, когда использую эту переменную
    const createdVideo = {
        id: +(new Date()),
        title: title,
        author: author,
        canBeDownloaded: false,
        minAgeRestriction: null,
        createdAt: createdAt.toISOString(),
        publicationDate: new Date().toISOString(),
        availableResolutions: availableResolutions
    };
    const errors = [];
    // validation:
    let validation = true;
    if (!title && (title.length < 1 || title.length > 40)) {
        errors.push({
            message: 'should be a string, max 40 symbols',
            field: 'title'
        });
        validation = false;
        return;
    }
    if (!author && (author.length < 1 || author.length > 40)) { //  && typeof author !== 'string'
        errors.push({
            message: 'should be a string, max 40 symbols',
            field: 'author'
        });
        validation = false;
        return;
    }
    // если ставлю тип string[], ругается на метод .length
    if (!availableResolutions && videoResolutions.includes(availableResolutions) && availableResolutions.length !== 0) {
        errors.push({
            message: 'should be not nullable array',
            field: 'availableResolutions'
        });
        validation = false;
        return;
    }
    // если данные прошли валидацию, то добавляем их в БД, иначе отправляем массив с ошибками
    if (validation) {
        db.videos.push(createdVideo);
        res.status(HTTP_STATUS.CREATED_201).send(createdVideo);
    }
    else {
        res.status(HTTP_STATUS.BAD_REQUEST_400).send({ errorsMessages: errors });
    }
});
app.get('/videos/:id', (req, res) => {
    // если не нашли видео по id, то сразу выдаем ошибку not found
    const foundVideo = db.videos.find(v => v.id === +req.params.id);
    if (!foundVideo) {
        res.status(HTTP_STATUS.NOT_FOUND_404);
        return;
    }
    res.status(HTTP_STATUS.OK_200).json(foundVideo);
});
//в свагере id имеет тип integer, а в видео говорится, что надо типизировать как string, как быть?
app.put('/videos/:id', (req, res) => {
    // если не нашли видео по id, то сразу выдаем ошибку not found
    const foundVideo = db.videos.find(v => v.id === +req.params.id);
    if (!foundVideo) {
        res.status(HTTP_STATUS.NOT_FOUND_404);
        return;
    }
    const title = req.body.title;
    const author = req.body.author;
    const availableResolutions = req.body.availableResolutions;
    const canBeDownloaded = req.body.canBeDownloaded;
    const minAgeRestriction = req.body.minAgeRestriction;
    const publicationDate = req.body.publicationDate;
    const errors = [];
    // validation:
    let validation = true;
    if (!title && (title.length < 1 || title.length > 40)) {
        errors.push({
            message: 'should be a string, max 40 symbols',
            field: 'title'
        });
        validation = false;
        return;
    }
    if (!author && (author.length < 1 || author.length > 40)) { //  && typeof author !== 'string'
        errors.push({
            message: 'should be a string, max 40 symbols',
            field: 'author'
        });
        validation = false;
        return;
    }
    // дописать validation для availableResolutions
    if (!availableResolutions && videoResolutions.includes(availableResolutions) && availableResolutions.length !== 0) {
        errors.push({
            message: 'resolution should be a P144, P240, P360, P480, P720, P1080, P1440 or P2160',
            field: 'availableResolutions'
        });
        validation = false;
        return;
    } // валидация через include
    if (!canBeDownloaded) {
        errors.push({
            message: 'required property',
            field: 'canBeDownloaded'
        });
        validation = false;
        return;
    } // вроде ок
    if (!minAgeRestriction && ((typeof minAgeRestriction === 'number' && (minAgeRestriction < 0 || minAgeRestriction > 18)))) { // || typeof minAgeRestriction === 'null'
        errors.push({
            message: 'should be a number <= 18 or null',
            field: 'minAgeRestriction'
        });
        validation = false;
        return;
    }
    if (!publicationDate) {
        errors.push({
            message: 'required property',
            field: 'publicationDate'
        });
        validation = false;
        return;
    }
    // если данные прошли валидацию, то обновляем их, иначе отправляем массив с ошибками
    if (validation) {
        foundVideo.title = title; // обновление всех получаемых параметров
        foundVideo.author = author;
        foundVideo.availableResolutions = availableResolutions;
        foundVideo.canBeDownloaded = canBeDownloaded;
        foundVideo.minAgeRestriction = minAgeRestriction;
        foundVideo.publicationDate = publicationDate;
        res.status(HTTP_STATUS.NO_CONTENT_204).json(foundVideo);
    }
    else {
        res.status(HTTP_STATUS.BAD_REQUEST_400).send({ errorsMessages: errors });
    }
});
app.delete('/videos/:id', (req, res) => {
    // если не нашли видео по id, то сразу выдаем ошибку not found
    db.videos = db.videos.filter(vid => vid.id !== +req.params.id);
    if (!req.params.id) {
        res.status(HTTP_STATUS.NOT_FOUND_404);
        return;
    }
    res.status(HTTP_STATUS.NO_CONTENT_204);
});
// start app
app.listen(port, () => {
    console.log(`Server running on: http://localhost/${port}`);
});
