/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import Dashboard from './views/Dashboard';
import Analytics from './views/Analytics';
import Processing from './views/Processing';
import AnalysisDetail from './views/AnalysisDetail';
import History from './views/History';
import AnalysisSetupModal from './components/AnalysisSetupModal';
import { ViewMode, AnalysisContext, AnalysisResponse, AnalysisRecord } from './types';
import { getAnalysis, getVideoUrl } from './api';

function AppInner() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [analysisContext, setAnalysisContext] = useState<AnalysisContext | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [historyVideoUrl, setHistoryVideoUrl] = useState<string | null>(null);
  // Cleanup blob URLs khi không còn dùng (tránh memory leak)
  const prevBlobUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevBlobUrlRef.current;
    if (prev && prev.startsWith('blob:') && prev !== historyVideoUrl) {
      URL.revokeObjectURL(prev);
    }
    prevBlobUrlRef.current = historyVideoUrl;
    return () => {
      if (historyVideoUrl && historyVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(historyVideoUrl);
      }
    };
  }, [historyVideoUrl]);

  const handleNewAnalysis = () => setIsSetupModalOpen(true);

  const handleStartAnalysis = (context: AnalysisContext, file: File) => {
    setAnalysisContext(context);
    setVideoFile(file);
    setAnalysisResult(null);
    setHistoryVideoUrl(null);
    setIsSetupModalOpen(false);
    setViewMode('processing');
    setActiveTab('dashboard');
  };

  const handleProcessingComplete = (result: AnalysisResponse) => {
    setAnalysisResult(result);
    // Tạo blob URL ngay lập tức từ videoFile để video load được ngay sau khi xử lý xong
    // (tránh race condition khi useMemo trong AnalysisDetail tạo URL và bị revoke sớm)
    if (videoFile) {
      const blobUrl = URL.createObjectURL(videoFile);
      setHistoryVideoUrl(blobUrl);
    }
    setViewMode('detail');
  };

  const handleTabChange = (tab: string) => {
    // Không cho phép chuyển tab khi đang phân tích
    if (viewMode === 'processing') return;
    setActiveTab(tab);
    if (tab === 'dashboard') setViewMode('dashboard');
    else if (tab === 'history') setViewMode('history');
    else if (tab === 'analytics') setViewMode('dashboard');
  };

  const handleCancelProcessing = () => {
    setViewMode('dashboard');
    setActiveTab('dashboard');
    setVideoFile(null);
  };

  // Open a record from history → load full detail → show AnalysisDetail
  const handleOpenRecord = async (record: AnalysisRecord) => {
    try {
      const detail = await getAnalysis(record.id);
      if (!detail.payload) {
        alert('Bản ghi này không có dữ liệu phân tích đầy đủ.');
        return;
      }
      setAnalysisResult({
        payload: detail.payload as any,
        review: detail.review as any,
      });
      setAnalysisContext(null);
      setVideoFile(null);

      // Lấy presigned URL trực tiếp từ MinIO (nhanh hơn proxy stream)
      if (detail.has_video) {
        try {
          const url = await getVideoUrl(record.id);
          setHistoryVideoUrl(url);
        } catch {
          setHistoryVideoUrl(null);
        }
      } else {
        setHistoryVideoUrl(null);
      }

      setActiveTab('dashboard');
      setViewMode('detail');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      alert(`Không thể tải chi tiết bản ghi: ${msg}`);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNewAnalysis={handleNewAnalysis}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        onProjectClick={() => {}}
        onLoginClick={() => setIsAuthModalOpen(true)}
        isProcessing={viewMode === 'processing'}
      />

      <main className={`transition-all duration-500 min-h-screen ${isCollapsed ? 'pl-0' : 'md:pl-64'}`}>
        <div className="p-8 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">

            {/* Lịch sử */}
            {activeTab === 'history' && (
              <History
                key="history"
                onNewAnalysis={handleNewAnalysis}
                onOpenRecord={handleOpenRecord}
                onLoginClick={() => setIsAuthModalOpen(true)}
              />
            )}

            {/* Tab phân tích — empty state */}
            {activeTab === 'analytics' && viewMode !== 'processing' && viewMode !== 'detail' && (
              <Analytics
                key="analytics"
                onNewAnalysis={handleNewAnalysis}
                onOpenRecord={handleOpenRecord}
                onLoginClick={() => setIsAuthModalOpen(true)}
              />
            )}

            {/* Dashboard */}
            {activeTab !== 'analytics' && activeTab !== 'history' && viewMode === 'dashboard' && (
              <Dashboard
                key="dashboard"
                onNewAnalysis={handleNewAnalysis}
                onProjectClick={() => {}}
              />
            )}

            {/* Đang xử lý */}
            {viewMode === 'processing' && videoFile && (
              <Processing
                key="processing"
                file={videoFile}
                context={analysisContext}
                onCancel={handleCancelProcessing}
                onComplete={handleProcessingComplete}
              />
            )}

            {/* Kết quả phân tích */}
            {viewMode === 'detail' && analysisResult && (
              <AnalysisDetail
                key="detail"
                context={analysisContext || undefined}
                analysisResult={analysisResult}
                videoFile={videoFile}
                videoSrcUrl={historyVideoUrl}
              />
            )}

            {viewMode === 'detail' && !analysisResult && (
              <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
                <p className="text-lg font-bold">Chưa có kết quả phân tích.</p>
                <p className="text-sm">Hãy tải video lên để bắt đầu.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnalysisSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onStart={handleStartAnalysis}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
