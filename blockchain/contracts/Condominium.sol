// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "./ICondominium.sol";
import { CondominiumLib as Lib } from "./CondominiumLib.sol";

contract Condominium is ICondominium {

    /* Lista de eventos para o frontend */ 
    event TopicCreated(bytes32 id, string title);
    event VoteCast(bytes32 id, address voter, Lib.Options option);
    event QuotaPaid(uint16 residence, uint amount);
    event TransferExecuted(address to, uint amount);

    address public manager;  // Ownable
    uint public monthlyQuota = 0.01 ether; // Mensalidade do condominio

    mapping (uint16 => bool) public residences; // unidades => true
    Lib.Resident[] public residents;
    mapping (address => uint) private _residentIndex; // Wallet => array index

    mapping(address => bool) public counselors; // conselheiro => true

    mapping (uint16 => uint) private _nextPayment; // Unidade/apartamento => proximo pagamento (timestamp em segundos)

    Lib.Topic[] public topics;
    mapping (bytes32 => uint) private _topicIndex; // topic hash => array index

    mapping (bytes32 => Lib.Vote[]) private _votings;

    uint private constant _thirtyDays = 30 * 24 * 60 * 60;

    constructor() {
        manager = msg.sender;

        for(uint16 i=1; i <= 2; i++) { // Os blocos
            for(uint16 j=1; j <= 5; j++) { // OS andares
                for(uint16 k=1; k <= 5; k++) { // As unidades
                    residences[(i * 1000) + (j * 100) + k] = true;
                }
            }
        }
    }

    modifier onlyManager() {
        require(msg.sender == manager, "Only the manager can do this");
        _;
    }

    modifier onlyCouncil() {
        require(msg.sender == manager || _isCounselor(msg.sender), "Only the manager or the council can do this");
        _;
    }
    
    modifier onlyResidents() {
        require(isResident(msg.sender), "Only the manager or the residents can do this");

        Lib.Resident memory resident = _getResident(msg.sender);
        if(resident.nextPayment > 0) {
            require(block.timestamp <= resident.nextPayment, "Resident is overdue");
        }
        _;
    }

    // Faz a validação direto no parametro da função
    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
    }

    // RESIDENTS FUNCTIONS
    function residenceExists(uint16 residenceId) public view returns (bool) {
        return residences[residenceId];
    }

    function isResident(address resident) public view returns (bool) {
        return _getResident(resident).residence > 0;
    }

    function addResident(address resident, uint16 residenceId) external onlyCouncil validAddress(resident) { // resideceId ex: 1101
        require(residenceExists(residenceId), "This residence does not exists");
        require(!isResident(resident), "Already a resident");

        residents.push(Lib.Resident({
            wallet: resident,
            residence: residenceId,
            isCounselor: false,
            isManager: resident == manager,
            nextPayment: 0
        }));

        _residentIndex[resident] = residents.length - 1;
    }

    function removeResident(address resident) external onlyManager {
        require(!_isCounselor(resident), "A counselor cannot be removed");
        require(isResident(resident), "Not a resident");
        uint index = _residentIndex[resident];

        if(index == 0)
            require(residents[index].wallet == resident, "The resident does not exists");

        if(index != residents.length - 1) {
            Lib.Resident memory latest = residents[residents.length - 1];
            residents[index] = latest;
            _residentIndex[latest.wallet] = index;
        }

        residents.pop();
        delete _residentIndex[resident];        
    }

    function _getResident(address resident) private view returns (Lib.Resident memory) {
        uint index = _residentIndex[resident];
        if(index < residents.length) {
            Lib.Resident memory result = residents[index];
            if(result.wallet == resident) {
                result.nextPayment = _nextPayment[result.residence];
                return result;
            }
        }

        return Lib.Resident({
            wallet: address(0),
            residence: 0,
            isCounselor: false,
            isManager: false,
            nextPayment: 0
        });
    }

    function getResident(address resident) external view returns (Lib.Resident memory) {
        return _getResident(resident);
    }

    function getResidents(uint page, uint pageSize) external view returns (Lib.ResidentPage memory) {
        Lib.Resident[] memory result = new Lib.Resident[](pageSize);
        uint skip = ((page - 1) * pageSize);
        uint index = 0;

        for(uint i = skip; i < (skip + pageSize) && i < residents.length; i++) {
            result[index++] = _getResident(residents[i].wallet);
        }

        return Lib.ResidentPage({residents: result, total: residents.length});
    }

    // COUNSELOR FUNCTIONS
    function _isCounselor(address resident) private view returns (bool) {
        return counselors[resident];
    }

    function _addCounselor(address counselor) private onlyManager validAddress(counselor) {
        require(isResident(counselor), "The counselor must be a resident");
        require(!counselors[counselor], "Already counselor");

        counselors[counselor] = true;

        residents[_residentIndex[counselor]].isCounselor = true;
    }

    function _removeCounselor(address counselor) private onlyManager validAddress(counselor) {
        require(counselors[counselor], "Not a counselor");

        counselors[counselor] = false;

        residents[_residentIndex[counselor]].isCounselor = false;
    }

    function setCounselor(address resident, bool isEntering) external onlyManager{
        if(isEntering) {
            _addCounselor(resident);
        }
        else {
            _removeCounselor(resident);
        }
    }

    // TOPIC FUNCTIONS
    function getTopic(string memory title) external view returns (Lib.Topic memory) {
        return _getTopic(title);
    }

    function _getTopic(string memory title) private view returns(Lib.Topic memory) {
        bytes32 topicId = keccak256(bytes(title));
        uint index = _topicIndex[topicId];

        if(index < topics.length) {
            Lib.Topic memory result = topics[index];
            if(index < topics.length && keccak256(bytes(result.title)) == topicId)
                return result;
        }

        return Lib.Topic({
            title: "",
            description: "",
            status: Lib.Status.DELETED,
            createDate: 0,
            startDate: 0,
            endDate: 0,
            responsible: address(0),
            amount: 0,
            category: Lib.Category.DECISION
        });
    }

    function topicExists(string memory title) public view returns (bool) {
        return _getTopic(title).createDate > 0;
    }

    function addTopic(string memory title, string memory description, Lib.Category category, uint amount, address responsible) external onlyResidents {
        require(!topicExists(title), "This topic already exists");
        if(amount > 0) {
            require(category == Lib.Category.CHANGE_QUOTA || category == Lib.Category.SPENT, "Wrong category");
        }

        Lib.Topic memory newTopic = Lib.Topic ({
            title: title,
            description: description,
            createDate: block.timestamp,
            startDate: 0,
            endDate: 0,
            status: Lib.Status.IDLE,
            category: category,
            amount: amount,
            responsible: responsible != address(0) ? responsible : msg.sender
        });

        _topicIndex[keccak256(bytes(title))] = topics.length;
        topics.push(newTopic);
        emit TopicCreated(keccak256(bytes(title)), title);
    }

    function removeTopic(string memory title) external onlyManager returns (Lib.TopicUpdate memory){
        Lib.Topic memory topic = _getTopic(title);  // Tras o topico para memoria para ser trabalhado
        require(topic.createDate > 0, "The topic does not exists");
        require(topic.status == Lib.Status.IDLE, "Only IDLE topics can be removed");

        bytes32 topicId = keccak256(bytes(title));
        uint index = _topicIndex[topicId];

        if(index != topics.length - 1) {
            Lib.Topic memory latest = topics[topics.length - 1];
            topics[index] = latest;
            _topicIndex[keccak256(bytes(latest.title))] = index;
        }

        topics.pop();
        delete _topicIndex[topicId];

        return Lib.TopicUpdate({
            id: topicId,
            title: topic.title,
            category: topic.category,
            status: Lib.Status.DELETED
        });
    }

    function editTopic(string memory topicToEdit, string memory description, uint amount, address responsible) external onlyManager returns (Lib.TopicUpdate memory) {
        Lib.Topic memory topic = _getTopic(topicToEdit);
        require(topic.createDate > 0, "This topic does not exist");
        require(topic.status == Lib.Status.IDLE, "Only IDLE topics can be edited");

        bytes32 topicId = keccak256(bytes(topicToEdit));
        uint index = _topicIndex[topicId];

        // Verifica qual doi editado e grava na blockchain apenas ele
        if(bytes(description).length > 0)
            topics[index].description = description;
        
        if(amount > 0)
            topics[index].amount = amount;

        if(responsible != address(0))
            topics[index].responsible = responsible;

        return Lib.TopicUpdate ({
            id: topicId,
            title: topic.title,
            category: topic.category,
            status: topic.status
        });
    }

    function getTopics(uint page, uint pageSize) external view returns (Lib.TopicPage memory) {
        Lib.Topic[] memory result = new Lib.Topic[](pageSize);
        uint skip = ((page - 1) * pageSize);
        uint index = 0;

        for(uint i = skip; i < (skip + pageSize) && i < topics.length; i++) {
            result[index++] = topics[i];
        }

        return Lib.TopicPage({topics: result, total: topics.length});
    }

    // VOTING FUNCTIONS
    function openVoting(string memory title) external onlyManager returns (Lib.TopicUpdate memory){
        Lib.Topic memory topic = _getTopic(title); // Tras o topico para memoria para ser trabalhado
        require(topic.createDate > 0, "The topic does not exists");
        require(topic.status == Lib.Status.IDLE, "Only IDLE topics can be open for voting");

        bytes32 topicId = keccak256(bytes(title));
        uint index = _topicIndex[topicId];

        topics[index].status = Lib.Status.VOTING;
        topics[index].startDate = block.timestamp;

        return Lib.TopicUpdate({
            id: topicId,
            title: topic.title,
            status: Lib.Status.VOTING,
            category: topic.category
        });
    }

    function vote(string memory title, Lib.Options option) external onlyResidents {
        require(option != Lib.Options.EMPTY, "The option cannot be EMPTY");

        Lib.Topic memory topic = _getTopic(title); // Tras o topico para memoria para ser trabalhado
        require(topic.createDate > 0, "The topic does not exists");
        require(topic.status == Lib.Status.VOTING, "Only VOTING topics can be voted");
        
        uint16 residence = residents[_residentIndex[msg.sender]].residence;
        bytes32 topicId = keccak256(bytes(title));

        Lib.Vote[] storage votes = _votings[topicId];

        for(uint i=0; i < votes.length; i++){
            require(votes[i].residence != residence, "The residence should vote only once");
        }

        Lib.Vote memory newVote = Lib.Vote ({
            residence: residence,
            resident: msg.sender,
            option: option,
            timestamp: uint64(block.timestamp)
        });

        _votings[topicId].push(newVote);
        emit VoteCast(topicId, msg.sender, option);
    }       

    function closeVoting(string memory title) external onlyManager returns (Lib.TopicUpdate memory) {
        Lib.Topic memory topic = _getTopic(title); // Tras o topico para memoria para ser trabalhado
        require(topic.createDate > 0, "The topic does not exists");
        require(topic.status == Lib.Status.VOTING, "Only VOTING topics can be closed");

        uint8 minimumVotes = 5;

        // Estipula o numero minimo de votos para cada categoria
        if(topic.category == Lib.Category.SPENT) {
            minimumVotes = 10;
        }
        else if(topic.category == Lib.Category.CHANGE_MANAGER) { 
            minimumVotes = 15;
        }
        else if(topic.category == Lib.Category.CHANGE_QUOTA) {
            minimumVotes = 20;
        }

        require(numberOfVotes(title) >= minimumVotes, "You cannot finish a voting without the minimum votes");

        uint8 approved = 0;
        uint8 denied = 0;
        uint8 abstentions = 0;
        bytes32 topicId = keccak256(bytes(title));
        Lib.Vote[] storage votes = _votings[topicId];
        
        for (uint8 i=0; i < votes.length; i++) {
            if(votes[i].option == Lib.Options.YES)
                approved++;
            else if(votes[i].option == Lib.Options.NO)
                denied++;
            else
                abstentions++;
        }

        // Verifica se a votação foi aprovada ou não
        Lib.Status newStatus = approved > denied
            ? Lib.Status.APPROVED
            : Lib.Status.DENIED;

        uint index = _topicIndex[topicId];
        topics[index].status = newStatus;
        topics[index].endDate = block.timestamp;

        if(newStatus == Lib.Status.APPROVED) {
            if(topic.category == Lib.Category.CHANGE_QUOTA) {
                monthlyQuota = topic.amount;
            }
            else if(topic.category == Lib.Category.CHANGE_MANAGER) {
                if(isResident(manager))
                    residents[_residentIndex[manager]].isManager = false;

                manager = topic.responsible;

                if(isResident(topic.responsible))
                    residents[_residentIndex[topic.responsible]].isManager = true;
            }
        }

        return Lib.TopicUpdate ({
            id: topicId,
            title: topic.title,
            category: topic.category,
            status: newStatus
        });
    }

    function numberOfVotes(string memory title) public view returns(uint256) {
        bytes32 topicId = keccak256(bytes(title));
        return _votings[topicId].length;
    }

    function getVotes(string memory topicTitle) external view returns (Lib.Vote[] memory) {
        return _votings[keccak256(bytes(topicTitle))];
    }

    //PAYMENT FUNCTIONS
    function payQuota(uint16 residenceId) external payable {
        require(residenceExists(residenceId), "The resident does not exists");
        require(msg.value >= monthlyQuota, "Wrong value");
        require(block.timestamp > _nextPayment[residenceId], "You cannot pay twice a month");
        
        if(_nextPayment[residenceId] == 0)
            _nextPayment[residenceId] = block.timestamp + _thirtyDays;
        else
            _nextPayment[residenceId] += _thirtyDays;
        
        emit QuotaPaid(residenceId, msg.value);
    }

    function transfer(string memory topicTitle, uint amount) external onlyManager returns (Lib.TransferReceipt memory) {
        require(address(this).balance >= amount, "Insufficient funds");  // O "address(this)" pega o endereço atual do contrato

        Lib.Topic memory topic = _getTopic(topicTitle);
        require(topic.status == Lib.Status.APPROVED && topic.category == Lib.Category.SPENT, "Only APPROVED SPENT topics can be used for transfers");
        require(topic.amount >= amount, "The amount must be less or equal the APPROVED topic");

        //(original) payable(topic.responsible).transfer(amount);
        (bool success, ) = payable(topic.responsible).call{value: amount}("");
        require(success, "Transfer failed");

        bytes32 topicId = keccak256(bytes(topicTitle));
        uint index = _topicIndex[topicId];
        topics[index].status = Lib.Status.SPENT;

        emit TransferExecuted(topic.responsible, amount);

        return Lib.TransferReceipt ({
            to: topic.responsible,
            amount: amount,
            topic: topicTitle
        });
    }

    function getManager() external view returns (address) {
        return manager;
    }

    function getQuota() external view returns (uint) {
        return monthlyQuota;
    }
}
