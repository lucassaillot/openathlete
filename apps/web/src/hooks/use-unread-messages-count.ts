import { useGetUserThreadsQuery } from '@/api/messages';
import { useGetMeQuery } from '@/api/user';
import { calculateTotalUnreadCount } from '@/utils/messages';

/** Total number of unread messages for the current user. */
export function useUnreadMessagesCount(): number {
  const { data: messageThreads } = useGetUserThreadsQuery();
  const { data: currentUser } = useGetMeQuery();

  return messageThreads && currentUser
    ? calculateTotalUnreadCount(messageThreads, currentUser.userId)
    : 0;
}
