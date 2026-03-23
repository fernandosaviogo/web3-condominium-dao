import type { Request, Response, NextFunction } from "express";
import fs from 'fs';
import path from "path";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils.js";

function checkTitleOrHash(hashOrTitle: string): string {
    if(!hashOrTitle) throw new Error(`The hash or title is required.`);

    const regex = /^[a-f0-9]{64}$/gi;
    if(!regex.test(hashOrTitle)) return keccak256(toUtf8Bytes(hashOrTitle));

    return hashOrTitle;
}

export async function getTopicFile(req: Request, res: Response, next: NextFunction) {
    const hash = checkTitleOrHash(req.params.hash);
    const fileName = req.params.fileName;
    const filePath = path.resolve(__dirname, "..", "..", "files", hash, fileName);
    if(fs.existsSync(filePath)) res.sendStatus(404);

    res.download(filePath);
    return;
}

export async function getTopicFiles(req: Request, res: Response, next: NextFunction) {
    const hash = checkTitleOrHash(req.params.hash);
    const folder = path.resolve(__dirname, "..", "..", "files", hash);

    if(fs.existsSync(folder)){
        const files =fs.readdirSync(folder);
        res.json(files);
        return;
    }

    res.json([]);
    return;
}

export async function addTopicFile(req: Request, res: Response, next: NextFunction) {
    const hash = checkTitleOrHash(req.params.hash);
    const file = req.file;
    if(!file) next(new Error(`No file found`));

    const folder = path.resolve(__dirname, "..", "..", "files");
    const oldPath = path.join(folder, file?.filename);

    const newFolder = path.join(folder, hash);
    if(!fs.existsSync(newFolder)) fs.mkdirSync(newFolder);

    const newPath = path.join(newFolder,file?.originalname);
    fs.renameSync(oldPath, newPath);

    res.sendStatus(201);
    return;
}

export async function deleteTopicFile(req: Request, res: Response, next: NextFunction) {
    const hash = checkTitleOrHash(req.params.hash);
    const fileName = req.params.fileName;
    const filePath = path.resolve(__dirname, "..", "..", "files", hash, fileName);
    if(fs.existsSync(filePath)) res.sendStatus(404);

    fs.unlinkSync(filePath);

    res.sendStatus(204);
    return;
}

export async function deleteAllTopicFile(req: Request, res: Response, next: NextFunction) {
    const hash = checkTitleOrHash(req.params.hash);
    const folder = path.resolve(__dirname, "..", "..", "files", hash);
    const files = fs.readdirSync(folder);
    files.map(file => fs.unlinkSync(path.join(folder, file)));
    fs.rmdirSync(folder);

    res.sendStatus(204);
    return;
}

export default {
    getTopicFile,
    getTopicFiles,
    addTopicFile,
    deleteTopicFile,
    deleteAllTopicFile
}