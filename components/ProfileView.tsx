import React, { useState, useRef } from 'react';
import { User } from '../types';
import { dbService } from '../services/dbService';
import { Mail, Edit2, Save, User as UserIcon, Upload, Award, BookOpen, CheckCircle2 } from 'lucide-react';

interface ProfileViewProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    bio: user.bio,
    avatar: user.avatar,
    discordLink: user.discordLink || ''
  });
  const [loading, setLoading] = useState(false);
  
  // Update formData when user prop changes (e.g., after save)
  React.useEffect(() => {
    setFormData({
      name: user.name,
      bio: user.bio,
      avatar: user.avatar,
      discordLink: user.discordLink || ''
    });
  }, [user.name, user.bio, user.avatar, user.discordLink]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setLoading(true);
    const updatedUser = {
      ...user,
      name: formData.name,
      bio: formData.bio,
      avatar: formData.avatar,
      discordLink: formData.discordLink?.trim() || undefined
    };
    try {
      await dbService.saveUser(updatedUser);
      const fresh = await dbService.getUserById(updatedUser.id);
      onUpdateUser(fresh || updatedUser);
      setIsEditing(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      bio: user.bio,
      avatar: user.avatar,
      discordLink: user.discordLink || ''
    });
    setIsEditing(false);
  };

  // Handle File Upload with compression for faster processing
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          if (file.size > 2 * 1024 * 1024) { // 2MB Limit check
              alert("File size is too large. Please upload an image under 2MB.");
              return;
          }

          // Show loading state
          setLoading(true);
          
          // Use FileReader with compression for faster processing
          const reader = new FileReader();
          reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                  // Create canvas for compression
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  
                  // Calculate optimal size (max 400x400 for profile)
                  const maxSize = 400;
                  let { width, height } = img;
                  
                  if (width > height) {
                      if (width > maxSize) {
                          height *= maxSize / width;
                          width = maxSize;
                      }
                  } else {
                      if (height > maxSize) {
                          width *= maxSize / height;
                          height = maxSize;
                      }
                  }
                  
                  canvas.width = width;
                  canvas.height = height;
                  
                  // Draw and compress
                  ctx.drawImage(img, 0, 0, width, height);
                  
                  // Get compressed base64 (quality 0.8 for balance)
                  const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                  setFormData(prev => ({ ...prev, avatar: compressedBase64 }));
                  setLoading(false);
              };
              
              img.onerror = () => {
                  alert("Failed to process image. Please try another image.");
                  setLoading(false);
              };
              
              img.src = e.target?.result as string;
          };
          
          reader.onerror = () => {
              alert("Failed to read image file. Please try again.");
              setLoading(false);
          };
          
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Your Profile</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage your personal information and biography.</p>
        </div>
        {!isEditing && (
            <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
            >
                <Edit2 className="w-4 h-4" />
                <span>Edit Profile</span>
            </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden p-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex flex-col items-center space-y-4">
                     {/* Avatar Area */}
                     <div className="relative group">
                        <img 
                            src={formData.avatar || `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${encodeURIComponent(user.name)}`} 
                            alt={user.name} 
                            className="w-32 h-32 rounded-full border-4 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 object-cover" 
                            onError={(e) => {
                                // Fallback to avatar initials if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.src = `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${encodeURIComponent(user.name)}`;
                            }}
                        />
                        
                        {/* Edit Overlay */}
                        {isEditing && (
                             <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                 <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={loading}
                                 />
                                 {loading ? (
                                     <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                                 ) : (
                                     <>
                                         <Upload className="w-8 h-8 text-white mb-1" />
                                         <span className="text-xs text-white font-medium">Upload Photo</span>
                                     </>
                                 )}
                             </div>
                        )}
                        
                        {/* Static Border (when not editing) */}
                        {!isEditing && (
                            <div className="absolute inset-0 rounded-full border-4 border-transparent group-hover:border-indigo-500/50 transition-colors pointer-events-none"></div>
                        )}
                     </div>

                     {isEditing ? (
                         <span className="text-xs text-indigo-600 dark:text-indigo-400 animate-pulse">Click image to upload</span>
                     ) : null}

                     <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg text-center w-full">
                         <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{user.rating.toFixed(1)}</div>
                         <div className="text-xs text-slate-600 dark:text-slate-500">Reputation Score</div>
                     </div>
                </div>

                <div className="flex-1 w-full space-y-6">
                    {/* Name & Email */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Full Name</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                            ) : (
                                <div className="flex items-center text-lg text-slate-900 dark:text-slate-100 font-medium h-[42px]">
                                    <UserIcon className="w-5 h-5 mr-3 text-slate-500 dark:text-slate-400" />
                                    {user.name}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Email</label>
                            <div className="flex items-center text-lg text-slate-700 dark:text-slate-300 h-[42px]">
                                <Mail className="w-5 h-5 mr-3 text-slate-500 dark:text-slate-400" />
                                {user.email}
                            </div>
                        </div>
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                            About Me
                            {isEditing && <span className="text-xs text-indigo-600 dark:text-indigo-400 ml-2">(Keywords help matching!)</span>}
                        </label>
                         {isEditing ? (
                                <textarea 
                                    value={formData.bio}
                                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 min-h-[120px]"
                                    placeholder="Tell us about your skills, interests, and what you're looking for..."
                                />
                            ) : (
                                <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed min-h-[100px]">
                                    {user.bio || <span className="italic text-slate-500 dark:text-slate-400">No bio provided yet.</span>}
                                </div>
                            )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Discord Link</label>
                        {isEditing ? (
                            <input
                                type="url"
                                value={formData.discordLink}
                                onChange={(e) => setFormData({ ...formData, discordLink: e.target.value })}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                                placeholder="https://discord.gg/... or your profile link"
                            />
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
                                {user.discordLink ? (
                                    <a href={user.discordLink} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 break-all">
                                        {user.discordLink}
                                    </a>
                                ) : (
                                    <span className="italic text-slate-500 dark:text-slate-400">No Discord link added yet.</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Skills Section (Read-only) */}
                    {!isEditing && (
                        <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-semibold text-slate-600 dark:text-slate-400 mb-3">Skills</h3>
                                <div className="flex flex-wrap gap-3">
                                    {user.skillsKnown.length > 0 ? user.skillsKnown.map(skill => (
                                        <div key={skill.id} className="flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                                            <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mr-2" />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{skill.name}</span>
                                            {skill.verified && (
                                                <div className="ml-2 flex items-center" title={`Verified with ${skill.score}%`}>
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                            )}
                                        </div>
                                    )) : (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">No skills added yet.</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-slate-600 dark:text-slate-400 mb-3">Learning Goals</h3>
                                <div className="flex flex-wrap gap-3">
                                    {user.skillsToLearn.length > 0 ? user.skillsToLearn.map((skill, idx) => (
                                        <div key={idx} className="flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                                            <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400 mr-2" />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{skill}</span>
                                        </div>
                                    )) : (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">No learning goals added yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {isEditing && (
                        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                             <button 
                                onClick={handleCancel}
                                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={loading}
                                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        <span>Save Changes</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
      </div>
    </div>
  );
};