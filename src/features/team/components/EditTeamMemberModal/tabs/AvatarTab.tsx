import React, { useState, useRef, useCallback } from "react";
import { 
  UserCircle, Camera, Shuffle, Info, Undo2, ImagePlus, Trash2,
  User, Smile, Ear, Bot, Heart, Theater, Sparkles, SmilePlus, Type
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { TeamMember } from "../../../types";

interface AvatarTabProps {
  formData: TeamMember;
  setFormData: (data: TeamMember) => void;
}

// Feature flags - enable when APIs are integrated
const FEATURES = {
  REMOVE_BACKGROUND: false,
  AI_ENHANCE: false,
  ADVANCED_CROP: false,
};

// Avatar style options with Lucide icons
const AVATAR_STYLES = [
  { id: 'avataaars', name: 'Classic', icon: User },
  { id: 'adventurer', name: 'Adventure', icon: Sparkles },
  { id: 'big-ears', name: 'Big Ears', icon: Ear },
  { id: 'bottts', name: 'Robots', icon: Bot },
  { id: 'micah', name: 'Micah', icon: Smile },
  { id: 'personas', name: 'Personas', icon: Theater },
  { id: 'lorelei', name: 'Lorelei', icon: Heart },
  { id: 'fun-emoji', name: 'Emoji', icon: SmilePlus },
  { id: 'initials', name: 'Initials', icon: Type },
];

// Section header component - consistent with L5 design system
const SectionHeader: React.FC<{
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
}> = ({ icon: Icon, iconColor, bgColor, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700/50">
    <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <div className="flex-1">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400">{subtitle}</p>
    </div>
  </div>
);

export const AvatarTab: React.FC<AvatarTabProps> = ({
  formData,
  setFormData,
}) => {
  // Undo history
  const [history, setHistory] = useState<string[]>([]);
  const maxHistory = 10;
  
  // UI state
  const [selectedStyle, setSelectedStyle] = useState('avataaars');
  const [isUploading, setIsUploading] = useState(false);
  
  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current avatar info
  const currentAvatar = formData.avatar_url || '';
  const isUploadedImage = currentAvatar && (
    currentAvatar.includes('supabase') || 
    currentAvatar.startsWith('blob:') ||
    currentAvatar.startsWith('data:')
  );
  const isGenerated = currentAvatar.includes('dicebear');

  // Update avatar with history tracking
  const handleAvatarChange = useCallback((url: string) => {
    if (url === currentAvatar) return;
    
    if (currentAvatar) {
      setHistory(prev => [...prev.slice(-(maxHistory - 1)), currentAvatar]);
    }
    
    setFormData({ ...formData, avatar_url: url });
  }, [formData, setFormData, currentAvatar]);

  // Undo
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    
    const previousAvatar = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setFormData({ ...formData, avatar_url: previousAvatar });
  }, [history, formData, setFormData]);

  // Generate avatar with style
  const generateAvatar = (style: string) => {
    const seed = style === 'initials' 
      ? `${formData.first_name?.[0] || ''}${formData.last_name?.[0] || ''}`.toUpperCase()
      : Math.random().toString(36).substring(7);
    
    const bgParam = style === 'initials' ? '&backgroundColor=0ea5e9' : '';
    handleAvatarChange(`https://api.dicebear.com/7.x/${style}/svg?seed=${seed}${bgParam}`);
    setSelectedStyle(style);
  };

  // Regenerate current style
  const regenerateAvatar = () => {
    generateAvatar(selectedStyle);
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(data.path);

      handleAvatarChange(publicUrl);
    } catch (error) {
      console.error("Error uploading avatar:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Get current style name
  const currentStyleName = AVATAR_STYLES.find(s => currentAvatar.includes(s.id))?.name || 'Generated';

  return (
    <div className="space-y-8">
      {/* Main Section */}
      <section className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
        <SectionHeader
          icon={Camera}
          iconColor="text-lime-400"
          bgColor="bg-lime-500/20"
          title="Profile Picture"
          subtitle={isUploadedImage ? 'Custom photo uploaded' : isGenerated ? `${currentStyleName} style` : 'No avatar set'}
        />

        {/* Split Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Actions */}
          <div className="flex-1 space-y-5 order-2 lg:order-1">
            {/* Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Upload Photo
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-3 w-full p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                <ImagePlus className="w-5 h-5 text-gray-400" />
                <div className="text-left">
                  <p className="text-sm text-gray-300">{isUploading ? 'Uploading...' : 'Choose file'}</p>
                  <p className="text-xs text-gray-500">JPG, PNG, or GIF</p>
                </div>
              </button>
            </div>

            {/* Avatar Styles */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Generated Styles
              </label>
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_STYLES.map((style) => {
                  const Icon = style.icon;
                  const isSelected = selectedStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => generateAvatar(style.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{style.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Actions
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={regenerateAvatar}
                  className="flex items-center gap-3 w-full p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 hover:bg-gray-800 transition-all"
                >
                  <Shuffle className="w-5 h-5 text-gray-400" />
                  <div className="text-left">
                    <p className="text-sm text-gray-300">Regenerate</p>
                    <p className="text-xs text-gray-500">New random variation</p>
                  </div>
                </button>
                
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="flex items-center gap-3 w-full p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 hover:bg-gray-800 transition-all"
                  >
                    <Undo2 className="w-5 h-5 text-gray-400" />
                    <div className="text-left">
                      <p className="text-sm text-gray-300">Undo</p>
                      <p className="text-xs text-gray-500">{history.length} change{history.length !== 1 ? 's' : ''} in history</p>
                    </div>
                  </button>
                )}

                {currentAvatar && (
                  <button
                    type="button"
                    onClick={() => handleAvatarChange('')}
                    className="flex items-center gap-3 w-full p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 hover:bg-gray-800 transition-all"
                  >
                    <Trash2 className="w-5 h-5 text-gray-400" />
                    <div className="text-left">
                      <p className="text-sm text-gray-300">Remove</p>
                      <p className="text-xs text-gray-500">Clear profile picture</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Avatar Preview */}
          <div className="lg:w-56 flex flex-col items-center order-1 lg:order-2">
            <div className="relative group">
              <div className="w-40 h-40 lg:w-48 lg:h-48 rounded-2xl overflow-hidden bg-gray-800 border border-gray-700">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserCircle className="w-20 h-20 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Hover overlay */}
              {isGenerated && (
                <button
                  type="button"
                  onClick={regenerateAvatar}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center"
                >
                  <div className="text-center">
                    <Shuffle className="w-6 h-6 text-white mx-auto mb-1" />
                    <span className="text-xs text-white">Regenerate</span>
                  </div>
                </button>
              )}

              {!currentAvatar && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center"
                >
                  <div className="text-center">
                    <ImagePlus className="w-6 h-6 text-white mx-auto mb-1" />
                    <span className="text-xs text-white">Upload</span>
                  </div>
                </button>
              )}
            </div>

            {/* Type indicator */}
            <p className="mt-3 text-xs text-gray-500">
              {isUploadedImage ? 'Custom photo' : isGenerated ? currentStyleName : 'No avatar'}
            </p>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-300">About Avatars</h4>
            <p className="text-sm text-gray-500 mt-1">
              Profile pictures help team members recognize each other on schedules 
              and throughout the app. Upload a photo or choose from 9 generated styles.
            </p>
          </div>
        </div>
      </section>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};
