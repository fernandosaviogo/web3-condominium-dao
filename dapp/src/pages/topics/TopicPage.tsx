import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Footer from "../../components/Footer";
import Sidebar from "../../components/Sidebar";
import { Category, Status, addTopic, editTopic, getTopic, isManager, type Topic, } from "../../services/Web3Service";
import Loader from "../../components/Loader";
import TopicCategory from "../../components/TopicCategory";
import TopicFiles from "./TopicFiles";

function TopicPage() {

    const navigate = useNavigate();

    const { title } = useParams();

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");
    const [topic, setTopic] = useState<Topic>({} as Topic);

    useEffect(() => {
        if (title) {
            setIsLoading(true);

            getTopic(title)
                .then(topic => {
                    setTopic(topic)
                    setIsLoading(false);
                })
                .catch(err => {
                    setMessage(err.message);
                    setIsLoading(false);
                });
        }
        else
            topic.responsible = localStorage.getItem("account") || "";
    }, [title])

    function onTopicChange(evt: React.ChangeEvent<HTMLInputElement>) {
        setTopic(prevState => ({ ...prevState, [evt.target.id]: evt.target.value }));
    }

    function btnSaveClick() {
        if (topic) {
            setMessage("Connecting to wallet...wait...");
            if (!title) {
                addTopic(topic)
                    .then(results => navigate("/topics?tx=" + results.hash))
                    .catch(err => setMessage(err.message));
            } else {
                editTopic(title, topic.description, topic.amount, topic.responsible)
                    .then(tx => navigate("/topics?tx=" + tx.hash))
                    .catch(err => setMessage(err.message));
            }
        }
    }

    function getDate(timesTemp: number) {
        const dateMs = timesTemp * 1000;
        if (!dateMs) return "";
        return new Date(dateMs).toDateString();
    }

    function getAmount(): string {
        return topic.amount ? topic.amount.toString() : "0";
    }

    function getStatus(): string {
        switch (topic.status) {
            case Status.APPROVED: return "APPROVED";
            case Status.DELETED: return "DELETED";
            case Status.DENIED: return "DENIED";
            case Status.SPENT: return "SPENT";
            case Status.VOTING: return "VOTING";
            default: return "IDLE";
        }
    }

    function showResponsible(): boolean {
        const category = parseInt(`${topic.category}`);
        return [Category.SPENT, Category.CHANGE_MANAGER].includes(category);
    }

    function showAmount(): boolean {
        const category = parseInt(`${topic.category}`);
        return [Category.SPENT, Category.CHANGE_MANAGER].includes(category);
    }

    function isClosed(): boolean {
        const status = parseInt(`${topic.status || 0}`);
        return [Status.APPROVED, Status.DENIED, Status.DELETED, Status.SPENT].includes(status);
    }

    function IsDisable() {
        return !!title && (topic.status !== Status.IDLE || !isManager());
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
                                            <i className="material-icons opacity-10 me-2">interests</i>
                                            {title ? "Edit " : "New "} Topic
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
                                                <label htmlFor="title">Title</label>
                                                <div className="input-group input-group-outline">
                                                    <input className="form-control" type="text" id="title" value={topic.title || ""} placeholder="Would be great..." onChange={onTopicChange} disabled={!!title}></input>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row ms-3">
                                        <div className="col-md-6 mb-3">
                                            <div className="form-group">
                                                <label htmlFor="Description">Description: </label>
                                                <div className="input-group input-group-outline">
                                                    <input className="form-control" type="text" id="Description" value={topic.description || ""} placeholder="..." onChange={onTopicChange} disabled={IsDisable()}></input>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {
                                        title
                                            ? (
                                                <div className="row ms-3">
                                                    <div className="col-md-6 mb-3">
                                                        <div className="form-group">
                                                            <label htmlFor="status">Status: </label>
                                                            <div className="input-group input-group-outline">
                                                                <input className="form-control" type="text" id="status" value={getStatus()} disabled={true} ></input>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                            : <></>
                                    }

                                    <div className="row ms-3">
                                        <div className="col-md-6 mb-3">
                                            <div className="form-group">
                                                <label htmlFor="category">Category:</label>
                                                <div className="input-group input-group-outline">
                                                    <TopicCategory value={topic.category} onChange={onTopicChange} disable={!!title} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {
                                        showResponsible()
                                            ? (
                                                <div className="row ms-3">
                                                    <div className="col-md-6 mb-3">
                                                        <div className="form-group">
                                                            <label htmlFor="responsible">Responsible:</label>
                                                            <div className="input-group input-group-outline">
                                                                <input className="form-control" type="text" id="responsible" value={topic.responsible || ""} placeholder="0x00..." onChange={onTopicChange} disabled={IsDisable()}></input>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                            : <></>
                                    }
                                    {
                                        showAmount()
                                            ? (
                                                <div className="row ms-3">
                                                    <div className="col-md-6 mb-3">
                                                        <div className="form-group">
                                                            <label htmlFor="amount">Amount (wei): </label>
                                                            <div className="input-group input-group-outline">
                                                                <input className="form-control" type="number" id="amount" value={getAmount()} placeholder="0" onChange={onTopicChange} disabled={IsDisable()}></input>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                            : <></>
                                    }
                                    {
                                        title
                                            ? (
                                                <div className="row ms-3">
                                                    <div className="col-md-6 mb-3">
                                                        <div className="form-group">
                                                            <label htmlFor="createdDate">Created Date: </label>
                                                            <div className="input-group input-group-outline">
                                                                <input className="form-control" type="text" id="createdDate" value={getDate(topic.createdDate || 0)} disabled={true}></input>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                            : <></>
                                    }
                                    {
                                        isClosed() || topic.status === Status.VOTING
                                            ? (
                                                <div className="row ms-3">
                                                    <div className="col-md-6 mb-3">
                                                        <div className="form-group">
                                                            <label htmlFor="startDate">Start Date: </label>
                                                            <div className="input-group input-group-outline">
                                                                <input className="form-control" type="text" id="startDate" value={getDate(topic.StartDate || 0)} disabled={true}></input>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                            : <></>
                                    }
                                    {
                                        isClosed()
                                            ? (
                                                <div className="row ms-3">
                                                    <div className="col-md-6 mb-3">
                                                        <div className="form-group">
                                                            <label htmlFor="endDate">End Date: </label>
                                                            <div className="input-group input-group-outline">
                                                                <input className="form-control" type="text" id="endDate" value={getDate(topic.endDate || 0)} disabled={true}></input>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                            : <></>
                                    }
                                    {
                                        !title || (isManager() && topic.status === Status.IDLE)
                                            ? (
                                                <div className="row- ms-3">
                                                    <div className="col-md-12 mb-3">
                                                        <button className="btn bg-gradient-dark me-2" onClick={btnSaveClick}>
                                                            <i className="material-icons opacity-10 me-2">save</i>
                                                            Save Topic
                                                        </button>
                                                        <span className="text-danger">
                                                            {message}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                            : <></>
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                    {
                        title
                        ? <TopicFiles title={title} status={topic.status} />
                        : <></>
                    }
                    <Footer />
                </div>
            </main>
        </>
    )

}

export default TopicPage;