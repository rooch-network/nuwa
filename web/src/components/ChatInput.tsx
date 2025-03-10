import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, CurrencyDollarIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { SessionKeyGuard } from '@roochnetwork/rooch-sdk-kit';

interface ChatInputProps {
  onSend: (message: string, payment?: { amount: string }) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  showPaymentOption?: boolean;
}

export function ChatInput({ 
  onSend, 
  placeholder = "Type a message...", 
  disabled = false,
  value,
  onChange,
  showPaymentOption = false
}: ChatInputProps) {
  const [localValue, setLocalValue] = useState(value || '');
  const [showWarning, setShowWarning] = useState(true);
  const [paymentMode, setPaymentMode] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('0.1'); // Default to 0.1 RGas
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localValue]);

  useEffect(() => {
    if (value !== undefined) {
      setLocalValue(value);
    }
  }, [value]);

  const handleSubmit = async () => {
    const message = localValue.trim();
    if (message && !disabled) {
      try {
        if (paymentMode && paymentAmount) {
          // Convert the decimal amount to the correct integer representation
          // RGas has 8 decimal places, so multiply by 10^8
          const rawAmount = (parseFloat(paymentAmount) * 100000000).toString();
          await onSend(message, { amount: rawAmount });
        } else {
          await onSend(message);
        }
        // Only clear input if message was sent successfully
        if (value === undefined) {
          setLocalValue('');
        }
        // Reset payment mode and amount after sending
        if (paymentMode) {
          setPaymentMode(false);
        }
      } catch (error) {
        // Keep the input value if sending failed
        console.error('Failed to send message:', error);
      }
    }
  };
  
  // Format the input to ensure valid decimal
  const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string for user to clear input
    if (value === '') {
      setPaymentAmount('');
      return;
    }
    
    // Validate that input is a valid decimal number
    const regex = /^\d*\.?\d{0,8}$/; // Allow up to 8 decimal places
    if (regex.test(value)) {
      setPaymentAmount(value);
    }
  };
  
  // Handle AI trigger
  const handleAITrigger = () => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = localValue.slice(0, cursorPos);
    const textAfterCursor = localValue.slice(cursorPos);
    
    const newValue = localValue.trim() === '' 
      ? '/ai ' 
      : (localValue.toLowerCase().startsWith('/ai') || localValue.includes('@AI')) 
        ? localValue 
        : textBeforeCursor + '@AI ' + textAfterCursor;
    
    setLocalValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = newValue.length;
        textareaRef.current.selectionEnd = newValue.length;
      }
    }, 0);
  };
  
  // Handle payment toggle
  const handleTogglePayment = () => {
    setPaymentMode(!paymentMode);
    if (!paymentMode && !paymentAmount) {
      setPaymentAmount('0.1'); // Default payment amount
    }
  };
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    
    if ((e.altKey) && e.key === 'a') {
      e.preventDefault();
      handleAITrigger();
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {showWarning && (
        <div className="w-full max-w-3xl mb-2 px-4">
          <div className="relative text-sm text-amber-600 bg-amber-50 rounded-lg p-3 pr-10 border border-amber-200">
            <span className="font-medium">Note:</span> This is an on-chain AI chat. All messages are public and permanently stored on the blockchain. Please do not share any private or sensitive information.
            <button
              onClick={() => setShowWarning(false)}
              className="absolute top-2 right-2 p-1 text-amber-600 hover:text-amber-700 rounded-full hover:bg-amber-100 transition-colors"
              aria-label="Close warning"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      
      <div className="relative w-full flex flex-col justify-center">
        {paymentMode && (
          <div className="w-full max-w-3xl mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 text-blue-500 mr-2" />
            <span className="text-blue-700 text-sm mr-2">Payment amount:</span>
            <input
              type="text"
              inputMode="decimal"
              value={paymentAmount}
              onChange={handlePaymentAmountChange}
              className="w-24 p-1 border border-blue-300 rounded"
              placeholder="0.1"
            />
            <span className="text-blue-600 text-xs ml-2">RGas will be sent with your message</span>
            <button
              onClick={() => setPaymentMode(false)}
              className="ml-auto p-1 text-blue-500 hover:text-blue-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        
        <div className="relative w-full max-w-3xl">
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={(e) => {
                setLocalValue(e.target.value);
                onChange?.(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full resize-none rounded-lg border border-gray-200 pr-12 py-3 px-4 
                focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50
                min-h-[60px] max-h-[200px] overflow-y-auto"
              rows={3}
            />
            <div className="absolute right-2 bottom-2 flex items-center">
              {/* AI trigger button */}
              <button
                type="button"
                onClick={handleAITrigger}
                className="p-2 text-blue-500 hover:text-blue-700 focus:outline-none"
                title="Ask AI (Alt+A)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.6,2.3C12.6,1.9,11.3,2,10.4,2.7L9,3.8L7.6,2.7C6.7,2,5.4,1.9,4.4,2.3C3.1,2.9,2,4.2,2,5.8v7.3 c0,1.6,1.1,2.9,2.4,3.4c1,0.4,2.3,0.3,3.2-0.4L9,15.2l1.4,1.1c0.6,0.5,1.3,0.7,2,0.7c0.4,0,0.8-0.1,1.2-0.2 c1.3-0.5,2.4-1.8,2.4-3.4V5.8C16,4.2,14.9,2.9,13.6,2.3z M8,13.6l-2,1.5C5.3,15.6,4.4,15.7,3.8,15.4C3,15,2,14.2,2,13.1V5.8 c0-1.1,0.6-1.9,1.4-2.3C3.9,3.3,4.3,3.3,4.6,3.3c0.5,0,0.9,0.2,1.4,0.5L8,5.3V13.6z M14,13.1c0,1.1-1,1.9-1.8,2.3 c-0.8,0.3-1.6,0.1-2.2-0.3l-2-1.5V5.3l2-1.5C10.5,3.5,10.9,3.3,11.4,3.3c0.3,0,0.7,0.1,1,0.2C13.4,3.9,14,4.7,14,5.8V13.1z" />
                  <path d="M6.5,5C6.2,5,6,5.2,6,5.5v3C6,8.8,6.2,9,6.5,9S7,8.8,7,8.5v-3C7,5.2,6.8,5,6.5,5z" />
                  <path d="M11.5,5C11.2,5,11,5.2,11,5.5v3C11,8.8,11.2,9,11.5,9S12,8.8,12,8.5v-3C12,5.2,11.8,5,11.5,5z" />
                </svg>
              </button>
              
              {/* Payment toggle button */}
              {showPaymentOption && (
                <button
                  type="button"
                  onClick={handleTogglePayment}
                  className={`p-2 ${paymentMode ? 'text-green-600' : 'text-gray-400'} hover:text-green-700 focus:outline-none`}
                  title="Add payment to message"
                >
                  <CurrencyDollarIcon className="h-5 w-5" />
                </button>
              )}
              
              {/* Send message button */}
              <SessionKeyGuard onClick={handleSubmit}>
                <button
                  type="button"
                  disabled={disabled || !localValue.trim() || (paymentMode && (!paymentAmount || isNaN(parseFloat(paymentAmount))))}
                  className="p-2 text-blue-600 hover:text-blue-700 disabled:text-gray-400 focus:outline-none"
                  title="Send message (Ctrl+Enter)"
                >
                  <PaperAirplaneIcon className="h-6 w-6" />
                </button>
              </SessionKeyGuard>
            </div>
        </div>
      </div>
    </div>
  );
}