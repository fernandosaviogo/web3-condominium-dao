// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { CondominiumLib as Lib } from "./CondominiumLib.sol";

interface ICondominium {

    function addResident(address resident, uint16 resideceId) external;

    function removeResident(address resident) external;

    function setCounselor(address resident, bool isEntering) external;

    // Todo: mudar
    function addTopic(string memory title, string memory description) external;

    //Todo: editar topico

    function removeTopic(string memory title) external;

    //Todo: Set quota

    function openVoting(string memory title) external;

    function vote(string memory title, Lib.Options option) external;

    function closeVoting(string memory title) external;

    // Todo: pay quota

    // Todo: transfer   
}