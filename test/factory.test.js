const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { mine } = require("@nomicfoundation/hardhat-network-helpers");
const { loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { decodeCalldata } = require('../utils/calldata.js')

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
const trustyPrice = ethers.parseEther("0.05");

const BLOCKLOCK = 28800;

describe("Trusty FACTORY tests", async () => {
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

    describe("Factories tests", async () => { 
        it("Deploy factories test", async () => {
            const result = await loadFixture(deployment);
            expect(result).to.be.equal(true)

            expect(await Factory.getAddress() !== null)
            expect(await FactoryAdvanced.getAddress() !== null)

            const factoryOwner = await Factory.whitelistedAddresses(accounts.owner.address)
            const factoryAdvancedOwner = await FactoryAdvanced.whitelistedAddresses(accounts.owner.address)
            
            expect(factoryOwner).to.be.equal(true)
            expect(factoryAdvancedOwner).to.be.equal(true)
            expect(await Factory.numAddressesWhitelisted()).to.be.equal(1)
            expect(await FactoryAdvanced.numAddressesWhitelisted()).to.be.equal(1)
        })
        
        describe("Factory tests", async () => {
            it("Factory test", async () => {
                const result = await loadFixture(deployment);
                expect(result).to.be.equal(true)

                const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

                // WHITELIST
                await Factory.connect(accounts.owner).addToFactoryWhitelist([accounts.owner.address, accounts.anonymous.address]);

                // Should fail whitelisting from not owner
                await expect(Factory.connect(accounts.otherAccount).addToFactoryWhitelist([accounts.otherAccount.address])).to.be.revertedWith("Ownable: caller is not the owner");

                // Should fail creation from not whitelisted
                await expect(Factory.connect(accounts.otherAccount).createContract(owners, 2, "", {value: trustyPrice})).to.be.revertedWith("Not in the Factory Whitelist!");

                await Factory.connect(accounts.owner).trustyPriceEnable();

                // Should fail creation with not enough price amount
                await expect(Factory.createContract(owners, 2, "", {value: 0n})).to.be.revertedWith("Ether sent is not enough")
                
                await Factory.connect(accounts.owner).trustyPriceEnable();

                const create = await Factory.createContract(owners, 2, "", {value: trustyPrice});
                const trustyAddr = await Factory.contracts(0);

                const amount = ethers.parseEther("1");

                // Should fail submit from not owner
                await expect(Factory.connect(accounts.anonymous).trustySubmit(0, accounts.anonymous.address, amount, "0x00")).to.be.revertedWith("msg.sender not owner");
                
                // Should fail deposit from not owner
                await expect(Factory.connect(accounts.otherAccount).depositContract(0, amount, {value: amount})).to.be.revertedWith("Not in the Factory Whitelist!");

                const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
                await txDeposit.wait();

                // Should fail proposal of not whitelisted
                await expect(Factory.connect(accounts.otherAccount).trustySubmit(0, accounts.otherAccount.address, amount, "0x00")).to.be.revertedWith("Not in the Factory Whitelist!")

                const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, "0x00");
                await txSend.wait();

                // Should fail confirmation of not existing tx
                await expect(Factory.connect(accounts.randomAccount).trustyConfirm(0, 1)).to.be.revertedWith("tx does not exist")

                // Should fail confirmation of not owner
                await expect(Factory.connect(accounts.anonymous).trustyConfirm(0, 0)).to.be.revertedWith("not owner")

                const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
                await txConfirm.wait();

                // Should fail confirmation of already confirmed tx
                await expect(Factory.connect(accounts.randomAccount).trustyConfirm(0, 0)).to.be.revertedWith("tx already confirmed")

                // Should fail confirmation of not whitelisted
                await expect(Factory.connect(accounts.otherAccount).trustyConfirm(0, 0)).to.be.revertedWith("Not in the Factory Whitelist!")

                // Should fail revokation of not owner
                await expect(Factory.connect(accounts.anonymous).trustyRevoke(0, 0)).to.be.revertedWith("not owner")

                // Should fail revokation of not confirmed tx
                await expect(Factory.connect(accounts.other).trustyRevoke(0, 0)).to.be.revertedWith("tx not confirmed")

                // Should fail revokation of not existing tx
                await expect(Factory.connect(accounts.other).trustyRevoke(0, 1)).to.be.revertedWith("tx does not exist")

                // Should fail revokation of not whitelisted
                await expect(Factory.connect(accounts.otherAccount).trustyRevoke(0, 0)).to.be.revertedWith("Not in the Factory Whitelist!")

                // Should fail execution of tx without quorum
                await expect(Factory.connect(accounts.randomAccount).trustyExecute(0, 0)).to.be.revertedWith("cannot execute tx due to number of confirmation required")

                const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
                await txConfirm2.wait();

                const txConfirm3 = await Factory.connect(accounts.owner).trustyConfirm(0, 0);
                await txConfirm3.wait();

                const txRevoke = await Factory.connect(accounts.owner).trustyRevoke(0, 0);
                await txRevoke.wait();

                // Should fail execution from not whitelisted
                await expect(Factory.connect(accounts.otherAccount).trustyExecute(0, 0)).to.be.revertedWith("Not in the Factory Whitelist!")

                // Should fail revokation of not owner
                await expect(Factory.connect(accounts.anonymous).trustyExecute(0, 0)).to.be.revertedWith("not owner")

                const txExecute = await Factory.connect(accounts.owner).trustyExecute(0,0);
                await txExecute.wait();

                // Should fail execution of already executed tx
                await expect(Factory.connect(accounts.randomAccount).trustyExecute(0, 0)).to.be.revertedWith("tx already executed")

                // Should fail execution of not existing tx
                await expect(Factory.connect(accounts.randomAccount).trustyExecute(0, 1)).to.be.revertedWith("tx does not exist")

                // Should fail confirmation of already executed tx
                await expect(Factory.connect(accounts.randomAccount).trustyConfirm(0, 0)).to.be.revertedWith("tx already executed")

                // Should fail revokation of already executed tx
                await expect(Factory.connect(accounts.randomAccount).trustyRevoke(0, 0)).to.be.revertedWith("tx already executed")

                // Should fail Withdraw from not owner
                await expect(Factory.connect(accounts.randomAccount).withdraw()).to.be.revertedWith("Ownable: caller is not the owner")

                await Factory.connect(accounts.owner).withdraw() 

                await Factory.connect(accounts.owner).contractReadOwners(0)
                await Factory.connect(accounts.owner).contractReadBalance(0)
                await Factory.connect(accounts.owner).contractReadTxs(0)
                await Factory.connect(accounts.owner).imOwner(0)
                await Factory.connect(accounts.owner).getTx(0,0)

                // Should fail setting whitelist from not owner
                await expect(Factory.connect(accounts.randomAccount).setMaxWhitelist(1)).to.be.revertedWith("Ownable: caller is not the owner")

                // Should fail removimg form whitelist from not owner
                await expect(Factory.connect(accounts.randomAccount).removeFromFactoryWhitelist([accounts.owner.address])).to.be.revertedWith("Ownable: caller is not the owner")

                // Should fail self whitelisting when already whitelisted
                await expect(Factory.connect(accounts.anonymous).whitelistMe()).to.be.revertedWith("You are already whitelisted")

                await Factory.connect(accounts.owner).removeFromFactoryWhitelist([accounts.randomAccount.address])

                // Should fail whitelisting with not required amount
                await expect(accounts.randomAccount.sendTransaction({to: Factory.getAddress(), value: 0, data: "0x5a941b6e"})).to.be.revertedWith("Ether sent is not enough");

                // Whitelist Fallback
                await accounts.randomAccount.sendTransaction({to: Factory.getAddress(), value: amount, data: Buffer.from("test")})

                await Factory.connect(accounts.owner).setMaxWhitelist(1)

                // Should fail adding addresses to whitelist when limit is reached
                await expect(Factory.connect(accounts.owner).addToFactoryWhitelist([accounts.otherAccount.address])).to.be.revertedWith("Whitelist limit reached")

                // Should fail self whitelisting when limit is reached
                await expect(Factory.connect(accounts.randomAccount).whitelistMe()).to.be.revertedWith("Whitelist limit reached")

                // Should fail setting price from not owner
                await expect(Factory.connect(accounts.randomAccount).trustyPriceConfig(0)).to.be.revertedWith("Ownable: caller is not the owner")

                // Should fail disabling price from not owner
                await expect(Factory.connect(accounts.randomAccount).trustyPriceEnable()).to.be.revertedWith("Ownable: caller is not the owner")

                await Factory.connect(accounts.owner).trustyPriceConfig(1)
            })
        })

        describe("Factory Advanced tests", async () => {
            it("Factory advanced test", async () => {
                const result = await loadFixture(deployment);
                expect(result).to.be.equal(true)

                const accountRecoveryAddress = await Recovery.getAddress()

                const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

                // WHITELIST
                await FactoryAdvanced.connect(accounts.owner).addToFactoryWhitelist([accounts.owner.address, accounts.anonymous.address]);

                // Should fail whitelisting from not owner
                await expect(FactoryAdvanced.connect(accounts.otherAccount).addToFactoryWhitelist([accounts.otherAccount.address])).to.be.revertedWith("Ownable: caller is not the owner");

                // Should fail creation from not whitelisted
                await expect(FactoryAdvanced.connect(accounts.otherAccount).createContract(owners, 2, "ADVANCED", owners, accountRecoveryAddress, 0, {value: trustyPrice})).to.be.revertedWith("Not in the Factory Whitelist!");

                await FactoryAdvanced.connect(accounts.owner).trustyPriceEnable();

                // Should fail creation with not enough price amount
                await expect(FactoryAdvanced.createContract(owners, 2, "ADVANCED", owners, accountRecoveryAddress, 0, {value: 0n})).to.be.revertedWith("Ether sent is not enough")
                
                await FactoryAdvanced.connect(accounts.owner).trustyPriceEnable();

                const create = await FactoryAdvanced.createContract(owners, 2, "ADVANCED", [...owners, accounts.anonymous.address, accountRecoveryAddress], accountRecoveryAddress, 0, {value: trustyPrice});
                const trustyAddr = await FactoryAdvanced.contracts(0);

                const amount = ethers.parseEther("1");

                // Should fail submit from not owner
                await expect(FactoryAdvanced.connect(accounts.anonymous).trustySubmit(0, accounts.anonymous.address, amount, "0x00", 0)).to.be.revertedWith("msg.sender not owner");
                
                // Should fail deposit from not owner
                await expect(FactoryAdvanced.connect(accounts.otherAccount).depositContract(0, amount, {value: amount})).to.be.revertedWith("Not in the Factory Whitelist!");

                const txDeposit = await FactoryAdvanced.connect(accounts.owner).depositContract(0, amount, {value: amount});
                await txDeposit.wait();

                // Should fail proposal from address not factory whitelisted
                await expect(FactoryAdvanced.connect(accounts.otherAccount).trustySubmit(0, accounts.otherAccount.address, amount, "0x00", 0)).to.be.revertedWith("Not in the Factory Whitelist!")

                // Should fail proposal to address not trusty whitelisted
                await expect(FactoryAdvanced.connect(accounts.owner).trustySubmit(0, accounts.otherAccount.address, amount, "0x00", 0)).to.be.revertedWith("Address/Contract not in Trusty Whitelist!")

                await FactoryAdvanced.connect(accounts.owner).addToTrustyBlacklist(0, [accountRecoveryAddress])

                // Should fail proposal to address blacklisted
                await expect(FactoryAdvanced.connect(accounts.owner).trustySubmit(0, accountRecoveryAddress, amount, "0x00", 0)).to.be.revertedWith("Address is blacklisted!")

                // Should fail proposal from not owner address
                await expect(FactoryAdvanced.connect(accounts.anonymous).trustySubmit(0, accounts.anonymous.address, amount, "0x00", 0)).to.be.revertedWith("msg.sender not owner")

                // Should fail proposal if locked
                await mine(BLOCKLOCK + 155).then(async () => {
                    await expect(FactoryAdvanced.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, "0x00", 0)).to.be.revertedWith("Trusty is locked!")

                    const recoverWhitelist = await Recovery.addAddressToRecoveryWhitelist([trustyAddr]);
                    await recoverWhitelist.wait();

                    const unlock = await Recovery.submitTransaction(trustyAddr, 0, "0xa69df4b5");
                    await unlock.wait()

                    const confirmUnlock = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
                    await confirmUnlock.wait()

                    const confirmUnlock2 = await Recovery.connect(accounts.other).confirmTransaction(0);
                    await confirmUnlock2.wait()

                    const executeUnlock = await Recovery.connect(accounts.other).executeTransaction(0);
                    await executeUnlock.wait();
                })

                const txSend = await FactoryAdvanced.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, "0x00", 100);
                await txSend.wait();

                // Should fail confirmation of not whitelisted address
                await expect(FactoryAdvanced.connect(accounts.otherAccount).trustyConfirm(0, 0)).to.be.revertedWith("Not in the Factory Whitelist!")

                // Should fail confirmation of not existing tx
                await expect(FactoryAdvanced.connect(accounts.owner).trustyConfirm(0, 1)).to.be.revertedWith("tx does not exist")

                // Should fail confirmation of not owner
                await expect(FactoryAdvanced.connect(accounts.anonymous).trustyConfirm(0, 0)).to.be.revertedWith("not owner")

                const txConfirm = await FactoryAdvanced.connect(accounts.randomAccount).trustyConfirm(0, 0);
                await txConfirm.wait();

                // Should fail confirmation of already confirmed tx
                await expect(FactoryAdvanced.connect(accounts.randomAccount).trustyConfirm(0, 0)).to.be.revertedWith("tx already confirmed")

                // Should fail confirmation of not whitelisted
                await expect(FactoryAdvanced.connect(accounts.otherAccount).trustyConfirm(0, 0)).to.be.revertedWith("Not in the Factory Whitelist!")

                // Should fail revokation of not owner
                await expect(FactoryAdvanced.connect(accounts.anonymous).trustyRevoke(0, 0)).to.be.revertedWith("not owner")

                // Should fail revokation of not confirmed tx
                await expect(FactoryAdvanced.connect(accounts.other).trustyRevoke(0, 0)).to.be.revertedWith("tx not confirmed")

                // Should fail revokation of not existing tx
                await expect(FactoryAdvanced.connect(accounts.other).trustyRevoke(0, 1)).to.be.revertedWith("tx does not exist")

                // Should fail revokation of not whitelisted
                await expect(FactoryAdvanced.connect(accounts.otherAccount).trustyRevoke(0, 0)).to.be.revertedWith("Not in the Factory Whitelist!")

                // Should fail execution of tx from not whitelisted
                await expect(FactoryAdvanced.connect(accounts.otherAccount).trustyExecute(0, 0)).to.be.revertedWith("Not in the Factory Whitelist!")

                // Should fail execution of tx without quorum
                await expect(FactoryAdvanced.connect(accounts.randomAccount).trustyExecute(0, 0)).to.be.revertedWith("cannot execute tx due to number of confirmation required")

                const txConfirm2 = await FactoryAdvanced.connect(accounts.other).trustyConfirm(0, 0);
                await txConfirm2.wait();

                const txConfirm3 = await FactoryAdvanced.connect(accounts.owner).trustyConfirm(0, 0);
                await txConfirm3.wait();

                const txRevoke = await FactoryAdvanced.connect(accounts.owner).trustyRevoke(0, 0);
                await txRevoke.wait();

                // Should fail execution from not whitelisted
                await expect(FactoryAdvanced.connect(accounts.otherAccount).trustyExecute(0, 0)).to.be.revertedWith("Not in the Factory Whitelist!")

                // Should fail revokation of not owner
                await expect(FactoryAdvanced.connect(accounts.anonymous).trustyExecute(0, 0)).to.be.revertedWith("not owner")

                // Should fail execution if relative timelock has not reached
                await expect(FactoryAdvanced.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWithCustomError(Advanced, "TimeLock")

                // Should fail execution if locked
                await mine(BLOCKLOCK + 155).then(async () => {
                    await expect(FactoryAdvanced.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("Trusty is locked!")
                    const unlock = await Recovery.submitTransaction(trustyAddr, 0, "0xa69df4b5");
                    await unlock.wait()

                    //decodeCalldata((await Recovery.getTransaction(1))[2])

                    const confirmUnlock = await Recovery.connect(accounts.randomAccount).confirmTransaction(1);
                    await confirmUnlock.wait()

                    const confirmUnlock2 = await Recovery.connect(accounts.other).confirmTransaction(1);
                    await confirmUnlock2.wait()

                    const executeUnlock = await Recovery.connect(accounts.other).executeTransaction(1);
                    await executeUnlock.wait();
                })

                const txExecute = await FactoryAdvanced.connect(accounts.owner).trustyExecute(0,0);
                await txExecute.wait();

                // Should fail execution to blacklisted address
                const txBlacklistSend = await FactoryAdvanced.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, "0x00", 0);
                await txBlacklistSend.wait();

                const txBlacklistConfirm = await FactoryAdvanced.connect(accounts.randomAccount).trustyConfirm(0, 1);
                await txBlacklistConfirm.wait();

                const txBlacklistConfirm2 = await FactoryAdvanced.connect(accounts.other).trustyConfirm(0, 1);
                await txBlacklistConfirm2.wait();

                await FactoryAdvanced.connect(accounts.owner).addToTrustyBlacklist(0, [accounts.anonymous.address])

                await expect(FactoryAdvanced.connect(accounts.owner).trustyExecute(0,1)).to.be.revertedWith("Cannot execute, address/contract is blacklisted!")

                // Should fail execution of already executed tx
                await expect(FactoryAdvanced.connect(accounts.randomAccount).trustyExecute(0, 0)).to.be.revertedWith("tx already executed")

                // Should fail execution of not existing tx
                await expect(FactoryAdvanced.connect(accounts.randomAccount).trustyExecute(0, 2)).to.be.revertedWith("tx does not exist")

                // Should fail confirmation of already executed tx
                await expect(FactoryAdvanced.connect(accounts.randomAccount).trustyConfirm(0, 0)).to.be.revertedWith("tx already executed")

                // Should fail revokation of already executed tx
                await expect(FactoryAdvanced.connect(accounts.randomAccount).trustyRevoke(0, 0)).to.be.revertedWith("tx already executed")

                // Should fail Withdraw from not owner
                await expect(FactoryAdvanced.connect(accounts.randomAccount).withdraw()).to.be.revertedWith("Ownable: caller is not the owner")

                await FactoryAdvanced.connect(accounts.owner).withdraw() 

                await FactoryAdvanced.connect(accounts.owner).contractReadOwners(0)
                await FactoryAdvanced.connect(accounts.owner).contractReadBalance(0)
                await FactoryAdvanced.connect(accounts.owner).contractReadTxs(0)
                await FactoryAdvanced.connect(accounts.owner).imOwner(0)
                await FactoryAdvanced.connect(accounts.owner).getTx(0,0)

                await FactoryAdvanced.connect(accounts.owner).getTrustyWhitelist(0)
                await FactoryAdvanced.connect(accounts.owner).getTrustyBlacklist(0)
                await FactoryAdvanced.connect(accounts.owner).addToTrustyBlacklist(0,[accounts.randomAccount.address])

                // Should fail getting Trusty whitelist from not owner
                await expect(FactoryAdvanced.connect(accounts.anonymous).getTrustyWhitelist(0)).to.be.revertedWith("not owner")

                // Should fail getting Trusty blacklist from not owner
                await expect(FactoryAdvanced.connect(accounts.anonymous).getTrustyBlacklist(0)).to.be.revertedWith("not owner")

                // Should fail adding to Trusty blacklist from not whitelisted
                await expect(FactoryAdvanced.connect(accounts.otherAccount).addToTrustyBlacklist(0,[accounts.randomAccount.address])).to.be.revertedWith("Not in the Factory Whitelist!")

                // Should fail adding to Trusty blacklist from not owner
                await expect(FactoryAdvanced.connect(accounts.anonymous).addToTrustyBlacklist(0,[accounts.owner.address])).to.be.revertedWith("not owner")

                // Should fail adding duplicated address to Trusty blacklist from not owner
                await expect(FactoryAdvanced.connect(accounts.owner).addToTrustyBlacklist(0,[accounts.anonymous.address, accounts.anonymous.address])).to.be.revertedWith("Duplicate address in blacklist")

                // Should fail setting whitelist from not owner
                await expect(FactoryAdvanced.connect(accounts.randomAccount).setMaxWhitelist(1)).to.be.revertedWith("Ownable: caller is not the owner")

                // Should fail removimg form whitelist from not owner
                await expect(FactoryAdvanced.connect(accounts.randomAccount).removeFromFactoryWhitelist([accounts.owner.address])).to.be.revertedWith("Ownable: caller is not the owner")

                // Should fail self whitelisting when already whitelisted
                await expect(FactoryAdvanced.connect(accounts.anonymous).whitelistMe()).to.be.revertedWith("You are already whitelisted")

                await FactoryAdvanced.connect(accounts.owner).removeFromFactoryWhitelist([accounts.randomAccount.address])

                // Should fail whitelisting with not required amount
                await expect(accounts.randomAccount.sendTransaction({to: FactoryAdvanced.getAddress(), value: 0, data: "0x5a941b6e"})).to.be.revertedWith("Ether sent is not enough");

                // Whitelist Fallback
                await accounts.randomAccount.sendTransaction({to: FactoryAdvanced.getAddress(), value: amount, data: Buffer.from("test")})

                await FactoryAdvanced.connect(accounts.owner).setMaxWhitelist(1)

                // Should fail adding addresses to whitelist when limit is reached
                await expect(FactoryAdvanced.connect(accounts.owner).addToFactoryWhitelist([accounts.otherAccount.address])).to.be.revertedWith("Whitelist limit reached")

                // Should fail self whitelisting when limit is reached
                await expect(FactoryAdvanced.connect(accounts.randomAccount).whitelistMe()).to.be.revertedWith("Whitelist limit reached")

                // Should fail setting price from not owner
                await expect(FactoryAdvanced.connect(accounts.randomAccount).trustyPriceConfig(0)).to.be.revertedWith("Ownable: caller is not the owner")

                // Should fail disabling price from not owner
                await expect(FactoryAdvanced.connect(accounts.randomAccount).trustyPriceEnable()).to.be.revertedWith("Ownable: caller is not the owner")

                await FactoryAdvanced.connect(accounts.owner).trustyPriceConfig(1)
            })
        })
    });
})
