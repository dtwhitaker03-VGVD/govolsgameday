import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';
import { DashboardCard } from '../ui/DashboardCard';

const USERNAME_REGEX = /^[a-zA-Z0-9]+$/;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function EditProfileCard({ onSaved }: { onSaved: () => void }) {
  const { session, profile, updateUsername, refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? '');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!session || !profile) return null;

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError('');
    setUsernameSuccess(false);

    if (!USERNAME_REGEX.test(username)) {
      setUsernameError('Letters and numbers only.');
      return;
    }
    if (username.length > 50) {
      setUsernameError('Maximum 50 characters.');
      return;
    }

    setUsernameSaving(true);
    const { error } = await updateUsername(username);
    setUsernameSaving(false);

    if (error) {
      setUsernameError(error);
    } else {
      setUsernameSuccess(true);
      onSaved();
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAvatarError('');
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Image must be under 5MB.');
      return;
    }

    setAvatarUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${session.user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) {
      setAvatarError('Upload failed. Please try again.');
      setAvatarUploading(false);
      return;
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: pub.publicUrl })
      .eq('id', session.user.id);

    setAvatarUploading(false);

    if (updateError) {
      setAvatarError('Could not save your new photo. Please try again.');
      return;
    }

    await refreshProfile();
    onSaved();
  };

  return (
    <DashboardCard title="EDIT PROFILE" statusDotColor="#FF8200">
      <div className="p-4 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <Avatar url={profile.avatar_url} username={profile.username} size="lg" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-vgd-orange hover:bg-orange-500 flex items-center justify-center text-white transition-colors disabled:opacity-60"
              aria-label="Change profile photo"
            >
              {avatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-xs text-white/80 font-semibold">Profile photo</p>
            <p className="text-[11px] text-vgd-muted mt-0.5">JPG, PNG or GIF. Max 5MB.</p>
            {avatarError && <p className="text-[11px] text-vgd-red mt-1">{avatarError}</p>}
          </div>
        </div>

        <form onSubmit={handleUsernameSubmit} className="flex flex-col gap-1.5">
          <label htmlFor="edit-username" className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            Username
          </label>
          <div className="flex items-center gap-2">
            <input
              id="edit-username"
              type="text"
              maxLength={50}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError('');
                setUsernameSuccess(false);
              }}
              disabled={usernameSaving}
              className="flex-1 bg-vgd-bg border border-white/10 text-white placeholder-vgd-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-vgd-orange/60 focus:ring-vgd-orange/30 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={usernameSaving || username === profile.username || username.length === 0}
              className="px-4 py-2 rounded-lg bg-vgd-orange hover:bg-orange-500 text-white text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
            >
              {usernameSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>
          {usernameError && <p className="text-[11px] text-vgd-red">{usernameError}</p>}
          {usernameSuccess && <p className="text-[11px] text-green-400">Username updated!</p>}
        </form>
      </div>
    </DashboardCard>
  );
}
