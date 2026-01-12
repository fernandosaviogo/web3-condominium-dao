// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library CondominiumLib {

    enum Status {
        IDLE, // ocioso
        VOTING, // em votação
        APPROVED, // aprovado
        DENIED, // negado
        SPENT // gasto
    }// 0,1,2,3

    enum Options {
        EMPTY,
        YES,
        NO,
        ABSTENTION
    }// 0,1,2,3

    enum Category {
        DECISION,
        SPENT,
        CHANGE_QUOTA,
        CHANGE_MANAGER
    }// 0,1,2,3


    struct Topic {
        string title;
        string description;
        Status status;
        uint256 createDate; // criação da votação
        uint256 startDate; // inicio da votação
        uint256 endDate; // fim da votação
        Category category;
        uint amount;
        address responsible;
    }

    struct Vote {
        address resident;
        uint16 residence;
        Options option;
        uint256 timestamp;
    }
    
}