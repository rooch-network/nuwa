import useUserInfo from "@/hooks/useUserInfo";
import { UserInfo } from "@/types/user";
import { Menu, Transition } from "@headlessui/react";
import {
  ConnectButton,
  useConnectionStatus,
  useCurrentAddress,
  useSubscribeOnRequest,
} from "@roochnetwork/rooch-sdk-kit";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import useRgasBalance from "@/hooks/useRgasBalance";

interface HeaderProps {
  isDarkMode: boolean;
}

export function Header({ isDarkMode }: HeaderProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const address = useCurrentAddress();
  const connectionStatus = useConnectionStatus();
  const { balance: rGas, refetchBalance } = useRgasBalance(
    address?.genRoochAddress().toHexAddress()
  );
  const subscribeOnRequest = useSubscribeOnRequest();
  const { userInfo } = useUserInfo(address?.genRoochAddress().toHexAddress());
  const hasShownToast = useRef(false);
  const hasShownProfileToast = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeOnRequest((status) => {
      switch (status) {
        case "success":
          refetchBalance();
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [subscribeOnRequest, address, refetchBalance]);

  useEffect(() => {
    if (connectionStatus === "connected" && userInfo) {
      setUser({
        ...userInfo,
      });
    }
  }, [rGas, userInfo, connectionStatus, address]);

  // Show different toasts based on wallet connection and RGAS balance
  useEffect(() => {
    if (connectionStatus === "connected" && address && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.success("Wallet Connected", {
        duration: 3000,
        position: "top-center",
        className: "mt-4",
      });
    }
  }, [connectionStatus, address]);

  // Show profile creation toast when user has RGAS but no username
  useEffect(() => {
    if (
      connectionStatus === "connected" &&
      address &&
      userInfo &&
      !userInfo?.name &&
      rGas &&
      rGas > 0 &&
      !hasShownProfileToast.current
    ) {
      hasShownProfileToast.current = true;
      toast(
        <div className="flex flex-col gap-1 text-sm w-full">
          <div className="font-bold">Create your profile</div>
          <Link
            to={`/profile/${address?.genRoochAddress().toBech32Address()}`}
            className="text-purple-500 hover:text-purple-600 font-medium dark:text-purple-200 dark:hover:text-purple-300"
          >
            Click here to set up your profile
          </Link>
        </div>,
        {
          duration: 5000,
          position: "top-center",
          className:
            "mt-4 bg-purple-50 border border-purple-200 text-purple-800 dark:bg-purple-900 dark:border-purple-800 dark:text-purple-300",
          icon: "👤",
        }
      );
    }
  }, [connectionStatus, address, userInfo, rGas]);

  // Show RGAS toast when balance is 0
  useEffect(() => {
    if (
      connectionStatus === "connected" &&
      address &&
      rGas === 0 &&
      window.location.pathname !== "/getrgas-testnet"
    ) {
      toast(
        <div className="flex flex-col gap-1 text-sm w-full">
          <div>No RGAS balance</div>
          <Link
            to="/getrgas-testnet"
            className="text-purple-500 hover:text-purple-600 font-medium dark:text-purple-200 dark:hover:text-purple-300"
          >
            Click here to get FREE RGAS
          </Link>
        </div>,
        {
          duration: 5000,
          position: "top-center",
          className:
            "mt-4 bg-purple-50 border border-purple-200 text-purple-800 dark:bg-purple-900 dark:border-purple-800 dark:text-purple-300",
          icon: "💜",
        }
      );
    }
  }, [rGas, address]);

  const handleLogout = () => {
    setUser(null);
    const prefix = "rooch-sdk-kit";
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  };

  const formatAddress = (address: string | undefined) => {
    if (!address) return "";
    if (address.length <= 6) return address;
    return `${address.slice(0, 5)}...${address.slice(-3)}`;
  };

  return (
    <div className="fixed top-0 right-0 left-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
      <div className="h-full flex items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img
            src={
              isDarkMode
                ? "/nuwa-logo-horizontal-dark.svg"
                : "/nuwa-logo-horizontal.svg"
            }
            alt="Nuwa Logo"
            className="h-8 w-auto"
          />
        </Link>

        {/* Right side content */}
        <div className="flex items-center space-x-4">
          <Link
            to="/docs/intro"
            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            Documentation
          </Link>
          <div className="p-1">
            <ThemeToggle />
          </div>
          {connectionStatus !== "connected" ? (
            <ConnectButton className="px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
              Connect Wallet
            </ConnectButton>
          ) : (
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center space-x-4 focus:outline-none">
                <img
                  src={user?.avatar}
                  alt={user?.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user?.name ||
                      formatAddress(
                        address?.genRoochAddress().toBech32Address()
                      )}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {rGas?.toLocaleString()} RGAS
                  </span>
                </div>
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white dark:!bg-black/95 shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/studio"
                          className={`${
                            active
                              ? "!bg-gray-100 dark:!bg-purple-500/10 dark:!text-purple-400"
                              : "dark:!text-gray-300"
                          } block px-4 py-2 text-sm text-gray-700 hover:!bg-gray-100 dark:hover:!bg-purple-500/10 dark:hover:!text-purple-400 transition-colors !bg-transparent`}
                        >
                          AI Studio
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to={`/profile/${address
                            ?.genRoochAddress()
                            .toBech32Address()}`}
                          className={`${
                            active
                              ? "!bg-gray-100 dark:!bg-purple-500/10 dark:!text-purple-400"
                              : "dark:!text-gray-300"
                          } block px-4 py-2 text-sm text-gray-700 hover:!bg-gray-100 dark:hover:!bg-purple-500/10 dark:hover:!text-purple-400 transition-colors !bg-transparent`}
                        >
                          Profile
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/getrgas-testnet"
                          className={`${
                            active
                              ? "!bg-gray-100 dark:!bg-purple-500/10 dark:!text-purple-400"
                              : "dark:!text-gray-300"
                          } block px-4 py-2 text-sm text-gray-700 hover:!bg-gray-100 dark:hover:!bg-purple-500/10 dark:hover:!text-purple-400 transition-colors !bg-transparent`}
                        >
                          Get RGAS
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={`${
                            active
                              ? "!bg-gray-100 dark:!bg-purple-500/10 dark:!text-purple-400"
                              : "dark:!text-gray-300"
                          } block w-full text-left px-4 py-2 text-sm text-gray-700 hover:!bg-gray-100 dark:hover:!bg-purple-500/10 dark:hover:!text-purple-400 transition-colors !bg-transparent`}
                        >
                          Log Out
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          )}
        </div>
      </div>
    </div>
  );
}
