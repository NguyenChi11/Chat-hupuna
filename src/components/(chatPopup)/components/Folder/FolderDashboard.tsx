'use client';

import React from 'react';
import { useChatContext } from '@/context/ChatContext';
import { useFolderController } from '@/components/controller/useFolderController';
import MobileLayout from '@/components/layout/folder/MobileLayout';
import DesktopLayout from '@/components/layout/folder/DesktopLayout';
import FolderCreateModal from '@/components/modal/folder/FolderCreateModal';
import RenameModal from '@/components/modal/folder/RenameModal';
import DeleteModal from '@/components/modal/folder/DeleteModal';

type Props = {
  roomId: string;
  onClose?: () => void;
  initialScope?: 'room' | 'global';
  onJumpToMessage?: (messageId: string) => void;
  onInsertToInput?: (text: string) => void;
  onAttachFromFolder?: (att: { url: string; type: 'image' | 'video' | 'file'; fileName?: string }) => void;
};

export default function FolderDashboard({
  roomId,
  onClose,
  initialScope,
  onJumpToMessage,
  onInsertToInput,
  onAttachFromFolder,
}: Props) {
  const { messages, currentUser } = useChatContext();

  const controller = useFolderController({
    roomId,
    currentUserId: String(currentUser?._id || ''),
    messages,
    onJumpToMessage,
    onInsertToInput,
    onAttachFromFolder,
  });

  React.useEffect(() => {
    if (initialScope === 'global') {
      controller.setSelectedScope('global');
    } else if (initialScope === 'room') {
      controller.setSelectedScope('room');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScope]);

  return (
    <div className="w-full">
      {controller.compact ? (
        <MobileLayout {...controller} onClose={onClose} />
      ) : (
        <DesktopLayout {...controller} onClose={onClose} />
      )}

      {controller.showCreateModal && (
        <FolderCreateModal
          isOpen={controller.showCreateModal}
          folders={controller.selectedScope === 'global' ? controller.foldersGlobal : controller.folders}
          defaultParentId={controller.createParentId || undefined}
          lockParent={!!controller.createParentId}
          onClose={() => {
            controller.setShowCreateModal(false);
            controller.setCreateParentId(null);
          }}
          onCreate={(name: string, parentId?: string) => {
            controller.createFolder(name, parentId);
            controller.setShowCreateModal(false);
            controller.setCreateParentId(null);
          }}
        />
      )}

      <RenameModal
        open={!!controller.renameTarget}
        name={controller.renameInput}
        onChangeName={(v) => controller.setRenameInput(v)}
        onCancel={() => controller.setRenameTarget(null)}
        onSave={controller.saveRename}
      />

      <DeleteModal
        open={!!controller.deleteTarget}
        name={controller.deleteTarget?.name || ''}
        onCancel={() => controller.setDeleteTarget(null)}
        onConfirm={controller.confirmDeleteFolder}
      />
    </div>
  );
}
