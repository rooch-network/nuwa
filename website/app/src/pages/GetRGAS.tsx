import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ClaimFreeRGAS } from '../components/rgas/ClaimFreeRGAS'
import { BuyRGAS } from '../components/rgas/BuyRGAS'

export const GetRGAS = () => {
    const [activeTab, setActiveTab] = useState<'claim' | 'buy'>('claim')

    return (
        <div className="container mx-auto px-4 py-8">
            <Helmet>
                <title>Get RGAS - Nuwa</title>
            </Helmet>

            <h1 className="text-3xl font-bold mb-6 text-center dark:text-white">Get RGAS</h1>

            {/* Tabs */}
            <div className="flex justify-center mb-8">
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('claim')}
                        className={`px-6 py-3 text-sm font-medium ${activeTab === 'claim'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        Get Free RGAS
                    </button>
                    <button
                        onClick={() => setActiveTab('buy')}
                        className={`px-6 py-3 text-sm font-medium ${activeTab === 'buy'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        Buy RGAS
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                {activeTab === 'claim' ? (
                    <ClaimFreeRGAS />
                ) : (
                    <BuyRGAS />
                )}
            </div>
        </div>
    )
}
