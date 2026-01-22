const hre = require("hardhat");

async function main() {
    const RideSharing = await hre.ethers.getContractFactory("RideSharing");
    const rideSharing = await RideSharing.deploy();

    await rideSharing.waitForDeployment();

    const address = await rideSharing.getAddress();
    console.log(`RideSharing deployed to ${address}`);
    const fs = require("fs");
    fs.writeFileSync("contract-address.txt", address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
