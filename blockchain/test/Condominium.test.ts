import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"; 
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Condominium } from "../typechain-types";

describe("Condominium", function () {

  enum Status {
    IDLE = 0, // ocioso
    VOTING = 1, // em votação
    APPROVED = 2, // aprovado
    DENIED = 3 // negado
  }

  enum Options {
    EMPTY = 0,
    YES = 1,
    NO = 2,
    ABSTENTION = 3
  }

  enum Category {
    DECISION = 0,
    SPENT = 1,
    CHANGE_QUOTA = 2,
    CHANGE_MANAGER = 3
  }

  // função para adicionar n moradores
  async function addResidents(contract: Condominium, count: number, accounts: SignerWithAddress[]) {
    for(let i=1; i <= count; i++) {
      const residence = (1000 * Math.ceil(i / 25)) + (100 * Math.ceil(i / 5)) + (i - (5 * Math.floor((i-1) / 5)));
      await contract.addResident(accounts[i-1].address, residence);
    }
  }
  
  // função para adicionar n votos
  async function addVotes(contract: Condominium, count: number, accounts: SignerWithAddress[], shouldApprove: boolean = true) {
    for(let i=1; i <= count; i++) {
      const instance = contract.connect(accounts[i-1]);
      await instance.vote("Topic 1", shouldApprove ? Options.YES : Options.NO);
    }
  }

  async function deployFixture() {
    const accounts = await hre.ethers.getSigners();
    const manager = accounts[0];

    const Condominium = await hre.ethers.getContractFactory("Condominium");
    const contract = await Condominium.deploy();

    return { contract, manager, accounts };
  }

  it("Should be residence", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    expect(await contract.residenceExists(2102)).to.equal(true);
  });

  it("Should add resident", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addResident(accounts[1].address, 2102);

    expect(await contract.isResident(accounts[1].address)).to.equal(true);
  });

  it("Should NOT add resident (invalid address)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await expect(contract.addResident(ethers.ZeroAddress, 2102)).to.be.revertedWith("Invalid address");
  });

  it("Should NOT add resident (permission)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);
    const instance = contract.connect(accounts[1]);    

    await expect(instance.addResident(accounts[1].address, 2102)).to.be.revertedWith("Only the manager or the council can do this");
  });

  it("Should NOT add resident (residence)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);
    await expect(contract.addResident(accounts[1].address, 20002)).to.be.revertedWith("This residence does not exists");
  });

  it("Should remove resident", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);
    
    await contract.addResident(accounts[1].address, 2102);
    await contract.removeResident(accounts[1].address);

    expect(await contract.isResident(accounts[1].address)).to.equal(false);
  });

  it("Should NOT remove resident (permission)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addResident(accounts[1].address, 2102);

    const instance = contract.connect(accounts[1]);

    await expect(instance.removeResident(accounts[1].address)).to.be.revertedWith("Only the manager can do this");
  });

  it("Should NOT remove resident (conselor)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addResident(accounts[1].address, 2102);

    await contract.setCounselor(accounts[1].address, true);

    await expect(contract.removeResident(accounts[1].address)).to.be.revertedWith("A counselor cannot be removed");
  });

  it("Should set counselor (true)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);
    
    await contract.addResident(accounts[1].address, 2102);

    await contract.setCounselor(accounts[1].address, true);

    const instance = contract.connect(accounts[1]);
    await instance.addResident(accounts[2].address, 2103);

    expect(await contract.counselors(accounts[1].address)).to.equal(true);
    expect(await contract.isResident(accounts[2].address)).to.equal(true);
  });

  it("Should set counselor (false)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);
    
    await contract.addResident(accounts[1].address, 2102);

    await contract.setCounselor(accounts[1].address, true);

    await contract.setCounselor(accounts[1].address, false);

    expect(await contract.counselors(accounts[1].address)).to.equal(false);
  });

  it("Should NOT set counselor (invalid address)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await expect(contract.setCounselor(ethers.ZeroAddress, true)).to.be.revertedWith("Invalid address");
  });

  it("Should NOT set counselor (Permission)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);
    
    await contract.addResident(accounts[1].address, 2102);

    const instance = contract.connect(accounts[1]);
    await expect(instance.setCounselor(accounts[1].address, true)).to.be.revertedWith("Only the manager can do this");
  });

  it("Should NOT set counselor (NOT resident)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await expect(contract.setCounselor(accounts[1].address, true)).to.be.revertedWith("The counselor must be a resident");
  });

  it("Should change manager", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await addResidents(contract, 15, accounts);

    await contract.addTopic("Topic 1", "Description 1", Category.CHANGE_MANAGER, 0, accounts[1].address);
    await contract.openVoting("Topic 1");

    await addVotes(contract, 15, accounts);

    await contract.closeVoting("Topic 1");
    
    expect(await contract.manager()).to.equal(accounts[1].address);
  });

  it("Should chage quota", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await addResidents(contract, 20, accounts);

    const value = ethers.parseEther("0.02");

    await contract.addTopic("Topic 1", "Description 1", Category.CHANGE_QUOTA, value, manager.address);
    await contract.openVoting("Topic 1");

    await addVotes(contract, 20, accounts);

    await contract.closeVoting("Topic 1");
    
    expect(await contract.monthlyQuota()).to.equal(value);
  });
  
  it("Should add topic (manager)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addTopic("Topic 1", "Descripition 1", Category.DECISION, 0, manager.address);

    expect(await contract.topicExists("Topic 1")).to.equal(true);
  });

  it("Should edit topic", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addTopic("Topic 1", "Descripition 1", Category.SPENT, 1, manager.address);

    await contract.editTopic("Topic 1", "New description", 2, manager.address);

    const topic = await contract.getTopic("Topic 1")

    expect(topic.description === "New description").to.equal(true);
  });

  it("Should edit topic (nothing)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addTopic("Topic 1", "Descripition 1", Category.SPENT, 1, manager.address);

    await contract.editTopic("Topic 1", "", 0, ethers.ZeroAddress);

    const topic = await contract.getTopic("Topic 1")

    expect(topic.description).to.equal("Descripition 1");
  });

  it("Should NOT edit topic (permission)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addTopic("Topic 1", "Descripition 1", Category.SPENT, 1, manager.address);

    const instance = contract.connect(accounts[1]);

    await expect(instance.editTopic("Topic 1", "New description", 2, manager.address)).to.be.revertedWith("Only the manager can do this");
  });

  it("Should NOT edit topic (not exist)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await expect(contract.editTopic("Topic 1", "New description", 2, manager.address)).to.be.revertedWith("This topic does not exist");
  });

  it("Should NOT edit topic (status)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addTopic("Topic 1", "Descripition 1", Category.SPENT, 1, manager.address);

    await contract.openVoting("Topic 1");

    await expect(contract.editTopic("Topic 1", "New description", 2, manager.address)).to.be.revertedWith("Only IDLE topics can be edited");
  });

  it("Should NOT add topic (amount)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await expect(contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 10, manager.address)).to.be.revertedWith("Wrong category");
  });

  it("Should add topic (resident)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addResident(accounts[1].address, 2102);

    const instance = contract.connect(accounts[1]);

    await instance.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);

    expect(await contract.topicExists("Topic 1")).to.equal(true);
  });

  it("Should NOT add topic (permission)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    const instance = contract.connect(accounts[1]);

    await expect(instance.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address)).to.be.revertedWith("Only the manager or the residents can do this");
  });

  it("Should NOT add topic (topic already exists)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);

    await expect(contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address)).to.be.revertedWith("This topic already exists");
  });

  it("Should remove topic (manager)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);

    await contract.removeTopic("Topic 1");

    expect(await contract.topicExists("Topic 1")).to.equal(false);
  });

  it("Should NOT remove topic (permission)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);

    const instance = contract.connect(accounts[1]);

    await expect(instance.removeTopic("Topic 1")).to.be.revertedWith("Only the manager can do this");
  });

  it("Should NOT remove topic (not exists)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await expect(contract.removeTopic("Topic 1")).to.be.revertedWith("The topic does not exists");
  });

  it("Should NOT remove topic (status)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);

    await contract.openVoting("Topic 1");

    await expect(contract.removeTopic("Topic 1")).to.be.revertedWith("Only IDLE topics can be removed");
  });

  it("Should vote", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addResident(accounts[1].address, 2102);
    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);
    await contract.openVoting("Topic 1");

    const instance = contract.connect(accounts[1]);
    await instance.vote("Topic 1", Options.ABSTENTION);
    
    expect(await instance.numberOfVotes("Topic 1")).to.equal(1);
  });

  it("Should NOT vote (duplicated)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addResident(accounts[1].address, 2102);
    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);
    await contract.openVoting("Topic 1");

    const instance = contract.connect(accounts[1]);
    await instance.vote("Topic 1", Options.YES);
    
    await expect(instance.vote("Topic 1", Options.YES)).to.be.revertedWith("The residence should vote only once");
  });

  it("Should NOT vote (status)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addResident(accounts[1].address, 2102);
    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);

    const instance = contract.connect(accounts[1]);
    
    await expect(instance.vote("Topic 1", Options.YES)).to.be.revertedWith("Only VOTING topics can be voted");
  });

  it("Should NOT vote (topic not exists)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addResident(accounts[1].address, 2102);

    const instance = contract.connect(accounts[1]);
    
    await expect(instance.vote("Topic 1", Options.YES)).to.be.revertedWith("The topic does not exists");
  });

  it("Should NOT vote (permission)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);
    await contract.openVoting("Topic 1");

    const instance = contract.connect(accounts[1]);
    
    await expect(instance.vote("Topic 1", Options.YES)).to.be.revertedWith("Only the manager or the residents can do this");
  });

  it("Should NOT vote (Options EMPTY)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addResident(accounts[1].address, 2102);
    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);
    await contract.openVoting("Topic 1");

    const instance = contract.connect(accounts[1]);
    
    await expect(instance.vote("Topic 1", Options.EMPTY)).to.be.revertedWith("The option cannot be EMPTY");
  });

  it("Should close voting", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await addResidents(contract, 6, accounts);

    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);
    await contract.openVoting("Topic 1");

    await addVotes(contract, 5, accounts, false);

    const instance = contract.connect(accounts[5]);
    await instance.vote("Topic 1", Options.ABSTENTION);

    await contract.closeVoting("Topic 1");
    const topic = await contract.getTopic("Topic 1");
    
    expect(topic.status).to.equal(Status.DENIED);
  });

  it("Should NOT close voting (permission)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addResident(accounts[1].address, 2102);
    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);
    await contract.openVoting("Topic 1");

    const instance = contract.connect(accounts[1]);
    
    await expect(instance.closeVoting("Topic 1")).to.be.revertedWith("Only the manager can do this");
  });

  it("Should NOT close voting (minimum votes)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);
    
    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);
    await contract.openVoting("Topic 1");
    
    await expect(contract.closeVoting("Topic 1")).to.be.revertedWith("You cannot finish a voting without the minimum votes");
  });

  it("Should NOT close voting (not exists)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);
        
    await expect(contract.closeVoting("Topic 1")).to.be.revertedWith("The topic does not exists");
  });

  it("Should NOT close voting (status)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);
    await expect(contract.closeVoting("Topic 1")).to.be.revertedWith("Only VOTING topics can be closed");
  });

  it("Should NOT open voting (permission)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);

    await contract.addResident(accounts[1].address, 2102);   
    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);

    const instance = contract.connect(accounts[1]);
    await expect(instance.openVoting("Topic 1")).to.be.revertedWith("Only the manager can do this");
  });

  it("Should NOT open voting (status)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);
 
    await contract.addTopic("Topic 1", "Descripyion 1", Category.DECISION, 0, manager.address);

    await contract.openVoting("Topic 1");

    await expect(contract.openVoting("Topic 1")).to.be.revertedWith("Only IDLE topics can be open for voting");
  });

  it("Should NOT open voting (exist)", async function () {
    const { contract, manager, accounts} = await loadFixture(deployFixture);
   
    await expect(contract.openVoting("Topic 1")).to.be.revertedWith("The topic does not exists");
  });
});

