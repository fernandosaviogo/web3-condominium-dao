import express, {type Request, type Response, type NextFunction}  from 'express';
import morgan from 'morgan';

import cors from "cors";
import helmet from 'helmet';
import errorMiddleware from './middlewares/errorMiddleware.js';

const app = express();

app.use(morgan("tiny"));
app.use(helmet());

app.use(cors({
    origin: process.env.CORS_ORIGIN
}));

app.use(express.json());

app.use('/', (req: Request, res: Response, next: NextFunction) => {
    res.send(`Hello World`)
})

app.use(errorMiddleware);

export default app;