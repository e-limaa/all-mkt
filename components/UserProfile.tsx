import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/hooks/usePermissions';
import { useConfig } from '../contexts/ConfigContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { LogOut, User as UserIcon, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from './ui/utils';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

export function UserProfile() {
  const { user, signOut, loading, updateProfile } = useAuth();
  const { isViewer, isEditor, isAdmin } = usePermissions();
  const { systemSettings } = useConfig();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('[UserProfile] Erro ao realizar logout', error);
    }
  }, [signOut]);

  const roleInfo = useMemo(() => {
    if (isAdmin()) return { label: 'Administrador', className: 'text-yellow-500' };
    if (isEditor()) return { label: 'Editor', className: 'text-blue-500' };
    if (isViewer()) return { label: 'Visualizador', className: 'text-green-500' };
    return { label: 'Usuário', className: 'text-muted-foreground' };
  }, [isAdmin, isEditor, isViewer]);

  useEffect(() => {
    if (isProfileOpen && user) {
      setName(user.name ?? '');
      setEmail(user.email ?? '');
      setNewPassword('');
      setConfirmPassword('');
      setAvatarPreview(user.avatar_url || null);
      setAvatarFile(null);
      setRemoveAvatar(false);
      setIsSaving(false);
    }
  }, [isProfileOpen, user]);

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  if (!user) return null;

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido.');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }

    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setAvatarFile(file);
    setRemoveAvatar(false);
  };

  const handleRemoveAvatar = () => {
    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(null);
    setAvatarFile(null);
    setRemoveAvatar(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error('Informe seu nome.');
      return;
    }

    if (!email.trim()) {
      toast.error('Informe seu email.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        newPassword: newPassword ? newPassword : undefined,
        avatarFile: removeAvatar ? null : avatarFile || undefined,
        removeAvatar,
      });
      setIsProfileOpen(false);
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(null);
      setAvatarPreview(null);
      setRemoveAvatar(false);
    } catch (error) {
      // erros já tratados em updateProfile
    } finally {
      setIsSaving(false);
    }
  };

  const initials = user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U';

  const profileSummary = (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        {user.avatar_url ? (
          <AvatarImage src={user.avatar_url} alt={user.name ?? 'Perfil'} />
        ) : (
          <AvatarFallback>{initials}</AvatarFallback>
        )}
      </Avatar>
      <div className="flex flex-col min-w-0 text-left">
        <span className="text-sm font-medium leading-tight truncate max-w-[160px]">
          {user.name}
        </span>
        <span className="text-xs text-muted-foreground truncate max-w-[160px]">
          {user.email}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/70 px-3 py-2 text-left transition hover:border-border"
          >
            {profileSummary}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Conta</DropdownMenuLabel>
          <div className="px-3 py-2 text-sm">
            <p className="font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <span className={cn('text-[11px] uppercase tracking-wide', roleInfo.className)}>
              {roleInfo.label}
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
            <UserIcon className="mr-2 h-4 w-4" />
            Meu Perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} disabled={loading} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Meu Perfil</DialogTitle>
            <DialogDescription>
              Atualize suas informações pessoais e sua foto de perfil.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="h-20 w-20">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt="Pré-visualização do avatar" />
                ) : user.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={user.name ?? 'Avatar'} />
                ) : (
                  <AvatarFallback className="text-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Trocar foto
                  </Button>
                  {(avatarPreview || user.avatar_url) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                    >
                      Remover foto
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG ou PNG até 5MB.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <Label htmlFor="profile-name">Nome *</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div className="sm:col-span-1">
                <Label htmlFor="profile-email">Email *</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-new-password">Nova senha</Label>
              <Input
                id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Deixe em branco para manter a senha atual"
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirme a nova senha"
              />
              <p className="text-xs text-muted-foreground">
                A senha deve ter pelo menos 6 caracteres.
              </p>
            </div>

            <Separator />

            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              {systemSettings.twoFactor && <span>2FA ativo na sua conta.</span>}
              {!systemSettings.multiSessions && <span>Sessão única habilitada para sua conta.</span>}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsProfileOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
