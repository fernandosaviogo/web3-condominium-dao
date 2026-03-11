import { ObjectId } from "mongodb";

export enum Profile {
    RESIDENT = 0,
    COUNSELOR = 1,
    MANAGEER = 2
}

export default class Resident {

    _id: ObjectId;
    wallet: string;
    name: string;
    profile: Profile;
    phone?: string;
    email?: string;

    constructor(wallet: string, name: string, profile: Profile.RESIDENT, phone?: string, email?: string){
        this.wallet = wallet;
        this.name = name;
        this.profile = profile;
        this.phone = phone;
        this.email = email;
    }
    
}