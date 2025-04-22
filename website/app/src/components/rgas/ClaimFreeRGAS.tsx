import { useState } from 'react'

type ClaimMethod = 'newUser' | 'twitter' | 'invite'

export const ClaimFreeRGAS = () => {
    const [claimStatus, setClaimStatus] = useState<Record<ClaimMethod, 'available' | 'pending' | 'claimed'>>({
        newUser: 'available',
        twitter: 'available',
        invite: 'available',
    })

    const handleClaim = (method: ClaimMethod) => {
        if (claimStatus[method] !== 'available') return

        setClaimStatus((prev) => ({ ...prev, [method]: 'pending' }))

        // Simulate API call
        setTimeout(() => {
            setClaimStatus((prev) => ({ ...prev, [method]: 'claimed' }))
        }, 1500)
    }

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-6 dark:text-white">Get Free RGAS</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                There are multiple ways to get RGAS tokens for free. Complete the following tasks to claim:
            </p>

            <div className="space-y-6">
                {/* New User Reward */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium dark:text-white">New User Reward</h3>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">New registered users can claim 50 RGAS for free</p>
                        </div>
                        <button
                            onClick={() => handleClaim('newUser')}
                            disabled={claimStatus.newUser !== 'available'}
                            className={`px-4 py-2 rounded-md text-white font-medium ${claimStatus.newUser === 'available'
                                ? 'bg-blue-500 hover:bg-blue-600'
                                : claimStatus.newUser === 'pending'
                                    ? 'bg-gray-400 cursor-wait'
                                    : 'bg-green-500 cursor-default'
                                }`}
                        >
                            {claimStatus.newUser === 'available'
                                ? 'Claim'
                                : claimStatus.newUser === 'pending'
                                    ? 'Processing...'
                                    : 'Claimed'}
                        </button>
                    </div>
                </div>

                {/* Connect Twitter */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium dark:text-white">Connect Twitter Account</h3>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">Connect your Twitter account to get 100 RGAS</p>
                        </div>
                        <button
                            onClick={() => handleClaim('twitter')}
                            disabled={claimStatus.twitter !== 'available'}
                            className={`px-4 py-2 rounded-md text-white font-medium ${claimStatus.twitter === 'available'
                                ? 'bg-blue-500 hover:bg-blue-600'
                                : claimStatus.twitter === 'pending'
                                    ? 'bg-gray-400 cursor-wait'
                                    : 'bg-green-500 cursor-default'
                                }`}
                        >
                            {claimStatus.twitter === 'available'
                                ? 'Connect Twitter'
                                : claimStatus.twitter === 'pending'
                                    ? 'Processing...'
                                    : 'Claimed'}
                        </button>
                    </div>
                </div>

                {/* Invite Friends */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium dark:text-white">Invite Friends</h3>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">Earn 75 RGAS for each new user who registers with your referral</p>
                        </div>
                        <div className="flex space-x-3">
                            <input
                                type="text"
                                readOnly
                                value="https://nuwa.io/refer?code=YOUR_CODE"
                                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-800 dark:text-gray-200"
                            />
                            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium">
                                Copy
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 