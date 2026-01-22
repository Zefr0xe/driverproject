
const hre = require("hardhat");
const fs = require("fs");

async function main() {
    // Read contract address
    const contractAddress = fs.readFileSync("contract-address.txt", "utf8").trim();
    console.log("Contract Address:", contractAddress);

    // Get signer (from .env)
    const [signer] = await hre.ethers.getSigners();
    console.log("Checking for account:", signer.address);

    // Attach contract
    const RideSharing = await hre.ethers.getContractFactory("RideSharing");
    const rideSharing = RideSharing.attach(contractAddress);

    // Check registration
    const driver = await rideSharing.drivers(signer.address);
    console.log("Is Registered:", driver.isRegistered);
    console.log("Driver Name:", driver.name);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
