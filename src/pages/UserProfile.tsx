import { useParams } from 'react-router-dom';
import { ComingSoon } from '../components/ui/ComingSoon';

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();

  return (
    <ComingSoon
      title={username ? `@${username}'s Profile` : 'User Profile'}
      description="Avatar, trophy room, prediction history, point ledger, and activity feed — coming soon."
    />
  );
}
