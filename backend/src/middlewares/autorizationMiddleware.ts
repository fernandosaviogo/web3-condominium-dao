import type { Request, Response, NextFunction } from "express";
import type { LoginDate } from "src/controllers/authControler.js";
import { Profile } from "src/models/resident.js";

export function onlyManager (req: Request, res: Response, next: NextFunction) {
    if(!res.locals.token) res.sendStatus(403);

    const loginData = res.locals.token as LoginDate & { profile: Profile };

    if(loginData.profile === Profile.MANAGEER) {
        next();
    }else {
        res.sendStatus(403);
    }

    return;
}

export function onlyCounselor (req: Request, res: Response, next: NextFunction) {
    if(!res.locals.token) res.sendStatus(403);

    const loginData = res.locals.token as LoginDate & { profile: Profile };

    if(loginData.profile === Profile.RESIDENT) {
        next();
    }else {
        res.sendStatus(403);
    }

    return;
}