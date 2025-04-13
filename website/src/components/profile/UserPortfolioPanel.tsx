import useAllBalance from "@/hooks/useAllBalance";
import { useTransfer } from "@/hooks/useTransfer";
import { Token } from "@/types/user";
import { normalizeCoinIconUrl } from "@/utils/icon";
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  SessionKeyGuard,
  useCurrentAddress,
} from "@roochnetwork/rooch-sdk-kit";
import { useState } from "react";
import toast from "react-hot-toast";

interface PortfolioPanelProps {
  address: string;
}

export const UserPortfolioPanel = ({ address }: PortfolioPanelProps) => {
  const currentAddress = useCurrentAddress();
  const isOwnProfile =
    currentAddress?.genRoochAddress().toBech32Address() === address;
  const {
    balances,
    isPending: isBalancePending,
    isError: isBalanceError,
    refetchBalance: refetchAllBalance,
  } = useAllBalance(address);
  const { mutate: transfer, isPending: isTransferring } = useTransfer();
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    recipient: "",
    amount: "",
    coinType: "",
  });
  const [currentToken, setCurrentToken] = useState<{
    name: string;
    symbol: string;
  } | null>(null);

  const itemsPerPage = 5;
  const totalPages = balances ? Math.ceil(balances.length / itemsPerPage) : 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageTokens = balances?.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchAllBalance();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleTransfer = async (token: Token) => {
    setTransferForm((prev) => ({
      ...prev,
      coinType: token.id,
    }));
    setCurrentToken({
      name: token.name,
      symbol: token.symbol,
    });
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = async () => {
    try {
      await transfer({
        recipient: transferForm.recipient,
        amount: BigInt(Number(transferForm.amount) * 100_000_000), // Convert to smallest unit
        coinType: { target: transferForm.coinType },
      });
      setIsTransferModalOpen(false);
      refetchAllBalance();
      toast.success("转账成功！", {
        position: "bottom-right",
        duration: 3000,
      });
    } catch (error) {
      console.error("Transfer failed:", error);
      toast.error("转账失败，请重试", {
        position: "bottom-right",
        duration: 3000,
      });
    }
  };

  if (isBalancePending) {
    return <div>Loading...</div>;
  }

  if (isBalanceError) {
    return <div>Error loading portfolio</div>;
  }

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Portfolio
        </h2>
        <button
          className={`text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-transform duration-1000 ${
            isRefreshing ? "animate-spin" : ""
          }`}
          title="Refresh"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <ArrowPathIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-4">
        {currentPageTokens && currentPageTokens.length > 0 ? (
          currentPageTokens.map((tokenBalance) => (
            <div
              key={tokenBalance.token.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <img
                  src={
                    tokenBalance.token.logo
                      ? normalizeCoinIconUrl(tokenBalance.token.logo)
                      : `data:image/svg+xml;utf8,${encodeURIComponent(
                          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="1.5"/><path d="M15 8.5C14.315 7.81501 13.1087 7.33003 12 7.33003C9.42267 7.33003 7.33333 9.41937 7.33333 12C7.33333 14.5807 9.42267 16.67 12 16.67C13.1087 16.67 14.315 16.185 15 15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M13.3333 12H16.6667M16.6667 12L15.3333 10.5M16.6667 12L15.3333 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                        )}`
                  }
                  alt={tokenBalance.token.name}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 p-1.5"
                />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {tokenBalance.token.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {tokenBalance.token.symbol}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {tokenBalance.balance}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {tokenBalance.token.symbol}
                  </p>
                </div>
                {isOwnProfile && (
                  <SessionKeyGuard
                    onClick={() => handleTransfer(tokenBalance.token)}
                  >
                    <button
                      className="px-3 py-1 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 border border-purple-600 dark:border-purple-400 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                      disabled={isTransferring}
                    >
                      {isTransferring ? "Transferring..." : "Transfer"}
                    </button>
                  </SessionKeyGuard>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No Assets Available
            </p>
          </div>
        )}
      </div>
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
              currentPage === 1
                ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
            }`}
          >
            <ChevronLeftIcon className="w-5 h-5 mr-1" />
            Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
              currentPage === totalPages
                ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
            }`}
          >
            Next
            <ChevronRightIcon className="w-5 h-5 ml-1" />
          </button>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Transfer {currentToken?.symbol || ""}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={transferForm.recipient}
                  onChange={(e) =>
                    setTransferForm((prev) => ({
                      ...prev,
                      recipient: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Enter recipient address"
                  disabled={isTransferring}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={transferForm.amount}
                  onChange={(e) =>
                    setTransferForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Enter amount"
                  disabled={isTransferring}
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                  disabled={isTransferring}
                >
                  Cancel
                </button>
                <SessionKeyGuard onClick={handleTransferSubmit}>
                  <button
                    disabled={
                      isTransferring ||
                      !transferForm.recipient ||
                      !transferForm.amount
                    }
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTransferring ? "Transferring..." : "Transfer"}
                  </button>
                </SessionKeyGuard>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
