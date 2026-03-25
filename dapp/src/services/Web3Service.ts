import { ethers } from "ethers";
import ABI from "./ABI.json"
import { doApiLogin } from "./ApiService";

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
    token: string;
};

export type Resident = {
    wallet: string;
    isCounselor: boolean;
    isManager: boolean;
    residence: number;
    nextPayment: number;
}

export function hasManagerPermissions(): boolean {
    return parseInt(localStorage.getItem("profile") || "0") === Profile.MANAGER;
}

export function hasCouselorPermissions(): boolean {
    return parseInt(localStorage.getItem("profile") || "0") !== Profile.RESIDENT;
}

export function hasResidentPermissions(): boolean {
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

    // Assinatura digital para segurança do login
    const signer = provider.getSigner();
    const timestamp = Date.now();
    const message = `Authenticating to condominium. Timestamp: ${timestamp}`;
    const secret = (await signer).signMessage(message);

    const token = await doApiLogin(account[0], await secret, timestamp);
    localStorage.setItem("token", token);

    return {
        token,
        account: account,
        profile: parseInt(localStorage.getItem("profile") || "0")
    } as LoginResult;
}

export function doLogout() {
    localStorage.removeItem("account");
    localStorage.removeItem("profile");
    localStorage.removeItem("token");
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

export enum Category {
    DECISION = 0,
    SPENT = 1,
    CHANGE_QUOTA = 2,
    CHANGE_MANAGER = 3
}

export enum Status {
    IDLE = 0,
    VOTING = 1,
    APPROVED = 2,
    DENIED = 3,
    DELETED = 4,
    SPENT = 5
}

export type Topic = {
    title: string;
    description: string;
    category: Category;
    amount: ethers.BigNumberish;
    responsible: String;
    status?: Status;
    createdDate?: number;
    StartDate?: number;
    endDate?: number;
}

export type TopicPage = {
    topics: Topic[];
    total: number;
}
export async function getTopic(title: string) : Promise<Topic> {
    const contract = getContract();
    return await contract.getTopic(title) as Topic;
}

export async function getTopics(page: number = 1, pageSize: number = 10) : Promise<TopicPage> {
    const contract = getContract();
    const result = await contract.getTopics(page, pageSize) as TopicPage;
    const topics = result.topics.filter(t => t.title)

    return {
        topics,
        total: Number(result.total)
    } as TopicPage;
}

export async function removeTopic(title: string): Promise<ethers.ContractTransactionResponse> {
    if(getProfile() !== Profile.MANAGER) throw new Error(`You do not have prmission.`);
    const contract = await getContractSigner();
    const tx = await contract.removeTopic(title);
    return tx;
}

export async function addTopic(topic: Topic): Promise<ethers.ContractTransactionResponse> {
    const contract = await getContractSigner();
    topic.amount = ethers.toBigInt(topic.amount || 0);
    const tx = await contract.addTopic(topic.title, topic.description, topic.category, topic.amount, topic.responsible);
    return tx;
}

export async function editTopic(topicToEdit: string, description: string, amount: ethers.BigNumberish, responsible: string): Promise<ethers.ContractTransactionResponse> {
    if(getProfile() !== Profile.MANAGER) throw new Error(`You do not have prmission.`);
    const contract = await getContractSigner();
    amount = ethers.toBigInt(amount || 0);
    const tx = await contract.aditTopic(topicToEdit, description, amount, responsible);
    return tx;
}

export async function openVoting(topic: Topic): Promise<ethers.ContractTransactionResponse> {
    if(getProfile() !== Profile.MANAGER) throw new Error(`You do not have prmission.`);
    const contract = await getContractSigner();
    const tx = await contract.openVoting(topic);
    return tx;
}

export async function closeVoting(topic: Topic): Promise<ethers.ContractTransactionResponse> {
    if(getProfile() !== Profile.MANAGER) throw new Error(`You do not have prmission.`);
    const contract = await getContractSigner();
    const tx = await contract.closeVoting(topic);
    return tx;
}

export async function payQuota(residenceId: number, value: ethers.BigNumberish): Promise<ethers.ContractTransactionResponse> {
    if(getProfile() !== Profile.RESIDENT) throw new Error(`You do not have prmission.`);
    const contract = await getContractSigner();
    const tx = await contract.payQuota(residenceId, { value });
    return tx;
}

export async function getQuota() : Promise<ethers.BigNumberish> {
    const contract = getContract();
    const tx = await contract.getQuota();
    return tx;
}

export enum Options {
    EMPTY = 0,
    YES = 1,
    NO = 2,
    ABSTENTION = 3
}

export type Vote = {
    resident: string;
    residence: number;
    timesTamp: number;
    option: Options;
}

export async function getVotes(topic: string) : Promise<Vote[]> {
    const contract = getContract();
    const tx = await contract.getVotes(topic);
    return tx;
}

export async function vote(topic: Topic, option: Options): Promise<ethers.ContractTransactionResponse> {
    const contract = await getContractSigner();
    const tx = await contract.vote(topic, option);
    return tx;
}