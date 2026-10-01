import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { initializeStorage } from './services/storage';
import { useAppStore } from './store/useAppStore';

// Pages
import LandingPage from './pages/LandingPage';
import PatientHome from './pages/patient/PatientHome';
import VoiceInteraction from './pages/patient/VoiceInteraction';
import GamesHome from './pages/patient/GamesHome';
import MemoryGame from './pages/patient/games/MemoryGame';
import LanguageGame from './pages/patient/games/LanguageGame';
import OrientationGame from './pages/patient/games/OrientationGame';
import AttentionGame from './pages/patient/games/AttentionGame';
import JudgementGame from './pages/patient/games/JudgementGame';
import PhotoPairsGame from './pages/patient/games/PhotoPairsGame';
import StoryRecallGame from './pages/patient/games/StoryRecallGame';
import FinishPhraseGame from './pages/patient/games/FinishPhraseGame';
import TimeOfDayGame from './pages/patient/games/TimeOfDayGame';
import TapTargetGame from './pages/patient/games/TapTargetGame';
import SortingGame from './pages/patient/games/SortingGame';
import RoutineGame from './pages/patient/games/RoutineGame';
import MoodCheckIn from './pages/patient/games/MoodCheckIn';
import MemoriesPage from './pages/patient/MemoriesPage';
import RemindersPage from './pages/patient/RemindersPage';
import SettingsPage from './pages/patient/SettingsPage';
import CaregiverDashboard from './pages/caregiver/CaregiverDashboard';
import FamilyMemories from './pages/caregiver/FamilyMemories';
import AshaView from './pages/caregiver/AshaView';
import DemoMode from './pages/demo/DemoMode';

// Layouts
import PatientLayout from './components/shared/PatientLayout';

function App() {
  const { isOnline, setOnline, pendingSyncCount } = useAppStore();

  // Initialize storage on first load
  useEffect(() => {
    initializeStorage();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingSyncCount > 0) {
      // Generate records and sync
      import('./services/syncService').then(({ generateSyncRecords, syncPendingData }) => {
        generateSyncRecords();
        syncPendingData().then(result => {
          if (result.success) {
            useAppStore.getState().showToast(result.message, 'success');
          }
        }).catch(() => { /* will retry */ });
      });
    }
  }, [isOnline, pendingSyncCount]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Patient routes */}
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<PatientHome />} />
          <Route path="talk" element={<VoiceInteraction />} />
          <Route path="games" element={<GamesHome />} />
          <Route path="games/memory" element={<MemoryGame />} />
          <Route path="games/language" element={<LanguageGame />} />
          <Route path="games/orientation" element={<OrientationGame />} />
          <Route path="games/attention" element={<AttentionGame />} />
          <Route path="games/judgement-check" element={<JudgementGame mode="probe" />} />
          <Route path="games/judgement-practice" element={<JudgementGame mode="adaptive" />} />
          <Route path="games/photo-pairs" element={<PhotoPairsGame />} />
          <Route path="games/story-recall" element={<StoryRecallGame />} />
          <Route path="games/finish-phrase" element={<FinishPhraseGame />} />
          <Route path="games/time-of-day" element={<TimeOfDayGame />} />
          <Route path="games/tap-target" element={<TapTargetGame />} />
          <Route path="games/sorting" element={<SortingGame />} />
          <Route path="games/routine" element={<RoutineGame />} />
          <Route path="games/mood" element={<MoodCheckIn />} />
          <Route path="memories" element={<MemoriesPage />} />
          <Route path="reminders" element={<RemindersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Caregiver routes */}
        <Route path="/caregiver" element={<CaregiverDashboard />} />
        <Route path="/caregiver/memories" element={<FamilyMemories />} />

        {/* ASHA route */}
        <Route path="/asha" element={<AshaView />} />

        {/* Demo route */}
        <Route path="/demo" element={<DemoMode />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
