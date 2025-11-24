'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import type { User } from '@/types/User';
import type { MemberInfo } from '@/types/Group';

interface UseChatMentionsParams {
  allUsers: User[];
  activeMembers: MemberInfo[];
  currentUserId: string;
}

export function useChatMentions({ allUsers, activeMembers, currentUserId }: UseChatMentionsParams) {
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const mentionMenuRef = useRef<HTMLDivElement | null>(null);
  const editableRef = useRef<HTMLDivElement | null>(null);

  const getPlainTextFromEditable = useCallback((): string => {
    if (!editableRef.current) return '';

    let result = '';
    editableRef.current.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent;
      } else if (node.nodeName === 'SPAN' && (node as HTMLElement).dataset.mention) {
        const userId = (node as HTMLElement).dataset.userId;
        const userName = (node as HTMLElement).dataset.userName;
        result += `@[${userName}](${userId})`;
      }
    });

    return result;
  }, []);

  const getCursorPosition = (): number => {
    const selection = window.getSelection();
    if (!selection || !editableRef.current) return 0;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editableRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    return preCaretRange.toString().length;
  };

  const parseMentions = (text: string): { mentions: string[]; displayText: string } => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]); // userId
    }

    return { mentions, displayText: text };
  };

  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery)
      return activeMembers.length > 0 ? activeMembers : allUsers.filter((u) => u._id !== currentUserId);

    const query = mentionQuery.toLowerCase();
    const usersList = activeMembers.length > 0 ? activeMembers : allUsers.filter((u) => u._id !== currentUserId);

    return usersList.filter((user) => user.name && user.name.toLowerCase().includes(query));
  }, [mentionQuery, activeMembers, allUsers, currentUserId]);

  const handleInputChangeEditable = () => {
    if (!editableRef.current) return;

    const text = editableRef.current.textContent || '';
    const cursorPos = getCursorPosition();

    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

      if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
        setShowMentionMenu(false);
        setMentionStartPos(null);
      } else {
        setShowMentionMenu(true);
        setMentionQuery(textAfterAt);
        setMentionStartPos(lastAtIndex);
        setSelectedMentionIndex(0);
      }
    } else {
      setShowMentionMenu(false);
      setMentionStartPos(null);
    }
  };

  const selectMention = (user: User | MemberInfo) => {
    if (mentionStartPos === null || !editableRef.current) return;

    const userId = user._id;
    const userName = user.name || 'User';

    const currentText = editableRef.current.textContent || '';
    const cursorPos = getCursorPosition();

    const beforeMention = currentText.slice(0, mentionStartPos);
    const afterCursor = currentText.slice(cursorPos);

    const mentionSpan = document.createElement('span');
    mentionSpan.contentEditable = 'false';
    mentionSpan.className =
      'inline-flex items-center bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-sm font-medium mx-0.5';
    mentionSpan.dataset.mention = 'true';
    mentionSpan.dataset.userId = userId;
    mentionSpan.dataset.userName = userName;
    mentionSpan.textContent = `@${userName}`;

    editableRef.current.innerHTML = '';

    if (beforeMention) {
      editableRef.current.appendChild(document.createTextNode(beforeMention));
    }

    editableRef.current.appendChild(mentionSpan);
    editableRef.current.appendChild(document.createTextNode(' '));

    if (afterCursor) {
      editableRef.current.appendChild(document.createTextNode(afterCursor));
    }

    setShowMentionMenu(false);
    setMentionStartPos(null);
    setMentionQuery('');

    setTimeout(() => {
      editableRef.current?.focus();
      const range = document.createRange();
      const sel = window.getSelection();

      const spaceNode = mentionSpan.nextSibling;
      if (spaceNode) {
        range.setStartAfter(spaceNode);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 0);
  };

  const handleKeyDownEditable = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (showMentionMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => Math.min(prev + 1, mentionSuggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (mentionSuggestions[selectedMentionIndex]) {
          selectMention(mentionSuggestions[selectedMentionIndex] as User | MemberInfo);
        }
      } else if (e.key === 'Escape') {
        setShowMentionMenu(false);
        setMentionStartPos(null);
      }
    }
  };

  return {
    showMentionMenu,
    mentionSuggestions,
    selectedMentionIndex,
    mentionMenuRef,
    editableRef,
    getPlainTextFromEditable,
    parseMentions,
    handleInputChangeEditable,
    handleKeyDownEditable,
    selectMention,
    setShowMentionMenu,
  };
}
