import { useState, useEffect } from 'react'

export const BuyRGAS = () => {
    const [fromAmount, setFromAmount] = useState<string>('')
    const [toAmount, setToAmount] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [btcUsdRate, setBtcUsdRate] = useState<number>(0)

    // RGAS to USD rate: 100 RGAS = 1 USD
    const RGAS_USD_RATE = 100

    useEffect(() => {
        const fetchBtcRate = async () => {
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
                const data = await response.json()
                setBtcUsdRate(data.bitcoin.usd)
            } catch (error) {
                console.error('Failed to fetch BTC rate:', error)
            }
        }

        fetchBtcRate()
        // 每60秒更新一次汇率
        const interval = setInterval(fetchBtcRate, 60000)
        return () => clearInterval(interval)
    }, [])

    // Calculate RGAS to BTC rate
    // 1 RGAS = 0.01 USD
    // 1 BTC = btcUsdRate USD
    // Therefore: 1 RGAS = 0.01 / btcUsdRate BTC
    const rgasToBtcRate = 0.01 / btcUsdRate

    const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setFromAmount(value)

        // Calculate exchange amount
        if (value === '') {
            setToAmount('')
        } else {
            const numValue = parseFloat(value)
            if (!isNaN(numValue)) {
                setToAmount((numValue / rgasToBtcRate).toString())
            }
        }
    }

    const handleToAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setToAmount(value)

        // Reverse calculation
        if (value === '') {
            setFromAmount('')
        } else {
            const numValue = parseFloat(value)
            if (!isNaN(numValue)) {
                setFromAmount((numValue * rgasToBtcRate).toString())
            }
        }
    }

    const handleSubmit = () => {
        if (!fromAmount || parseFloat(fromAmount) <= 0) return

        setIsSubmitting(true)

        // Simulate transaction process
        setTimeout(() => {
            setIsSubmitting(false)
            // Reset form or show success message
            setFromAmount('')
            setToAmount('')
        }, 2000)
    }

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-semibold dark:text-white">Buy RGAS</h2>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-center space-x-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">¥</span>
                        </div>
                        <span className="font-medium text-sm dark:text-white">RGAS Price</span>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-blue-500 dark:text-blue-400">
                            {rgasToBtcRate.toFixed(8)} <span className="text-sm">₿</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            = $1 USD
                        </div>
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        BTC/USD: ${btcUsdRate.toLocaleString()}
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto">
                {/* FROM area */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-2">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">FROM</label>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Balance: 0.02 BTC
                        </span>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="number"
                            value={fromAmount}
                            onChange={handleFromAmountChange}
                            placeholder="0"
                            className="w-full text-3xl bg-transparent border-none outline-none dark:text-white"
                        />
                        <div className="flex items-center space-x-2 ml-4">
                            <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center">
                                <span className="text-white font-bold">₿</span>
                            </div>
                            <span className="font-semibold dark:text-white">BTC</span>
                        </div>
                    </div>
                </div>

                {/* Exchange icon */}
                <div className="flex justify-center -my-2 relative z-10">
                    <div className="bg-purple-400 rounded-full w-10 h-10 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </div>
                </div>

                {/* TO area */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">TO</label>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Balance: 504,846.7 RGAS
                        </span>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="number"
                            value={toAmount}
                            onChange={handleToAmountChange}
                            placeholder="0"
                            className="w-full text-3xl bg-transparent border-none outline-none dark:text-white"
                        />
                        <div className="flex items-center space-x-2 ml-4">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-white font-bold">¥</span>
                            </div>
                            <span className="font-semibold dark:text-white">RGAS</span>
                        </div>
                    </div>
                </div>

                {/* Submit button */}
                <button
                    onClick={handleSubmit}
                    disabled={!fromAmount || parseFloat(fromAmount) <= 0 || isSubmitting}
                    className={`w-full py-3 rounded-lg text-white font-semibold ${!fromAmount || parseFloat(fromAmount) <= 0 || isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                >
                    {isSubmitting ? 'Processing...' : 'Confirm Exchange'}
                </button>
            </div>
        </div>
    )
} 