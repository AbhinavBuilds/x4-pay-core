import React from 'react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showSettings?: boolean;
  showClose?: boolean;
  showAppIcon?: boolean;
  theme?: 'light' | 'dark';
  onBackPress?: () => void;
  onSettingsPress?: () => void;
  onClosePress?: () => void;
}

// Black and white icons
const BackIcon = ({ size = 20, color = 'white' }: { size?: number; color?: string }) => (
  <div style={{ width: size, height: size }} className="flex items-center justify-center">
    <span style={{ fontSize: size * 0.8, color }}>‹</span>
  </div>
);

const SettingsIcon = ({ size = 20, color = 'white' }: { size?: number; color?: string }) => (
  <div style={{ width: size, height: size }} className="flex items-center justify-center">
    <span style={{ fontSize: size * 0.8, color }}>⚙</span>
  </div>
);

const CloseIcon = ({ size = 20, color = 'white' }: { size?: number; color?: string }) => (
  <div style={{ width: size, height: size }} className="flex items-center justify-center">
    <span style={{ fontSize: size * 0.8, color }}>✕</span>
  </div>
);

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  showSettings = false,
  showClose = false,
  showAppIcon = false,
  theme = 'dark',
  onBackPress,
  onSettingsPress,
  onClosePress,
}) => {
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-black' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-black';
  const borderColor = isDark ? 'border-white/8' : 'border-black/8';
  const iconBg = isDark ? 'bg-white/8' : 'bg-black/8';

  return (
    <div className={`border-b ${borderColor} ${bgColor}`}>
      <div className="flex items-center justify-between px-4 py-4 max-w-md mx-auto">
        {/* Left Side */}
        <div className="flex items-center gap-4 flex-1">
          {showBack && onBackPress ? (
            <button
              onClick={onBackPress}
              className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center active:scale-95 transition-all duration-150`}
            >
              <BackIcon size={22} color={isDark ? 'white' : 'black'} />
            </button>
          ) : showAppIcon ? (
            <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center`}>
              <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg" />
            </div>
          ) : null}
          
          <div className="flex-1">
            {title ? (
              typeof title === 'string' ? (
                <div className={`font-semibold tracking-tight ${textColor} text-xl`}>{title}</div>
              ) : (
                <img src="/banner.png" alt="x4 Pay" className="h-8" />
              )
            ) : (
              <img src="/banner.png" alt="x4 Pay" className="h-8" />
            )}
            {subtitle && (
              <div className={`text-sm font-light mt-0.5 ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {showSettings && onSettingsPress && (
            <button
              onClick={onSettingsPress}
              className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center active:scale-95 transition-all duration-150`}
            >
              <SettingsIcon size={20} color={isDark ? 'white' : 'black'} />
            </button>
          )}
          
          {showClose && onClosePress && (
            <button
              onClick={onClosePress}
              className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center active:scale-95 transition-all duration-150`}
            >
              <CloseIcon size={20} color={isDark ? 'white' : 'black'} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;