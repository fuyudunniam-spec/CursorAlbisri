import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Tab {
  label: string;
  path: string;
}

interface ModuleHeaderProps {
  title: string;
  tabs: Tab[];
}

const ModuleHeader: React.FC<ModuleHeaderProps> = ({ title, tabs }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="mb-8">
      {/* Module Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <Button
            key={tab.path}
            variant="ghost"
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              isActive(tab.path)
                ? "border-b-2 border-primary text-primary bg-primary/5"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
            onClick={() => navigate(tab.path)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ModuleHeader;
