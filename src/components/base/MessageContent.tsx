'use client';
import { isLink } from '../../utils/utils';

export const MessageContent = ({ content }: { content: string | undefined }) => {
  if (isLink(content)) {
    // Nếu là link, thêm http vào nếu thiếu để thẻ <a> hoạt động
    const href = (content || '').startsWith('http') ? content : `https://${content}`;

    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
        {content}
      </a>
    );
  }

  return <p>{content}</p>;
};
