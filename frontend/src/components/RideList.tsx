
import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { rideSharingAbi } from '../abi';
import { CONTRACT_ADDRESS } from '../App';

export function RideList() {
    const { data: rideCount } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: rideSharingAbi,
        functionName: 'rideCount',
    });

    return (
        <div className="card">
            <h2>Ride Management</h2>
            <RequestRide />
            <h3>All Rides</h3>
            {rideCount && <RidesList count={Number(rideCount)} />}
        </div>
    );
}

function RequestRide() {
    const [origin, setOrigin] = useState('');
    const [dest, setDest] = useState('');
    const { data: hash, writeContract, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const handleRequest = (e: React.FormEvent) => {
        e.preventDefault();
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: rideSharingAbi,
            functionName: 'requestRide',
            args: [origin, dest],
        });
    };

    return (
        <div className="sub-card">
            <h4>Request a Ride</h4>
            <form onSubmit={handleRequest}>
                <input placeholder="Origin" value={origin} onChange={e => setOrigin(e.target.value)} />
                <input placeholder="Destination" value={dest} onChange={e => setDest(e.target.value)} />
                <button disabled={isPending || isConfirming}>{isPending ? 'Requesting...' : 'Request Ride'}</button>
            </form>
            {isSuccess && <p>Ride Requested!</p>}
        </div>
    );
}

function RidesList({ count }: { count: number }) {
    const rides = [];
    for (let i = 1; i <= count; i++) {
        rides.push(<RideItem key={i} id={i} />);
    }
    return <div className="ride-list">{rides.reverse()}</div>;
}

function RideItem({ id }: { id: number }) {
    const { data: ride, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: rideSharingAbi,
        functionName: 'getRide',
        args: [BigInt(id)],
    });

    const { writeContract, data: hash } = useWriteContract();
    const { isSuccess } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (isSuccess) refetch();
    }, [isSuccess, refetch]);

    if (!ride) return null;


    // State Mapping: 0:Requested, 1:Accepted, 2:Funded, 3:CompletedByDriver, 4:Finalized, 5:Cancelled
    const states = ['Requested', 'Accepted', 'Funded', 'Completed (Driver)', 'Finalized', 'Cancelled'];
    const stateName = states[ride.state];
    const statusClass = `status-${stateName.toLowerCase().replace(/[\s()]/g, '')}`;

    return (
        <div className="ride-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Ride #{Number(ride.id)}</span>
                <span className={statusClass}>{stateName}</span>
            </div>

            <p><strong>Route:</strong> {ride.origin} ➝ {ride.destination}</p>
            <p><strong>Passenger:</strong> {ride.passenger.slice(0, 6)}...{ride.passenger.slice(-4)}</p>
            {ride.driver !== '0x0000000000000000000000000000000000000000' && (
                <p><strong>Driver:</strong> {ride.driver.slice(0, 6)}...{ride.driver.slice(-4)}</p>
            )}
            <p style={{ fontSize: '1.2rem', color: '#00d2ff', marginTop: '10px' }}>
                {formatEther(ride.amount)} ETH
            </p>

            <div className="actions">
                {/* Driver Actions */}
                {ride.state === 0 && (
                    <button onClick={() => writeContract({
                        address: CONTRACT_ADDRESS,
                        abi: rideSharingAbi,
                        functionName: 'acceptRide',
                        args: [BigInt(ride.id)],
                    })}>Accept Ride</button>
                )}
                {ride.state === 2 && (
                    <button onClick={() => writeContract({
                        address: CONTRACT_ADDRESS,
                        abi: rideSharingAbi,
                        functionName: 'completeRide',
                        args: [BigInt(ride.id)],
                    })}>Complete Ride</button>
                )}

                {/* Passenger Actions */}
                {ride.state === 1 && (
                    <button onClick={() => writeContract({
                        address: CONTRACT_ADDRESS,
                        abi: rideSharingAbi,
                        functionName: 'fundRide',
                        args: [BigInt(ride.id)],
                        value: ride.amount,
                    })}>Fund Ride</button>
                )}
                {ride.state === 3 && (
                    <button onClick={() => writeContract({
                        address: CONTRACT_ADDRESS,
                        abi: rideSharingAbi,
                        functionName: 'confirmArrival',
                        args: [BigInt(ride.id)],
                    })}>Confirm Arrival</button>
                )}

                {/* Cancel Action (Only Requested, Accepted, Funded) */}
                {[0, 1, 2].includes(ride.state) && (
                    <button onClick={() => writeContract({
                        address: CONTRACT_ADDRESS,
                        abi: rideSharingAbi,
                        functionName: 'cancelRide',
                        args: [BigInt(ride.id)],
                    })} style={{ background: 'rgba(255, 50, 50, 0.2)', border: '1px solid rgba(255, 50, 50, 0.4)', color: '#ff6b6b' }}>Cancel Ride</button>
                )}
            </div>
            {hash && <div className="hash">Tx: {hash.slice(0, 10)}...</div>}
        </div>
    );
}
