import { ethers } from "ethers";
import ABI from "./ABI.json"

//const ADAPTER_ADDRESS =  `${process.env.VITE_ADAPTER_ADDRESS}`;
const ADAPTER_ADDRESS = import.meta.env.VITE_ADAPTER_ADDRESS as string;

export const Profile = {
    RESIDENT: 0,
    COUNSELOR: 1,
    MANAGER: 2
} as const;

export type Profile = typeof Profile[keyof typeof Profile];

function getProfile(): Profile {
    const profile = localStorage.getItem("profile") || "0";
    return parseInt(profile) as Profile;
}

function getProvider(): ethers.BrowserProvider {
    if(!window.ethereum) throw new Error("No MetaMask found");
    return new ethers.BrowserProvider(window.ethereum);
}

function getContract(provider?: ethers.BrowserProvider) : ethers.Contract {
    if(!provider) provider = getProvider();
    return new ethers.Contract(ADAPTER_ADDRESS, ABI as ethers.InterfaceAbi, provider);
}

async function getContractSigner(provider?: ethers.BrowserProvider) : Promise<ethers.Contract> {
    if(!provider) provider = getProvider();
    const signer = await provider.getSigner(localStorage.getItem("account") || undefined);
    return new ethers.Contract(ADAPTER_ADDRESS, ABI as ethers.InterfaceAbi, signer);
}

export type LoginResult = {
    account: string;
    profile: Profile;
};

export type Resident = {
    wallet: string;
    isCounselor: boolean;
    isManager: boolean;
    residence: number;
    nextPayment: number;
}

export function isManager(): boolean {
    return parseInt(localStorage.getItem("profile") || "0") === Profile.MANAGER;
}

export function isResident(): boolean {
    return parseInt(localStorage.getItem("profile") || "0") === Profile.RESIDENT;
}

export async function doLogin() : Promise<LoginResult> {
    const provider = getProvider();

    const accounts: string[] = await provider.send("eth_requestAccounts", []);

    if(!accounts.length) throw new Error("Wallet not found/allwed.");

    const account = ethers.getAddress(accounts[0]);
    const contract = getContract(provider);

    const resident = (await contract.getResident(account)) as Resident;

    //const manager: string = await contract.getManager();
    let isManager = resident.isManager; //manager.toLowerCase() === account;

    if(!isManager && resident.residence > 0) {
        if(resident.isCounselor){
            localStorage.setItem("profile", `${Profile.COUNSELOR}`);
        }else {
            localStorage.setItem("profile", `${Profile.RESIDENT}`);
        }
    }else if(!isManager && !resident.residence) {
        const manager = await contract.getManager() as string;
        isManager = account === manager.toUpperCase();
    }

    if(isManager) {
        localStorage.setItem("profile", `${Profile.MANAGER}`);
    } else if(localStorage.getItem("profile") === null){
        throw new Error("Unauthorized");
    }
    localStorage.setItem("account", accounts[0]);

    return {
        account: account,
        profile: parseInt(localStorage.getItem("profile") || "0")
    } as LoginResult;
}

export function doLogout() {
    localStorage.removeItem("account");
    localStorage.removeItem("profile");
}

export async function getAddress() : Promise<string> {
    const contract = getContract();
    return await contract.getAddress();
}

export type ResidentPage = {
    residents: Resident[];
    total: number;
}
export async function getResident(wallet: string) : Promise<Resident> {
    const contract = getContract();
    return await contract.getResidents(wallet) as Resident;
}

export async function getResidents(page: number = 1, pageSize: number = 10) : Promise<ResidentPage> {
    const contract = getContract();
    const result = await contract.getResidents(page, pageSize) as ResidentPage;
    const residents = result.residents.filter(r => r.residence).sort((a,b) => {
        if(a.residence > b.residence) return 1;
        return -1;
    });

    return {
        residents,
        total: Number(result.total)
    } as ResidentPage;
}

export async function upgrade(address: string): Promise<ethers.ContractTransactionResponse> {
    if(getProfile() !== Profile.MANAGER) throw new Error(`You do not have prmission.`);
    const contract = await getContractSigner();
    const tx = await contract.upgrade(address);
    return tx;
}

export async function addResident(wallet: string, residentId: number): Promise<ethers.ContractTransactionResponse> {
    if(getProfile() === Profile.RESIDENT) throw new Error(`You do not have prmission.`);
    const contract = await getContractSigner();
    const tx = await contract.addResident(wallet, residentId);
    return tx;
}

export async function removeResident(wallet: string): Promise<ethers.ContractTransactionResponse> {
    if(getProfile() !== Profile.MANAGER) throw new Error(`You do not have prmission.`);
    const contract = await getContractSigner();
    const tx = await contract.removeResident(wallet);
    return tx;
}

export async function setCounselor(wallet: string, isEntering: boolean): Promise<ethers.ContractTransactionResponse> {
    if(getProfile() !== Profile.MANAGER) throw new Error(`You do not have prmission.`);
    const contract = await getContractSigner();
    const tx = await contract.setCounselor(wallet, isEntering);
    return tx;
}