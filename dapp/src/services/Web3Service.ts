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

function getProvider(): ethers.BrowserProvider {
    if(!window.ethereum) throw new Error("No MetaMask found");
    return new ethers.BrowserProvider(window.ethereum);
}

function getContract(provider?: ethers.BrowserProvider) : ethers.Contract {
    if(!provider) provider = getProvider();
    return new ethers.Contract(ADAPTER_ADDRESS, ABI, provider);
}

export type LoginResult = {
    account: string;
    profile: Profile;
};

export async function doLogin() : Promise<LoginResult> {
    const provider = getProvider();

    const accounts: string[] = await provider.send("eth_requestAccounts", []);

    if(!accounts.length) throw new Error("Wallet not found/allwed.");

    const account = accounts[0].toLowerCase();
    const contract = getContract(provider);

    const manager: string = await contract.getManager();
    const isManager = manager.toLowerCase() === account;

    const profile: Profile = isManager
        ? Profile.MANAGER
        : Profile.RESIDENT;

    /* persistência */
    localStorage.setItem("account", account);
    localStorage.setItem("profile", String(profile));

    return {
        account,
        profile,
    };
}

export function doLogout() {
    localStorage.removeItem("account");
    localStorage.removeItem("profile");
}