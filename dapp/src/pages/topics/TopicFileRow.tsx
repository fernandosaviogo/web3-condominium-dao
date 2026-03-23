import { isManager, Status } from "../../services/Web3Service";
import { keccak256, toUtf8Bytes } from "ethers";

type Props = {
    filename: string;
    topicTitle: string;
    status?: Status;
    onDelete: (title: string) => void;
}

/**
 * props:
 * - filename
 * - topicTitle
 * - status?
 * - onDelete
 */
function TopicFileRow(props: Props) {

    function btnDeleteClick() {
        if (window.confirm("Are you sure to delete this file?"))
            props.onDelete(props.filename);
    }

    function getTopicFileUrl() {
        const hash = keccak256(toUtf8Bytes(props.topicTitle));
        return `${import.meta.env.VITE_API_URL}/topicfiles/${hash}/${props.filename}?token=${localStorage.getItem("token")}`;
    }

    return (
        <tr>
            <td>
                <a href={getTopicFileUrl()} target="_blznk" className="ms-3">{props.filename}</a>
            </td>
            <td>
                <a href={getTopicFileUrl()} target="_blznk" className="btn btn-success btn-sm me-1 mb-0">
                    <i className="material-icons text-sm">cloud_download</i>
                </a>
                {
                    isManager() && (props.status === Status.IDLE)
                        ? (
                            <a href="#" className="btn btn-danger btn-sm me-1 mb-0" onClick={btnDeleteClick}>
                                <i className="material-icons text-sm">delete</i>
                            </a>
                        )
                        : <></>
                }

            </td>
        </tr>
    )
}

export default TopicFileRow;