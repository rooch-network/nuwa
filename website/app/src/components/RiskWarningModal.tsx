import { useState } from 'react'
import { createPortal } from 'react-dom'

interface RiskWarningModalProps {
    isOpen: boolean
    onClose: () => void
}

export function RiskWarningModal({ isOpen, onClose }: RiskWarningModalProps) {
    const [isChecked, setIsChecked] = useState(true)

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[500px] max-w-[90vw]">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    Alpha Test Warning
                </h2>
                <div className="space-y-4 text-gray-600 dark:text-gray-300">
                    <p>1. The platform is currently in beta testing phase. We welcome you to test the features and submit test reports</p>
                    <p>2. All chat messages are on-chain transactions and publicly visible. Please be kind in your interactions</p>
                    <p>3. Users need to obtain testnet RGAS before using any features</p>
                </div>
                <div className="mt-6 flex items-center">
                    <input
                        type="checkbox"
                        id="understand"
                        checked={isChecked}
                        onChange={(e) => setIsChecked(e.target.checked)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="understand" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                        I understand
                    </label>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={() => {
                            localStorage.setItem('hasSeenRiskWarning', 'true')
                            onClose()
                        }}
                        disabled={!isChecked}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
} 