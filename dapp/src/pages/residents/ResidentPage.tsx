import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Footer from "../../components/Footer";
import Sidebar from "../../components/Sidebar";
import SwitchInput from "../../components/SwitchInput";
import { Profile, type Resident, addResident, doLogin, getResident, isManager, isResident, setCounselor } from "../../services/Web3Service";
import Loader from "../../components/Loader";
import { type ApiResident, getApiResident, addApiResident, updateApiResident } from "../../services/ApiService";

function ResidentPage() {

    const navigate = useNavigate();

    const { wallet } = useParams();

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");
    const [resident, setResident] = useState<Resident>({} as Resident);
    const [apiResident, setApiResident] = useState<ApiResident>({} as ApiResident);

    useEffect(() => {
        if (isResident()) {
            doLogin();
            navigate("/");
        }

        if (wallet) {
            setIsLoading(true);

            const blockchainPromise = getResident(wallet)
            const backendPromise = getApiResident(wallet)
            Promise.all([blockchainPromise, backendPromise])
                .then(results => {
                    setResident(results[0])
                    setApiResident(results[1])
                })
                .catch(err => {
                    setMessage(err.message);
                    setIsLoading(false);
                });
        }
    }, [wallet])

    function onResidentChange(evt: React.ChangeEvent<HTMLInputElement>) {
        setResident(prevState => ({ ...prevState, [evt.target.id]: evt.target.value }));
    }

    function onApiResidentChange(evt: React.ChangeEvent<HTMLInputElement>) {
        setApiResident(prevState => ({ ...prevState, [evt.target.id]: evt.target.value }));
    }

    function btnSaveClick() {
        if (resident) {
            setMessage("Connecting to wallet...wait...");
            if(!wallet) {
                const promiseBlockchain = addResident(resident.wallet, resident.residence);
                const promiseBackend = addApiResident({ ...apiResident, profile: Profile.RESIDENT, wallet: resident.wallet });
                Promise.all([promiseBlockchain, promiseBackend])
                    .then(results => navigate("/residents?tx=" + results[0].hash))
                    .catch(err => setMessage(err.message));
            }else {
                const profile = resident.isCounselor ? Profile.COUNSELOR : Profile.RESIDENT;
                const promises = [];
                if(apiResident.profile !== profile) {
                    promises.push(setCounselor(resident.wallet, resident.isCounselor))
                }
                
                promises.push(updateApiResident(wallet, {...apiResident, profile, wallet}));
                Promise.all(promises)
                    .then(results => navigate("/residents?tx=" + wallet))
                    .catch(err => setMessage(err.message));
            }
        }
    }

    function getNextPayment(){
        const dateMs = resident.nextPayment * 1000;
        if(!dateMs) return "Never payed";
        return new Date(dateMs).toDateString();
    }

    function getNextPaymentClass(){
        const className = "input-group input-group-outline";
        const dateMs = resident.nextPayment * 1000;
        if(!dateMs || dateMs < Date.now()) return className + "is-invalid";

        return className + "is-valid";
    }

    return (
        <>
            <Sidebar />
            <main className="main-content position-relative max-height-vh-100 h-100 border-radius-lg ">
                <div className="container-fluid py-4">
                    <div className="row">
                        <div className="col-12">
                            <div className="card my-4">
                                <div className="card-header p-0 position-relative mt-n4 mx-3 z-index-2">
                                    <div className="bg-gradient-primary shadow-primary border-radius-lg pt-4 pb-3">
                                        <h6 className="text-white text-capitalize ps-3">
                                            <i className="material-icons opacity-10 me-2">group</i>
                                            {wallet ? "Edit " : "New "} Resident
                                        </h6>
                                    </div>
                                </div>
                                <div className="card-body px-0 pb-2">
                                    {
                                        isLoading
                                            ? <Loader />
                                            : <></>
                                    }
                                    <div className="row ms-3">
                                        <div className="col-md-6 mb-3">
                                            <div className="form-group">
                                                <label htmlFor="wallet">Wallet Address</label>
                                                <div className="input-group input-group-outline">
                                                    <input className="form-control" type="text" id="wallet" value={resident.wallet || ""} placeholder="0x00..." onChange={onResidentChange} disabled={!!wallet}></input>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row ms-3">
                                        <div className="col-md-6 mb-3">
                                            <div className="form-group">
                                                <label htmlFor="residence">Residence Id: (block+apartment)</label>
                                                <div className="input-group input-group-outline">
                                                    <input className="form-control" type="number" id="residence" value={resident.residence || ""} placeholder="1101" onChange={onResidentChange} disabled={!!wallet}></input>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row ms-3">
                                        <div className="col-md-6 mb-3">
                                            <div className="form-group">
                                                <label htmlFor="name">Name:</label>
                                                <div className="input-group input-group-outline">
                                                    <input className="form-control" type="text" id="name" value={apiResident.name || ""} onChange={onApiResidentChange}></input>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row ms-3">
                                        <div className="col-md-6 mb-3">
                                            <div className="form-group">
                                                <label htmlFor="phone">Phone:</label>
                                                <div className="input-group input-group-outline">
                                                    <input className="form-control" type="tel" id="phone" value={apiResident.phone || ""} placeholder="+5551123456789" onChange={onApiResidentChange}></input>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row ms-3">
                                        <div className="col-md-6 mb-3">
                                            <div className="form-group">
                                                <label htmlFor="email">E-mail:</label>
                                                <div className="input-group input-group-outline">
                                                    <input className="form-control" type="email" id="email" value={apiResident.email || ""} placeholder="name@company.com" onChange={onApiResidentChange}></input>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {
                                        wallet
                                            ? (
                                                <div className="row ms-3">
                                                    <div className="col-md-6 mb-3">
                                                        <div className="form-group">
                                                            <label htmlFor="nextPayment">Next payment</label>
                                                            <div className={getNextPaymentClass()}>
                                                                <input className="form-control" type="text" id="nextPayment" value={getNextPayment()} disabled={true}></input>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                            : <></>
                                    }
                                    {
                                        isManager() && wallet
                                            ? (
                                                <div className="row ms-3">
                                                    <div className="col-md-6 mb-3">
                                                        <div className="form-group">
                                                            <SwitchInput id="isCounselor" isChecked={resident.isCounselor} text="Is Counselor?" onChange={onResidentChange} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                            : <></>
                                    }

                                    <div className="row- ms-3">
                                        <div className="col-md-12 mb-3">
                                            <button className="btn bg-gradient-dark me-2" onClick={btnSaveClick}>
                                                <i className="material-icons opacity-10 me-2">save</i>
                                                Save Resident
                                            </button>
                                            <span className="text-danger">
                                                {message}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Footer />
                </div>
            </main>
        </>
    )

}

export default ResidentPage;