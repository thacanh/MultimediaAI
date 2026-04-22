/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import Processing from './views/Processing';
import AnalysisDetail from './views/AnalysisDetail';
import AnalysisSetupModal from './components/AnalysisSetupModal';
import { ViewMode, AnalysisContext } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [analysisContext, setAnalysisContext] = useState<AnalysisContext | null>(null);

  const handleNewAnalysis = () => {
    setIsSetupModalOpen(true);
  };

  const handleStartAnalysis = (context: AnalysisContext) => {
    setAnalysisContext(context);
    setIsSetupModalOpen(false);
    setViewMode('processing');
    setActiveTab('dashboard');
  };

  // Called when Processing finishes its simulated pipeline
  const handleProcessingComplete = () => {
    setViewMode('detail');
  };

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setViewMode('detail');
    setActiveTab(`project-${projectId}`);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'dashboard') {
      setViewMode('dashboard');
    }
  };

  const handleCancelProcessing = () => {
    setViewMode('dashboard');
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNewAnalysis={handleNewAnalysis}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        onProjectClick={handleProjectClick}
      />

      <main className={`transition-all duration-500 min-h-screen ${isCollapsed ? 'pl-0' : 'md:pl-64'}`}>
        <div className="p-8 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {viewMode === 'dashboard' && (
              <Dashboard
                key="dashboard"
                onNewAnalysis={handleNewAnalysis}
                onProjectClick={handleProjectClick}
              />
            )}

            {viewMode === 'processing' && (
              <Processing
                key="processing"
                onCancel={handleCancelProcessing}
                onComplete={handleProcessingComplete}
                context={analysisContext}
              />
            )}

            {viewMode === 'detail' && (
              <AnalysisDetail
                key="detail"
                context={analysisContext || undefined}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnalysisSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onStart={handleStartAnalysis}
      />
    </div>
  );
}
