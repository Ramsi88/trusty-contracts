const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { mine } = require("@nomicfoundation/hardhat-network-helpers");
const { loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const accounts = {
    owner: "",
    otherOwner: "",
    otherOwner1: "",
    otherOwner2: "",
    otherAccount: "",
    randomAccount: "",
    other: "",
    anonymous: "",
    erc20contract: "",
    recovery: ""
}
let Factory = null;
let FactoryAdvanced = null;
let Trusty = null;
let Simple = null;
let Advanced = null;
let Recovery = null;
let Erc20 = null;

const ethDecimals = 10**18;
const trustyPrice = ethers.parseEther("0.01");

const BLOCKLOCK = 28800;

describe("Trusty DEPLOY tests", async () => {
    // Create various accounts signers for testing purpose
    const istantiateAccounts = async () => {
        const addresses = await hre.ethers.getSigners();  

        accounts.owner = addresses[0]
        
        accounts.otherOwner = addresses[2]
        accounts.otherOwner1 = addresses[3]
        accounts.otherOwner2 = addresses[4]
        accounts.otherAccount = addresses[1]
        accounts.randomAccount = addresses[5]
        accounts.other = addresses[6]
        accounts.anonymous = addresses[7]
        accounts.erc20contract = addresses[8]
        accounts.recovery = addresses[8]
    }

    // Handle the Trusty Multisignature Factory deploy for each test that needs an istance to run and fill the necessary accounts signers
    const deployFactory = async () => {
        istantiateAccounts()
        const MusigFactory = await ethers.getContractFactory("TrustyFactory");
        const musigFactory = await MusigFactory.deploy({ value: 0 });
        Factory = musigFactory
    }

    const deployFactoryAdvanced = async () => {
        istantiateAccounts()
        const MusigFactory = await ethers.getContractFactory("TrustyFactoryAdvanced");
        const musigFactory = await MusigFactory.deploy({ value: 0 });
        FactoryAdvanced = musigFactory
    }

    // Handle the Trusty Multisignature single deploy for each test that needs an istance to run and fill the necessary accounts signers
    const deployTrustySingle = async (owners, threshold = 2,id="") => {
        const Musig = await ethers.getContractFactory("Trusty");
        const musig = await Musig.deploy(owners, threshold, id,/*  whitelist, recovery, BLOCKLOCK, */ { value: 0 });
        Trusty = musig
    }

    const deployTrustySimple = async (owners, threshold = 2, id="") => {
        //const Musig = await ethers.getContractFactory("TrustySimple");
        //const musig = await Musig.deploy(owners, threshold, id, { value: 0 });
        //Simple = musig
    }

    const deployTrustyAdvanced = async (owners, threshold = 2,id="",whitelist=[], recovery) => {
        const Musig = await ethers.getContractFactory("TrustyAdvanced");
        const musig = await Musig.deploy(owners, threshold, id, whitelist, recovery, BLOCKLOCK, { value: 0 });
        Advanced = musig
    }

    // Handle the Trusty Multisignature Factory deploy for each test that needs an istance to run and fill the necessary accounts signers
    const deployRecovery = async (owners, threshold = 2, id="") => {    
        const MusigRecovery = await ethers.getContractFactory("Recovery");
        const musigRecovery = await MusigRecovery.deploy(owners, threshold, id, { value: 0 });
        Recovery = musigRecovery
    }

    // Handle the Deploy of an ERC20 Token for testing purpose
    const deployErc20 = async () => {
        const Erc20Contract = await ethers.getContractFactory("ERC20");
        const erc20 = await Erc20Contract.deploy();
        Erc20 = erc20
    }

    // Deploy all contracts
    async function deployment() {
        await istantiateAccounts()
        const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
        
        await deployFactory()
        await deployFactoryAdvanced()
        await deployErc20()
        await deployRecovery(owners)
        
        await deployTrustySingle(owners)
        await deployTrustySimple(owners)
        await deployTrustyAdvanced(owners, 2, "", owners, await Recovery.getAddress())

        return true
    }

    //it("Deploy tests", async () => { 
        it("Deploy all test", async () => {
            const result = await loadFixture(deployment);
            expect(result).to.be.equal(true)

            expect(await Erc20.getAddress() !== null)
            expect(await Recovery.getAddress() !== null)
            expect(await Factory.getAddress() !== null)
            expect(await FactoryAdvanced.getAddress() !== null)
            expect(await Trusty.getAddress() !== null)
            //expect(await Simple.getAddress() !== null)
            expect(await Advanced.getAddress() !== null)

            const checkRecoveryOwner = await Recovery.getOwners()
            const checkTrustyOwner = await Trusty.getOwners()
            //const checkTrustySimpleOwner = await Simple.getOwners()
            const checkTrustyAdvancedOwner = await Advanced.getOwners()

            const factoryOwner = await Factory.whitelistedAddresses(accounts.owner.address)
            const factoryAdvancedOwner = await FactoryAdvanced.whitelistedAddresses(accounts.owner.address)
            
            expect(factoryOwner).to.be.equal(true)
            expect(factoryAdvancedOwner).to.be.equal(true)

            expect(checkRecoveryOwner[0]).to.be.equal(accounts.owner.address)
            expect(checkRecoveryOwner[1]).to.be.equal(accounts.randomAccount.address)
            expect(checkRecoveryOwner[2]).to.be.equal(accounts.other.address)

            expect(checkTrustyOwner[0]).to.be.equal(accounts.owner.address)
            expect(checkTrustyOwner[1]).to.be.equal(accounts.randomAccount.address)
            expect(checkTrustyOwner[2]).to.be.equal(accounts.other.address)

            //expect(checkTrustySimpleOwner[0]).to.be.equal(accounts.owner.address)
            //expect(checkTrustySimpleOwner[1]).to.be.equal(accounts.randomAccount.address)
            //expect(checkTrustySimpleOwner[2]).to.be.equal(accounts.other.address)

            expect(checkTrustyAdvancedOwner[0]).to.be.equal(accounts.owner.address)
            expect(checkTrustyAdvancedOwner[1]).to.be.equal(accounts.randomAccount.address)
            expect(checkTrustyAdvancedOwner[2]).to.be.equal(accounts.other.address)
        })
    //});
})
