import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
  User, 
  Mail, 
  KeyRound, 
  Save, 
  ArrowLeft, 
  Eye, 
  EyeOff,
  Camera,
  X,
  Image,
  Loader,
  Building,
  Users
} from 'lucide-react';
import ImageUploadSetting from '../components/Settings/ImageUploadSetting';

interface ProfileData {
  fullName: string;
  email: string;
  companyName: string;
  avatarUrl: string;
  avatarFile?: File | null;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { section } = useParams();
  const { user, profile, refetchProfile } = useAuth();
  const { addToast, updateToast } = useToast();
  
  const [activeSection, setActiveSection] = useState(section || 'personal');
  
  const [profileData, setProfileData] = useState<ProfileData>({
    fullName: '',
    email: '',
    companyName: '',
    avatarUrl: '',
    avatarFile: null,
  });
  
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [landingPageSettings, setLandingPageSettings] = useState<any>({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  
  // Estados para aba de usuários
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const isAdmin = user?.email === 'klaus@bleinat.com.br';

  useEffect(() => {
    const currentActiveSection = section || 'personal';
    if ((currentActiveSection === 'appearance' || currentActiveSection === 'users') && !isAdmin) {
      navigate('/profile/personal', { replace: true });
    } else {
      setActiveSection(currentActiveSection);
    }
  }, [section, isAdmin, navigate]);

  useEffect(() => {
    if (user && profile) {
      setProfileData({
        fullName: profile.full_name || '',
        email: user.email || '',
        companyName: profile.company_name || '',
        avatarUrl: profile.avatar_url || '',
        avatarFile: null,
      });
      setAvatarPreview(profile.avatar_url || '');
    }
    if (user && activeSection === 'appearance' && isAdmin) {
      fetchLandingPageSettings();
    }
    if (user && activeSection === 'users' && isAdmin) {
      fetchUsers();
    }
  }, [user, profile, activeSection, isAdmin]);

  const fetchLandingPageSettings = async () => {
    setSettingsLoading(true);
    const { data, error } = await supabase.from('landing_page_settings').select('*');
    if (error) {
      console.error('Error fetching landing page settings:', error);
    } else {
      const settingsMap = data.reduce((acc, setting) => {
        acc[setting.key] = { value: setting.value, description: setting.description };
        return acc;
      }, {});
      setLandingPageSettings(settingsMap);
    }
    setSettingsLoading(false);
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      // Usar RPC segura para buscar usuários (validação admin server-side)
      const { data: users, error } = await supabase.rpc('get_admin_users');
      
      if (error) {
        console.error('Error fetching users:', error);
        if (error.message?.includes('Acesso negado')) {
          addToast('Acesso negado: apenas administradores', 'error');
        } else {
          addToast('Erro ao carregar usuários', 'error');
        }
      } else {
        setUsers(users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      addToast('Erro ao carregar usuários', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const toastId = addToast('Salvando perfil...', 'loading');

    try {
      let newAvatarUrl = profileData.avatarUrl;

      // Handle logo upload/removal
      if (profileData.avatarFile) {
        const file = profileData.avatarFile;
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        newAvatarUrl = urlData.publicUrl;

        // If there was an old avatar, delete it
        if (profile?.avatar_url) {
          const oldFilePath = profile.avatar_url.split('/avatars/').pop();
          if (oldFilePath) {
            await supabase.storage.from('avatars').remove([oldFilePath]);
          }
        }
      } else if (!avatarPreview && profile?.avatar_url) {
        // Handle avatar removal
        const oldFilePath = profile.avatar_url.split('/avatars/').pop();
        if (oldFilePath) {
          await supabase.storage.from('avatars').remove([oldFilePath]);
        }
        newAvatarUrl = '';
      }

      const updateData = {
        full_name: profileData.fullName,
        company_name: profileData.companyName,
        avatar_url: newAvatarUrl,
      };

      const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);
      if (error) throw error;
      
      updateToast(toastId, 'Perfil atualizado com sucesso!', 'success');
      await refetchProfile();
    } catch (error: any) {
      updateToast(toastId, `Erro ao atualizar perfil: ${error.message}`, 'error');
    } finally {
      setLoading(false);
      setProfileData(prev => ({...prev, avatarFile: null}));
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = addToast('Alterando senha...', 'loading');
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      updateToast(toastId, 'As senhas não coincidem', 'error');
      setLoading(false);
      return;
    }
    if (passwordData.newPassword.length < 6) {
      updateToast(toastId, 'A nova senha deve ter pelo menos 6 caracteres', 'error');
      setLoading(false);
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      updateToast(toastId, 'Senha alterada com sucesso!', 'success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      updateToast(toastId, `Erro ao alterar senha: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSettingUpdate = (key: string, newUrl: string) => {
    setLandingPageSettings((prev: any) => ({
        ...prev,
        [key]: { ...prev[key], value: newUrl }
    }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) { addToast('Por favor, selecione apenas arquivos de imagem', 'error'); return; }
      if (file.size > 5 * 1024 * 1024) { addToast('A imagem deve ter no máximo 5MB', 'error'); return; }
      
      setProfileData(prev => ({ ...prev, avatarFile: file }));
      
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  const removeAvatar = () => { 
    setAvatarPreview(''); 
    setProfileData(prev => ({ ...prev, avatarUrl: '', avatarFile: null })); 
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/dashboard')} className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Gerencie suas informações e preferências</p>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => navigate('/profile/personal')} className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeSection === 'personal' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'}`}>
            <User className="w-4 h-4 inline mr-2" />Informações Pessoais
          </button>
          <button onClick={() => navigate('/profile/password')} className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeSection === 'password' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'}`}>
            <KeyRound className="w-4 h-4 inline mr-2" />Senha
          </button>
          {isAdmin && (
            <button onClick={() => navigate('/profile/users')} className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeSection === 'users' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'}`}>
              <Users className="w-4 h-4 inline mr-2" />Usuários
            </button>
          )}
          {isAdmin && (
            <button onClick={() => navigate('/profile/appearance')} className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeSection === 'appearance' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'}`}>
              <Image className="w-4 h-4 inline mr-2" />Aparência
            </button>
          )}
        </nav>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
        {activeSection === 'personal' && (
          <form onSubmit={handleProfileUpdate} className="p-6 space-y-6">
            <div className="flex flex-col items-center space-y-4 mb-8">
              <div className="relative">
                {avatarPreview ? <img src={avatarPreview} alt="Logo da Empresa" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-700 shadow-lg" /> : <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center border-4 border-white dark:border-slate-700 shadow-lg"><Building className="w-12 h-12 text-gray-400" /></div>}
                {avatarPreview && <button type="button" onClick={removeAvatar} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"><X className="w-4 h-4" /></button>}
              </div>
              <div className="flex flex-col items-center space-y-2">
                <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                  <Camera className="w-4 h-4 mr-2" />Logo da Empresa<input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG ou GIF. Máximo 5MB.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome Completo (Vistoriador)</label>
                <div className="relative"><User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" value={profileData.fullName} onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))} className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Seu nome completo" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome da Empresa</label>
                <div className="relative"><Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" value={profileData.companyName} onChange={(e) => setProfileData(prev => ({ ...prev, companyName: e.target.value }))} className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Nome da sua empresa" /></div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="email" value={profileData.email} readOnly className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-600 text-gray-900 dark:text-gray-100 cursor-not-allowed" /></div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">O email não pode ser alterado</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={loading} className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><Save className="w-5 h-5 mr-2" />{loading ? 'Salvando...' : 'Salvar Alterações'}</button>
            </div>
          </form>
        )}
        {activeSection === 'password' && (
          <form onSubmit={handlePasswordUpdate} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nova Senha</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type={showPasswords.new ? 'text' : 'password'} value={passwordData.newPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))} className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Mínimo 6 caracteres" />
                <button type="button" onClick={() => togglePasswordVisibility('new')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">{showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirmar Nova Senha</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type={showPasswords.confirm ? 'text' : 'password'} value={passwordData.confirmPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))} className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Repita a nova senha" />
                <button type="button" onClick={() => togglePasswordVisibility('confirm')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">{showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={loading} className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><Save className="w-5 h-5 mr-2" />{loading ? 'Alterando...' : 'Alterar Senha'}</button>
            </div>
          </form>
        )}
        {activeSection === 'users' && isAdmin && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Gerenciar Usuários</h3>
            {usersLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Data de Registro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Plano
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          Nenhum usuário encontrado
                        </td>
                      </tr>
                    ) : (
                      users.map((userItem) => (
                        <tr key={userItem.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {userItem.avatar_url ? (
                                  <img className="h-10 w-10 rounded-full" src={userItem.avatar_url} alt="" />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {userItem.full_name || 'Nome não informado'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {userItem.email || 'Email não disponível'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {userItem.company_name || 'Não informado'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(userItem.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                              {userItem.plan_tier || 'Gratuito'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              userItem.is_active 
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                            }`}>
                              {userItem.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {users.length > 0 && (
                  <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    Total de usuários cadastrados: {users.length}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {activeSection === 'appearance' && isAdmin && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Gerenciar Imagens da Landing Page</h3>
            {settingsLoading ? (
              <div className="flex justify-center items-center py-10"><Loader className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : (
              <div className="space-y-4">
                {Object.entries(landingPageSettings).map(([key, setting]: [string, any]) => (
                  <ImageUploadSetting key={key} settingKey={key} label={setting.description || key.replace(/_/g, ' ')} currentImageUrl={setting.value} onUpdate={handleSettingUpdate} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
