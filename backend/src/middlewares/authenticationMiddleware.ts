import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = `${process.env.JWT_SECRET}`;

export default (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization'];
    const queryToken = req.query.token as string;

    if(token || queryToken) {
        try{
            const decoded = jwt.verify(token || queryToken, JWT_SECRET);
            if(decoded){
                res.locals.token = decoded;
                next();
            }
            console.log(`Token decoded error.`)
        }catch(err: any) {
            console.error(err);
        }
    }else {
        console.error(`No token provided.`);
    }

    res.sendStatus(401);

    return;
}