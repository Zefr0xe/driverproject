
import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { rideSharingAbi } from '../abi';
import { CONTRACT_ADDRESS } from '../App';

export function DriverRegistration() {
    const [name, setName] = useState('');
    const [fare, setFare] = useState('');

    const { address } = useAccount();
    const { data: driverData } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: rideSharingAbi,
        functionName: 'drivers',
        args: [address as `0x${string}`],
        query: {
            enabled: !!address,
        }
    });

    const isRegistered = driverData?.[3];

    const { data: hash, writeContract, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !fare) return;

        writeContract({
            address: CONTRACT_ADDRESS,
            abi: rideSharingAbi,
            functionName: 'registerDriver',
            args: [name, parseEther(fare)],
        });
    };

    if (isRegistered) {
        return (
            <div className="card">
                <h2>Driver Dashboard</h2>
                <div style={{ background: 'rgba(144, 190, 109, 0.1)', border: '1px solid #90be6d', padding: '1rem', borderRadius: '8px', color: '#90be6d' }}>
                    <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}><strong>✅ Registered</strong></p>
                    <p>Name: <span style={{ color: 'white' }}>{driverData?.[1]}</span></p>
                    <p>Fare: <span style={{ color: 'white' }}>{driverData?.[2] ? formatEther(driverData[2]) : 0} ETH</span></p>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <h2>Register as Driver</h2>
            <p style={{ color: '#a0a0a0', fontSize: '0.9rem', marginBottom: '20px' }}>
                Join our network to start accepting rides.
            </p>
            <form onSubmit={handleRegister}>
                <div>
                    <label>Driver Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Michael Knight"
                    />
                </div>
                <div>
                    <label>Default Fare (ETH)</label>
                    <input
                        type="number"
                        step="0.0001"
                        value={fare}
                        onChange={(e) => setFare(e.target.value)}
                        placeholder="e.g. 0.01"
                    />
                </div>
                <button type="submit" disabled={isPending || isConfirming} style={{ width: '100%', marginTop: '10px' }}>
                    {isPending ? 'Confirming...' : 'Register Now'}
                </button>
            </form>
            {isSuccess && <div className="success">Driver registered successfully!</div>}
            {hash && <div className="hash">Tx: {hash}</div>}
        </div>
    );
}
