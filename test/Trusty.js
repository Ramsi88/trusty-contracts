const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { mine } = require("@nomicfoundation/hardhat-network-helpers");

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
let Trusty = null;
let Simple = null;
let Advanced = null;
let Recovery = null;
let Erc20 = null;

const ethDecimals = 10**18;
const trustyPrice = ethers.utils.parseEther("0");

const BLOCKLOCK = 28800;

/**
 * [Trusty Multisignature Contract]: 
 * interface,provider,signer,callStatic,estimateGas,functions,populateTransaction,filters,
 * _runningEvents,_wrappedEmits,address,resolvedAddress,_price(),contractAction(uint256,uint256),
 * contractReadBalance(uint256),contractReadOwners(uint256),contractReadTxs(uint256),
 * contracts(uint256),createContract(address[],uint256),depositContract(uint256,uint256),
 * getTx(uint256,uint256),imOwner(uint256),owner(),renounceOwnership(),totalTrusty(),
 * transferOwnership(address),trustyConfirm(uint256,uint256),trustyExecute(uint256,uint256),
 * trustyOwner(uint256,uint256),trustyPriceConfig(uint256),trustyRevoke(uint256,uint256),
 * trustySubmit(uint256,address,uint256,bytes),withdraw(),_price,contractAction,contractReadBalance,
 * contractReadOwners,contractReadTxs,contracts,createContract,depositContract,getTx,imOwner,owner,
 * renounceOwnership,totalTrusty,transferOwnership,trustyConfirm,trustyExecute,trustyOwner,trustyPriceConfig,
 * trustyRevoke,trustySubmit,withdraw,deployTransaction
 */

