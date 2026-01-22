
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { formatEther } from 'viem'
import { WagmiProvider, useAccount, useConnect, useDisconnect, useBalance, useSwitchChain } from 'wagmi'
import { config } from './wagmi'
import { DriverRegistration } from './components/DriverRegistration'
import { RideList } from './components/RideList'
import './App.css'

const queryClient = new QueryClient()

// REPLACE THIS WITH YOUR DEPLOYED CONTRACT ADDRESS
export const CONTRACT_ADDRESS = '0xaAa5dAAa19F59D02A79eCA47eE182Eb79eCd3040' as `0x${string}`;

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="container">
          <header>
            <h1>Ride Sharing DApp</h1>
            <WalletProfile />
          </header>

          <main>
            <ContractStatus />
            <div className="main-grid">
              <div className="left-panel">
                <DriverRegistration />
              </div>
              <div className="right-panel">
                <RideList />
              </div>
            </div>
          </main>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

function WalletProfile() {
  const { address, isConnected, chainId } = useAccount()
  const { data: balance } = useBalance({ address })
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  // Sepolia Chain ID is 11155111
  const isWrongNetwork = isConnected && chainId !== 11155111;

  if (isConnected) {
    return (
      <div className="profile-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        {isWrongNetwork && (
          <div style={{ background: '#ff4d4d', color: 'white', padding: '8px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⚠️ Wrong Network!</span>
            <button
              onClick={() => switchChain({ chainId: 11155111 })}
              style={{ background: 'white', color: '#ff4d4d', padding: '4px 8px', fontSize: '0.8rem', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
            >
              Switch to Sepolia
            </button>
          </div>
        )}
        <div className="profile">
          <div>
            <p>Connected</p>
            <strong>{address?.slice(0, 6)}...{address?.slice(-4)}</strong>
          </div>
          <div>
            <p>Balance</p>
            <strong>{balance ? Number(formatEther(balance.value)).toFixed(4) : '0'} {balance?.symbol}</strong>
          </div>
          <button className="disconnect-btn" onClick={() => disconnect()} style={{ background: 'rgba(255,50,50,0.2)', border: '1px solid rgba(255,50,50,0.3)', marginTop: 0 }}>Disconnect</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {connectors.map((connector) => (
        <button key={connector.uid} onClick={() => connect({ connector })}>
          Connect {connector.name}
        </button>
      ))}
    </div>
  )
}

function ContractStatus() {
  return (
    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
      <span style={{
        background: 'rgba(0,255,255,0.1)',
        color: '#00d2ff',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '0.85rem',
        border: '1px solid rgba(0,255,255,0.2)'
      }}>
        Contract: {CONTRACT_ADDRESS}
      </span>
    </div>
  )
}

export default App
