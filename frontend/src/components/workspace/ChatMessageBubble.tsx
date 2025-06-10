import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Avatar 컴포넌트 import

// ChatMessage 인터페이스는 PodcastView.tsx 또는 별도의 types.ts 파일에서 정의될 예정입니다.
// 여기서는 임시로 동일한 구조를 가정하고 사용합니다.
export interface ChatMessage {
  id: string;
  sender: 'personA' | 'personB' | string; // string 추가하여 유연성 확보
  text: string;
  timestamp: Date;
  startTime: number;
  endTime: number;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isActive: boolean;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message, isActive }) => {
  const { sender, text, timestamp } = message;
  const isPersonA = sender === 'personA'; // 'personA'를 기준으로 스타일 분기

  // Tailwind CSS를 사용한 스타일링
  const bubbleClasses = `
    p-3 rounded-lg max-w-xs lg:max-w-md xl:max-w-lg transition-all duration-300
    ${isPersonA ? 'bg-primary text-primary-foreground self-start rounded-br-none' : 'bg-secondary text-secondary-foreground self-end rounded-bl-none'}
    ${isActive ? 'ring-2 ring-offset-2 ring-ring ring-offset-background' : ''}
  `;

  const timeClasses = `
    text-xs mt-1
    ${isPersonA ? 'text-primary-foreground/80' : 'text-secondary-foreground/80'}
    ${isPersonA ? 'text-left' : 'text-right'}
  `;

  return (
    <div className={`flex items-end mb-2 gap-2 ${isPersonA ? 'justify-start' : 'justify-end'}`}>
      {isPersonA && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">
            A
          </AvatarFallback>
        </Avatar>
      )}
      <div className={bubbleClasses}>
        <p className="text-sm">{text}</p>
        <p className={timeClasses}>
          {new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(timestamp)}
        </p>
      </div>
      {!isPersonA && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            B
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessageBubble;