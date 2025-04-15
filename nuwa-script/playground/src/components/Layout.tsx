import React, { useState, useEffect, ReactNode } from 'react';
import { BoltIcon } from './AppIcons'; // Import BoltIcon if used

type ActiveSidePanel = 'examples' | 'tools';

interface HeaderProps {
  onRunClick: () => void;
  isRunning: boolean;
  isRunDisabled: boolean;
}

interface LayoutProps {
  headerProps: HeaderProps;
  sidebarContent: ReactNode;
  mainPanelTitle: string;
  mainPanelContent: ReactNode;
  scriptPanelTitle: string;
  scriptPanelContent: ReactNode;
  chatPanelContent: ReactNode;
  onSelectSidebarTab: (tab: ActiveSidePanel) => void;
  initialActiveSidePanel: ActiveSidePanel;
}

const Layout: React.FC<LayoutProps> = ({
  headerProps,
  sidebarContent,
  mainPanelTitle,
  mainPanelContent,
  scriptPanelTitle,
  scriptPanelContent,
  chatPanelContent,
  onSelectSidebarTab,
  initialActiveSidePanel,
}) => {
  const [activeSidePanel, setActiveSidePanel] = useState<ActiveSidePanel>(initialActiveSidePanel);
  const [scriptPanelHeight, setScriptPanelHeight] = useState<string>('40%');
  const [isDragging, setIsDragging] = useState(false);

  // Update internal state if initial prop changes (though direct control via prop might be better)
  useEffect(() => {
    setActiveSidePanel(initialActiveSidePanel);
  }, [initialActiveSidePanel]);


  const handleSidebarTabClick = (tab: ActiveSidePanel) => {
    setActiveSidePanel(tab);
    onSelectSidebarTab(tab); // Notify parent about the change
  };

  // Start resize operation for editor/output panels
  const startResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Handle resize on drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Try to find the main container reliably
        const container = document.querySelector('.main-container-for-resize') as HTMLDivElement; // Add this class to the main div
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const y = e.clientY - containerRect.top;

          const height = containerRect.height || 1; // Avoid division by zero
          const percentage = (y / height) * 100;

          // Define min/max heights for the script panel
          const minHeightPercent = 15; // e.g., 15% minimum height
          const maxHeightPercent = 85; // e.g., 85% maximum height

          const clampedPercentage = Math.min(Math.max(percentage, minHeightPercent), maxHeightPercent);

          setScriptPanelHeight(`${clampedPercentage}%`);
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp, { once: true });
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp); // Ensure listener is removed
    };
  }, [isDragging]); // Dependency array is correct

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 main-container-for-resize"> {/* Added class for resize */}
      {/* Header */}
      <header className="nuwa-header flex items-center justify-between px-4 py-2 shadow-md bg-white dark:bg-gray-800 flex-shrink-0"> {/* Ensure header doesn't shrink */}
        <div className="flex items-center space-x-4">
          <a href="https://github.com/rooch-network/nuwa" target="_blank" rel="noopener noreferrer" className="flex items-center">
            <img src="/nuwa-icon.svg" alt="Nuwa Logo" className="logo h-8 w-8" />
          </a>
          <div className="ml-2 text-lg font-semibold text-gray-800 dark:text-gray-200">NuwaScript Playground</div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={headerProps.onRunClick}
            disabled={headerProps.isRunDisabled}
            className="nuwa-button flex items-center"
          >
            {headerProps.isRunning ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Running...
              </>
            ) : (
              <>
                <BoltIcon className="mr-1" /> Run
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden"> {/* Ensure this flex container takes remaining space */}
        {/* Left sidebar */}
        <aside 
          className="fixed-sidebar-width bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col"
        > {/* Using our custom fixed-sidebar-width class */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              className={`flex-1 py-2 px-4 text-sm font-medium text-center ${activeSidePanel === 'examples' ? 'bg-gray-100 dark:bg-gray-700 text-brand-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              onClick={() => handleSidebarTabClick('examples')}
            >
              Examples
            </button>
            <button
              className={`flex-1 py-2 px-4 text-sm font-medium text-center ${activeSidePanel === 'tools' ? 'bg-gray-100 dark:bg-gray-700 text-brand-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              onClick={() => handleSidebarTabClick('tools')}
            >
              Tools
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {sidebarContent}
          </div>
        </aside>

        {/* Middle and right content area */}
        <main className="flex-1 flex flex-col overflow-hidden"> {/* Main area takes remaining horizontal space */}
          <div className="flex flex-1 overflow-hidden"> {/* This inner flex handles horizontal layout */}

            {/* Main application panel (takes available space) */}
            <div className="flex-1 overflow-hidden flex flex-col main-panel min-w-[600px]"> {/* Ensure min-width and flex-1 */}
              {/* Top part: Output/Canvas */}
              <div className="flex-1 overflow-hidden relative bg-white flex flex-col"> {/* Ensure this takes space and allows children to flex */}
                <div className="flex items-center px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0"> {/* Panel header */}
                  <BoltIcon size="small" className="text-gray-700 mr-2 w-4 h-4" />
                  <span className="text-sm text-gray-700">{mainPanelTitle}</span>
                </div>
                 {/* Content area: Needs to fill remaining space */}
                <div className="flex-1 p-4 bg-white overflow-auto flex flex-col"> {/* Use flex-1 to grow, flex-col */}
                    {mainPanelContent}
                </div>
              </div>

              {/* Bottom part: Script Panel (controlled height) */}
              <div className="border-t border-gray-200 flex flex-col" style={{ height: scriptPanelHeight }}> {/* Use flex-col here */}
                <div
                  className="resize-handle cursor-ns-resize w-full h-1 bg-gray-200 hover:bg-blue-300 flex-shrink-0"
                  onMouseDown={startResize}
                ></div>
                <div className="px-4 py-1 bg-white border-b border-gray-200 text-sm text-gray-700 flex justify-between items-center flex-shrink-0"> {/* Panel header */}
                  <div>{scriptPanelTitle}</div>
                  <button
                    onClick={() => setScriptPanelHeight('40%')} // Reset height
                    className="text-gray-500 hover:text-gray-700 p-1" // Added padding for easier clicking
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg> {/* Adjusted stroke width */}
                  </button>
                </div>
                 {/* Editor Content: Needs to fill remaining space */}
                <div className="flex-1 overflow-hidden"> {/* Use flex-1 to fill space */}
                  {scriptPanelContent}
                </div>
              </div>
            </div>

            {/* AI Chat panel (fixed width) */}
            <div className="w-80 min-w-[320px] max-w-xs border-l border-gray-200 bg-white overflow-hidden flex flex-col flex-shrink-0"> {/* Ensure fixed width and no shrinking */}
              <div className="p-4 h-full flex flex-col"> {/* Ensure chat content fills height */}
                {chatPanelContent}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout; 