import type { Request, Response, NextFunction } from "express";
import residentRepository from "src/repositories/residentRepository.js";
import { ethers } from "ethers";
import { jwt } from "jsonwebtoken";

type LoginDate = {
    timestamp: number;
    wallet: string;
    secret: string;
}

const JWT_SECRET = `${process.env.JWT_SECRET}`;
const JWT_EXPIRES = parseInt(`${process.env.JWT_EXPIRES}`);

async function doLogin(req: Request, res: Response, next: NextFunction) {
    const data = req.body as LoginDate;
    if(data.timestamp < (Date.now() - (30 * 1000)))
        res.status(401).send(`Timestamp too old.`);

    const message = `Authenticating to condominium. Timestamp: ${data.timestamp}`;

    const signer = ethers.utils.verifyMessage(message, data.secret);
    if(signer.toUpperCase() === data.wallet.toUpperCase()){

        const resident = await residentRepository.getResident(data.wallet);
        if(!resident) res.send(401).send(`Resident not found.`);

        const token = jwt.sign({ ...data, profile: resident?.profile }, JWT_SECRET, {
            expiresIn: JWT_EXPIRES
        })
        res.json({ token });

    }

    res.status(401).send(`Wallet and secret doesn't match`);

    return;
}

export default {
    doLogin
}