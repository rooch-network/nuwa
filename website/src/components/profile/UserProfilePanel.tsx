import useRgasBalance from "@/hooks/useRgasBalance";
import useUserInfo from "@/hooks/useUserInfo";
import { useUserInit } from "@/hooks/useUserInit";
import { useUserUpdate } from "@/hooks/useUserUpdate";
import { ClipboardIcon, PencilIcon } from "@heroicons/react/24/outline";
import {
  SessionKeyGuard,
  useCurrentAddress,
} from "@roochnetwork/rooch-sdk-kit";
import { useState } from "react";
import { toast } from "react-toastify";
import { EditProfileModal } from "../profile/EditUserProfileModal";

const roochScanBaseUrl = "https://test.roochscan.io";

interface ProfilePanelProps {
  address: string;
}

export const UserProfilePanel = ({ address }: ProfilePanelProps) => {
  const currentAddress = useCurrentAddress();
  const isOwnProfile =
    currentAddress?.genRoochAddress().toBech32Address() === address;
  const {
    balance: rGas,
    isPending: isRgasPending,
    isError: isRgasError,
  } = useRgasBalance(address);
  const {
    userInfo,
    isPending: isUserInfoPending,
    isError: isUserInfoError,
    refetch: refetchUserInfo,
  } = useUserInfo(address);
  const { isPending: isUpdating } = useUserUpdate();
  const { isPending: isInitializing } = useUserInit();
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard!", {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
    });
  };

  if (isRgasPending || isUserInfoPending) {
    return <div>Loading...</div>;
  }

  if (isRgasError || isUserInfoError || !userInfo) {
    return <div>Error loading user profile</div>;
  }

  const handlerRefreshUserInfo = async () => {
    const s = setTimeout(async () => {
      await refetchUserInfo();
      clearTimeout(s);
    }, 1000);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-r from-purple-600 to-pink-600"></div>

        {/* Profile Info */}
        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-16 mb-4 group w-32 h-32">
            <div className="w-full h-full relative rounded-full overflow-hidden">
              <img
                src={userInfo.avatar}
                alt={userInfo.name}
                className="w-full h-full rounded-full border-0 border-white dark:border-gray-800 bg-white dark:bg-gray-800 object-cover"
              />
            </div>
          </div>

          {/* Name and Username */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {userInfo.name || "Name Not Set"}
                </h1>
              </div>
              {isOwnProfile && (
                <SessionKeyGuard
                  onClick={() => setIsEditProfileModalOpen(true)}
                >
                  <button
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    title="Edit Profile"
                  >
                    <PencilIcon className="w-4 h-4 mr-2" />
                    Edit Profile
                  </button>
                </SessionKeyGuard>
              )}
            </div>
            <div className="mt-1 flex flex-col space-y-2">
              <div className="text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                @<span>{userInfo.username || "Username Not Set"}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {address}
                    </span>
                    <button
                      onClick={() => handleCopy(address?.toString() || "")}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Copy Address"
                    >
                      <ClipboardIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <a
                    href={`${roochScanBaseUrl}/account/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer mt-0.5"
                  >
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                      View on Explorer
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RGAS Balance */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                RGAS Balance
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {rGas?.toLocaleString()} RGAS
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        initialData={{
          name: userInfo.name || "",
          username: userInfo.username || "",
          avatar: userInfo.avatar || "",
          id: userInfo.id,
        }}
        hasUsername={!!userInfo.username}
        isSubmitting={isUpdating || isInitializing}
        onSuccess={() => {
          handlerRefreshUserInfo();
        }}
      />
    </>
  );
};
