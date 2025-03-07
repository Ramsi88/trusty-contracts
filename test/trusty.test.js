const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { mine } = require("@nomicfoundation/hardhat-network-helpers");
const { loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
//const { decodeCalldata } = require('../utils/calldata.js')

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

describe("TRUSTY multisig tests", async () => {
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
        const musig = await Musig.deploy(owners, threshold, id, { value: 0 });
        Trusty = musig
    }

    const deployTrustySimple = async (owners, threshold = 2, id="") => {
        //const Musig = await ethers.getContractFactory("TrustySimple");
        //const musig = await Musig.deploy(owners, threshold, id, { value: 0 });
        //Simple = musig
    }

    const deployTrustyAdvanced = async (owners, threshold = 2,id="",whitelist=[], recovery, timelock = BLOCKLOCK) => {
        const Musig = await ethers.getContractFactory("TrustyAdvanced");
        const musig = await Musig.deploy(owners, threshold, id, whitelist, recovery, timelock, { value: 0 });
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

    describe("Trusties tests", async () => {
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

        it("Erc20.sol test", async () => {
            await loadFixture(deployment)

            const erc20addr = await Erc20.getAddress()
            expect(erc20addr !== null)
            const erc20Supply = await Erc20.balanceOf(accounts.owner.address)
            expect(erc20Supply).to.be.eq(100000000000000000000000000n)

            const erc20amount = ethers.parseEther("1000")
            const erc20amount2 = ethers.parseEther("1")

            await expect(Erc20.connect(accounts.owner).transfer(accounts.anonymous.address, 100000000000000000000000001n)).to.be.revertedWith("Balance too low")
            await expect(Erc20.connect(accounts.owner).transfer(accounts.anonymous.address, 0)).to.be.revertedWith("Can not transfer negative value")

            const erc20approve = await Erc20.connect(accounts.owner).approve(accounts.anonymous.address, erc20amount2)
            await expect(erc20approve.wait()).to.emit(Erc20, "Approval")

            const erc20transfer = await Erc20.connect(accounts.owner).transfer(accounts.anonymous.address, erc20amount)
            await expect(erc20transfer.wait()).to.emit(Erc20, "Transfer")

            expect(await Erc20.totalSupply()).to.be.eq(100000000000000000000000000n)
            expect(await Erc20.name()).to.be.eq("ERC20 Token")
            expect(await Erc20.symbol()).to.be.eq("ERC")
            expect(await Erc20.decimals()).to.be.eq(18)

            expect(await Erc20.balances(accounts.owner.address)).to.equal(erc20Supply - erc20amount)            
            expect(await Erc20.allowance(accounts.owner.address, accounts.anonymous.address)).to.equal(erc20amount2)
            expect(await Erc20.balanceOf(accounts.anonymous.address)).to.equal(erc20amount)
            expect(await Erc20.balanceOf(accounts.owner.address)).to.equal(99999000000000000000000000n)
        })

        describe("Trusty.sol standalone test", async () => {
            it("Constructor test", async () => {
                const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

                // Should fail deploy without owners
                await expect(deployTrustySingle([],2, "TRUSTY")).to.be.revertedWith("owners required")

                // Should fail with number of confirmations equal to 0
                await expect(deployTrustySingle(owners,0, "TRUSTY")).to.be.revertedWith("invalid number of required confirmations")

                // Should fail with number of confirmations greater than owners size
                await expect(deployTrustySingle(owners,4, "TRUSTY")).to.be.revertedWith("invalid number of required confirmations")

                // Should fail with invalid owner address
                await expect(deployTrustySingle([owners[0], "0x0000000000000000000000000000000000000000", owners[2]], 3, "TRUSTY")).to.be.revertedWith("invalid owner")

                // Should fail with non unnique owner address
                await expect(deployTrustySingle([owners[0],owners[1],owners[0]],3, "TRUSTY")).to.be.revertedWith("owner not unique")
            })

            it("Deposit test", async () => {
                const result = await loadFixture(deployment);
                expect(result).to.be.equal(true)

                const trustyAddr = await Trusty.getAddress()

                const amount = ethers.parseEther("1")
                
                // Send ETH without `data`
                await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
                expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

                // Send ETH with `data`
                await accounts.owner.sendTransaction({to: trustyAddr, value: amount, data: Buffer.from("test")});
                expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(BigInt(amount * 2n));
            })

            it('Submit, confirm, revoke, execute test', async () => {
                const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

                await deployTrustySingle(owners)

                const trustyAddr = await Trusty.getAddress()

                // Should fail submitting transaction from not owner
                await expect(Trusty.connect(accounts.anonymous).submitTransaction(accounts.anonymous.address, 1, "0xce746024")).to.be.revertedWith("not owner");

                const submitTx = await Trusty.connect(accounts.owner).submitTransaction(trustyAddr, 0, "0xce746024")
                await submitTx.wait()

                // Should fail confirmation from not owner address
                await expect(Trusty.connect(accounts.anonymous).confirmTransaction(0)).to.be.revertedWith('not owner')
    
                // Should fail execution of not existing tx
                await expect(Trusty.connect(accounts.owner).confirmTransaction(1)).to.be.revertedWith('tx does not exist')
    
                const confirmTx = await Trusty.connect(accounts.owner).confirmTransaction(0)
                await confirmTx.wait()

                // Should fail confirmation of already confirmed tx
                await expect(Trusty.connect(accounts.owner).confirmTransaction(0)).to.be.revertedWith('tx already confirmed')
    
                // Should fail revokation from not owner
                await expect(Trusty.connect(accounts.anonymous).revokeConfirmation(0)).to.be.revertedWith('not owner')
    
                // Should fail revokation of not confirmed tx
                await expect(Trusty.connect(accounts.other).revokeConfirmation(0)).to.be.revertedWith('tx not confirmed')

                // Should fail revokation of not not existing tx
                await expect(Trusty.connect(accounts.other).revokeConfirmation(1)).to.be.revertedWith('tx does not exist')
    
                // Should fail execution from not owner
                await expect(Trusty.connect(accounts.anonymous).executeTransaction(0)).to.be.revertedWith('not owner')
    
                // Should fail execution without required quorum
                await expect(Trusty.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith('cannot execute tx due to number of confirmation required')

                const confirmTx2 = await Trusty.connect(accounts.other).confirmTransaction(0)
                await confirmTx2.wait()
    
                const confirmTx3 = await Trusty.connect(accounts.randomAccount).confirmTransaction(0)
                await confirmTx3.wait()

                const revokeTx = await Trusty.connect(accounts.randomAccount).revokeConfirmation(0)
                await revokeTx.wait()

                // Should fail execution of not existing tx
                await expect(Trusty.connect(accounts.other).executeTransaction(1)).to.be.revertedWith('tx does not exist')

                // Should fail without amount
                //await expect(Trusty.connect(accounts.other).executeTransaction(0)).to.be.revertedWith("no amount")

                const amount = ethers.parseEther("1")
                await accounts.owner.sendTransaction({to: trustyAddr, value: amount});

                const executeTx = await Trusty.connect(accounts.other).executeTransaction(0)
                await executeTx.wait()

                // Should fail execution of already executed tx
                await expect(Trusty.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith('tx already executed')

                // Should fail revokation of already executed tx
                await expect(Trusty.connect(accounts.owner).revokeConfirmation(0)).to.be.revertedWith('tx already executed')
    
                // Should fail confirmation of already executed tx
                await expect(Trusty.connect(accounts.owner).confirmTransaction(0)).to.be.revertedWith('tx already executed')

                await Trusty.connect(accounts.owner).getBalance()
                await Trusty.connect(accounts.owner).getTransactionCount()
                await Trusty.connect(accounts.owner).getTransaction(0)
            })
        })

        describe("TrustyAdvanced.sol standalone test", async () => {
            it("Constructor test", async () => {
                const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
                const whitelist = [accounts.anonymous.address]
                const recovery = Recovery.getAddress()

                // Should fail deploy without owners
                await expect(deployTrustyAdvanced([],2, "TRUSTY", whitelist, recovery)).to.be.revertedWith("owners required")

                // Should fail with number of confirmations equal to 0
                await expect(deployTrustyAdvanced(owners,0, "TRUSTY", whitelist, recovery)).to.be.revertedWith("invalid number of required confirmations")

                // Should fail with number of confirmations greater than owners size
                await expect(deployTrustyAdvanced(owners,4, "TRUSTY", whitelist, recovery)).to.be.revertedWith("invalid number of required confirmations")

                // Should fail with invalid owner address
                await expect(deployTrustyAdvanced([owners[0], "0x0000000000000000000000000000000000000000", owners[2]], 3, "TRUSTY", whitelist, recovery)).to.be.revertedWith("invalid owner")

                // Should fail with non unnique owner address
                await expect(deployTrustyAdvanced([owners[0],owners[1],owners[0]],3, "TRUSTY", whitelist, recovery)).to.be.revertedWith("owner not unique")

                // Should fail with empty whitelist
                await expect(deployTrustyAdvanced(owners,3, "TRUSTY", [], recovery)).to.be.revertedWith("a minimum whitelist is required or the funds will be locked forever")

                // Should fail with duplicated whitelist
                await expect(deployTrustyAdvanced(owners,3, "TRUSTY", [owners[0], owners[0]], recovery)).to.be.revertedWith("Each address must be unique to be in whitelist")

                // Should fail with invalid recovery address
                await expect(deployTrustyAdvanced(owners,3, "TRUSTY", whitelist, "0x0000000000000000000000000000000000000000")).to.be.revertedWith("invalid Recovery Trusty address")
            })

            it("Deposit test", async () => {
                const result = await loadFixture(deployment);
                expect(result).to.be.equal(true)

                const trustyAddr = await Advanced.getAddress()

                const amount = ethers.parseEther("1")
                
                // Send ETH without `data`
                await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
                expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

                // Send ETH with `data`
                await accounts.owner.sendTransaction({to: trustyAddr, value: amount, data: Buffer.from("test")});
                expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(BigInt(amount * 2n));
            })

            it('Submit, confirm, revoke, execute test', async () => {
                const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
                const timelock = 7200;

                await deployTrustyAdvanced(owners, 2, "ADVANCED", [...owners, accounts.otherAccount.address, accounts.otherOwner.address], accounts.anonymous.address, timelock)

                const trustyAddr = await Trusty.getAddress()

                // Should fail submitting transaction from not owner
                await expect(Advanced.connect(accounts.anonymous).submitTransaction(accounts.anonymous.address, 1, "0xce746024", 0)).to.be.revertedWith("not owner");

                // Should fail submitting transaction to not whitelisted address
                await expect(Advanced.connect(accounts.owner).submitTransaction(accounts.anonymous.address, 1, "0xce746024", 0)).to.be.revertedWith("Address/Contract not in Trusty Whitelist!");

                // Should fail adding blacklisted address from not owner
                await expect(Advanced.connect(accounts.anonymous).addAddressToBlacklist([accounts.owner.address])).to.be.revertedWith("not owner");

                // Should fail adding duplicated blacklisted address
                await expect(Advanced.connect(accounts.owner).addAddressToBlacklist([accounts.anonymous.address, accounts.anonymous.address])).to.be.revertedWith("Duplicate address in blacklist");

                await Advanced.connect(accounts.owner).addAddressToBlacklist([accounts.otherAccount.address])

                // Should fail submitting transaction to blacklisted address
                await expect(Advanced.connect(accounts.owner).submitTransaction(accounts.otherAccount.address, 1, "0xce746024", 0)).to.be.revertedWith("Address is blacklisted!");

                // Shoul fail PoR if not locked
                await expect(Advanced.connect(accounts.anonymous).POR()).to.be.revertedWith("Trusty not yet unlocked!")

                await mine(BLOCKLOCK + 120).then(async () => {
                    // Should fail submitting transaction if locked
                    await expect(Advanced.connect(accounts.owner).submitTransaction(trustyAddr, 1, "0xce746024", 0)).to.be.revertedWith("Trusty is locked!")
                })

                // Shoul fail PoR from not recovery
                await expect(Advanced.connect(accounts.owner).POR()).to.be.revertedWith("Not allowed!")

                await Advanced.connect(accounts.anonymous).POR()

                const submitTx = await Advanced.connect(accounts.owner).submitTransaction(trustyAddr, 1, Buffer.from("test"), 100)
                await submitTx.wait()

                // Should fail confirmation from not owner address
                await expect(Advanced.connect(accounts.anonymous).confirmTransaction(0)).to.be.revertedWith('not owner')
    
                // Should fail execution of not existing tx
                await expect(Advanced.connect(accounts.owner).confirmTransaction(1)).to.be.revertedWith('tx does not exist')
    
                const confirmTx = await Advanced.connect(accounts.owner).confirmTransaction(0)
                await confirmTx.wait()
                
                // Should fail confirmation of already confirmed tx
                await expect(Advanced.connect(accounts.owner).confirmTransaction(0)).to.be.revertedWith('tx already confirmed')
    
                // Should fail revokation from not owner
                await expect(Advanced.connect(accounts.anonymous).revokeConfirmation(0)).to.be.revertedWith('not owner')
    
                // Should fail revokation of not confirmed tx
                await expect(Advanced.connect(accounts.other).revokeConfirmation(0)).to.be.revertedWith('tx not confirmed')

                // Should fail revokation of not not existing tx
                await expect(Advanced.connect(accounts.other).revokeConfirmation(1)).to.be.revertedWith('tx does not exist')
    
                // Should fail execution from not owner
                await expect(Advanced.connect(accounts.anonymous).executeTransaction(0)).to.be.revertedWith('not owner')
    
                // Should fail execution without required quorum
                await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith('cannot execute tx due to number of confirmation required')
                
                const confirmTx2 = await Advanced.connect(accounts.other).confirmTransaction(0)
                await confirmTx2.wait()
    
                const confirmTx3 = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
                await confirmTx3.wait()

                const revokeTx = await Advanced.connect(accounts.randomAccount).revokeConfirmation(0)
                await revokeTx.wait()

                // Should fail execution of not existing tx
                await expect(Advanced.connect(accounts.other).executeTransaction(1)).to.be.revertedWith('tx does not exist')

                // Should fail without amount
                //await expect(Trusty.connect(accounts.other).executeTransaction(0)).to.be.revertedWith("no amount")

                const amount = ethers.parseEther("1")
                await accounts.owner.sendTransaction({to: trustyAddr, value: amount});

                // Should fail if relative timelock has not passed
                await expect(Advanced.connect(accounts.other).executeTransaction(0)).to.be.revertedWithCustomError(Advanced, "TimeLock")

                await mine(timelock + 120).then(async () => {
                    // Should fail if absolute timelock has passed
                    await expect(Advanced.connect(accounts.other).executeTransaction(0)).to.be.revertedWith("Trusty is locked!")

                    await Advanced.connect(accounts.anonymous).POR()

                    const executeTx = await Advanced.connect(accounts.other).executeTransaction(0)
                    await executeTx.wait()
                })

                // Should fail execution to blacklisted address
                const submitBlacklistTx = await Advanced.connect(accounts.owner).submitTransaction(accounts.otherOwner.address, 1, Buffer.from("test"), 0)
                await submitBlacklistTx.wait()

                const confirmBlacklistTx = await Advanced.connect(accounts.owner).confirmTransaction(1)
                await confirmBlacklistTx.wait()

                const confirmBlacklistTx2 = await Advanced.connect(accounts.other).confirmTransaction(1)
                await confirmBlacklistTx2.wait()

                await Advanced.connect(accounts.owner).addAddressToBlacklist([accounts.otherOwner])

                await expect(Advanced.connect(accounts.other).executeTransaction(1)).to.be.revertedWith("Cannot execute, address/contract is blacklisted!")

                // Should fail execution of already executed tx
                await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith('tx already executed')

                // Should fail revokation of already executed tx
                await expect(Advanced.connect(accounts.owner).revokeConfirmation(0)).to.be.revertedWith('tx already executed')
    
                // Should fail confirmation of already executed tx
                await expect(Advanced.connect(accounts.owner).confirmTransaction(0)).to.be.revertedWith('tx already executed')

                await Advanced.connect(accounts.owner).getBalance()
                await Advanced.connect(accounts.owner).getTransactionCount()
                await Advanced.connect(accounts.owner).getTransaction(0)

                // Should fail getting whitelist from not owner
                await expect(Advanced.connect(accounts.anonymous).getWhitelist()).to.be.revertedWith("not owner")

                await Advanced.connect(accounts.owner).getWhitelist()

                // Should fail getting whitelist from not owner
                await expect(Advanced.connect(accounts.anonymous).getBlacklist()).to.be.revertedWith("not owner")

                await Advanced.connect(accounts.owner).getBlacklist()
            })
        })
    });
})
