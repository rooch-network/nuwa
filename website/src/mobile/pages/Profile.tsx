import { useState, useEffect } from 'react';
import { useCurrentAddress, useConnectionStatus, ConnectButton, SessionKeyGuard } from '@roochnetwork/rooch-sdk-kit';
import useUserInfo from '../../hooks/use-user-info';
import useRgasBalance from '../../hooks/use-rgas-balance';
import { UserInfo } from '../../types/user';
import { useNavigate } from 'react-router-dom';
import { PortfolioPanel } from '../components/profile/PortfolioPanel';
import toast from 'react-hot-toast';

const Profile = () => {
    const address = useCurrentAddress();
    const connectionStatus = useConnectionStatus();
    const navigate = useNavigate();
    const { userInfo } = useUserInfo(address?.genRoochAddress().toHexAddress());
    const { balance: rGas } = useRgasBalance(address?.genRoochAddress().toHexAddress());
    const [userProfile, setUserProfile] = useState<UserInfo | null>(null);

    useEffect(() => {
        if (connectionStatus === 'connected' && userInfo) {
            setUserProfile(userInfo);
        }
    }, [connectionStatus, userInfo]);

    const handleLogout = () => {
        const prefix = 'rooch-sdk-kit';
        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        });
        window.location.reload();
    };

    return (
        <div className="fixed inset-0 bg-gray-50 overflow-hidden">
            {/* 顶部导航栏 */}
            <div className="absolute top-0 left-0 right-0 h-14 bg-white border-b border-gray-200">
                <div className="h-full flex items-center px-4">
                    <h1 className="text-lg font-semibold flex-1 text-center">Profile</h1>
                </div>
            </div>

            {/* 主要内容区域 */}
            <div className="absolute top-0 bottom-0 left-0 right-0 overflow-hidden">
                {connectionStatus !== 'connected' ? (
                    <div className="h-full flex flex-col items-center justify-center px-4 overflow-hidden">
                        <div className="w-full max-w-sm flex flex-col items-center justify-center overflow-hidden">
                            <div className="text-center space-y-3">
                                <div className="w-20 h-20 mx-auto mb-4">
                                    <img
                                        src="/images/wallet-connect.svg"
                                        alt="Connect Wallet"
                                        className="w-full h-full"
                                    />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Connect Your Wallet</h2>
                                <p className="text-gray-600 text-sm">
                                    Connect your wallet to view your profile and asset information
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Support OKX Wallet</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    <span>Safe and Reliable</span>
                                </div>
                            </div>

                            <ConnectButton className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span>Connect Wallet</span>
                            </ConnectButton>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 px-4">
                        {/* 头像区域 */}
                        <div className="bg-white rounded-lg p-4">
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    <img
                                        src={userProfile?.avatar || 'https://via.placeholder.com/100'}
                                        alt="avatar"
                                        className="w-16 h-16 rounded-full"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="text-lg font-semibold">{userProfile?.name || 'Name Not Set'}</div>
                                    <div className="text-sm text-gray-500">{userProfile?.username || 'Username Not Set'}</div>
                                </div>
                                <SessionKeyGuard onClick={() => navigate('/profile/edit')}>
                                    <button
                                        className="text-purple-600 text-sm font-medium"
                                        onClick={() => { }}
                                    >
                                        Edit
                                    </button>
                                </SessionKeyGuard>
                            </div>
                        </div>

                        {/* RGAS Balance */}
                        <div className="bg-white rounded-lg p-4">
                            <div className="text-sm text-gray-500 mb-2">RGAS Balance</div>
                            <div className="text-lg font-semibold">
                                {rGas?.toLocaleString() || '0'} RGAS
                            </div>
                        </div>

                        {/* Wallet Address */}
                        <div className="bg-white rounded-lg p-4">
                            <div className="text-sm text-gray-500 mb-2">Wallet Address (Click to copy)</div>
                            <div
                                className="text-sm font-mono break-all cursor-pointer hover:text-purple-600 transition-colors"
                                onClick={() => {
                                    navigator.clipboard.writeText(address?.genRoochAddress().toBech32Address() || '');
                                    toast.success('Address Copied');
                                }}
                            >
                                {address?.genRoochAddress().toBech32Address()}
                            </div>
                        </div>

                        {/* Portfolio 板块 */}
                        <PortfolioPanel
                            address={address?.genRoochAddress().toBech32Address() || ''}
                        />

                        {/* 退出登录按钮 */}
                        <div className="bg-white rounded-lg px-4">
                            <button
                                onClick={handleLogout}
                                className="w-full text-red-500 text-center py-2 font-medium"
                            >
                                Disconnect Wallet
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile; 