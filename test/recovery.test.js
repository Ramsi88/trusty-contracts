//const { expect } = require("chai");
//const hre = require("hardhat");
//const { ethers } = require("hardhat");
//const { mine } = require("@nomicfoundation/hardhat-network-helpers");
//const { loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
//const { decodeCalldata } = require('../utils/calldata.js')

import { expect } from "chai";
import { describe, it } from "node:test";
import hre from "hardhat";
const { ethers, networkHelpers, provider } = await hre.network.connect();

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

describe("Trusty RECOVERY tests", async () => {
    // Create various accounts signers for testing purpose
    const istantiateAccounts = async () => {
        const addresses = await provider.request({ method: "eth_accounts" })
        
        accounts.owner = await ethers.getSigner(addresses[0])
        
        accounts.otherOwner = await ethers.getSigner(addresses[2])
        accounts.otherOwner1 = await ethers.getSigner(addresses[3])
        accounts.otherOwner2 = await ethers.getSigner(addresses[4])
        accounts.otherAccount = await ethers.getSigner(addresses[1])
        accounts.randomAccount = await ethers.getSigner(addresses[5])
        accounts.other = await ethers.getSigner(addresses[6])
        accounts.anonymous = await ethers.getSigner(addresses[7])
        accounts.erc20contract = await ethers.getSigner(addresses[8])
        accounts.recovery = await ethers.getSigner(addresses[8])
    }

    // Handle the Trusty Multisignature Factory deploy for each test that needs an istance to run and fill the necessary accounts signers
    const deployFactory = async () => {
        istantiateAccounts()
        const musigFactory = await ethers.deployContract("TrustyFactory");
        Factory = musigFactory
    }

    const deployFactoryAdvanced = async () => {
        istantiateAccounts()
        const musigFactory = await ethers.deployContract("TrustyFactoryAdvanced");
        FactoryAdvanced = musigFactory
    }

    // Handle the Trusty Multisignature single deploy for each test that needs an istance to run and fill the necessary accounts signers
    const deployTrustySingle = async (owners, threshold = 2,id="") => {
        const musig = await ethers.deployContract("Trusty",[owners, threshold, id],/*  whitelist, recovery, BLOCKLOCK, */ { value: 0 });
        Trusty = musig
    }

    const deployTrustySimple = async (owners, threshold = 2, id="") => {
        //const Musig = await ethers.getContractFactory("TrustySimple");
        //const musig = await Musig.deploy(owners, threshold, id, { value: 0 });
        //Simple = musig
    }

    const deployTrustyAdvanced = async (owners, threshold = 2,id="",whitelist=[], recovery) => {
        const musig = await ethers.deployContract("TrustyAdvanced", [owners, threshold, id, whitelist, recovery, BLOCKLOCK],  { value: 0 });
        Advanced = musig
    }

    // Handle the Trusty Multisignature Factory deploy for each test that needs an istance to run and fill the necessary accounts signers
    const deployRecovery = async (owners, threshold = 2, id="") => {    
        const musigRecovery = await ethers.deployContract("Recovery", [owners, threshold, id], { value: 0 });
        Recovery = musigRecovery
    }

    // Handle the Deploy of an ERC20 Token for testing purpose
    const deployErc20 = async () => {
        const Erc20Contract = await ethers.deployContract("ERC20");
        Erc20 = Erc20Contract
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

    describe("Recovery tests", async () => {
        it("Recovery test", async () => {
            await istantiateAccounts()

            await deployErc20()
            const erc20Addr = await Erc20.getAddress()
            
            const recoOwners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployRecovery(recoOwners,2, "RECOVERY")
            const recoveryAddr = await Recovery.getAddress()

            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

            await deployTrustyAdvanced(owners, 2, "Advanced", owners, recoveryAddr)
            const trustyAddr = await Advanced.getAddress()

            const amount = ethers.parseEther("1")
            await accounts.owner.sendTransaction({to: trustyAddr, value: amount})

            const erc20amount = ethers.parseEther("100000000")

            const erc20transfer = await Erc20.connect(accounts.owner).transfer(trustyAddr, erc20amount)
            await erc20transfer.wait()

            // Whitelist
            const whitelist = await Recovery.connect(accounts.owner).addAddressToRecoveryWhitelist([trustyAddr]);
            await whitelist.wait()

            const whitelistArray = await Recovery.connect(accounts.owner).getWhitelist()
            expect(whitelistArray.length).to.be.equal(2)

            // Should fail whitelisting the same address
            await expect(Recovery.connect(accounts.owner).addAddressToRecoveryWhitelist([trustyAddr])).to.be.revertedWith("Each address must be unique to be in whitelist");
            
            // Blacklist
            const blacklist = await Recovery.connect(accounts.owner).addAddressToBlacklist([accounts.other.address]);
            await blacklist.wait()

            // Should fail blacklisting the same address
            await expect(Recovery.connect(accounts.owner).addAddressToBlacklist([accounts.other.address])).to.be.revertedWith("Duplicated address in blacklist");

            const blacklistArray = await Recovery.connect(accounts.owner).getBlacklist()
            expect(blacklistArray.length).to.be.equal(1)

            // RECOVER
            
            //0xce746024 //0x7c0f1ee7
            const recoverEth = await Recovery.connect(accounts.owner).submitTransaction(trustyAddr, 0, "0xce746024");
            await recoverEth.wait()

            expect(await Recovery.getTransactionCount()).to.be.eq(1)

            // Should fail recover by not recovery address
            await expect(Advanced.connect(accounts.owner).recover()).to.be.revertedWith("Not allowed!")
            
            let confirm = await Recovery.connect(accounts.owner).confirmTransaction(0);
            await confirm.wait()

            let revoke = await Recovery.connect(accounts.owner).revokeConfirmation(0);
            await revoke.wait()

            // Should revert revocation of undefined tx
            await expect(Recovery.connect(accounts.owner).revokeConfirmation(3)).to.be.revertedWith("tx does not exist")

            let confirm2 = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
            await confirm2.wait()

            let confirm3 = await Recovery.connect(accounts.other).confirmTransaction(0);
            await confirm3.wait()

            // Should revert an execution from not owner
            await expect(Recovery.connect(accounts.anonymous).executeTransaction(0)).to.be.revertedWith("not owner")
            
            // AWAIT for number of block equal to BLOCKLOCK + OFFSET - number of already executed tx calls
            await networkHelpers.mine(BLOCKLOCK + 110).then(async () => {
                const executeRecoverEth = await Recovery.connect(accounts.owner).executeTransaction(0);
                await executeRecoverEth.wait();
                expect(await Advanced.getBalance()).to.be.eq(0n)
                expect(await Recovery.getBalance()).to.be.eq(1000000000000000000n)
            })
            
            // ERC20 Recovery
            const erc20recover = await Recovery.connect(accounts.owner).submitTransaction(trustyAddr, 0, `0x9e8c708e000000000000000000000000${erc20Addr.slice(2,erc20Addr.length)}`);
            await erc20recover.wait()

            confirm = await Recovery.connect(accounts.owner).confirmTransaction(1);
            await confirm.wait()

            confirm2 = await Recovery.connect(accounts.randomAccount).confirmTransaction(1);
            await confirm2.wait()

            // Should fail recover by not recovery address
            await expect(Advanced.connect(accounts.owner).recoverERC20(erc20Addr)).to.be.revertedWith("Not allowed!")

            // Should revert confirmation of undefined tx
            await expect(Recovery.connect(accounts.owner).confirmTransaction(3)).to.be.revertedWith("tx does not exist")

            // Should revert an already executed tx
            await expect(Recovery.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("tx already executed")

            // Should revert execution of an undefined tx
            await expect(Recovery.connect(accounts.owner).executeTransaction(3)).to.be.revertedWith("tx does not exist")
            
            const executeRecoverErc20 = await Recovery.connect(accounts.owner).executeTransaction(1);
            await executeRecoverErc20.wait();

            // Get Trusty TXs State
            const txGet = await Recovery.getTransaction(1);
            expect(txGet[3]).to.equal(true)

            expect(await Erc20.balanceOf(recoveryAddr)).to.be.eq(100000000000000000000000000n)

            // Fallback
            const amount2 = ethers.parseEther("1")
            await accounts.owner.sendTransaction({to: recoveryAddr, value: amount2, data: Buffer.from("test")})
        })

        it('Constructor test', async () => {
            const recoOwners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            // Should fail deploy without owners
            await expect(deployRecovery([],2, "RECOVERY")).to.be.revertedWith("owners required")

            // Should fail with number of confirmations equal to 0
            await expect(deployRecovery(recoOwners,0, "RECOVERY")).to.be.revertedWith("invalid number of required confirmations")

            // Should fail with number of confirmations greater than owners size
            await expect(deployRecovery(recoOwners,4, "RECOVERY")).to.be.revertedWith("invalid number of required confirmations")

            // Should fail with invalid owner address
            await expect(deployRecovery([recoOwners[0], "0x0000000000000000000000000000000000000000", recoOwners[2]], 3, "RECOVERY")).to.be.revertedWith("invalid owner")

            // Should fail with non unnique owner address
            await expect(deployRecovery([recoOwners[0],recoOwners[1],recoOwners[0]],3, "RECOVERY")).to.be.revertedWith("owner not unique")
        })

        it('Whitelist & Blacklist test', async () => {
            const result = await networkHelpers.loadFixture(deployment);
            expect(result).to.be.equal(true)

            const trustyAddr = await Advanced.getAddress()
            const recoveryAddr = await Recovery.getAddress()

            // Should fail submitting transaction from not owner
            await expect(Recovery.connect(accounts.anonymous).submitTransaction(trustyAddr, 0, "0xce746024")).to.be.revertedWith("not owner");

            // Should fail submitting transaction without whitelisting address receiver
            await expect(Recovery.connect(accounts.owner).submitTransaction(trustyAddr, 0, "0xce746024")).to.be.revertedWith("Address/Contract not in Trusty Whitelist!");

            // Should fail adding addresses to whitelist from not owner
            await expect(Recovery.connect(accounts.anonymous).addAddressToRecoveryWhitelist([trustyAddr, accounts.anonymous.address])).to.be.revertedWith("not owner");

            // Whitelist
            const whitelist = await Recovery.connect(accounts.owner).addAddressToRecoveryWhitelist([trustyAddr, accounts.anonymous.address, accounts.randomAccount.address])
            await whitelist.wait()

            // Blacklist Address
            const blacklist = await Recovery.connect(accounts.owner).addAddressToBlacklist([accounts.anonymous.address])
            await blacklist.wait()

            // Should fail adding addresses to blacklist from not owner
            await expect(Recovery.connect(accounts.anonymous).addAddressToBlacklist([trustyAddr, accounts.anonymous.address])).to.be.revertedWith("not owner");

            // Should fail submitting transaction to blacklisted address receiver
            await expect(Recovery.connect(accounts.owner).submitTransaction(accounts.anonymous.address, 0, "0xce746024")).to.be.revertedWith("Address is blacklisted!");

            // Should fail getting whitelist from not owner
            expect(Recovery.connect(accounts.anonymous).getWhitelist()).to.be.revertedWith("not owner");

            // Should fail getting blacklist from not owner
            expect(Recovery.connect(accounts.anonymous).getBlacklist()).to.be.revertedWith("not owner");

            const amount = ethers.parseEther("1");
            await accounts.owner.sendTransaction({to: recoveryAddr, value: amount})

            // Should fail executing tx to address blacklisted after a proposal submit
            await Recovery.connect(accounts.owner).submitTransaction(accounts.randomAccount.address, amount, Buffer.from(""))
            
            const confirmTx = await Recovery.connect(accounts.owner).confirmTransaction(0)
            await confirmTx.wait()
            
            const confirmTx2 = await Recovery.connect(accounts.other).confirmTransaction(0)
            await confirmTx2.wait()

            const blacklisting = await Recovery.connect(accounts.owner).addAddressToBlacklist([accounts.randomAccount.address])
            await blacklisting.wait()

            await expect(Recovery.connect(accounts.other).executeTransaction(0)).to.be.revertedWith('Cannot execute, address/contract is blacklisted!')
        })

        it('Submit, confirm, revoke, execute test', async () => {
            //const result = await networkHelpers.loadFixture(deployment);
            //expect(result).to.be.equal(true)

            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployRecovery(owners)
            await deployTrustyAdvanced(owners, 2, "", owners, await Recovery.getAddress())

            const trustyAddr = await Advanced.getAddress()
            const recoveryAddr = await Recovery.getAddress()

            // Should fail submitting transaction from not owner
            await expect(Recovery.connect(accounts.anonymous).submitTransaction(trustyAddr, 0, "0xce746024")).to.be.revertedWith("not owner");

            // Should fail submitting transaction without whitelisting address receiver
            await expect(Recovery.connect(accounts.owner).submitTransaction(trustyAddr, 0, "0xce746024")).to.be.revertedWith("Address/Contract not in Trusty Whitelist!");

            // Whitelist
            const whitelist = await Recovery.connect(accounts.owner).addAddressToRecoveryWhitelist([trustyAddr, accounts.anonymous.address])
            await whitelist.wait()

            const submitTx = await Recovery.connect(accounts.owner).submitTransaction(trustyAddr, 0, "0xce746024")
            await submitTx.wait()

            // Should fail confirmation from not owner address
            await expect(Recovery.connect(accounts.anonymous).confirmTransaction(0)).to.be.revertedWith('not owner')

            // Should fail execution of not existing tx
            await expect(Recovery.connect(accounts.owner).confirmTransaction(1)).to.be.revertedWith('tx does not exist')

            const confirmTx = await Recovery.connect(accounts.owner).confirmTransaction(0)
            await confirmTx.wait()

            // Should fail confirmation of already confirmed tx
            await expect(Recovery.connect(accounts.owner).confirmTransaction(0)).to.be.revertedWith('tx already confirmed')

            // Should fail revokation from not owner
            await expect(Recovery.connect(accounts.anonymous).revokeConfirmation(0)).to.be.revertedWith('not owner')

            // Should fail revokation of not confirmed tx
            await expect(Recovery.connect(accounts.other).revokeConfirmation(0)).to.be.revertedWith('tx not confirmed')

            // Should fail execution from not owner
            await expect(Recovery.connect(accounts.anonymous).executeTransaction(0)).to.be.revertedWith('not owner')

            // Should fail execution without required quorum
            await expect(Recovery.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith('cannot execute tx due to number of confirmation required')

            const confirmTx2 = await Recovery.connect(accounts.other).confirmTransaction(0)
            await confirmTx2.wait()

            // Should fail execution of not existing tx
            await expect(Recovery.connect(accounts.other).executeTransaction(1)).to.be.revertedWith('tx does not exist')

            // Should fail recover when Timelock is not reached
            await expect(Recovery.connect(accounts.other).executeTransaction(0)).to.be.revertedWith("tx failed")

            await networkHelpers.mine(BLOCKLOCK + 114).then(async () => {
                // Should fail without amount to recover
                await expect(Recovery.connect(accounts.other).executeTransaction(0)).to.be.revertedWith("tx failed")

                const amount = ethers.parseEther("1")
                await accounts.owner.sendTransaction({to: trustyAddr, value: amount});

                const executeTx = await Recovery.connect(accounts.other).executeTransaction(0)
                await executeTx.wait()
            })

            // Should fail revokation of already executed tx
            await expect(Recovery.connect(accounts.owner).revokeConfirmation(0)).to.be.revertedWith('tx already executed')

            // Should fail confirmation of already executed tx
            await expect(Recovery.connect(accounts.owner).confirmTransaction(0)).to.be.revertedWith('tx already executed')
        })

        it('Recover ETH test', async () => {
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

            await deployRecovery(owners)
            await deployTrustyAdvanced(owners, 2, "", owners, await Recovery.getAddress())

            const trustyAddr = await Advanced.getAddress()
            const recoveryAddr = await Recovery.getAddress()

            expect(await ethers.provider.getBalance(trustyAddr)).to.equal(0n);

            const amount = ethers.parseEther("1")            
            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});

            expect(await ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            // Recovery Whitelist
            const whitelist = await Recovery.connect(accounts.owner).addAddressToRecoveryWhitelist([trustyAddr])
            await whitelist.wait()

            const submitTx = await Recovery.connect(accounts.owner).submitTransaction(trustyAddr, 0, "0xce746024")
            await submitTx.wait()

            //decodeCalldata((await Recovery.getTransaction(0))[2])

            const confirmTx = await Recovery.connect(accounts.owner).confirmTransaction(0)
            await confirmTx.wait()

            const confirmTx2 = await Recovery.connect(accounts.other).confirmTransaction(0)
            await confirmTx2.wait()

            await networkHelpers.mine(BLOCKLOCK + 120).then(async () => {
                const executeTx = await Recovery.connect(accounts.other).executeTransaction(0)
                await executeTx.wait()

                expect(await ethers.provider.getBalance(recoveryAddr)).to.equal(amount);
            })
        })

        it('Recover ERC20 test', async () => {
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployErc20()
            await deployRecovery(owners)
            await deployTrustyAdvanced(owners, 2, "", [...owners, await Erc20.getAddress(), accounts.otherOwner.address], await Recovery.getAddress())

            const erc20Addr = await Erc20.getAddress()
            const trustyAddr = await Advanced.getAddress()
            const recoveryAddr = await Recovery.getAddress()

            const erc20amount = ethers.parseEther("100000000")

            const recoverWhitelist = await Recovery.addAddressToRecoveryWhitelist([trustyAddr]);
            await recoverWhitelist.wait();

            const erc20OwnerBalance = await Erc20.connect(accounts.owner).balanceOf(accounts.owner.address)
            //console.log(`[Erc20Trustybal-preRecover]: ${erc20OwnerBalance}`)

            const erc20recover = await Recovery.submitTransaction(trustyAddr, 0, `0x9e8c708e000000000000000000000000${(await Erc20.getAddress()).slice(2, (await Erc20.getAddress()).length)}`);
            await erc20recover.wait()

            //decodeCalldata((await Recovery.getTransaction(0))[2])

            const erc20recoverConfirm = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
            await erc20recoverConfirm.wait()

            const erc20recoverConfirm2 = await Recovery.connect(accounts.other).confirmTransaction(0);
            await erc20recoverConfirm2.wait()

            // Should fail recover if not unlock
            await expect(Recovery.connect(accounts.other).executeTransaction(0)).to.be.revertedWith("tx failed")

            // Should fail transfer of ERC20 to not whitelisted address          
            await expect(Advanced.connect(accounts.owner).submitTransaction(erc20Addr, erc20OwnerBalance, "0xa9059cbb00000000000000000000000090F79bf6EB2c4f870365E785982E1f101E93b90600000000000000000000000000000000000000000052b7d2dcc80cd400000000", 0)).to.be.revertedWith("Calldata not allowed or address not whitelisted!")

            // Should fail transfer of ERC20 to blacklisted address
            await Advanced.connect(accounts.owner).addAddressToBlacklist([accounts.otherOwner.address])
            await expect(Advanced.connect(accounts.owner).submitTransaction(erc20Addr, erc20OwnerBalance, "0xa9059cbb0000000000000000000000003C44CdDdB6a900fa2b585dd299e03d12FA4293BC00000000000000000000000000000000000000000052b7d2dcc80cd400000000", 0)).to.be.revertedWith("Address in calldata is blacklisted!")

            await networkHelpers.mine(BLOCKLOCK + 125).then(async () => {
                // Should fail recover if balance is 0
                await expect(Recovery.connect(accounts.other).executeTransaction(0)).to.be.revertedWith("tx failed")

                const erc20transfer = await Erc20.connect(accounts.owner).transfer(trustyAddr, erc20amount)
                await erc20transfer.wait()

                const erc20executeRecover = await Recovery.connect(accounts.other).executeTransaction(0);
                await erc20executeRecover.wait();
            })

            const erc20RecoveryBalance = await Erc20.connect(accounts.owner).balanceOf(recoveryAddr)
            expect(BigInt(erc20RecoveryBalance)).to.equal(erc20amount);
        })
    });
})