describe("Trusty tests", async () => {
    // Create various accounts signers for testing purpose
    const istantiateAccounts = async () => {
        const [owner, otherAccount, otherOwner, otherOwner1, otherOwner2, randomAccount, other, anonymous, erc20contract] = await ethers.getSigners();
        accounts.owner = owner
        accounts.otherAccount = otherAccount
        accounts.otherOwner = otherOwner
        accounts.otherOwner1 = otherOwner1
        accounts.otherOwner2 = otherOwner2
        accounts.randomAccount = randomAccount
        accounts.other = other
        accounts.anonymous = anonymous
        accounts.erc20contract = erc20contract
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
        //Factory = musigFactory
    }

    // Handle the Trusty Multisignature single deploy for each test that needs an istance to run and fill the necessary accounts signers
    const deployTrustySingle = async (owners, threshold = 2,id="",whitelist=[], recovery) => {    
        const Musig = await ethers.getContractFactory("Trusty");
        const musig = await Musig.deploy(owners, threshold, id,/*  whitelist, recovery, BLOCKLOCK, */ { value: 0 });
        Trusty = musig
    }

    const deployTrustySimple = async (owners, threshold = 2,id="",whitelist=[], recovery) => {    
        const Musig = await ethers.getContractFactory("TrustySimple");
        const musig = await Musig.deploy(owners, threshold, id, { value: 0 });
        Simple = musig
    }

    const deployTrustyAdvanced = async (owners, threshold = 2,id="",whitelist=[], recovery) => {    
        const Musig = await ethers.getContractFactory("TrustyAdvanced");
        const musig = await Musig.deploy(owners, threshold, id, whitelist, recovery, BLOCKLOCK, { value: 0 });
        Advanced = musig
    }

    // Handle the Trusty Multisignature Factory deploy for each test that needs an istance to run and fill the necessary accounts signers
    const deployRecovery = async (owners, threshold = 2,id="",whitelist=[], recovery) => {    
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

    // Tests with Factory intermediation
    describe("Deploy Factory tests", async () => { 
        it("factory deploy test", async () => {
            await deployFactory()
            expect(Factory.deployTransaction.hash !== null && Factory.address !== null)
        });

        it("factory owner test", async () => {
            await deployFactory()
            expect(accounts.owner === Factory.signer.address === Factory.deployTransaction.from === await Factory.owner())
        });
    });

    describe("Price enabler tests", async () => {
        it("owner toggle price test", async () => {
            await deployFactory();
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const priceEnabled = await Factory.connect(accounts.owner).trustyPriceEnable();
            const enabled = await Factory._priceEnabled();
            expect(enabled).to.equal(true);
        });

        it("should revert toggle price from not owner", async () => {
            await deployFactory();
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await expect(Factory.connect(accounts.randomAccount).trustyPriceEnable()).to.be.reverted;
            await expect(Factory.connect(accounts.randomAccount).trustyPriceEnable()).to.be.revertedWith("Ownable: caller is not the owner");
            const enabled = await Factory._priceEnabled();
            expect(enabled).to.equal(false);
        });
    });

    describe("Create Trusty tests", async () => {
        it("create 1of2 test",async () => {
            await deployFactory()

            const owners = [accounts.owner.address, accounts.randomAccount.address];

            const totalPre = await Factory.totalTrusty()

            expect(totalPre).equals(0)

            const create = await Factory.createContract(owners, 1, "",/*  [...owners], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice})

            //await expect(Factory.createContract(owners, 1, {value: trustyPrice})).to.be.reverted

            const totalPost = await Factory.totalTrusty()

            expect(totalPost).equals(1)

            expect(create.hash !== null)
        });

        it("create 2of3 test", async () => {
            await deployFactory()

            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

            const totalPre = await Factory.totalTrusty()
            
            expect(totalPre).equals(0)

            const create = await Factory.createContract(owners, 2, "",/*  [...owners], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});

            const totalPost = await Factory.totalTrusty()

            expect(totalPost).equals(1)

            //const addr = await Factory.contracts(0);

            expect(create.hash !== null)
        });

        it("create 3of3 test", async () => {
            await deployFactory()

            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

            const totalPre = await Factory.totalTrusty()
            
            expect(totalPre).equals(0)

            const create = await Factory.createContract(owners, 3, "",/*  [...owners], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});

            const totalPost = await Factory.totalTrusty()

            expect(totalPost).equals(1)

            //const addr = await Factory.contracts(0);

            expect(create.hash !== null)
        });

        it("create trusty with 1 threshold test",async () => {
            await deployFactory()

            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

            const totalPre = await Factory.totalTrusty()

            expect(totalPre).equals(0)

            const create = await Factory.createContract(owners, 1, "",/*  [...owners], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice})

            //await expect(Factory.createContract(owners, 1, {value: trustyPrice})).to.be.reverted

            const totalPost = await Factory.totalTrusty()

            expect(totalPost).equals(1)

            expect(create.hash !== null)
        });

        it("should revert with empty owners array test", async () => {
            await deployFactory()

            const owners = [];

            await expect(Factory.createContract(owners, 0, "",/*  [], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice})).to.be.reverted
        });        

        it("should revert with 0 threshold test",async () => {
            await deployFactory()

            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

            await expect(Factory.createContract(owners, 0, "",/*  [], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice})).to.be.reverted
        });        

        it("should revert with more threshold than owners test",async () => {
            await deployFactory()

            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

            await expect(Factory.createContract(owners , 4, "",/*  [], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice})).to.be.reverted
        });

        it("should revert with duplicated owners test",async () => {
            await deployFactory()

            let owners = [accounts.owner.address, accounts.randomAccount.address, accounts.randomAccount.address];

            await expect(Factory.createContract(owners, 3, "",/*  [], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice})).to.be.reverted

            owners = [accounts.owner.address, accounts.owner.address, accounts.randomAccount.address];

            await expect(Factory.createContract(owners, 3, "",/*  [], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice})).to.be.reverted

            owners = [accounts.owner.address, accounts.randomAccount.address, accounts.randomAccount.address];

            await expect(Factory.createContract(owners, 3, "",/*  [], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice})).to.be.reverted

            owners = [accounts.owner.address, accounts.owner.address, accounts.owner.address];

            await expect(Factory.createContract(owners, 3, "",/*  [], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice})).to.be.reverted
        });

        it("should revert using address 0x0 test",async () => {
            await deployFactory()

            const owners = [accounts.owner.address, accounts.randomAccount.address, "0x0000000000000000000000000000000000000000"];

            await expect(Factory.createContract(owners, 3, "",/*  [], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice})).to.be.reverted
        });
    });

    describe("Deposit to Trusty tests", async () => {
        it("send ether directly test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            const create = await Factory.createContract(owners, 2, "",/*  [...owners], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            // Send ETH without `data`
            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            // Send ETH with `data`
            await accounts.owner.sendTransaction({to: trustyAddr, value: ethers.utils.parseEther("1"), data: Buffer.from("asd")});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(BigInt(amount*2)); //2*10**18
        })

        it("deposit ether with contract method test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            const create = await Factory.createContract(owners, 2, "",/*  [...owners], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
        })
    });

    describe("Submit, confirm, execute transaction tests", async () =>{
        it("submit, confirm and execute a transaction proposal test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            // WHITELIST
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist(owners);

            const create = await Factory.createContract(owners, 2, "",/*  [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1");
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const addNewAddresToWhitelist = await Factory.connect(accounts.owner).addToTrustyWhitelist(0,[accounts.anonymous.address]);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            await txConfirm2.wait();

            // Execute a tx
            const txExe = await Factory.connect(accounts.owner).trustyExecute(0,0);
            await txExe.wait();

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(amount) + BigInt(preBalance)).to.equal(BigInt(postBalance));

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[3]).to.equal(true);
        })

        it("should revert execution of a transaction proposal already executed test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist(owners);
            const create = await Factory.createContract(owners, 2, "",/*  [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            await txConfirm2.wait();

            // Execute a tx
            const txExe = await Factory.connect(accounts.owner).trustyExecute(0,0);
            await txExe.wait();

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(amount) + BigInt(preBalance)).to.equal(BigInt(postBalance));

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[3]).to.equal(true)

            // Re-Execute same tx
            await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted;
            await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("tx already executed");
            
            expect(BigInt(amount) + BigInt(preBalance)).to.equal(BigInt(postBalance));
        })

        it("should revert execution of a transaction proposal with more amount than balance test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist(owners);
            const create = await Factory.createContract(owners, 2, "",/*  [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount + BigInt(1), 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            await txConfirm2.wait();

            // Execute a tx
            await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted
            await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("tx failed")
            
            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[3]).to.equal(false)
            
        })

        it("should revert a transaction proposal from not owner test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners,accounts.anonymous.address]);
            const create = await Factory.createContract(owners, 2, "",/*  [...owners], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            await expect(Factory.connect(accounts.anonymous).trustySubmit(0, accounts.anonymous.address, amount, 0x00)).to.be.reverted
            await expect(Factory.connect(accounts.anonymous).trustySubmit(0, accounts.anonymous.address, amount, 0x00)).to.be.revertedWith("not owner");
        })

        it("confirm a transaction proposal test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist(owners);
            const create = await Factory.createContract(owners, 2, "",/*  [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            await txConfirm2.wait();

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[4]).to.equal(2)
        })

        it("should revert a transaction proposal already confirmed from the same caller test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist(owners);
            const create = await Factory.createContract(owners, 2, "",/*  [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.owner).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Re-Confirm a tx from another account of owners
            await expect(Factory.connect(accounts.owner).trustyConfirm(0, 0)).to.be.reverted;
            await expect(Factory.connect(accounts.owner).trustyConfirm(0, 0)).to.be.revertedWith("tx already confirmed");
            
            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[4]).to.equal(1)
        })

        it("should revert confirmation of a transaction proposal from not owner test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners,accounts.anonymous.address]);
            const create = await Factory.createContract(owners, 2, "",/*  [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            await expect(Factory.connect(accounts.anonymous).trustyConfirm(0, 0)).to.be.reverted
            await expect(Factory.connect(accounts.anonymous).trustyConfirm(0, 0)).to.be.revertedWith("not owner")

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[4]).to.equal(1)
        })

        it("revoke a transaction proposal test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist(owners);
            const create = await Factory.createContract(owners, 2, "",/*  [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            await txConfirm2.wait();

            // Revoke a tx from another account of owners
            const txRevoke = await Factory.connect(accounts.other).trustyRevoke(0, 0);
            await txRevoke.wait();

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[4]).to.equal(1)
        })

        it("should revert the revoke of a transaction proposal from not owner test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners,accounts.anonymous.address]);
            const create = await Factory.createContract(owners, 2, "",/*  [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            await txConfirm2.wait();

            // Revoke a tx from a not owner account
            await expect(Factory.connect(accounts.anonymous).trustyRevoke(0, 0)).to.be.reverted
            await expect(Factory.connect(accounts.anonymous).trustyRevoke(0, 0)).to.be.revertedWith("not owner")

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[4]).to.equal(2)
        })

        it("execute a transaction proposal test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist(owners);
            const create = await Factory.createContract(owners, 2, "",/*  [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            await txConfirm2.wait();

            // Execute a tx
            const txExe = await Factory.connect(accounts.owner).trustyExecute(0,0);
            await txExe.wait();

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(amount) + BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[3]).to.equal(true)
        })

        it("should revert the execution of a transaction proposal with less confirmation than minimum test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist(owners);
            const create = await Factory.createContract(owners, 3, "",/*  [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            await txConfirm2.wait();

            // Execute a tx
            await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted
            await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("cannot execute tx due to number of confirmation required")

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[3]).to.equal(false)
        })

        it("should revert the execution of a transaction proposal from not owner test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners,accounts.anonymous.address]);
            const create = await Factory.createContract(owners, 2, "",/*  [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            await txConfirm2.wait();

            // Execute a tx
            await expect(Factory.connect(accounts.anonymous).trustyExecute(0,0)).to.be.reverted
            await expect(Factory.connect(accounts.anonymous).trustyExecute(0,0)).to.be.revertedWith("not owner")
            
            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[3]).to.equal(false)
        })
    });

    describe("Type Advanced Timelock test", async () => {
        it("submit a transaction with timelock 1 day test", async () => {
            const TIME_LOCK = 7200
            await deployFactory()
            
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);
            
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);

            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;
            

            const amount = ethers.utils.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, TIME_LOCK);
            //await txSend.wait();

            const txSend = await Advanced.submitTransaction(accounts.anonymous.address, amount, 0x00, TIME_LOCK);
            await txSend.wait();
            
            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Advanced.connect(accounts.other).confirmTransaction(0)
            await txConfirm2.wait()
            
            // Execute a tx
            await mine(TIME_LOCK).then(async () => {
                //const txExe = await Factory.connect(accounts.owner).trustyExecute(0,0);
                //await txExe.wait();
                const txExe = await Advanced.connect(accounts.owner).executeTransaction(0)
                await txExe.wait();
            })            

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(amount) + BigInt(preBalance)).to.equal(BigInt(postBalance))
            
            // Get Trusty txs status
            //const txGet = await Factory.getTx(0,0);
            const txGet = await Advanced.getTransaction(0);

            expect(txGet[3]).to.equal(true)
            
        })

        it("should revert a transaction with execution less than timelock test", async () => {
            const TIME_LOCK = 7200
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);

            //const create = await Factory.createContract(owners, 2, "",/*  [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, */ {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);

            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;

            const amount = ethers.utils.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, TIME_LOCK);
            //await txSend.wait();

            const txSend = await Advanced.submitTransaction(accounts.anonymous.address, amount, 0x00, TIME_LOCK);
            await txSend.wait();

            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Advanced.connect(accounts.other).confirmTransaction(0)
            await txConfirm2.wait()

            // Execute a tx
            await mine(TIME_LOCK-4).then(async () => {
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted
                await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.reverted
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith(`TimeLock("timeLock preventing execution: ", 1)`)
            })            

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            //const txGet = await Factory.getTx(0,0);
            const txGet = await Advanced.getTransaction(0);

            expect(txGet[3]).to.equal(false)
        })
        
        /*
        it("test", async () => {
            await mine(1).then(async () => {})
        })
        */
    })

    describe("Type Advanced Whitelist tests", async () => {
        it("add whitelisted address test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            // WHITELIST
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);

            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);
            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;

            //const getTrustyWhitelist = await Factory.getTrustyWhitelist(0);
            const getTrustyWhitelist = await Advanced.getWhitelist()

            const whitelistToCheck = [trustyAddr, accounts.anonymous.address] //trustyAddr, 

            for(let i = 0; i < getTrustyWhitelist.length; i++) {
                //console.log(getTrustyWhitelist[i],whitelistToCheck[i])
                expect(getTrustyWhitelist[i]).to.be.equal(whitelistToCheck[i])
            }
            
        })

        it("submit, confirm and execute a transaction proposal to a whitelisted address test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            // FACTORY WHITELIST
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist(owners);

            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);

            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;

            const amount = ethers.utils.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            // TRUSTY WHITELIST
            //const getTrustyWhitelist = await Factory.getTrustyWhitelist(0);
            const getTrustyWhitelist = await Advanced.getWhitelist()

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0);
            //await txSend.wait();
            const txSend = await Advanced.submitTransaction(accounts.anonymous.address, amount, 0x00, 0);
            await txSend.wait();

            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Advanced.connect(accounts.other).confirmTransaction(0)
            await txConfirm2.wait()

            // Execute a tx
            //const txExe = await Factory.connect(accounts.owner).trustyExecute(0,0);
            //await txExe.wait();
            const txExe = await Advanced.connect(accounts.owner).executeTransaction(0)
            await txExe.wait();

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(amount) + BigInt(preBalance)).to.equal(BigInt(postBalance));

            // Get Trusty txs status
            //const txGet = await Factory.getTx(0,0);
            const txGet = await Advanced.getTransaction(0);

            expect(txGet[3]).to.equal(true);
        })

        it("should revert the submit of a transaction proposal to a not whitelisted address test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            // Factory WHITELIST
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist(owners);

            //const create = await Factory.createContract(owners, 2, "", [...owners], accounts.owner.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);

            await deployTrustyAdvanced(owners,2,"Advanced", [...owners], accounts.owner.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;

            const amount = ethers.utils.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //await expect(Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0)).to.be.reverted
            //await expect(Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0)).to.be.revertedWith("Address/Contract not in Trusty Whitelist!")
            await expect(Advanced.connect(accounts.owner).submitTransaction(accounts.anonymous.address, amount, 0x00, 0)).to.be.reverted
            await expect(Advanced.connect(accounts.owner).submitTransaction(accounts.anonymous.address, amount, 0x00, 0)).to.be.revertedWith("Address/Contract not in Trusty Whitelist!")
        })
    })

    describe("Type Advanced Blacklist tests", async () => {
        it("blacklist address pre-submit test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            // WHITELIST
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);
            
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);

            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;
            
            const amount = ethers.utils.parseEther("1");

            //const getTrustyWhitelist = await Factory.getTrustyWhitelist(0);
            const getTrustyWhitelist = await Advanced.getWhitelist()

            const whitelistToCheck = [trustyAddr, accounts.anonymous.address]

            for(let i = 0; i < getTrustyWhitelist.length; i++) {
                //console.log(getTrustyWhitelist[i],whitelistToCheck[i])
                expect(getTrustyWhitelist[i]).to.be.equal(whitelistToCheck[i])
            }    

            //const blacklist = await Factory.connect(accounts.owner).addToTrustyBlacklist(0,[accounts.anonymous.address])
            //await blacklist.wait()
            const blacklist = await Advanced.connect(accounts.owner).addAddressToBlacklist([accounts.anonymous.address])
            await blacklist.wait()
            
            //await expect(Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x0, 0)).to.be.reverted
            //await expect(Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x0, 0)).to.be.revertedWith("Address is blacklisted!")
            await expect(Advanced.connect(accounts.owner).submitTransaction(accounts.anonymous.address, amount, 0x00, 0)).to.be.reverted
            await expect(Advanced.connect(accounts.owner).submitTransaction(accounts.anonymous.address, amount, 0x00, 0)).to.be.revertedWith("Address is blacklisted!")
        })

        it("blacklist address post-submit/pre-execution test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            // WHITELIST
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);
            
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);
            
            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;
            
            const amount = ethers.utils.parseEther("1");

            //const getTrustyWhitelist = await Factory.getTrustyWhitelist(0);
            const getTrustyWhitelist = await Advanced.getWhitelist()

            const whitelistToCheck = [trustyAddr, accounts.anonymous.address]

            for(let i = 0; i < getTrustyWhitelist.length; i++) {
                //console.log(getTrustyWhitelist[i],whitelistToCheck[i])
                expect(getTrustyWhitelist[i]).to.be.equal(whitelistToCheck[i])
            }    
            
            //const proposal = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x0, 0)
            //await proposal.wait()
            const proposal = await Advanced.connect(accounts.owner).submitTransaction(accounts.anonymous.address, amount, 0x0, 0)
            await proposal.wait()

            //const blacklist = await Factory.connect(accounts.owner).addToTrustyBlacklist(0,[accounts.anonymous.address])
            //await blacklist.wait()
            const blacklist = await Advanced.connect(accounts.owner).addAddressToBlacklist([accounts.anonymous.address])
            await blacklist.wait()

            //const confirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0,0)
            //await confirm.wait()
            const confirm = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
            await confirm.wait()
            //const confirm2 = await Factory.connect(accounts.other).trustyConfirm(0,0)
            //await confirm2.wait()
            const confirm2 = await Advanced.connect(accounts.other).confirmTransaction(0)
            await confirm2.wait()

            //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted
            //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("Cannot execute, address/contract is blacklisted!")
            await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.reverted
            await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("Cannot execute, address/contract is blacklisted!")
        })

        it("blacklist erc20contract address post-submit/pre-execution test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            // WHITELIST
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);
            
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address,"0xeDaCEf763B85597A517061D276D61947610411D1",accounts.erc20contract.address], accounts.owner.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);

            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address,"0xeDaCEf763B85597A517061D276D61947610411D1",accounts.erc20contract.address], accounts.owner.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;
            
            const amount = ethers.utils.parseEther("1");

            //const getTrustyWhitelist = await Factory.getTrustyWhitelist(0);
            const getTrustyWhitelist = await Advanced.getWhitelist()

            const whitelistToCheck = [trustyAddr, accounts.anonymous.address,"0xeDaCEf763B85597A517061D276D61947610411D1",accounts.erc20contract.address]

            for(let i = 0; i < getTrustyWhitelist.length; i++) {
                //console.log(getTrustyWhitelist[i],whitelistToCheck[i])
                expect(getTrustyWhitelist[i]).to.be.equal(whitelistToCheck[i])
            }    
            
            //const proposal = await Factory.connect(accounts.owner).trustySubmit(0, accounts.erc20contract.address, amount, "0xa9059cbb000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0)
            //await proposal.wait()
            const proposal = await Advanced.connect(accounts.owner).submitTransaction(accounts.erc20contract.address, amount, "0xa9059cbb000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0)
            await proposal.wait()

            //const blacklist = await Factory.connect(accounts.owner).addToTrustyBlacklist(0,[accounts.erc20contract.address])
            //await blacklist.wait()
            const blacklist = await Advanced.connect(accounts.owner).addAddressToBlacklist([accounts.erc20contract.address])
            await blacklist.wait()

            //const confirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0,0)
            //await confirm.wait()
            const confirm = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
            await confirm.wait()
            //const confirm2 = await Factory.connect(accounts.other).trustyConfirm(0,0)
            //await confirm2.wait()
            const confirm2 = await Advanced.connect(accounts.other).confirmTransaction(0)
            await confirm2.wait()

            //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted
            //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("Cannot execute, address/contract is blacklisted!")
            await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.reverted
            await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("Cannot execute, address/contract is blacklisted!")
        })

        it("blacklist address encoded in calldata test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            // WHITELIST
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);
            
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address,"0xeDaCEf763B85597A517061D276D61947610411D1",accounts.erc20contract.address], accounts.owner.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);
            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address,"0xeDaCEf763B85597A517061D276D61947610411D1",accounts.erc20contract.address], accounts.owner.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;
            
            const amount = ethers.utils.parseEther("0.1");

            // Send ETH without `data`
            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});

            //const getTrustyWhitelist = await Factory.getTrustyWhitelist(0);
            const getTrustyWhitelist = await Advanced.getWhitelist()

            const whitelistToCheck = [trustyAddr, accounts.anonymous.address,"0xeDaCEf763B85597A517061D276D61947610411D1",accounts.erc20contract.address]

            for(let i = 0; i < getTrustyWhitelist.length; i++) {
                //console.log(getTrustyWhitelist[i],whitelistToCheck[i])
                expect(getTrustyWhitelist[i]).to.be.equal(whitelistToCheck[i])
            }    
            
            //const proposal = await Factory.connect(accounts.owner).trustySubmit(0, accounts.erc20contract.address, amount, "0xa9059cbb000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0)
            //await proposal.wait()
            const proposal = await Advanced.connect(accounts.owner).submitTransaction(accounts.erc20contract.address, amount, "0xa9059cbb000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0)
            await proposal.wait()

            //const blacklist = await Factory.connect(accounts.owner).addToTrustyBlacklist(0,["0xeDaCEf763B85597A517061D276D61947610411D1"])
            //await blacklist.wait()
            const blacklist = await Advanced.connect(accounts.owner).addAddressToBlacklist(["0xeDaCEf763B85597A517061D276D61947610411D1"])
            await blacklist.wait()

            //const confirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0,0)
            //await confirm.wait()
            const confirm = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
            await confirm.wait()
            //const confirm2 = await Factory.connect(accounts.other).trustyConfirm(0,0)
            //await confirm2.wait()
            const confirm2 = await Advanced.connect(accounts.other).confirmTransaction(0)
            await confirm2.wait()

            //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted
            //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("Address in calldata is blacklisted!")
            await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.reverted
            await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("Address in calldata is blacklisted!")
        })
    })
    
    describe("Type Advanced Calldata tests", async () => {
        it("should revert approve, transfer, transferFrom, mint calldatas test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            // WHITELIST
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist(owners);

            //0xeDaCEf763B85597A517061D276D61947610411D1
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address, accounts.erc20contract.address], accounts.owner.address, BLOCKLOCK, {value: trustyPrice});
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address, accounts.erc20contract.address, "0xeDaCEf763B85597A517061D276D61947610411D1"], {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);

            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address,accounts.erc20contract.address], accounts.owner.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;

            const amount = ethers.utils.parseEther("1");
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const tx = 
            //await expect(Factory.connect(accounts.owner).trustySubmit(0, accounts.erc20contract.address, amount, "0xa9059cbb000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0)).to.be.reverted
            //await expect(Factory.connect(accounts.owner).trustySubmit(0, accounts.erc20contract.address, amount, "0xa9059cbb000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0)).to.be.revertedWith("Calldata not allowed or address not whitelisted!")
            //await expect(Factory.connect(accounts.owner).trustySubmit(0, accounts.erc20contract.address, amount, "0x095ea7b3000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0)).to.be.revertedWith("Calldata not allowed or address not whitelisted!")
            //await expect(Factory.connect(accounts.owner).trustySubmit(0, accounts.erc20contract.address, amount, "0x23b872dd000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0)).to.be.revertedWith("Calldata not allowed or address not whitelisted!")
            //await expect(Factory.connect(accounts.owner).trustySubmit(0, accounts.erc20contract.address, amount, "0x40c10f19000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0)).to.be.revertedWith("Calldata not allowed or address not whitelisted!")
            await expect(Advanced.connect(accounts.owner).submitTransaction(accounts.erc20contract.address, amount, "0xa9059cbb000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0)).to.be.reverted
            await expect(Advanced.connect(accounts.owner).submitTransaction(accounts.erc20contract.address, amount, "0xa9059cbb000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0)).to.be.revertedWith("Calldata not allowed or address not whitelisted!")
            await expect(Advanced.connect(accounts.owner).submitTransaction(accounts.erc20contract.address, amount, "0x095ea7b3000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0)).to.be.revertedWith("Calldata not allowed or address not whitelisted!")
            await expect(Advanced.connect(accounts.owner).submitTransaction(accounts.erc20contract.address, amount, "0x23b872dd000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0)).to.be.revertedWith("Calldata not allowed or address not whitelisted!")
            await expect(Advanced.connect(accounts.owner).submitTransaction(accounts.erc20contract.address, amount, "0x40c10f19000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0)).to.be.revertedWith("Calldata not allowed or address not whitelisted!")
        })     
    });
    
    describe("Type Advanced Absolute timelock tests", async () => {
        it("Execute a tx 1 block before absolute timelock test", async () => {
            const ABSOLUTE_LOCK = 28800;
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);
            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;

            const amount = ethers.utils.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0);
            //await txSend.wait();
            const txSend = await Advanced.submitTransaction(accounts.anonymous.address, amount, 0x00, 0);
            await txSend.wait();

            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Advanced.connect(accounts.other).confirmTransaction(0)
            await txConfirm2.wait()

            // Execute a tx
            await mine(ABSOLUTE_LOCK + 115).then(async () => {
                //const txExe = await Factory.connect(accounts.owner).trustyExecute(0,0);
                //await txExe.wait();
                const txExe = await Advanced.connect(accounts.owner).executeTransaction(0)
                await txExe.wait();
            })            

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(amount) + BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            //const txGet = await Factory.getTx(0,0);
            const txGet = await Advanced.getTransaction(0);

            expect(txGet[3]).to.equal(true)
        })

        it("Should revert a tx executed 1 block after absolute timelock test", async () => {
            const ABSOLUTE_LOCK = 28800;
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);
            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;

            const amount = ethers.utils.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0);
            //await txSend.wait();
            const txSend = await Advanced.submitTransaction(accounts.anonymous.address, amount, 0x00, 0);
            await txSend.wait();

            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Advanced.connect(accounts.other).confirmTransaction(0)
            await txConfirm2.wait()

            // Execute a tx
            await mine(ABSOLUTE_LOCK + 116).then(async () => {
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted;
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("Trusty is locked!")
                await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.reverted
                await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("Trusty is locked!")
            })            

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            //const txGet = await Factory.getTx(0,0);
            const txGet = await Advanced.getTransaction(0);

            expect(txGet[3]).to.equal(false)
        })

        it("Execute a tx executed after unlocking absolute timelock test", async () => {
            const ABSOLUTE_LOCK = 28800;
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);
            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;

            const amount = ethers.utils.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0);
            //await txSend.wait();
            const txSend = await Advanced.submitTransaction(accounts.anonymous.address, amount, 0x00, 0);
            await txSend.wait();

            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Advanced.connect(accounts.other).confirmTransaction(0)
            await txConfirm2.wait()

            // Execute a tx
            await mine(ABSOLUTE_LOCK + 116).then(async () => {
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted;
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("Trusty is locked!")
                await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.reverted
                await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("Trusty is locked!")
            })            

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            //const txGet = await Factory.getTx(0,0);
            const txGet = await Advanced.getTransaction(0);

            expect(txGet[3]).to.equal(false)
        })
    })

    describe("Type Advanced Recovery tests", async () => {
        it("execute an eth recovery after absolute timelock expiring test", async () => {
            const ABSOLUTE_LOCK = 28800;
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployFactory()
            await deployRecovery(owners,2, "RECOVERY", [...owners], accounts.owner.address);
            //console.log("[RECOVERY]",Recovery.address);
            
            
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address], Recovery.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);
            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address], Recovery.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;
            
            const amount = ethers.utils.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0);
            //await txSend.wait();
            const txSend = await Advanced.submitTransaction(accounts.anonymous.address, amount, 0x00, 0);
            await txSend.wait();

            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Advanced.connect(accounts.other).confirmTransaction(0)
            await txConfirm2.wait()

            // Execute a tx after Absolute TimeLock
            await mine(ABSOLUTE_LOCK + 116).then(async () => {
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted;
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("Trusty is locked!")
                await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.reverted
                await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("Trusty is locked!")
            })            

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            //const txGet = await Factory.getTx(0,0);
            const txGet = await Advanced.getTransaction(0);

            expect(txGet[3]).to.equal(false)

            // Executes RECOVERY
            const recoverWhitelist = await Recovery.addAddressToRecoveryWhitelist([trustyAddr]);
            await recoverWhitelist.wait();

            //0xce746024 //0x7c0f1ee7
            const recover = await Recovery.submitTransaction(trustyAddr, 0, "0xce746024");
            await recover.wait()

            const confirm = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
            await confirm.wait()

            const confirm2 = await Recovery.connect(accounts.other).confirmTransaction(0);
            await confirm2.wait()

            const executeRecover = await Recovery.connect(accounts.other).executeTransaction(0);
            await executeRecover.wait();

            const trustyBal = await hre.ethers.provider.getBalance(trustyAddr)
            const recoveryBal = await hre.ethers.provider.getBalance(Recovery.address)

            expect(BigInt(trustyBal)).to.equal(BigInt(0));
            expect(BigInt(recoveryBal)).to.equal(amount);
        })

        it("execute an erc20 recovery after absolute timelock expiring test", async () => {
            const ABSOLUTE_LOCK = 28800;
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployFactory()
            await deployRecovery(owners,2, "RECOVERY", [...owners], accounts.owner.address);
            await deployErc20()
            //console.log("[RECOVERY]",Recovery.address);
            
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address], Recovery.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);
            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address], Recovery.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;
            
            const amount = ethers.utils.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            const erc20amount = ethers.utils.parseEther("100000000")

            const erc20approve = await Erc20.connect(accounts.owner).approve(trustyAddr, erc20amount)
            await erc20approve.wait()

            const erc20transfer = await Erc20.connect(accounts.owner).transfer(trustyAddr, erc20amount)
            await erc20transfer.wait()

            //const erc20Trustybal = await Erc20.connect(accounts.owner).balanceOf(trustyAddr)
            //console.log(`[Erc20Trustybal-preRecover]: ${erc20Trustybal}`)
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0);
            //await txSend.wait();
            const txSend = await Advanced.submitTransaction(accounts.anonymous.address, amount, 0x00, 0);
            await txSend.wait();

            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Advanced.connect(accounts.other).confirmTransaction(0)
            await txConfirm2.wait()
            
            // Execute a tx after Absolute TimeLock
            await mine(ABSOLUTE_LOCK + 116).then(async () => {
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted;
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("Trusty is locked!")
                await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.reverted
                await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("Trusty is locked!")
            })

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            //const txGet = await Factory.getTx(0,0);
            const txGet = await Advanced.getTransaction(0);

            expect(txGet[3]).to.equal(false)

            // Executes RECOVERY
            const recoverWhitelist = await Recovery.addAddressToRecoveryWhitelist([trustyAddr]);
            await recoverWhitelist.wait();

            // ETH Recovery //0xce746024 //0x7c0f1ee7
            const recover = await Recovery.submitTransaction(trustyAddr, 0, "0xce746024");
            await recover.wait()

            const confirm = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
            await confirm.wait()

            const confirm2 = await Recovery.connect(accounts.other).confirmTransaction(0);
            await confirm2.wait()

            const executeRecover = await Recovery.connect(accounts.other).executeTransaction(0);
            await executeRecover.wait();

            const trustyBal = await hre.ethers.provider.getBalance(trustyAddr)
            const recoveryBal = await hre.ethers.provider.getBalance(Recovery.address)

            expect(BigInt(trustyBal)).to.equal(BigInt(0));
            expect(BigInt(recoveryBal)).to.equal(amount);

            //console.log(hre.ethers.utils.hexlify(erc20amount)) //52b7d2dcc80cd2e4000000
            //console.log(Erc20.address.slice(2,Erc20.address.length))

            // ERC20 Recovery
            //const erc20recover = await Recovery.submitTransaction(trustyAddr, 0, `0x8980f11f000000000000000000000000${Erc20.address.slice(2,Erc20.address.length)}000000000000000000000000000000000000000000${hre.ethers.utils.hexlify(erc20amount).slice(2)}`, 0);
            const erc20recover = await Recovery.submitTransaction(trustyAddr, 0, `0x9e8c708e000000000000000000000000${Erc20.address.slice(2,Erc20.address.length)}`);
            await erc20recover.wait()

            const erc20confirm = await Recovery.connect(accounts.randomAccount).confirmTransaction(1);
            await erc20confirm.wait()

            const erc20confirm2 = await Recovery.connect(accounts.other).confirmTransaction(1);
            await erc20confirm2.wait()

            await mine(ABSOLUTE_LOCK + 116).then(async () => {
                const erc20executeRecover = await Recovery.connect(accounts.other).executeTransaction(1);
                await erc20executeRecover.wait();
            })

            const erc20Trustybal = await Erc20.connect(accounts.owner).balanceOf(trustyAddr)
            //console.log(`[Erc20Trustybal-postRecover]: ${erc20Trustybal}`)

            const erc20Recoverybal = await Erc20.connect(accounts.owner).balanceOf(Recovery.address)
            //console.log(`[Erc20Recoverybal-postRecover]: ${erc20Recoverybal}`)

            expect(BigInt(erc20Trustybal)).to.equal(BigInt(0));
            expect(BigInt(erc20Recoverybal)).to.equal(erc20amount);
        })

        it("execute transaction after a POR from recovery after absolute timelock reset test", async () => {
            const ABSOLUTE_LOCK = 28800;
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployFactory()
            await deployRecovery(owners,2, "RECOVERY", [...owners], accounts.owner.address);
            await deployErc20()
            //console.log("[RECOVERY]",Recovery.address);
            
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address], Recovery.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);
            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address], Recovery.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;
            
            const amount = ethers.utils.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            const erc20amount = ethers.utils.parseEther("100000000")

            const erc20approve = await Erc20.connect(accounts.owner).approve(trustyAddr, erc20amount)
            await erc20approve.wait()

            const erc20transfer = await Erc20.connect(accounts.owner).transfer(trustyAddr, erc20amount)
            await erc20transfer.wait()

            //const erc20Trustybal = await Erc20.connect(accounts.owner).balanceOf(trustyAddr)
            //console.log(`[Erc20Trustybal-preRecover]: ${erc20Trustybal}`)
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0);
            //await txSend.wait();
            const txSend = await Advanced.submitTransaction(accounts.anonymous.address, amount, 0x00, 0);
            await txSend.wait();

            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Advanced.connect(accounts.other).confirmTransaction(0)
            await txConfirm2.wait()
            
            // Execute a tx after Absolute TimeLock
            await mine(ABSOLUTE_LOCK + 116).then(async () => {
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted;
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("Trusty is locked!")
                await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.reverted
                await expect(Advanced.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("Trusty is locked!")
            })
            
            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            //const txGet = await Factory.getTx(0,0);
            const txGet = await Advanced.getTransaction(0);

            expect(txGet[3]).to.equal(false)

            // Executes RECOVERY POR
            const recoverWhitelist = await Recovery.addAddressToRecoveryWhitelist([trustyAddr]);
            await recoverWhitelist.wait();

            
            // ETH POR //0x5c470ecb //0xa69df4b5
            const recover = await Recovery.submitTransaction(trustyAddr, 0, "0x5c470ecb");
            await recover.wait()

            const confirm = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
            await confirm.wait()

            const confirm2 = await Recovery.connect(accounts.other).confirmTransaction(0);
            await confirm2.wait()

            const executeRecover = await Recovery.connect(accounts.other).executeTransaction(0);
            await executeRecover.wait();

            // Execute a tx after Absolute TimeLock
            await mine(1 + 116).then(async () => {
                //const postPOR = await Factory.connect(accounts.owner).trustyExecute(0,0);
                //await postPOR.wait()
                //expect(postPOR.hash !== null)
                const postPOR = await Advanced.connect(accounts.owner).executeTransaction(0);
                await postPOR.wait()
                expect(postPOR.hash !== null)
            })
        })

        it("should revert a recover before absolute timelock expiring test", async () => {
            const ABSOLUTE_LOCK = 28800;
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployFactory()
            await deployRecovery(owners,2, "RECOVERY", [...owners], accounts.owner.address);
            //console.log("[RECOVERY]",Recovery.address);
            
            
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address], Recovery.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);
            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address], Recovery.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;
            
            const amount = ethers.utils.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0);
            //await txSend.wait();
            const txSend = await Advanced.submitTransaction(accounts.anonymous.address, amount, 0x00, 0);
            await txSend.wait();

            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Advanced.connect(accounts.other).confirmTransaction(0)
            await txConfirm2.wait()

            // Execute a tx after Absolute TimeLock
            await mine(ABSOLUTE_LOCK - 100).then(async () => {
                //const txExe = 
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted;
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("Trusty is locked!")
                //await txExe.wait();                       

                const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

                expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

                // Get Trusty txs status
                //const txGet = await Factory.getTx(0,0);
                const txGet = await Advanced.getTransaction(0);

                expect(txGet[3]).to.equal(false)

                // Executes RECOVERY
                const recoverWhitelist = await Recovery.addAddressToRecoveryWhitelist([trustyAddr]);
                await recoverWhitelist.wait();

                //0xce746024 //0x7c0f1ee7
                const recover = await Recovery.submitTransaction(trustyAddr, 0, "0xce746024");
                await recover.wait()

                const confirm = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
                await confirm.wait()

                const confirm2 = await Recovery.connect(accounts.other).confirmTransaction(0);
                await confirm2.wait()

                //const executeRecover = 
                await expect(Recovery.connect(accounts.other).executeTransaction(0)).to.be.reverted;
                await expect(Recovery.connect(accounts.other).executeTransaction(0)).to.be.revertedWith("tx failed");
                //await executeRecover.wait();

                const trustyBal = await hre.ethers.provider.getBalance(trustyAddr)
                const recoveryBal = await hre.ethers.provider.getBalance(Recovery.address)

                expect(BigInt(trustyBal)).to.equal(amount);
                expect(BigInt(recoveryBal)).to.equal(BigInt(0));
            })
        })

        it("should revert a recover from not recovery address test", async () => {
            const ABSOLUTE_LOCK = 28800;
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployFactory()
            await deployRecovery(owners,2, "RECOVERY", [...owners], accounts.owner.address);
            //console.log("[RECOVERY]",Recovery.address);
            
            
            const whitelist = await Factory.connect(accounts.owner).addToFactoryWhitelist([...owners]);
            //const create = await Factory.createContract(owners, 2, "", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK, {value: trustyPrice});
            //const trustyAddr = await Factory.contracts(0);
            await deployTrustyAdvanced(owners,2,"Advanced", [accounts.anonymous.address], accounts.owner.address, BLOCKLOCK)
            const trustyAddr = await Advanced.address;
            
            const amount = ethers.utils.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0);
            //await txSend.wait();
            const txSend = await Advanced.submitTransaction(accounts.anonymous.address, amount, 0x00, 0);
            await txSend.wait();

            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Advanced.connect(accounts.randomAccount).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Advanced.connect(accounts.other).confirmTransaction(0)
            await txConfirm2.wait()

            // Execute a tx after Absolute TimeLock
            await mine(ABSOLUTE_LOCK + 120).then(async () => {
                //const txExe = 
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted;
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("Trusty is locked!")
                //await txExe.wait();                       

                const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

                expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

                // Get Trusty txs status
                //const txGet = await Factory.getTx(0,0);
                const txGet = await Advanced.getTransaction(0);

                expect(txGet[3]).to.equal(false)

                // Executes RECOVERY
                const recoverWhitelist = await Recovery.addAddressToRecoveryWhitelist([trustyAddr]);
                await recoverWhitelist.wait();

                //0xce746024 //0x7c0f1ee7
                const recover = await Recovery.submitTransaction(trustyAddr, 0, "0xce746024");
                await recover.wait()

                const confirm = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
                await confirm.wait()

                const confirm2 = await Recovery.connect(accounts.other).confirmTransaction(0);
                await confirm2.wait()

                //const executeRecover = 
                await expect(Recovery.connect(accounts.other).executeTransaction(0)).to.be.reverted;
                await expect(Recovery.connect(accounts.other).executeTransaction(0)).to.be.revertedWith("tx failed");
                //await executeRecover.wait();

                const trustyBal = await hre.ethers.provider.getBalance(trustyAddr)
                const recoveryBal = await hre.ethers.provider.getBalance(Recovery.address)

                expect(BigInt(trustyBal)).to.equal(amount);
                expect(BigInt(recoveryBal)).to.equal(BigInt(0));
            })
        })
    })
    
    // Tests without Factory intermediation
    describe("Deploy single Trusty without Factory interaction tests", async () => {
        it("deploy single Trusty test", async () => {
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployTrustySingle(owners,2, ""/* , [...owners], accounts.owner.address */);
            const trustyAddress = Trusty.address;
            //console.log(`[Trusty address]: ${trustyAddress}`);
            expect(Trusty.deployTransaction.hash !== null && Trusty.address !== null);
        });

        it("deposit to single Trusty test", async () => {
            await istantiateAccounts();
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployTrustySingle(owners,2, ""/* , [...owners], accounts.owner.address */);
            const trustyAddress = Trusty.address;
            
            const amount = ethers.utils.parseEther("0.1");

            // Send ETH without `data`
            await accounts.owner.sendTransaction({to: trustyAddress, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddress)).to.equal(amount);

            // Send ETH with `data`
            await accounts.owner.sendTransaction({to: trustyAddress, value: amount, data: Buffer.from("asd")});
            expect(await hre.ethers.provider.getBalance(trustyAddress)).to.equal(BigInt(amount*2)); //2*10**18

            const ownerBalance = await hre.ethers.provider.getBalance(accounts.owner.address);
            const trustyBalance = await hre.ethers.provider.getBalance(trustyAddress);
            //console.log(`[ownerBalance]: ${ownerBalance/ethDecimals}`);
            //console.log(`[trustyBalance]: ${trustyBalance/ethDecimals}`);
        });

        it("submit, confirm, execute transaction with single Trusty test", async () => {
            await istantiateAccounts();
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployTrustySingle(owners,2, ""/* , [accounts.anonymous.address], accounts.owner.address */);
            const trustyAddress = Trusty.address;
            
            const amount = ethers.utils.parseEther("0.1");

            // Send ETH without `data`
            await accounts.owner.sendTransaction({to: trustyAddress, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddress)).to.equal(amount);

            // Send ETH with `data`
            await accounts.owner.sendTransaction({to: trustyAddress, value: amount, data: Buffer.from("asd")});
            expect(await hre.ethers.provider.getBalance(trustyAddress)).to.equal(BigInt(amount*2)); //2*10**18

            const ownerBalance = await hre.ethers.provider.getBalance(accounts.owner.address);
            const trustyBalance = await hre.ethers.provider.getBalance(trustyAddress);
            //console.log(`[ownerBalance]: ${ownerBalance/ethDecimals}`);
            //console.log(`[trustyBalance]: ${trustyBalance/ethDecimals}`);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            // Submit transaction proposal
            const txSend = await Trusty.connect(accounts.owner).submitTransaction(accounts.anonymous.address, amount, Buffer.from("#testing!"));
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Trusty.connect(accounts.randomAccount).confirmTransaction(0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Trusty.connect(accounts.other).confirmTransaction(0);
            await txConfirm2.wait();

            // Execute a tx
            const txExe = await Trusty.connect(accounts.owner).executeTransaction(0);
            await txExe.wait();

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(amount) + BigInt(preBalance)).to.equal(BigInt(postBalance));

            // Get Trusty txs status
            const txGet = await Trusty.getTransaction(0);

            expect(txGet[3]).to.equal(true)
        });
    });

    describe("Deploys test", async () => {
        it("deploy all test", async () => {
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployTrustySingle(owners,1, "Single", [...owners], accounts.owner.address);
            await deployFactory()
            await deployRecovery(owners,2, "RECOVERY", [...owners], accounts.owner.address);
            await deployTrustySimple(owners,1,"Simple")
            await deployTrustyAdvanced(owners,1,"Advanced",owners,accounts.owner.address,0)
            await deployFactoryAdvanced()
        })
    })
});