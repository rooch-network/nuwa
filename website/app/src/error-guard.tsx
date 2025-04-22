import { useSubscribeOnError } from '@roochnetwork/rooch-sdk-kit'
import { useEffect } from "react";
import toast from 'react-hot-toast';
import type { ErrorType } from '@roochnetwork/rooch-sdk-kit';

interface MoveAbortStatus {
  type: 'moveabort';
  location: string;
  abort_code: string;
}

// Error code mapping to friendly messages
const ERROR_MESSAGES: Record<number, string> = {
  // Channel Entry Errors
  1: "Invalid coin type. Please check your payment method.",
  2: "Invalid recipient address. Please check the address and try again.",
  3: "Invalid amount. Please enter a valid amount.",

  // Agent Errors
  4: "Invalid agent temperature setting. Please try again.",

  // Name Registry Errors
  5: "Username is already registered. Please choose a different username.",
  6: "Username is not registered. Please check and try again.",
  7: "You don't have permission to perform this action.",
  8: "This address is already registered with another username.",

  // AI Service Errors
  9: "Invalid deposit amount. Please check and try again.",
  10: "Insufficient balance. Please add more funds.",

  // Agent Runner Errors
  11: "Insufficient base fee. Please add more funds to continue.",
};

// Move contract error messages
const MOVE_ERROR_MESSAGES: Record<string, Record<number, string>> = {
  "0x3::coin_store": {
    4: "Insufficient RGas balance in your account. Please add more funds.",
    5: "Coin store not found. Please try again.",
    6: "Invalid coin type. Please check your payment method.",
    7: "Coin store already exists. Please try again.",
  },
};

export function ErrorGuard() {
  const subscribeToError = useSubscribeOnError();

  useEffect(() => {
    const unsubscribe = subscribeToError((error: ErrorType) => {
      // Keep console log for debugging
      console.error('Error occurred:', error);

      let friendlyMessage = error.message;

      // Eliminate this error
      // https://github.com/rooch-network/nuwa/issues/143
      if (error.code === 32602) {
        console.log(error.message);
        return 
      }

      // Handle Move contract errors
      if ('status' in error && (error.status as MoveAbortStatus).type === 'moveabort') {
        const status = error.status as MoveAbortStatus;
        const location = status.location;
        const abortCode = parseInt(status.abort_code);

        // Check if we have a specific message for this location and abort code
        if (MOVE_ERROR_MESSAGES[location]?.[abortCode]) {
          friendlyMessage = MOVE_ERROR_MESSAGES[location][abortCode];
        }
      } else {
        // Handle regular errors
        friendlyMessage = ERROR_MESSAGES[error.code] || error.message;
      }

      // Display error toast in bottom-left corner
      toast.error(friendlyMessage, {
        position: 'bottom-left',
        duration: 5000, // Auto dismiss after 5 seconds
      });
    });

    return () => {
      unsubscribe();
    };
  }, [subscribeToError]);

  // Add toast container to render notifications
  return (
    <>
      <div className="fixed bottom-4 left-4 z-50" /> {/* Toast anchor point */}
    </>
  );
}
