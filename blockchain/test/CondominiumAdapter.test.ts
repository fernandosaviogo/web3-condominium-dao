import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"; 
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { CondominiumAdapter } from "../typechain-types";

describe("CondominiumAdapter", function () {

  enum Status {
    IDLE = 0, // ocioso
    VOTING = 1, // em votação
    APPROVED = 2, // aprovado
    DENIED = 3, // negado
    DELETED = 4, // deletado
    SPENT= 5 // gasto
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
  async function addResidents(adapter: CondominiumAdapter, count: number, accounts: SignerWithAddress[]) {
    for(let i=1; i <= count; i++) {
      const residenceId = (1000 * Math.ceil(i / 25)) + (100 * Math.ceil(i / 5)) + (i - (5 * Math.floor((i-1) / 5)));
      await adapter.addResident(accounts[i-1].address, residenceId);

      const instance = adapter.connect(accounts[i-1]);
      await instance.payQuota(residenceId, { value: ethers.parseEther("0.01") });
    }
  }

  // função para adicionar n votos
  async function addVotes(adapter: CondominiumAdapter, count: number, accounts: SignerWithAddress[], deny: boolean = false) {
    for(let i=1; i <= count; i++) {
      const instance = adapter.connect(accounts[i-1]);
      await instance.vote("Topic 1", deny ? Options.NO : Options.YES);
    }
  }

  async function deployAdapterFixture() {
    const accounts = await hre.ethers.getSigners();
    const manager = accounts[0];

    const CondominiumAdapter = await hre.ethers.getContractFactory("CondominiumAdapter");
    const adapter = await CondominiumAdapter.deploy();

    return { adapter, manager, accounts };
  }

  async function deployImplementationFixture() {
    const Condominium = await hre.ethers.getContractFactory("Condominium");
    const contract = await Condominium.deploy();

    return { contract };
  }

  it("Should upgrade", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    const implAddress = await contract.getAddress();

    await adapter.upgrade(implAddress);
    const address = await adapter.getImplAddress();


    expect(address).to.equal(implAddress);
  });

  it("Should NOT upgrade (permission)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    const instance = adapter.connect(accounts[1]);
    await expect(instance.upgrade(contract.getAddress())).to.be.revertedWith("You do not have permission");
  });

  it("Should NOT upgrade (not address)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

    await expect(adapter.upgrade(ethers.ZeroAddress)).to.be.revertedWith("Invalid address");
  });

  it("Should add resident", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    await adapter.upgrade(contract.getAddress());

    await adapter.addResident(accounts[1].address, 1301);    

    expect(await contract.isResident(accounts[1].address)).to.equal(true);
  });

  it("Should NOT add resident (not upgrade)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

    await expect(adapter.addResident(accounts[1].address, 1301)).to.be.revertedWith("You must upgrade first");
  });

  it("Should remove resident", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    await adapter.upgrade(contract.getAddress());

    await adapter.addResident(accounts[1].address, 1301);
    await adapter.removeResident(accounts[1].address);

    expect(await contract.isResident(accounts[1].address)).to.equal(false);
  });

  it("Should NOT remove resident (not upgrade)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

    await expect(adapter.removeResident(accounts[1].address)).to.be.revertedWith("You must upgrade first");
  });

  it("Should set counselor", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    await adapter.upgrade(contract.getAddress());

    await adapter.addResident(accounts[1].address, 1301);
    await adapter.setCounselor(accounts[1].address, true);

    expect(await contract.counselors(accounts[1].address)).to.equal(true);
  });

  it("Should NOT set counselor (not upgrade)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

    await expect(adapter.setCounselor(accounts[1].address, true)).to.be.revertedWith("You must upgrade first");
  });

  it("Should add topic", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    await adapter.upgrade(contract.getAddress());

    await adapter.addTopic("Topic 1", "description 1", Category.DECISION, 0, manager.address);    

    expect(await contract.topicExists("Topic 1")).to.equal(true);
  });

  it("Should NOT add topic (not upgrade)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

    await expect(adapter.addTopic("Topic 1", "description 1", Category.DECISION, 0, manager.address)).to.be.revertedWith("You must upgrade first");
  });

  it("Should edit topic", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    await adapter.upgrade(contract.getAddress());

    await adapter.addTopic("Topic 1", "description 1", Category.SPENT, 1, manager.address);  

    await adapter.editTopic("Topic 1", "new description", 2, manager.address);

    const topic = await contract.getTopic("Topic 1");

    expect(topic.description === "new description").to.equal(true);
  });

  it("Should NOT edit topic (not upgrade)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

    expect(adapter.editTopic("Topic 1", "new description", 2, manager.address)).to.be.revertedWith("You must upgrade first");
  });

  it("Should remove topic", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    await adapter.upgrade(contract.getAddress());

    await adapter.addTopic("Topic 1", "description 1", Category.DECISION, 0, manager.address);
    await adapter.removeTopic("Topic 1");

    expect(await contract.topicExists("Topic 1")).to.equal(false);
  });

  it("Should NOT remove topic (not upgrade)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

    await expect(adapter.removeTopic("Topic 1")).to.be.revertedWith("You must upgrade first");
  });

  it("Should open voting", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    await adapter.upgrade(contract.getAddress());

    await adapter.addTopic("Topic 1", "description 1", Category.DECISION, 0, manager.address);  
    await adapter.openVoting("Topic 1");
    const topic = await contract.getTopic("Topic 1");

    await expect(topic.status).to.equal(Status.VOTING);
  });

  it("Should NOT open voting (not upgrade)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

    await expect(adapter.openVoting("Topic 1")).to.be.revertedWith("You must upgrade first");
  });

  it("Should vote", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    await adapter.upgrade(contract.getAddress());

    await addResidents(adapter, 1, [accounts[1]]);

    await adapter.addTopic("Topic 1", "description 1", Category.DECISION, 0, manager.address);  
    await adapter.openVoting("Topic 1");
    
    const instance = adapter.connect(accounts[1]);
    await instance.vote("Topic 1", Options.YES);

    expect(await contract.numberOfVotes("Topic 1")).to.equal(1);
  });

  it("Should NOT vote (not upgrade)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

    await expect(adapter.vote("Topic 1", Options.YES)).to.be.revertedWith("You must upgrade first");
  });

  it("Should close voting (DECISION APPROVED)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    await adapter.upgrade(contract.getAddress());

    await addResidents(adapter, 5, accounts);

    await adapter.addTopic("Topic 1", "description 1", Category.DECISION, 0, manager.address);  
    await adapter.openVoting("Topic 1");

    await addVotes(adapter, 5, accounts);

    await expect(adapter.closeVoting("Topic 1")).to.emit(adapter, "TopicChange");
    const topic = await contract.getTopic("Topic 1");
    await expect(topic.status).to.equal(Status.APPROVED);
  });

  it("Should close voting (DECISION DENIED)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    await adapter.upgrade(contract.getAddress());

    await addResidents(adapter, 5, accounts);

    await adapter.addTopic("Topic 1", "description 1", Category.DECISION, 0, manager.address);  
    await adapter.openVoting("Topic 1");

    await addVotes(adapter, 5, accounts, true);

    await expect(adapter.closeVoting("Topic 1")).to.emit(adapter, "TopicChange");
    const topic = await contract.getTopic("Topic 1");
    await expect(topic.status).to.equal(Status.DENIED);
  });

  it("Should close voting (CHANGE_MANAGER)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    await adapter.upgrade(contract.getAddress());

    await addResidents(adapter, 15, accounts);

    await adapter.addTopic("Topic 1", "description 1", Category.CHANGE_MANAGER, 0, accounts[1].address);  
    await adapter.openVoting("Topic 1");

    await addVotes(adapter, 15, accounts);

    await expect(adapter.closeVoting("Topic 1")).to.emit(adapter, "ManagerChaged").withArgs(accounts[1].address);
  });

  it("Should close voting (CHANGE_QUOTA)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    await adapter.upgrade(contract.getAddress());

    await addResidents(adapter, 20, accounts);

    await adapter.addTopic("Topic 1", "description 1", Category.CHANGE_QUOTA, 100, manager.address);  
    await adapter.openVoting("Topic 1");

    await addVotes(adapter, 20, accounts);

    await expect(adapter.closeVoting("Topic 1")).to.emit(adapter, "QuotaChanged").withArgs(100);
  });

  it("Should NOT close voting (not upgrade)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

    await expect(adapter.closeVoting("Topic 1")).to.be.revertedWith("You must upgrade first");
  });

  it("Should NOT pay quota (not upgrade)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

    await expect(adapter.payQuota(2103, { value: ethers.parseEther("0.01") })).to.be.revertedWith("You must upgrade first");
  });

  it("Should transfer", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);

    await adapter.upgrade(contract.getAddress());

    await addResidents(adapter, 10, accounts);

    await adapter.addTopic("Topic 1", "description 1", Category.SPENT, 100, accounts[1].address);
    await adapter.openVoting("Topic 1");

    await addVotes(adapter, 10, accounts);

    await adapter.closeVoting("Topic 1");

    const balanceBefore = await ethers.provider.getBalance(contract.getAddress());
    const balanceWorkerBefore = await ethers.provider.getBalance(accounts[1].address);

    await adapter.transfer("Topic 1", 100n);

    const balanceAfter = await ethers.provider.getBalance(contract.getAddress());
    const balanceWorkerAfter = await ethers.provider.getBalance(accounts[1].address);

    const topic = await contract.getTopic("Topic 1");

    await expect(balanceAfter).to.equal(balanceBefore - 100n);
    await expect(balanceWorkerAfter).to.equal(balanceWorkerBefore + 100n);
    await expect(topic.status).to.equal(Status.SPENT);
  });

  it("Should NOT transfer (not upgrade)", async function () {
    const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

    await expect(adapter.transfer("Topic 1", 100n)).to.be.revertedWith("You must upgrade first");
  });
});