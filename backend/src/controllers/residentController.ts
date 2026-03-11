import type { Request, Response, NextFunction } from "express";
import Resident from "src/models/resident.js";
import residentRepository from "src/repositories/residentRepository.js";

export async function getResident(req: Request, res: Response, next: NextFunction) {
    const wallet = req.params.wallet;
    const resident = await residentRepository.getResident(wallet);
    if(!resident) res.sendStatus(404);

    return;
}

export async function postResident(req: Request, res: Response, next: NextFunction) {
    const resident = req.body as Resident;
    const result = await residentRepository.addResident(resident);
    res.status(201).json(result);
    return;
}

export async function patchResident(req: Request, res: Response, next: NextFunction) {
    const wallet = req.params.wallet;
    const resident = req.body as Resident;
    const result = await residentRepository.updateResident(wallet, resident)
    res.json(result);
    return;
}

export async function deleteResident(req: Request, res: Response, next: NextFunction) {
    const wallet = req.params.wallet;
    const success = await residentRepository.deleteResident(wallet)
    
    if(success){
        res.sendStatus(204)
    } else {
        res.sendStatus(404)
    }

    return;
}

export default {
    getResident,
    postResident,
    patchResident,
    deleteResident
}
