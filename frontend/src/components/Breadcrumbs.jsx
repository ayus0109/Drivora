import React from 'react';
import { ChevronRight, HardDrive } from 'lucide-react';

const Breadcrumbs = ({ path = [], onNavigate }) => {
  return (
    <nav className="flex items-center space-x-1 text-xs sm:text-sm font-medium text-gray-700 py-1 overflow-x-auto no-scrollbar max-w-full">
      {path.map((item, index) => {
        const isLast = index === path.length - 1;

        return (
          <React.Fragment key={item._id || 'root'}>
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            )}

            <button
              onClick={() => onNavigate(item._id)}
              disabled={isLast}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors flex-shrink-0 ${
                isLast
                  ? 'font-bold text-gray-900 cursor-default bg-gray-100/70'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {index === 0 && <HardDrive className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />}
              <span className="truncate max-w-[120px] sm:max-w-[200px]">
                {item.name}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
