import { useState, useEffect } from 'react';
import { useCurrentAddress, useConnectionStatus, SessionKeyGuard } from '@roochnetwork/rooch-sdk-kit';
import useUserInfo from '../../hooks/use-user-info';
import { UserInfo } from '../../types/user';
import { useUserUpdate } from '../../hooks/use-user-update';
import { useUserInit } from '../../hooks/use-user-init';
import useUserNameCheck from '../../hooks/use-user-name-check';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ProfileEdit = () => {
    const address = useCurrentAddress();
    console.log(address)
    const connectionStatus = useConnectionStatus();
    const navigate = useNavigate();
    const { userInfo } = useUserInfo(address?.genRoochAddress().toHexAddress());
    const [userProfile, setUserProfile] = useState<UserInfo | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        avatar: ''
    });
    const [error, setError] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { mutate: updateUser } = useUserUpdate();
    const { mutate: initUser } = useUserInit();
    const { available: usernameCheck, isPending: isCheckingUsername, refetch: refetchUsername } = useUserNameCheck(formData.username);

    useEffect(() => {
        if (connectionStatus === 'connected' && userInfo) {
            setUserProfile(userInfo);
            setFormData({
                name: userInfo.name || '',
                username: userInfo.username || '',
                avatar: userInfo.avatar || ''
            });
            setPreviewUrl(userInfo.avatar || '');
        }
    }, [connectionStatus, userInfo]);

    useEffect(() => {
        setPreviewUrl(formData.avatar);
    }, [formData.avatar]);

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newUsername = e.target.value;
        setFormData(prev => {
            const newData = { ...prev, username: newUsername };
            if (!userProfile?.username) {
                newData.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUsername}`;
            }
            return newData;
        });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError('');

        try {
            // 验证 Display Name
            if (!formData.name.trim()) {
                setError('Display Name is required');
                return;
            }

            // 验证用户名
            if (!userProfile?.username) {
                if (!formData.username) {
                    setError('Username is required');
                    return;
                }

                const result = await refetchUsername();
                if (result.data?.error) {
                    setError(result.data.error);
                    return;
                }

                if (!result.data?.isAvailable) {
                    setError('Username is not available');
                    return;
                }

                // 初始化用户
                await initUser({
                    name: formData.name,
                    username: formData.username.trim(),
                    avatar: formData.avatar
                });
                toast.success('初始化成功');
                navigate(-1);
            } else {
                // 更新用户信息
                if (!userProfile.id) {
                    setError('用户ID不存在');
                    return;
                }

                const updates = [];
                if (formData.name !== userProfile.name) {
                    console.log(userProfile.id)
                    updates.push(
                        updateUser({
                            objId: userProfile.id,
                            name: formData.name
                        })
                    );
                }
                if (formData.avatar !== userProfile.avatar) {
                    updates.push(
                        updateUser({
                            objId: userProfile.id,
                            avatar: formData.avatar
                        })
                    );
                }

                if (updates.length > 0) {
                    await Promise.all(updates);
                    toast.success('更新成功');
                    navigate(-1);
                } else {
                    toast.success('没有需要更新的内容');
                    navigate(-1);
                }
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            setError('更新失败: ' + (error instanceof Error ? error.message : '未知错误'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 顶部导航栏 */}
            <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50">
                <div className="h-full flex items-center justify-between px-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-gray-600"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <SessionKeyGuard onClick={handleSubmit}>
                        <button
                            className="text-purple-600 font-medium"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? '保存中...' : 'Save'}
                        </button>
                    </SessionKeyGuard>
                </div>
            </div>

            {/* 主要内容区域 */}
            <div className="pt-14 pb-16 mt-8">
                <div className="space-y-4 px-4">
                    {/* 账号设置 */}
                    <div className="bg-white rounded-lg divide-y divide-gray-100">
                        <div className="p-4">
                            <div className="space-y-4">
                                {!userProfile?.username && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={handleUsernameChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="Enter username"
                                            disabled={isSubmitting}
                                        />
                                        {isCheckingUsername && (
                                            <p className="mt-1 text-sm text-gray-500">
                                                检查用户名可用性...
                                            </p>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Enter display name"
                                        disabled={isSubmitting}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                                    <input
                                        type="text"
                                        value={formData.avatar}
                                        onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Enter avatar URL"
                                        disabled={isSubmitting}
                                    />
                                    {previewUrl && (
                                        <div className="mt-2 flex justify-center">
                                            <img
                                                src={previewUrl}
                                                alt="Avatar preview"
                                                className="h-20 w-20 rounded-full object-cover"
                                                onError={() => setPreviewUrl('')}
                                            />
                                        </div>
                                    )}
                                </div>
                                {error && (
                                    <p className="text-sm text-red-600">{error}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileEdit; 