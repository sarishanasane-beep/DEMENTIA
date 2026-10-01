import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Image, Mic, FileText, Trash2, Check, X, Edit3, Eye, Upload, Play, Pause, Shield
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  getMemories, addMemory, updateMemory, deleteMemory,
  getActivitiesForMemory, getMemoryCompletions
} from '../../services/storage';
import { saveMedia, deleteMedia } from '../../services/mediaStorage';
import { createRealReminiscenceService } from '../../services/reminiscenceAI';
import { v4 as uuid } from 'uuid';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import type { Memory, MemoryActivity, MemoryProcessingStatus } from '../../types';

type ViewMode = 'list' | 'add' | 'review' | 'detail';

export default function FamilyMemories() {
  const navigate = useNavigate();
  const { updateMemoryActivity } = useAppStore();
  const [view, setView] = useState<ViewMode>('list');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<MemoryActivity | null>(null);
  const [, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const memories = getMemories();
  const completions = getMemoryCompletions();

  const stats = {
    total: memories.length,
    pending: memories.filter(m => m.status === 'pending').length,
    approved: memories.filter(m => m.status === 'approved').length,
    excluded: memories.filter(m => m.status === 'excluded').length,
  };

  if (view === 'add') {
    return <AddMemoryView onBack={() => { setView('list'); refresh(); }} />;
  }

  if (view === 'review' && selectedActivity) {
    return (
      <ActivityReviewView
        activity={selectedActivity}
        memory={memories.find(m => m.id === selectedActivity.sourceMemoryId) || null}
        onBack={() => { setView('detail'); setSelectedActivity(null); refresh(); }}
        onApprove={(id) => { updateMemoryActivity(id, { status: 'approved' }); refresh(); setView('list'); }}
        onExclude={(id) => { updateMemoryActivity(id, { status: 'excluded' }); refresh(); setView('list'); }}
        onEdit={(id, updates) => { updateMemoryActivity(id, { ...updates, status: 'pending_review' }); refresh(); setView('list'); }}
      />
    );
  }

  if (view === 'detail' && selectedMemory) {
    const memActivities = getActivitiesForMemory(selectedMemory.id);
    const memCompletions = completions.filter(c => memActivities.some(a => a.id === c.activityId));
    return (
      <MemoryDetailView
        memory={selectedMemory}
        activities={memActivities}
        completions={memCompletions}
        onBack={() => { setView('list'); setSelectedMemory(null); }}
        onReview={(act) => { setSelectedActivity(act); setView('review'); }}
        onDelete={async (id) => {
          const mediaId = deleteMemory(id);
          if (mediaId) await deleteMedia(mediaId);
          refresh(); setView('list'); setSelectedMemory(null);
        }}
        onStatusChange={(id, status) => { updateMemory(id, { status }); refresh(); }}
      />
    );
  }

  // ---- List View ----
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/caregiver')} className="p-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Family Memories</h1>
          </div>
          <button onClick={() => setView('add')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium active:scale-95">
            <Plus size={16} /> Add Memory
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-700' },
            { label: 'Pending', value: stats.pending, color: 'text-caution-500' },
            { label: 'Approved', value: stats.approved, color: 'text-success-500' },
            { label: 'Excluded', value: stats.excluded, color: 'text-gray-400' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {memories.filter(m => m.status === 'pending').length > 0 && (
          <div className="bg-caution-50 rounded-2xl p-4 border border-caution-200">
            <h3 className="font-bold text-caution-700 mb-2 text-sm">⏳ Pending Review</h3>
            <p className="text-xs text-caution-600 mb-3">These memories need your approval before they appear to the patient.</p>
            <div className="space-y-2">
              {memories.filter(m => m.status === 'pending').map(memory => (
                <MemoryCard key={memory.id} memory={memory} activities={getActivitiesForMemory(memory.id)}
                  onView={() => { setSelectedMemory(memory); setView('detail'); }}
                  onApprove={() => { updateMemory(memory.id, { status: 'approved', processingStatus: 'approved' }); refresh(); }}
                  onExclude={() => { updateMemory(memory.id, { status: 'excluded', processingStatus: 'excluded' }); refresh(); }} />
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3">All Memories</h3>
          <div className="space-y-2">
            {memories.filter(m => m.status !== 'pending').map(memory => (
              <MemoryCard key={memory.id} memory={memory} activities={getActivitiesForMemory(memory.id)}
                onView={() => { setSelectedMemory(memory); setView('detail'); }}
                onApprove={() => { updateMemory(memory.id, { status: 'approved', processingStatus: 'approved' }); refresh(); }}
                onExclude={() => { updateMemory(memory.id, { status: 'excluded', processingStatus: 'excluded' }); refresh(); }} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-2 text-sm">🔒 Privacy</h3>
          <div className="space-y-1 text-xs text-gray-500">
            <p>• Family memories are personal information.</p>
            <p>• Only approved memories are shown to the patient.</p>
            <p>• Family members appearing in photos or recordings should consent to their use.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Memory Card ----
function MemoryCard({ memory, activities, onView, onApprove, onExclude }: {
  memory: Memory; activities: MemoryActivity[];
  onView: () => void; onApprove: () => void; onExclude: () => void;
}) {
  const typeIcon = { photo: '📷', audio: '🎙️', story: '📖', video: '🎬' }[memory.type] || '📷';
  const statusColors = { approved: 'bg-success-50 text-success-500', pending: 'bg-caution-50 text-caution-500', excluded: 'bg-gray-100 text-gray-500' };
  const { url: mediaUrl } = useMediaUrl(memory.mediaId, memory.imageUrl || undefined);

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center text-xl shrink-0 overflow-hidden">
        {mediaUrl ? (
          <img src={mediaUrl} alt="" className="w-12 h-12 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : typeIcon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700 text-sm">{memory.title}</span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${statusColors[memory.status]}`}>{memory.status}</span>
          {memory.sensitive && <Shield size={12} className="text-caution-500" />}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {memory.type.toUpperCase()}
          {memory.event && ` · ${memory.event}`}
          {memory.year && ` · ${memory.year}`}
        </div>
        {activities.length > 0 && (
          <div className="text-xs text-primary-500 mt-1">
            {activities.length} activit{activities.length > 1 ? 'ies' : 'y'}
            {activities.filter(a => a.status === 'pending_review').length > 0 && (
              <span className="text-caution-500 ml-1">· {activities.filter(a => a.status === 'pending_review').length} to review</span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onView} className="p-2 rounded-lg hover:bg-gray-200 text-gray-400" title="View"><Eye size={16} /></button>
        {memory.status === 'pending' && (
          <>
            <button onClick={onApprove} className="p-2 rounded-lg hover:bg-success-100 text-success-500" title="Approve"><Check size={16} /></button>
            <button onClick={onExclude} className="p-2 rounded-lg hover:bg-alert-50 text-alert-500" title="Exclude"><X size={16} /></button>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Add Memory View ----
function AddMemoryView({ onBack }: { onBack: () => void }) {
  const { language, addMemoryActivities } = useAppStore();
  const [type, setType] = useState<'photo' | 'audio' | 'story'>('photo');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [people, setPeople] = useState('');
  const [event, setEvent] = useState('');
  const [location, setLocation] = useState('');
  const [year, setYear] = useState('');
  const [whyImportant, setWhyImportant] = useState('');
  const [sensitive, setSensitive] = useState(false);
  const [step, setStep] = useState<'form' | 'processing' | 'transcript_review' | 'generated'>('form');
  const [processStage, setProcessStage] = useState(0);
  const [generatedActivities, setGeneratedActivities] = useState<MemoryActivity[]>([]);
  const [aiMode, setAiMode] = useState<'mock' | 'real' | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<{ description: string; setting: string; uncertaintyNotes: string[] } | null>(null);
  const [transcript, setTranscript] = useState('');
  const [transcriptMode, setTranscriptMode] = useState<'mock' | 'real' | 'manual' | 'error' | null>(null);

  // File upload states
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Track previous blob URLs for cleanup
  const prevPhotoPreviewRef = useRef<string | null>(null);
  const prevAudioPreviewRef = useRef<string | null>(null);

  // Revoke previous blob URL whenever a new preview is set
  useEffect(() => {
    if (prevPhotoPreviewRef.current && prevPhotoPreviewRef.current !== photoPreview) {
      URL.revokeObjectURL(prevPhotoPreviewRef.current);
    }
    prevPhotoPreviewRef.current = photoPreview;
  }, [photoPreview]);

  useEffect(() => {
    if (prevAudioPreviewRef.current && prevAudioPreviewRef.current !== audioPreview) {
      URL.revokeObjectURL(prevAudioPreviewRef.current);
    }
    prevAudioPreviewRef.current = audioPreview;
  }, [audioPreview]);

  // Revoke remaining blob URLs on unmount
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      if (audioPreview) URL.revokeObjectURL(audioPreview);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    setAudioPreview(URL.createObjectURL(file));
  };

  const processingStages = [
    'Uploading content...',
    type === 'photo' ? 'Analysing image...' : type === 'audio' ? 'Transcribing voice...' : 'Understanding content...',
    'Generating activities...',
    'Finalising...',
  ];

  const handleSave = async () => {
    if (!title.trim()) return;
    setStep('processing');
    setProcessStage(0);

    const memoryId = uuid();
    const peopleList = people.split(',').map(p => p.trim()).filter(Boolean);

    // Save media to IndexedDB if uploaded
    let mediaId: string | undefined;
    let imageUrl = '';
    if (type === 'photo' && photoFile) {
      mediaId = await saveMedia(photoFile);
      imageUrl = photoPreview || '';
    } else if (type === 'photo') {
      imageUrl = 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop';
    } else if (type === 'audio' && audioFile) {
      mediaId = await saveMedia(audioFile);
    }

    const memory: Memory = {
      id: memoryId,
      patientId: 'P001',
      title: title.trim(),
      description: description.trim() || title.trim(),
      imageUrl,
      mediaId,
      type,
      people: peopleList.length > 0 ? peopleList : undefined,
      event: event.trim() || undefined,
      location: location.trim() || undefined,
      year: year.trim() || undefined,
      whyImportant: whyImportant.trim() || undefined,
      sensitive,
      status: 'pending',
      processingStatus: 'uploaded',
      createdAt: new Date().toISOString(),
    };

    addMemory(memory);

    // Stage 1: Uploading
    setProcessStage(0);
    await new Promise(r => setTimeout(r, 400));

    const service = createRealReminiscenceService();

    // Stage 2: Image analysis (photos) or Transcription (audio)
    if (type === 'photo' && photoFile) {
      setProcessStage(1);
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(photoFile);
        });

        const analysis = await service.analyzeImage(base64, 'P001', memoryId, {
          title: memory.title,
          people: memory.people,
          event: memory.event,
          location: memory.location,
          year: memory.year,
          description: memory.description,
        });

        setImageAnalysis({
          description: analysis.description,
          setting: analysis.setting,
          uncertaintyNotes: analysis.uncertaintyNotes,
        });
        if (analysis.mode !== 'error') setAiMode(analysis.mode);
      } catch {
        console.log('[FamilyMemories] Image analysis failed, continuing with metadata');
      }
    } else if (type === 'audio' && audioFile) {
      // Transcribe audio
      setProcessStage(1);
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(audioFile);
        });

        const sttResult = await service.transcribeAudio(
          base64,
          'P001',
          memoryId,
          language,
          people.split(',').map(p => p.trim()).filter(Boolean)[0] || undefined,
          title.trim(),
        );

        setTranscript(sttResult.transcript);
        setTranscriptMode(sttResult.mode === 'error' ? 'error' : sttResult.mode);
        if (sttResult.mode !== 'error') setAiMode(sttResult.mode);

        // Store transcript on the memory
        if (sttResult.transcript) {
          updateMemory(memoryId, { transcript: sttResult.transcript, transcriptSource: sttResult.mode === 'real' ? 'ai_stt' : 'ai_stt' });
        }
      } catch (err) {
        console.log('[FamilyMemories] Transcription failed:', (err as Error).message);
        setTranscriptMode('error');
      }
    } else {
      setProcessStage(1);
      await new Promise(r => setTimeout(r, 400));
    }

    // For audio with transcript — show transcript review before generating activities
    if (type === 'audio' && transcript) {
      updateMemory(memoryId, { processingStatus: 'pending_review' });
      setStep('transcript_review');
      return;
    }

    // For audio without transcript — allow manual entry then continue
    if (type === 'audio' && !transcript) {
      setTranscriptMode('manual');
      updateMemory(memoryId, { processingStatus: 'pending_review' });
      setStep('transcript_review');
      return;
    }

    // Stage 3: Generating activities
    setProcessStage(2);
    await new Promise(r => setTimeout(r, 400));

    const activities = await service.generateActivities(memory, language as 'en' | 'as' | 'hi');
    if (aiMode === null) setAiMode('mock');

    // Stage 4: Finalising
    setProcessStage(3);
    await new Promise(r => setTimeout(r, 300));

    addMemoryActivities(activities);
    setGeneratedActivities(activities);
    updateMemory(memoryId, { processingStatus: 'generated' });
    setStep('generated');
  };

  // Generate activities from approved transcript
  const handleGenerateFromTranscript = async (approvedTranscript: string) => {
    setStep('processing');
    setProcessStage(2);

    const service = createRealReminiscenceService();
    const memoryId = uuid(); // We need to find the memory we just created
    
    // Update the most recent audio memory with the approved transcript
    const peopleList = people.split(',').map(p => p.trim()).filter(Boolean);
    const updatedMemory: Memory = {
      id: memoryId,
      patientId: 'P001',
      title: title.trim(),
      description: description.trim() || title.trim(),
      imageUrl: '',
      mediaId: undefined,
      type: 'audio',
      people: peopleList.length > 0 ? peopleList : undefined,
      event: event.trim() || undefined,
      location: location.trim() || undefined,
      year: year.trim() || undefined,
      whyImportant: whyImportant.trim() || undefined,
      sensitive,
      transcript: approvedTranscript,
      transcriptSource: transcriptMode === 'manual' ? 'manual' : 'ai_stt',
      status: 'pending',
      processingStatus: 'uploaded',
      createdAt: new Date().toISOString(),
    };

    // Find the memory we just created (most recent audio memory)
    const allMemories = getMemories();
    const latestAudio = allMemories.filter(m => m.type === 'audio').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (latestAudio) {
      updateMemory(latestAudio.id, {
        transcript: approvedTranscript,
        transcriptSource: transcriptMode === 'manual' ? 'manual' : 'ai_stt',
        processingStatus: 'uploaded',
      });
      updatedMemory.id = latestAudio.id;
      updatedMemory.mediaId = latestAudio.mediaId;
      updatedMemory.imageUrl = latestAudio.imageUrl;
    }

    await new Promise(r => setTimeout(r, 300));

    const activities = await service.generateActivities(updatedMemory, language as 'en' | 'as' | 'hi');
    if (aiMode === null) setAiMode('mock');

    setProcessStage(3);
    await new Promise(r => setTimeout(r, 300));

    addMemoryActivities(activities);
    setGeneratedActivities(activities);
    if (latestAudio) {
      updateMemory(latestAudio.id, { processingStatus: 'generated' });
    }
    setStep('generated');
  };

  // ---- Processing View ----
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center max-w-sm mx-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-lg font-bold text-gray-800 mb-4">Processing memory...</p>
          <div className="space-y-2 text-left">
            {processingStages.map((stage, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {i < processStage ? (
                  <Check size={14} className="text-success-500" />
                ) : i === processStage ? (
                  <div className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full bg-gray-200" />
                )}
                <span className={i <= processStage ? 'text-gray-700 font-medium' : 'text-gray-400'}>{stage}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            {aiMode === 'real' ? 'Powered by OpenAI' : 'Demo processing — not a real AI service'}
          </p>
        </div>
      </div>
    );
  }

  // ---- Transcript Review View (audio memories) ----
  if (step === 'transcript_review') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <button onClick={() => setStep('form')} className="p-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Voice Transcript</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          <div className="bg-primary-50 rounded-2xl p-4 border border-primary-200">
            <p className="text-sm font-medium text-primary-700">
              {transcriptMode === 'manual' ? '✏️ Please enter the transcript manually' : '🎙️ Voice transcribed successfully'}
            </p>
            {transcriptMode && transcriptMode !== 'manual' && (
              <p className="text-xs text-primary-600 mt-1">
                {transcriptMode === 'real' ? '🤖 Transcribed using OpenAI Whisper' : '🎮 Transcribed using demo STT'}
              </p>
            )}
          </div>

          {/* Transcript editor */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <label className="text-sm font-medium text-gray-700 block mb-2">Transcript</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Enter what the family member said..."
              className="w-full p-4 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 outline-none resize-none text-base min-h-[120px]"
              rows={5}
            />
            <p className="text-xs text-gray-400 mt-2">
              You can edit the transcript before generating activities. Correct any mistakes from automatic transcription.
            </p>
          </div>

          {/* Audio preview */}
          {audioPreview && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">🎙️ Original Audio</p>
              <audio
                controls
                src={audioPreview}
                className="w-full"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (transcript.trim()) {
                  handleGenerateFromTranscript(transcript.trim());
                }
              }}
              disabled={!transcript.trim()}
              className="flex-1 bg-primary-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✅ Approve & Generate Activities
            </button>
            <button
              onClick={() => setStep('form')}
              className="px-6 py-4 rounded-2xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Family memories are personal information. Only approved content is shown to the patient.
          </p>
        </div>
      </div>
    );
  }

  // ---- Generated View ----
  if (step === 'generated') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Generated Activities</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          <div className="bg-success-50 rounded-2xl p-4 border border-success-200">
            <p className="text-sm font-medium text-success-700">✅ Memory processed successfully!</p>
            <p className="text-xs text-success-600 mt-1">{generatedActivities.length} activities generated for review.</p>
            {aiMode && (
              <p className="text-xs text-success-500 mt-1">
                {aiMode === 'real' ? '🤖 Generated using OpenAI' : '🎮 Generated using demo AI'}
              </p>
            )}
          </div>

          {imageAnalysis && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">📷 Image Understanding</p>
              <p className="text-sm text-gray-700">{imageAnalysis.description}</p>
              {imageAnalysis.setting && (
                <p className="text-xs text-gray-400 mt-1">Setting: {imageAnalysis.setting}</p>
              )}
              {imageAnalysis.uncertaintyNotes.length > 0 && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400">{imageAnalysis.uncertaintyNotes[0]}</p>
                </div>
              )}
            </div>
          )}

          {generatedActivities.map(act => (
            <div key={act.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-caution-50 text-caution-500">⏳ Pending Review</span>
                <span className="text-xs text-gray-400">{act.activityType.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">{act.question}</p>
              <p className="text-xs text-gray-400">Correct answer: {act.correctAnswer}</p>
              {act.options && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {act.options.map(opt => (
                    <span key={opt} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{opt}</span>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button onClick={onBack} className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold active:scale-95">Done</button>
        </div>
      </div>
    );
  }

  // ---- Form View ----
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Add Family Memory</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Type selector */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3 text-sm">Memory Type</h3>
          <div className="flex gap-2">
            {([
              { value: 'photo' as const, icon: Image, label: 'Photo' },
              { value: 'audio' as const, icon: Mic, label: 'Voice' },
              { value: 'story' as const, icon: FileText, label: 'Story' },
            ]).map(t => (
              <button key={t.value} onClick={() => setType(t.value)}
                className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 font-medium transition-all ${
                  type === t.value ? 'bg-primary-500 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}>
                <t.icon size={20} />
                <span className="text-xs">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Photo upload */}
        {type === 'photo' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3 text-sm">Photo</h3>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                <button onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center">
                  <X size={16} />
                </button>
                <p className="text-xs text-gray-400 mt-2">{photoFile?.name}</p>
              </div>
            ) : (
              <button onClick={() => photoInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-2 hover:border-primary-400 transition-colors">
                <Upload size={24} className="text-gray-400" />
                <span className="text-sm text-gray-500">Choose photo from device</span>
                <span className="text-xs text-gray-400">JPG, PNG up to 10MB</span>
              </button>
            )}
          </div>
        )}

        {/* Audio upload */}
        {type === 'audio' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3 text-sm">Voice Recording</h3>
            <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
            {audioPreview ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <button onClick={() => {
                    const audio = new Audio(audioPreview);
                    if (audioPlaying) { audio.pause(); setAudioPlaying(false); }
                    else { audio.play(); setAudioPlaying(true); audio.onended = () => setAudioPlaying(false); }
                  }} className="w-10 h-10 rounded-full bg-warm-500 text-white flex items-center justify-center shrink-0">
                    {audioPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{audioFile?.name}</p>
                    <p className="text-xs text-gray-400">Audio uploaded</p>
                  </div>
                  <button onClick={() => { setAudioPreview(null); setAudioFile(null); setAudioPlaying(false); }}
                    className="p-2 rounded-lg hover:bg-gray-200 text-gray-400">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => audioInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-2 hover:border-primary-400 transition-colors">
                <Mic size={24} className="text-gray-400" />
                <span className="text-sm text-gray-500">Choose audio file from device</span>
                <span className="text-xs text-gray-400">MP3, WAV, M4A up to 10MB</span>
              </button>
            )}
          </div>
        )}

        {/* Basic info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-bold text-gray-800 text-sm">Memory Details</h3>
          <input type="text" placeholder="Title (e.g., Family Wedding)" value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg focus:outline-none focus:border-primary-500" />
          <textarea placeholder="Description (optional)" value={description}
            onChange={e => setDescription(e.target.value)} rows={2}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500 resize-none" />
        </div>

        {/* People and event */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-bold text-gray-800 text-sm">People & Event</h3>
          <input type="text" placeholder="People in this memory (comma separated)" value={people}
            onChange={e => setPeople(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500" />
          <div className="flex gap-3">
            <input type="text" placeholder="Event (e.g., Wedding)" value={event}
              onChange={e => setEvent(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500" />
            <input type="text" placeholder="Location" value={location}
              onChange={e => setLocation(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500" />
          </div>
          <input type="text" placeholder="Year (optional)" value={year}
            onChange={e => setYear(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500" />
        </div>

        {/* Context */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-bold text-gray-800 text-sm">Context</h3>
          <textarea placeholder="Why is this memory important? (helps generate better activities)" value={whyImportant}
            onChange={e => setWhyImportant(e.target.value)} rows={2}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500 resize-none" />
          <button type="button" onClick={() => setSensitive(!sensitive)} className="flex items-center gap-3 cursor-pointer">
            <div className={`w-10 h-6 rounded-full transition-all ${sensitive ? 'bg-caution-500' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all ${sensitive ? 'ml-5 mt-0.5' : 'ml-0.5 mt-0.5'}`} />
            </div>
            <span className="text-sm text-gray-600">Mark as sensitive</span>
          </button>
          {sensitive && (
            <div className="flex items-center gap-2 px-3 py-2 bg-caution-50 rounded-xl">
              <Shield size={14} className="text-caution-500" />
              <p className="text-xs text-caution-600">Sensitive memory — caregiver review required before appearing to patient.</p>
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={!title.trim()}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            title.trim() ? 'bg-primary-500 text-white active:scale-95 shadow-lg' : 'bg-gray-200 text-gray-400'
          }`}>
          <Plus size={20} /> Save & Generate Activities
        </button>
      </div>
    </div>
  );
}

// ---- Activity Review View ----
function ActivityReviewView({ activity, memory, onBack, onApprove, onExclude, onEdit }: {
  activity: MemoryActivity; memory: Memory | null;
  onBack: () => void; onApprove: (id: string) => void;
  onExclude: (id: string) => void; onEdit: (id: string, updates: Partial<MemoryActivity>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editQuestion, setEditQuestion] = useState(activity.question);
  const [editAnswer, setEditAnswer] = useState(activity.correctAnswer);
  const [editOptions, setEditOptions] = useState(activity.options?.join(', ') || '');

  if (editing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <h1 className="text-lg font-bold text-gray-800">Edit Activity</h1>
            <button onClick={() => setEditing(false)} className="text-sm text-gray-400">Cancel</button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <label className="text-xs text-gray-400">Question</label>
            <textarea value={editQuestion} onChange={e => setEditQuestion(e.target.value)} rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500 resize-none" />
            <label className="text-xs text-gray-400">Correct Answer</label>
            <input type="text" value={editAnswer} onChange={e => setEditAnswer(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500" />
            <label className="text-xs text-gray-400">Options (comma separated)</label>
            <input type="text" value={editOptions} onChange={e => setEditOptions(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500" />
          </div>
          <p className="text-xs text-caution-500">After saving, this activity will return to "Pending Review" for re-approval.</p>
          <button onClick={() => {
            const opts = editOptions.split(',').map(o => o.trim()).filter(Boolean);
            onEdit(activity.id, {
              question: editQuestion, correctAnswer: editAnswer,
              options: opts.length > 0 ? opts : activity.options,
              editedFields: ['question', 'correctAnswer', 'options'],
            });
          }} className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold active:scale-95">
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  // Generate explanation of why this question was generated
  const whyGenerated = activity.activityType === 'who_is_this'
    ? `Generated because the memory has people listed: ${memory?.people?.join(', ') || 'N/A'}.`
    : activity.activityType === 'where_was_this'
    ? `Generated because the memory has a location: ${memory?.location || 'N/A'}.`
    : activity.activityType === 'complete_the_memory'
    ? `Generated from the story/description provided for this memory.`
    : activity.activityType === 'what_happened_next'
    ? `Generated because the memory has an event: ${memory?.event || 'N/A'}.`
    : activity.activityType === 'whose_voice_is_this'
    ? `Generated because this is an audio memory with speaker: ${memory?.familyMember || 'N/A'}.`
    : 'Generated from the provided memory content.';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Review Activity</h1>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Source memory */}
        {memory && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Source Memory</p>
            <p className="font-medium text-gray-700">{memory.title}</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{memory.type.toUpperCase()}</span>
              {memory.event && <span className="text-xs px-2 py-0.5 bg-primary-50 rounded-full text-primary-500">{memory.event}</span>}
              {memory.location && <span className="text-xs px-2 py-0.5 bg-success-50 rounded-full text-success-500">{memory.location}</span>}
              {memory.year && <span className="text-xs px-2 py-0.5 bg-warm-50 rounded-full text-warm-500">{memory.year}</span>}
              {memory.people && memory.people.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-purple-50 rounded-full text-purple-500">People: {memory.people.join(', ')}</span>
              )}
            </div>
          </div>
        )}

        {/* Why generated */}
        <div className="bg-primary-50 rounded-2xl p-4 border border-primary-200">
          <p className="text-xs font-medium text-primary-600 mb-1">💡 Why this question was generated</p>
          <p className="text-sm text-primary-700">{whyGenerated}</p>
        </div>

        {/* Activity details */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-caution-50 text-caution-500">⏳ Pending Review</span>
            <span className="text-xs text-gray-400">{activity.activityType.replace(/_/g, ' ')}</span>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Question</p>
            <p className="text-lg font-medium text-gray-800">{activity.question}</p>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Correct Answer</p>
            <p className="font-medium text-success-600">{activity.correctAnswer}</p>
          </div>

          {activity.options && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Options</p>
              <div className="flex flex-wrap gap-2">
                {activity.options.map(opt => (
                  <span key={opt} className={`text-sm px-3 py-1 rounded-full ${
                    opt === activity.correctAnswer ? 'bg-success-50 text-success-600 font-medium' : 'bg-gray-100 text-gray-500'
                  }`}>{opt}</span>
                ))}
              </div>
            </div>
          )}

          {activity.storyTemplate && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Story Template</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">{activity.storyTemplate}</p>
            </div>
          )}

          {activity.sequenceCards && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Sequence Cards (correct order)</p>
              <div className="space-y-1">
                {activity.sequenceCards.map((card, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    {card}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400">
            Generated from verified caregiver data: {activity.generatedFromVerifiedData ? '✅ Yes' : '⚠️ No'}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={() => onExclude(activity.id)}
            className="flex-1 py-3 bg-gray-100 rounded-xl font-medium text-gray-600 flex items-center justify-center gap-2 active:scale-95">
            <X size={18} /> Exclude
          </button>
          <button onClick={() => setEditing(true)}
            className="flex-1 py-3 bg-caution-50 rounded-xl font-medium text-caution-600 flex items-center justify-center gap-2 active:scale-95">
            <Edit3 size={18} /> Edit
          </button>
          <button onClick={() => onApprove(activity.id)}
            className="flex-1 py-3 bg-success-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 active:scale-95 shadow-lg">
            <Check size={18} /> Approve
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Memory Detail View ----
function MemoryDetailView({ memory, activities, completions, onBack, onReview, onDelete, onStatusChange }: {
  memory: Memory; activities: MemoryActivity[];
  completions: { activityId: string; score: number; completedAt: string }[];
  onBack: () => void; onReview: (act: MemoryActivity) => void;
  onDelete: (id: string) => void; onStatusChange: (id: string, status: Memory['status']) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { url: mediaUrl } = useMediaUrl(memory.mediaId, memory.imageUrl || undefined);

  const processingLabels: Record<MemoryProcessingStatus, string> = {
    uploaded: '📤 Uploaded', processing: '⚙️ Processing', generated: '✅ Generated',
    pending_review: '⏳ Pending Review', approved: '✓ Approved',
    edited_and_approved: '✓ Edited & Approved', excluded: '✕ Excluded',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">{memory.title}</h1>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Memory info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          {mediaUrl && (
            <img src={mediaUrl} alt={memory.title} className="w-full h-48 object-cover rounded-xl mb-4"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <p className="text-sm text-gray-600 mb-2">{memory.description}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{memory.type.toUpperCase()}</span>
            {memory.event && <span className="px-2 py-0.5 bg-primary-50 rounded-full text-primary-500">{memory.event}</span>}
            {memory.location && <span className="px-2 py-0.5 bg-success-50 rounded-full text-success-500">{memory.location}</span>}
            {memory.year && <span className="px-2 py-0.5 bg-warm-50 rounded-full text-warm-500">{memory.year}</span>}
            {memory.people && memory.people.length > 0 && (
              <span className="px-2 py-0.5 bg-purple-50 rounded-full text-purple-500">People: {memory.people.join(', ')}</span>
            )}
          </div>
          {memory.whyImportant && (
            <p className="text-xs text-gray-400 mt-3 italic">"{memory.whyImportant}"</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-400">Processing:</span>
            <span className="text-xs font-medium text-gray-600">{processingLabels[memory.processingStatus]}</span>
            {memory.sensitive && (
              <span className="text-xs px-2 py-0.5 bg-caution-50 rounded-full text-caution-500 flex items-center gap-1">
                <Shield size={10} /> Sensitive
              </span>
            )}
          </div>
        </div>

        {/* Status management */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3 text-sm">Status</h3>
          <div className="flex gap-2">
            {(['approved', 'pending', 'excluded'] as const).map(status => (
              <button key={status} onClick={() => onStatusChange(memory.id, status)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  memory.status === status
                    ? status === 'approved' ? 'bg-success-500 text-white'
                    : status === 'pending' ? 'bg-caution-500 text-white' : 'bg-gray-500 text-white'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}>
                {status === 'approved' ? '✓ Approve' : status === 'pending' ? '⏳ Pending' : '✕ Exclude'}
              </button>
            ))}
          </div>
        </div>

        {/* Generated activities with completion status */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3 text-sm">Generated Activities ({activities.length})</h3>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-400">No activities generated yet.</p>
          ) : (
            <div className="space-y-2">
              {activities.map(act => {
                const completion = completions.find(c => c.activityId === act.id);
                return (
                  <div key={act.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-500">
                          {act.activityType.replace(/_/g, ' ')}
                        </span>
                        {completion ? (
                          <span className="text-xs text-success-500">✓ Played ({completion.score}%)</span>
                        ) : (
                          <span className="text-xs text-gray-400">Not played</span>
                        )}
                        {act.status === 'pending_review' && (
                          <span className="text-xs px-1.5 py-0.5 bg-caution-50 text-caution-500 rounded">To review</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-1 truncate">{act.question}</p>
                      <p className="text-xs text-gray-400">Answer: {act.correctAnswer}</p>
                      {completion && (
                        <p className="text-xs text-gray-400 mt-0.5">Last played: {new Date(completion.completedAt).toLocaleDateString()}</p>
                      )}
                    </div>
                    {act.status === 'pending_review' && (
                      <button onClick={() => onReview(act)}
                        className="px-3 py-1.5 bg-caution-50 text-caution-600 rounded-lg text-xs font-medium active:scale-95">
                        Review
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete */}
        {confirmDelete ? (
          <div className="bg-alert-50 rounded-2xl p-4 border border-alert-200">
            <p className="text-sm font-medium text-alert-700 mb-3">Delete this memory and all its activities?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={() => onDelete(memory.id)} className="flex-1 py-2 bg-alert-500 text-white rounded-xl text-sm font-medium active:scale-95">Delete</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            className="w-full py-3 bg-white border border-red-200 rounded-xl text-sm font-medium text-red-500 flex items-center justify-center gap-2 active:scale-95">
            <Trash2 size={16} /> Delete Memory
          </button>
        )}
      </div>
    </div>
  );
}
