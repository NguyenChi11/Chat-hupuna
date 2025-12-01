import { User } from '@/types/User';

export type ViewMode = 'profile' | 'editInfo' | 'changePassword';

export interface PopupProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onAvatarUpdated?: (newUrl: string) => void;
  onUserUpdated?: (updatedUser: Partial<User>) => void;
}
