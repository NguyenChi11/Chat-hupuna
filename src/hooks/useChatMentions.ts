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

    const BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

    const traverse = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;

        if (el.dataset && el.dataset.mention) {
          const userId = el.dataset.userId as string;
          const userName = el.dataset.userName as string;
          return `@[${userName}](${userId})`;
        }

        if (el.tagName === 'BR') {
          return '\n';
        }

        let out = '';
        el.childNodes.forEach((child) => {
          out += traverse(child);
        });

        if (BLOCK_TAGS.has(el.tagName)) {
          if (out && !out.endsWith('\n')) out += '\n';
        }

        return out;
      }

      return '';
    };

    const text = traverse(editableRef.current);
    return text;
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

    const editable = editableRef.current;
    const userId = user._id;
    const userName = user.name || 'User';

    const cursorPos = getCursorPosition();

    // Tạo span mention mới
    const mentionSpan = document.createElement('span');
    mentionSpan.contentEditable = 'false';
    mentionSpan.className =
      'inline-flex items-center bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-sm font-medium mx-0.5';
    mentionSpan.dataset.mention = 'true';
    mentionSpan.dataset.userId = userId;
    mentionSpan.dataset.userName = userName;
    mentionSpan.textContent = `@${userName}`;

    // Helper: Tạo range theo vị trí text (dựa trên textContent)
    const createRangeFromOffsets = (start: number, end: number): Range | null => {
      const range = document.createRange();
      let current = 0;
      let startNode: Node | null = null;
      let startOffset = 0;
      let endNode: Node | null = null;
      let endOffset = 0;

      const walker = (node: Node): boolean => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          const next = current + text.length;

          if (!startNode && start >= current && start <= next) {
            startNode = node;
            startOffset = start - current;
          }
          if (!endNode && end >= current && end <= next) {
            endNode = node;
            endOffset = end - current;
          }

          current = next;
        } else {
          node.childNodes.forEach((child) => {
            if (!endNode) {
              const done = walker(child);
              if (done) return;
            }
          });
        }

        return !!endNode;
      };

      walker(editable);

      if (!startNode || !endNode) return null;

      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      return range;
    };

    const range = createRangeFromOffsets(mentionStartPos, cursorPos);
    if (!range) {
      // Fallback: chèn mention ở cuối nếu không tính được range
      editable.appendChild(mentionSpan);
      const spaceNode = document.createTextNode(' ');
      editable.appendChild(spaceNode);

      const sel = window.getSelection();
      if (sel) {
        const caretRange = document.createRange();
        caretRange.setStartAfter(spaceNode);
        caretRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(caretRange);
      }
    } else {
      // Xoá đoạn @typing hiện tại và thay bằng span mention
      range.deleteContents();

      const spaceNode = document.createTextNode(' ');
      range.insertNode(mentionSpan);
      mentionSpan.after(spaceNode);

      const sel = window.getSelection();
      if (sel) {
        const caretRange = document.createRange();
        caretRange.setStartAfter(spaceNode);
        caretRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(caretRange);
      }
    }

    setShowMentionMenu(false);
    setMentionStartPos(null);
    setMentionQuery('');

    // Đảm bảo focus lại vào ô nhập
    setTimeout(() => {
      editable.focus();
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
