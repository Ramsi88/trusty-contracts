import { network } from "hardhat";
const { ethers } = await network.connect();

import promptSync from 'prompt-sync';

const prompt = promptSync({});

async function main() {
    const confirmations = parseInt(prompt('How many confirmations are required for the Trusty? '));
    if (isNaN(confirmations)) { throw `You must use a valid number: ${confirmations}` }

    const nOwners = parseInt(prompt('How many owners will manage the Trusty? '));
    if (isNaN(nOwners)) { throw `You must use a valid number: ${nOwners}` }

    const owners = []

    if (confirmations === 0 || nOwners === 0 || confirmations < 1 || confirmations > nOwners) {
        throw `Confirmations must be greater than 1 and less than or equal to the numbers of owners: (1 < ${confirmations} <= ${nOwners}) is not a valid expression`
    }

    for (var i = 0; i < nOwners; i++) {
        const owner = prompt(`Address of the ${i}th owner: `);
        if (!ethers.isAddress(owner)) { throw "You must enter a valid string address" }
        owners.push(owner);
    }

    const whitelist = []

    const address = prompt(`Address to whitelist: `);
    if (!ethers.isAddress(address)) { throw "You must enter a valid string address" }
    whitelist.push(address);

    while (prompt(`Would you like to add more addresses to whitelist? [y] or [press any button] to exit: `) === "y" ? true : false) {
        const address = prompt(`Address to whitelist: `);
        if (!ethers.isAddress(address)) { throw "You must enter a valid string address" }
        whitelist.push(address);
    }

    const recovery = prompt(`Insert the RECOVERY address: `)
    if (!ethers.isAddress(recovery)) { throw "You must enter a valid string address" }

    const blocklock = parseInt(prompt('How many blocks until RECOVERY mode enabled? '));
    if (isNaN(blocklock)) { throw `You must use a valid number: ${blocklock}` }

    const name = prompt(`Insert a name for your Trusty or leave blank `)

    const awareness = prompt('ARE YOU SURE YOU WANT TO DEPLOY? [deploy] or [press any button] to exit: ') === "deploy" ? true : false;
    if (!awareness) {
        throw "[Aborting all and exiting...]";
    }

    // here we deploy the contract
    const deployedTrustyContract = await ethers.deployContract("TrustyAdvanced", [owners, confirmations, name, whitelist, recovery, blocklock], {
        maxFeePerGas: 10_000_000_000n,
        maxPriorityFeePerGas: 2_000_000_000n,
    });
    await deployedTrustyContract.waitForDeployment();

    // print the address of the deployed contract
    console.log("TrustyAdvanced Contract Address:", await deployedTrustyContract.getAddress());
}

// Call the main function and catch if there is any error
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
