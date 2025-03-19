import { Attachment } from '../types/channel';
import { shortenAddress } from '../utils/address';

interface MessageAttachmentProps {
  attachment: Attachment;
}

export function MessageAttachment({ attachment }: MessageAttachmentProps) {
  const renderAttachment = () => {
    try {
      const attachmentData = JSON.parse(attachment.attachment_json);
      
      switch (attachment.attachment_type) {
        case 0: // MESSAGE_ATTACHMENT_TYPE_COIN
          return (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg border border-yellow-100 w-full">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-yellow-800 truncate">
                  Transfer {attachmentData.amount} {attachmentData.coin_symbol}
                </div>
                <div className="text-xs text-yellow-600 truncate">
                  To: {shortenAddress(attachmentData.to)}
                </div>
              </div>
            </div>
          );
        
        default:
          return (
            <div className="text-sm text-gray-600 w-full">
              <span className="font-medium">Type:</span> {attachment.attachment_type}
              <br />
              <span className="font-medium">Content:</span> {attachment.attachment_json}
            </div>
          );
      }
    } catch (error) {
      console.error('Failed to parse attachment:', error);
      return (
        <div className="text-sm text-red-600 w-full">
          Failed to parse attachment data
        </div>
      );
    }
  };

  return (
    <div className="w-full">
      {renderAttachment()}
    </div>
  );
} 