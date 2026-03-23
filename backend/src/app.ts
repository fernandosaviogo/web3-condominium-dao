import express, {type Request, type Response, type NextFunction}  from 'express';
import morgan from 'morgan';

import cors from "cors";
import helmet from 'helmet';
import multer from 'multer';
import errorMiddleware from './middlewares/errorMiddleware.js';

import residentRouter from './routers/residentRouter.js'
import authControler from './controllers/authControler.js'
import topicFileRouter from './routers/topicFileRouter.js'
import authenticationMiddleware from './middlewares/authenticationMiddleware.js';

const app = express();

app.use(morgan("tiny"));
app.use(helmet());

app.use(cors({
    origin: process.env.CORS_ORIGIN
}));

app.use(express.json());

app.post('/login/', authControler.doLogin);

app.use('/residents/', authenticationMiddleware, residentRouter);

const uploadMiddleware = multer({ dest: "files" });
app.use('/topicfiles/', authenticationMiddleware, uploadMiddleware.single("file"), topicFileRouter);

app.use('/', (req: Request, res: Response, next: NextFunction) => {
    res.send(`Healt Check`)
})

app.use(errorMiddleware);

export default app;