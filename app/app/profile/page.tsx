'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { profileService } from '@/services/profile.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowLeft, User, Lock, Trash2, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

function ProfileContent() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();

  // Profile
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    setSavingProfile(true);
    try {
      const updatedUser = await profileService.update({ name, email });
      updateUser(updatedUser);
      setProfileMsg('Perfil atualizado com sucesso!');
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Erro ao atualizar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }

    setSavingPassword(true);
    try {
      await profileService.updatePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setPasswordMsg('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Erro ao alterar senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleting(true);
    try {
      await profileService.deleteAccount(deletePassword);
      logout();
      router.push('/login');
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao excluir conta.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-sm text-muted-foreground">Gerencie sua conta</p>
          </div>
        </div>

        {/* Profile Info */}
        <Card className="ximples-shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Informações pessoais</h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {profileMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" />{profileMsg}
              </div>
            )}
            {profileError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{profileError}</div>
            )}

            <div>
              <Label htmlFor="name" className="mb-2 block text-sm font-medium">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="ximples-input" />
            </div>
            <div>
              <Label htmlFor="email" className="mb-2 block text-sm font-medium">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="ximples-input" />
            </div>
            <Button type="submit" disabled={savingProfile} className="ximples-button-primary">
              {savingProfile ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </form>
        </Card>

        {/* Password */}
        <Card className="ximples-shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Alterar senha</h2>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {passwordMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" />{passwordMsg}
              </div>
            )}
            {passwordError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{passwordError}</div>
            )}

            <div>
              <Label className="mb-2 block text-sm font-medium">Senha atual</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="ximples-input" />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium">Nova senha</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="ximples-input" placeholder="Mínimo 8 caracteres" />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium">Confirmar nova senha</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="ximples-input" />
            </div>
            <Button type="submit" disabled={savingPassword} className="ximples-button-primary">
              {savingPassword ? 'Alterando...' : 'Alterar senha'}
            </Button>
          </form>
        </Card>

        {/* Delete Account */}
        <Card className="ximples-shadow p-6 border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="w-5 h-5 text-red-600" />
            <h2 className="font-semibold text-red-600">Excluir conta</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Esta ação é irreversível. Todos os seus dados serão excluídos permanentemente.
          </p>

          {!showDeleteConfirm ? (
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => setShowDeleteConfirm(true)}>
              Excluir minha conta
            </Button>
          ) : (
            <div className="space-y-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <strong>Tem certeza? Digite sua senha para confirmar.</strong>
              </div>
              {deleteError && (
                <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm">{deleteError}</div>
              )}
              <Input
                type="password"
                placeholder="Sua senha"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="ximples-input"
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}>
                  Cancelar
                </Button>
                <Button
                  disabled={deleting || !deletePassword}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDeleteAccount}
                >
                  {deleting ? 'Excluindo...' : 'Confirmar exclusão'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
