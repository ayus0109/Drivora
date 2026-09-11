import React from 'react';
import { ChevronRight, HardDrive } from 'lucide-react';

const Breadcrumbs = ({ path = [], onNavigate }) => {
  return (
    <nav className="flex items-center space-x-1 sm:space-x-1.5 text-sm sm:text-base font-medium text-gray-700 py-1 overflow-x-auto no-scrollbar max-w-full">
      {path.map((item, index) => {
        const isLast = index === path.length - 1;

        return (
          <React.Fragment key={item._id || 'root'}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mx-0.5" />
            )}

            <button
              onClick={() => onNavigate(item._id)}
              disabled={isLast}
              className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all flex-shrink-0 touch-active ${
                isLast
                  ? 'font-bold text-gray-900 cursor-default bg-gray-100/90 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 font-semibold'
              }`}
            >
              {index === 0 && (
                <HardDrive className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-blue-600 flex-shrink-0" />
              )}
              <span className="truncate max-w-[160px] sm:max-w-[260px] text-sm sm:text-base font-bold">
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
