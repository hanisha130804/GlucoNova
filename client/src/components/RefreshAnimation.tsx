// RefreshAnimation.tsx - Visual feedback for refresh actions
import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface RefreshAnimationProps {
  category: string;
}

export const RefreshAnimation: React.FC<RefreshAnimationProps> = ({ category }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleRefreshComplete = (event: CustomEvent) => {
      if (event.detail === category) {
        setShow(true);
        setTimeout(() => setShow(false), 2000);
      }
    };

    document.addEventListener('refreshComplete', handleRefreshComplete as EventListener);
    return () => document.removeEventListener('refreshComplete', handleRefreshComplete as EventListener);
  }, [category]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 duration-300">
      <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-sm">
        <CheckCircle className="w-5 h-5 animate-pulse" />
        <span className="font-semibold">
          {category === 'breakfast' ? '🍳 New breakfast' : '🥗 New snacks'} loaded!
        </span>
      </div>
    </div>
  );
};
