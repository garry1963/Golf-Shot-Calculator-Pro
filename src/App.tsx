import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Compass, 
  Wind, 
  Mountain, 
  Settings, 
  History, 
  Database, 
  Plus, 
  Minus, 
  Trash, 
  Edit, 
  BookOpen, 
  Sparkles, 
  Search, 
  Star, 
  User, 
  RefreshCw, 
  Play, 
  ChevronRight, 
  ChevronDown, 
  Save, 
  FileDown, 
  FileUp, 
  Check, 
  Cpu, 
  Thermometer, 
  Eye, 
  CloudRain, 
  Sliders, 
  Info, 
  X,
  PlusCircle,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

import { Club, LieType, ShotCalculation, ShotType, UserProfile, CustomRule } from './types';
import { defaultClubs, defaultRules } from './data/defaultClubs';
import { calculateAdjustments } from './utils/calculationEngine';
import { playHapticFeedback } from './utils/haptics';
import MobileSimulator from './components/MobileSimulator';
import TrajectoryCanvas from './components/TrajectoryCanvas';

// Available presets
const LIES: LieType[] = ['Fairway', 'Tee Box', 'First Cut', 'Heavy Rough', 'Deep Rough', 'Sand'];
const SHOT_TYPES: ShotType[] = ['Normal', 'Punch', 'Pitch', 'Chip', 'Flop', 'Fade', 'Draw', 'Knockdown'];

export default function App() {
  // Global theme and sound state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Loaded profiles and active database
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('default');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [history, setHistory] = useState<ShotCalculation[]>([]);

  // Navigation tab
  // 'calc' (Calculator) | 'practice' (Practice Mode) | 'clubs' (Clubs Database) | 'insights' (Stats & Caddy) | 'profile' (Profile & Custom Formulas)
  const [activeTab, setActiveTab] = useState<'calc' | 'practice' | 'clubs' | 'insights' | 'profile'>('calc');

  // Calculator inputs
  const [targetDistance, setTargetDistance] = useState<number>(150);
  const [elevation, setElevation] = useState<number>(0);
  const [windSpeed, setWindSpeed] = useState<number>(5);
  const [windAngle, setWindAngle] = useState<number>(0);
  const [selectedLie, setSelectedLie] = useState<LieType>('Fairway');
  const [selectedShot, setSelectedShot] = useState<ShotType>('Normal');
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(70);
  const [altitude, setAltitude] = useState<number>(0);
  const [humidity, setHumidity] = useState<number>(50);

  // Modal and edit states
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [isAddingClub, setIsAddingClub] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null);
  const [isAddingRule, setIsAddingRule] = useState<boolean>(false);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Calculator Outputs
  const [currentCalculation, setCurrentCalculation] = useState<ShotCalculation | null>(null);
  const [showResultsDrawer, setShowResultsDrawer] = useState<boolean>(false);

  // AI assistant state
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Compass Dragging States
  const compassRef = useRef<HTMLDivElement>(null);
  const [isDraggingCompass, setIsDraggingCompass] = useState<boolean>(false);

  const handleCompassInteraction = (clientX: number, clientY: number) => {
    if (!compassRef.current) return;
    const rect = compassRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    
    // Round to nearest degree
    setWindAngle(Math.round(angle));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only handle left click
    setIsDraggingCompass(true);
    handleCompassInteraction(e.clientX, e.clientY);
    triggerHaptic('click');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCompass) return;
    handleCompassInteraction(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDraggingCompass(true);
    if (e.touches.length > 0) {
      handleCompassInteraction(e.touches[0].clientX, e.touches[0].clientY);
      triggerHaptic('click');
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingCompass) return;
    if (e.touches.length > 0) {
      handleCompassInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDraggingCompass(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDraggingCompass]);

  const getWindDirectionLabel = (angle: number) => {
    const deg = angle % 360;
    if (deg >= 337.5 || deg < 22.5) return 'Headwind';
    if (deg >= 22.5 && deg < 67.5) return 'Cross-Head R';
    if (deg >= 67.5 && deg < 112.5) return 'Crosswind R';
    if (deg >= 112.5 && deg < 157.5) return 'Cross-Tail R';
    if (deg >= 157.5 && deg < 202.5) return 'Tailwind';
    if (deg >= 202.5 && deg < 247.5) return 'Cross-Tail L';
    if (deg >= 247.5 && deg < 292.5) return 'Crosswind L';
    if (deg >= 292.5 && deg < 337.5) return 'Cross-Head L';
    return '';
  };

  // New club template
  const [newClub, setNewClub] = useState<Partial<Club>>({
    name: '',
    loft: 30,
    carry: 150,
    total: 160,
    spin: 6000,
    tendency: 'Straight',
    confidence: 4
  });

  // New rule template
  const [newRule, setNewRule] = useState<Partial<CustomRule>>({
    name: 'New Custom Adjuster',
    active: true,
    conditionField: 'windSpeed',
    conditionOperator: '>',
    conditionValue: 10,
    actionType: 'addYards',
    actionValue: 5
  });

  // Practice state
  const [practiceDistance, setPracticeDistance] = useState<number>(145);
  const [practiceElevation, setPracticeElevation] = useState<number>(15);
  const [practiceWindSpeed, setPracticeWindSpeed] = useState<number>(12);
  const [practiceWindAngle, setPracticeWindAngle] = useState<number>(45);
  const [practiceLie, setPracticeLie] = useState<LieType>('Heavy Rough');
  const [practiceShot, setPracticeShot] = useState<ShotType>('Normal');

  // Load state from LocalStorage on mount
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'light' || storedTheme === 'dark') setTheme(storedTheme);

      const storedSound = localStorage.getItem('soundEnabled');
      if (storedSound !== null) setSoundEnabled(storedSound === 'true');

      // Setup default active profile
      const storedProfiles = localStorage.getItem('profiles');
      let currentProfiles: UserProfile[] = [];
      if (storedProfiles) {
        currentProfiles = JSON.parse(storedProfiles);
      } else {
        const defaultProfile: UserProfile = {
          id: 'default',
          name: 'Garry Davies',
          skillLevel: 'Intermediate',
          preferredUnits: 'Imperial',
          windUnits: 'mph',
          elevationUnits: 'ft',
          favoriteShotTypes: ['Normal', 'Punch', 'Fade', 'Draw'],
          personalAdjustment: 100,
          customRules: defaultRules as any
        };
        currentProfiles = [defaultProfile];
        localStorage.setItem('profiles', JSON.stringify(currentProfiles));
      }
      setProfiles(currentProfiles);
      setActiveProfileId(currentProfiles[0]?.id || 'default');

      // Setup clubs
      const storedClubs = localStorage.getItem('clubs');
      if (storedClubs) {
        setClubs(JSON.parse(storedClubs));
      } else {
        setClubs(defaultClubs);
        localStorage.setItem('clubs', JSON.stringify(defaultClubs));
      }

      // Setup history
      const storedHistory = localStorage.getItem('history');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      } else {
        // Seed some history logs
         const initialHistory: ShotCalculation[] = [
          {
            id: 'h1',
            timestamp: Date.now() - 3600000 * 24 * 2, // 2 days ago
            targetDistance: 165,
            elevation: 15,
            windSpeed: 12,
            windAngle: 0,
            lieType: 'Fairway',
            shotType: 'Normal',
            temperature: 72,
            altitude: 500,
            humidity: 45,
            effectiveDistance: 178.8,
            adjustedCarry: 178.8,
            recommendedClub: '5-Iron',
            recommendedPower: 102,
            lateralDrift: 0,
            isFavorite: true,
            playsLikeDistance: 178.8,
            slopeAdjustment: 5.0,
            windDistanceAdjustment: 13.8,
            liePenaltyFactor: 1.0
          },
          {
            id: 'h2',
            timestamp: Date.now() - 3600000 * 4, // 4 hours ago
            targetDistance: 145,
            elevation: -10,
            windSpeed: 8,
            windAngle: 90,
            lieType: 'Heavy Rough',
            shotType: 'Punch',
            temperature: 68,
            altitude: 0,
            humidity: 60,
            effectiveDistance: 142.8,
            adjustedCarry: 176.3,
            recommendedClub: '6-Iron',
            recommendedPower: 105,
            lateralDrift: 8.5,
            isFavorite: false,
            playsLikeDistance: 142.8,
            slopeAdjustment: -2.2,
            windDistanceAdjustment: 0.0,
            liePenaltyFactor: 1.11
          }
        ];
        setHistory(initialHistory);
        localStorage.setItem('history', JSON.stringify(initialHistory));
      }
    } catch (e) {
      console.error('Failed to load local storage state:', e);
    }
  }, []);

  // Save changes to localStorage on active modifications
  const activeProfile = useMemo(() => {
    return profiles.find(p => p.id === activeProfileId) || {
      id: 'default',
      name: 'Player 1',
      skillLevel: 'Intermediate' as const,
      preferredUnits: 'Imperial' as const,
      windUnits: 'mph' as const,
      elevationUnits: 'ft' as const,
      favoriteShotTypes: ['Normal' as const],
      personalAdjustment: 100,
      customRules: []
    };
  }, [profiles, activeProfileId]);

  const saveClubsToStorage = (updatedClubs: Club[]) => {
    setClubs(updatedClubs);
    localStorage.setItem('clubs', JSON.stringify(updatedClubs));
  };

  const saveHistoryToStorage = (updatedHistory: ShotCalculation[]) => {
    setHistory(updatedHistory);
    localStorage.setItem('history', JSON.stringify(updatedHistory));
  };

  const saveProfilesToStorage = (updatedProfiles: UserProfile[]) => {
    setProfiles(updatedProfiles);
    localStorage.setItem('profiles', JSON.stringify(updatedProfiles));
  };

  const updateProfileCalibrations = (updates: Partial<UserProfile>) => {
    const updatedProfiles = profiles.map(p => {
      if (p.id === activeProfileId) {
        return { ...p, ...updates };
      }
      return p;
    });
    saveProfilesToStorage(updatedProfiles);
  };

  // Sound triggering helper
  const triggerHaptic = (type: 'click' | 'success' | 'warning' | 'heavy' = 'click') => {
    if (soundEnabled) {
      playHapticFeedback(type);
    }
  };

  // Core Shot Calculation Engine Trigger
  const handleCalculateShot = () => {
    triggerHaptic('heavy');
    const result = calculateAdjustments({
      targetDistance,
      elevation,
      windSpeed,
      windAngle,
      lieType: selectedLie,
      shotType: selectedShot,
      temperature,
      altitude,
      humidity,
      profile: activeProfile as UserProfile,
      clubs
    });

    setCurrentCalculation(result);
    setShowResultsDrawer(true);

    // Save calculation to history
    const updatedHistory = [result, ...history];
    saveHistoryToStorage(updatedHistory);
  };

  // Live Practice mode calculations
  const practiceCalculation = useMemo(() => {
    return calculateAdjustments({
      targetDistance: practiceDistance,
      elevation: practiceElevation,
      windSpeed: practiceWindSpeed,
      windAngle: practiceWindAngle,
      lieType: practiceLie,
      shotType: practiceShot,
      temperature: 70,
      altitude: 0,
      humidity: 50,
      profile: activeProfile as UserProfile,
      clubs
    });
  }, [practiceDistance, practiceElevation, practiceWindSpeed, practiceWindAngle, practiceLie, practiceShot, clubs, activeProfile]);

  // Live Calculator tab calculations (for tablet split screen view)
  const liveCalculation = useMemo(() => {
    return calculateAdjustments({
      targetDistance,
      elevation,
      windSpeed,
      windAngle,
      lieType: selectedLie,
      shotType: selectedShot,
      temperature,
      altitude,
      humidity,
      profile: activeProfile as UserProfile,
      clubs
    });
  }, [targetDistance, elevation, windSpeed, windAngle, selectedLie, selectedShot, temperature, altitude, humidity, activeProfile, clubs]);

  // Favorite Quick Recall SITUATION helper
  const handleFavoriteRecall = (fav: ShotCalculation) => {
    triggerHaptic('success');
    setTargetDistance(fav.targetDistance);
    setElevation(fav.elevation);
    setWindSpeed(fav.windSpeed);
    setWindAngle(fav.windAngle);
    setSelectedLie(fav.lieType);
    setSelectedShot(fav.shotType);
    setTemperature(fav.temperature || 70);
    setAltitude(fav.altitude || 0);
    setHumidity(fav.humidity || 50);
    
    // Instant calculate
    const result = calculateAdjustments({
      targetDistance: fav.targetDistance,
      elevation: fav.elevation,
      windSpeed: fav.windSpeed,
      windAngle: fav.windAngle,
      lieType: fav.lieType,
      shotType: fav.shotType,
      temperature: fav.temperature || 70,
      altitude: fav.altitude || 0,
      humidity: fav.humidity || 50,
      profile: activeProfile as UserProfile,
      clubs
    });

    setCurrentCalculation(result);
    setShowResultsDrawer(true);
  };

  // Club database modifiers
  const handleAddClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClub.name) return;
    triggerHaptic('success');
    const clubToAdd: Club = {
      id: Math.random().toString(36).substr(2, 9),
      name: newClub.name,
      loft: Number(newClub.loft) || 0,
      carry: Number(newClub.carry) || 0,
      total: Number(newClub.total) || 0,
      spin: Number(newClub.spin) || 5000,
      tendency: (newClub.tendency as any) || 'Straight',
      confidence: Number(newClub.confidence) || 4
    };

    const updated = [...clubs, clubToAdd].sort((a, b) => b.carry - a.carry);
    saveClubsToStorage(updated);
    setIsAddingClub(false);
    setNewClub({
      name: '',
      loft: 30,
      carry: 150,
      total: 160,
      spin: 6000,
      tendency: 'Straight',
      confidence: 4
    });
  };

  const handleUpdateClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClub) return;
    triggerHaptic('success');
    const updated = clubs.map(c => c.id === editingClub.id ? editingClub : c).sort((a, b) => b.carry - a.carry);
    saveClubsToStorage(updated);
    setEditingClub(null);
  };

  const handleDeleteClub = (clubId: string) => {
    triggerHaptic('warning');
    const updated = clubs.filter(c => c.id !== clubId);
    saveClubsToStorage(updated);
  };

  const handleResetClubs = () => {
    if (window.confirm('Are you sure you want to restore default clubs? This resets all distances.')) {
      triggerHaptic('success');
      saveClubsToStorage(defaultClubs);
    }
  };

  // Custom formula rules modifiers
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name) return;
    triggerHaptic('success');
    const ruleToAdd: CustomRule = {
      id: Math.random().toString(36).substr(2, 9),
      name: newRule.name,
      active: true,
      conditionField: (newRule.conditionField as any) || 'windSpeed',
      conditionOperator: (newRule.conditionOperator as any) || '>',
      conditionValue: newRule.conditionValue ?? 10,
      actionType: (newRule.actionType as any) || 'addYards',
      actionValue: Number(newRule.actionValue) || 5
    };

    const updatedProfile = {
      ...activeProfile,
      customRules: [...activeProfile.customRules, ruleToAdd]
    };

    const updatedProfiles = profiles.map(p => p.id === activeProfileId ? updatedProfile as UserProfile : p);
    saveProfilesToStorage(updatedProfiles);
    setIsAddingRule(false);
  };

  const handleToggleRule = (ruleId: string) => {
    triggerHaptic('click');
    const updatedProfile = {
      ...activeProfile,
      customRules: activeProfile.customRules.map((r: CustomRule) => r.id === ruleId ? { ...r, active: !r.active } : r)
    };
    const updatedProfiles = profiles.map(p => p.id === activeProfileId ? updatedProfile as UserProfile : p);
    saveProfilesToStorage(updatedProfiles);
  };

  const handleDeleteRule = (ruleId: string) => {
    triggerHaptic('warning');
    const updatedProfile = {
      ...activeProfile,
      customRules: activeProfile.customRules.filter((r: CustomRule) => r.id !== ruleId)
    };
    const updatedProfiles = profiles.map(p => p.id === activeProfileId ? updatedProfile as UserProfile : p);
    saveProfilesToStorage(updatedProfiles);
  };

  // Import / Export Club sets as JSON
  const handleExportClubSet = () => {
    triggerHaptic('success');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clubs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `golf_clubs_${activeProfile.name.toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportClubSet = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].carry !== undefined) {
            triggerHaptic('success');
            saveClubsToStorage(parsed);
            alert('Club set imported successfully!');
          } else {
            throw new Error('Invalid clubs schema');
          }
        } catch (err) {
          triggerHaptic('warning');
          alert('Failed to import clubs. Please ensure the file is a valid club list JSON export.');
        }
      };
    }
  };

  // CSV History Export
  const handleExportCSVHistory = () => {
    triggerHaptic('success');
    const headers = ['Timestamp', 'Target Distance', 'Elevation', 'Wind Speed', 'Wind Angle', 'Lie Type', 'Shot Type', 'Effective Distance', 'Adjusted Carry', 'Recommended Club', 'Recommended Power', 'Lateral Drift'];
    const rows = history.map(h => [
      new Date(h.timestamp).toLocaleString(),
      h.targetDistance,
      h.elevation,
      h.windSpeed,
      h.windAngle,
      h.lieType,
      h.shotType,
      h.effectiveDistance,
      h.adjustedCarry,
      h.recommendedClub,
      h.recommendedPower,
      h.lateralDrift
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `shot_history_export.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Clear History
  const handleClearHistory = () => {
    if (window.confirm('Delete all calculations from your history logs?')) {
      triggerHaptic('warning');
      saveHistoryToStorage([]);
    }
  };

  // Toggle favorite on history
  const handleToggleFavorite = (id: string) => {
    triggerHaptic('click');
    const updated = history.map(h => h.id === id ? { ...h, isFavorite: !h.isFavorite } : h);
    saveHistoryToStorage(updated);
  };

  const handleDeleteHistoryItem = (id: string) => {
    triggerHaptic('warning');
    const updated = history.filter(h => h.id !== id);
    saveHistoryToStorage(updated);
  };

  // Gemini AI Assistant Call
  const handleRequestAiRecommendation = async () => {
    triggerHaptic('heavy');
    setAiLoading(true);
    setAiError(null);
    setAiResponse(null);

    // Prepare active conditions based on calculator values
    const conditions = {
      targetDistance,
      elevation,
      windSpeed,
      windAngle,
      lieType: selectedLie,
      shotType: selectedShot,
      temperature,
      altitude,
      humidity
    };

    try {
      const response = await fetch('/api/gemini/caddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditions,
          clubs,
          profile: activeProfile
        })
      });

      const data = await response.json();
      if (response.ok) {
        setAiResponse(data);
        triggerHaptic('success');
      } else {
        setAiError(data.error || 'Unable to connect to the Caddy server. Make sure Gemini API Key is configured.');
        triggerHaptic('warning');
      }
    } catch (err: any) {
      setAiError('Connection failed. Please configure GEMINI_API_KEY in the Settings > Secrets menu.');
      triggerHaptic('warning');
    } finally {
      setAiLoading(false);
    }
  };

  // Search and filters for history list
  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      const matchesSearch = h.recommendedClub.toLowerCase().includes(historySearchQuery.toLowerCase()) || 
                            h.targetDistance.toString().includes(historySearchQuery) ||
                            h.lieType.toLowerCase().includes(historySearchQuery.toLowerCase());
      const matchesFavorite = showFavoritesOnly ? h.isFavorite : true;
      return matchesSearch && matchesFavorite;
    });
  }, [history, historySearchQuery, showFavoritesOnly]);

  // Statistics datasets
  const clubUsageData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    history.forEach(h => {
      counts[h.recommendedClub] = (counts[h.recommendedClub] || 0) + 1;
    });
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] })).sort((a, b) => b.value - a.value);
  }, [history]);

  const avgDistanceByClub = useMemo(() => {
    const sums: { [key: string]: number } = {};
    const counts: { [key: string]: number } = {};
    history.forEach(h => {
      sums[h.recommendedClub] = (sums[h.recommendedClub] || 0) + h.targetDistance;
      counts[h.recommendedClub] = (counts[h.recommendedClub] || 0) + 1;
    });
    return Object.keys(sums).map(k => ({ 
      name: k, 
      avgDistance: Math.round(sums[k] / counts[k]) 
    })).sort((a, b) => b.avgDistance - a.avgDistance);
  }, [history]);

  const shotTypeData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    history.forEach(h => {
      counts[h.shotType] = (counts[h.shotType] || 0) + 1;
    });
    return Object.keys(counts).map(k => ({ name: k, count: counts[k] }));
  }, [history]);

  // Quick favorite presets for recall on top of calculator
  const favoritePresets = useMemo(() => {
    return history.filter(h => h.isFavorite).slice(0, 3);
  }, [history]);

  return (
    <MobileSimulator 
      theme={theme} 
      setTheme={setTheme} 
      soundEnabled={soundEnabled} 
      setSoundEnabled={setSoundEnabled}
    >
      {/* Screen Body */}
      <div className={`flex-1 flex flex-col overflow-hidden relative ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}>
        
        {/* Navigation Tab Panel */}
        <div className="flex-1 overflow-y-auto pb-20">
          
          {/* HEADER BRANDING */}
          <div className={`sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b backdrop-blur-md ${
            theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white/95 border-slate-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shadow-md shadow-green-900/20">
                <Compass className="h-5 w-5 text-white animate-spin-slow" />
              </div>
              <div>
                <h1 className={`text-xs font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  GOLF SHOT CALC <span className="text-green-500">PRO</span>
                </h1>
                <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">V3.4.2 — Tournament Edition</p>
              </div>
            </div>
            
            {/* Active profile & status badges */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSettingsModal(true);
                  triggerHaptic('click');
                }}
                className={`p-1.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  theme === 'dark' 
                    ? 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-green-400' 
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 text-slate-500 hover:text-green-500'
                }`}
                title="System Settings & Wind Formulas"
              >
                <Settings className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-end">
                <span className="text-[7px] text-slate-500 uppercase font-black tracking-wider leading-none">Active Profile</span>
                <span className={`text-[9px] font-mono font-bold truncate max-w-[85px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  {activeProfile.name ? activeProfile.name.toUpperCase().replace(/\s+/g, '_') : 'GOLFER'}_99
                </span>
              </div>
              <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-black ${
                theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-300 bg-slate-200 text-slate-700'
              }`}>
                {activeProfile.name ? activeProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'GP'}
              </div>
            </div>
          </div>

          {/* TAB CONTENTS */}
          <AnimatePresence mode="wait">
            
            {/* TAB 1: CALCULATOR */}
            {activeTab === 'calc' && (
              <motion.div
                key="calc"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="p-4 grid grid-cols-1 md:grid-cols-12 gap-5"
              >
                <div className="md:col-span-7 space-y-4 flex flex-col">
                 {/* FAVORITES PRESET CAROUSEL (ONE TAP RECALL) */}
                {favoritePresets.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic">
                      ⚡ Quick Recall Presets
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {favoritePresets.map(fav => (
                        <button
                          key={fav.id}
                          onClick={() => handleFavoriteRecall(fav)}
                          className={`text-left p-2 rounded-xl border text-[10px] flex flex-col justify-between h-[58px] transition-all hover:scale-[1.02] cursor-pointer ${
                            theme === 'dark' 
                              ? 'bg-slate-900/80 border-slate-800 hover:border-green-500' 
                              : 'bg-white border-slate-200 hover:border-green-500'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full font-mono font-bold">
                            <span className="text-green-400">{fav.targetDistance}Y</span>
                            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                          </div>
                          <span className="opacity-70 font-medium truncate">{fav.lieType}</span>
                          <span className="font-mono text-[9px] opacity-50 truncate">{fav.recommendedClub} ({fav.recommendedPower}%)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* TARGET DISTANCE & ELEVATION BENTO */}
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Target Distance Keypad Slider */}
                  <div className={`p-3 rounded-2xl border ${
                    theme === 'dark' ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic">Target Distance</span>
                      <span className="text-[10px] font-bold font-mono text-green-500 uppercase tracking-widest">Yards</span>
                    </div>
                    
                    <div className="text-center py-2">
                      <input 
                        type="number"
                        value={targetDistance}
                        onChange={(e) => {
                          setTargetDistance(Math.max(1, Number(e.target.value)));
                          triggerHaptic('click');
                        }}
                        className={`text-3xl font-extrabold font-mono text-center w-full bg-transparent focus:outline-none ${
                          theme === 'dark' ? 'text-green-400' : 'text-slate-900'
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetDistance(prev => Math.max(40, prev - 1));
                          triggerHaptic('click');
                        }}
                        className="w-6 h-6 shrink-0 rounded-full border border-slate-700 dark:border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/50 active:scale-90 transition-all select-none cursor-pointer"
                        title="Decrease by 1 yard"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input 
                        type="range"
                        min={40}
                        max={350}
                        step={1}
                        value={targetDistance}
                        onChange={(e) => {
                          setTargetDistance(Number(e.target.value));
                          if (Number(e.target.value) % 10 === 0) triggerHaptic('click');
                        }}
                        className="flex-1 accent-green-500 h-1.5 rounded-lg cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setTargetDistance(prev => Math.min(350, prev + 1));
                          triggerHaptic('click');
                        }}
                        className="w-6 h-6 shrink-0 rounded-full border border-slate-700 dark:border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/50 active:scale-90 transition-all select-none cursor-pointer"
                        title="Increase by 1 yard"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex justify-between text-[9px] font-mono opacity-50 mt-1">
                      <span>40y</span>
                      <span>150y</span>
                      <span>350y</span>
                    </div>
                  </div>

                  {/* Slope Elevation */}
                  <div className={`p-3 rounded-2xl border ${
                    theme === 'dark' ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic">Slope Elevation</span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 rounded-md ${
                        elevation > 0 
                          ? 'bg-rose-500/10 text-rose-400' 
                          : elevation < 0 ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {elevation > 0 ? `+${elevation}ft` : `${elevation}ft`}
                      </span>
                    </div>

                    <div className="text-center py-2 flex items-center justify-center gap-1">
                      {elevation > 0 ? (
                        <Mountain className="h-4 w-4 text-rose-500 animate-bounce" />
                      ) : elevation < 0 ? (
                        <Mountain className="h-4 w-4 text-green-400 rotate-180" />
                      ) : (
                        <Mountain className="h-4 w-4 text-slate-400" />
                      )}
                      <span className="text-xl font-bold font-mono">
                        {elevation === 0 ? 'FLAT' : elevation > 0 ? `Uphill` : `Downhill`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setElevation(prev => Math.max(-100, prev - 1));
                          triggerHaptic('click');
                        }}
                        className="w-6 h-6 shrink-0 rounded-full border border-slate-700 dark:border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/50 active:scale-90 transition-all select-none cursor-pointer"
                        title="Decrease by 1 ft"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input 
                        type="range"
                        min={-100}
                        max={100}
                        step={1}
                        value={elevation}
                        onChange={(e) => {
                          setElevation(Number(e.target.value));
                          if (Number(e.target.value) % 10 === 0) triggerHaptic('click');
                        }}
                        className="flex-1 accent-green-500 h-1.5 rounded-lg cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setElevation(prev => Math.min(100, prev + 1));
                          triggerHaptic('click');
                        }}
                        className="w-6 h-6 shrink-0 rounded-full border border-slate-700 dark:border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/50 active:scale-90 transition-all select-none cursor-pointer"
                        title="Increase by 1 ft"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex justify-between text-[9px] font-mono opacity-50 mt-1">
                      <span>-100ft</span>
                      <span>0ft</span>
                      <span>+100ft</span>
                    </div>
                  </div>
                </div>

                {/* WIND ADJUSTMENT COMPASS PANEL */}
                <div className={`p-5 rounded-3xl border transition-all ${
                  theme === 'dark' ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <Wind className="h-4.5 w-4.5 text-green-400 animate-pulse" />
                      <span className="text-[10px] sm:text-xs text-slate-500 uppercase font-black tracking-wider italic">Wind Adjuster</span>
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">{windSpeed} MPH</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-around gap-6 py-2">
                    {/* Visual Compass Dial */}
                    <div 
                      ref={compassRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      className={`relative w-36 h-36 rounded-full border-2 flex items-center justify-center select-none cursor-crosshair transition-all duration-200 touch-none ${
                        theme === 'dark' 
                          ? 'bg-slate-950/70 border-slate-800 hover:border-green-500/50 shadow-inner' 
                          : 'bg-slate-50/50 border-slate-200 hover:border-green-500/40 shadow-inner'
                      } ${isDraggingCompass ? 'ring-4 ring-green-500/20 border-green-500' : ''}`}
                    >
                      {/* Compass Ticks */}
                      {Array.from({ length: 12 }).map((_, i) => {
                        const angle = i * 30;
                        return (
                          <div
                            key={i}
                            className="absolute w-0.5 h-1.5 origin-bottom"
                            style={{
                              transform: `rotate(${angle}deg) translateY(-66px)`,
                              bottom: '50%',
                              left: 'calc(50% - 1px)',
                              backgroundColor: angle % 90 === 0 
                                ? 'rgba(34, 197, 94, 0.6)' 
                                : theme === 'dark' ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.35)',
                            }}
                          />
                        );
                      })}

                      {/* Compass directions (clickable / interactive) */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setWindAngle(0); triggerHaptic('click'); }}
                        className={`absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-mono font-black transition-all cursor-pointer select-none outline-none z-20 ${
                          (windAngle === 0 || windAngle === 360) ? 'text-green-400 scale-125 font-black drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'text-slate-500 hover:text-green-400'
                        }`}
                        title="Set Wind North (0° - Headwind)"
                      >
                        N
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setWindAngle(45); triggerHaptic('click'); }}
                        className={`absolute top-[24px] right-[24px] text-[8px] font-mono font-black transition-all cursor-pointer select-none outline-none z-20 ${
                          windAngle === 45 ? 'text-green-400 scale-125 font-black drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'text-slate-500 hover:text-green-400'
                        }`}
                        title="Set Wind North-East (45°)"
                      >
                        NE
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setWindAngle(90); triggerHaptic('click'); }}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black transition-all cursor-pointer select-none outline-none z-20 ${
                          windAngle === 90 ? 'text-green-400 scale-125 font-black drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'text-slate-500 hover:text-green-400'
                        }`}
                        title="Set Wind East (90° - Right Crosswind)"
                      >
                        E
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setWindAngle(135); triggerHaptic('click'); }}
                        className={`absolute bottom-[24px] right-[24px] text-[8px] font-mono font-black transition-all cursor-pointer select-none outline-none z-20 ${
                          windAngle === 135 ? 'text-green-400 scale-125 font-black drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'text-slate-500 hover:text-green-400'
                        }`}
                        title="Set Wind South-East (135°)"
                      >
                        SE
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setWindAngle(180); triggerHaptic('click'); }}
                        className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono font-black transition-all cursor-pointer select-none outline-none z-20 ${
                          windAngle === 180 ? 'text-green-400 scale-125 font-black drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'text-slate-500 hover:text-green-400'
                        }`}
                        title="Set Wind South (180° - Tailwind)"
                      >
                        S
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setWindAngle(225); triggerHaptic('click'); }}
                        className={`absolute bottom-[24px] left-[24px] text-[8px] font-mono font-black transition-all cursor-pointer select-none outline-none z-20 ${
                          windAngle === 225 ? 'text-green-400 scale-125 font-black drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'text-slate-500 hover:text-green-400'
                        }`}
                        title="Set Wind South-West (225°)"
                      >
                        SW
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setWindAngle(270); triggerHaptic('click'); }}
                        className={`absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black transition-all cursor-pointer select-none outline-none z-20 ${
                          windAngle === 270 ? 'text-green-400 scale-125 font-black drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'text-slate-500 hover:text-green-400'
                        }`}
                        title="Set Wind West (270° - Left Crosswind)"
                      >
                        W
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setWindAngle(315); triggerHaptic('click'); }}
                        className={`absolute top-[24px] left-[24px] text-[8px] font-mono font-black transition-all cursor-pointer select-none outline-none z-20 ${
                          windAngle === 315 ? 'text-green-400 scale-125 font-black drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'text-slate-500 hover:text-green-400'
                        }`}
                        title="Set Wind North-West (315°)"
                      >
                        NW
                      </button>

                      {/* Compass SVG needle with subtle gradients and drop shadow */}
                      <svg 
                        className="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-300"
                        style={{ transform: `rotate(${windAngle}deg)` }}
                        viewBox="0 0 144 144"
                      >
                        <defs>
                          <linearGradient id="windNeedleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#15803d" />
                          </linearGradient>
                          <linearGradient id="windNeedleTail" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#475569" />
                            <stop offset="100%" stopColor="#1e293b" />
                          </linearGradient>
                        </defs>
                        
                        {/* Interactive drag path indicator */}
                        <circle cx="72" cy="72" r="46" fill="none" stroke="rgba(34, 197, 94, 0.08)" strokeDasharray="3,3" />
                        <circle cx="72" cy="72" r="60" fill="none" stroke="rgba(148, 163, 184, 0.06)" strokeWidth="1" />
                        
                        {/* Compass Needle - North Pointer */}
                        <path 
                          d="M 72 24 L 76.5 60 L 72 56.5 L 67.5 60 Z" 
                          fill="url(#windNeedleGrad)" 
                          className="drop-shadow-[0_2px_4px_rgba(34,197,94,0.4)]"
                        />
                        
                        {/* Compass Needle - South Tail */}
                        <path 
                          d="M 72 120 L 74.5 84 L 72 87.5 L 69.5 84 Z" 
                          fill="url(#windNeedleTail)" 
                        />
                      </svg>

                      {/* Compass core */}
                      <div className={`w-8 h-8 rounded-full shadow-lg z-10 flex items-center justify-center pointer-events-none border transition-colors ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}>
                        <span className="text-[10px] font-black text-green-500 font-mono">{windAngle}°</span>
                      </div>
                    </div>

                    {/* Wind control sliders */}
                    <div className="flex-1 w-full space-y-4">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1 font-mono">
                          <span className="opacity-70 font-semibold uppercase tracking-wider">Speed</span>
                          <span className="font-extrabold text-green-400">{windSpeed} mph</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setWindSpeed(prev => Math.max(0, prev - 1));
                              triggerHaptic('click');
                            }}
                            className={`w-8 h-8 shrink-0 rounded-full border flex items-center justify-center text-slate-400 hover:text-green-400 active:scale-90 transition-all select-none cursor-pointer ${
                              theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-100/50'
                            }`}
                            title="Decrease by 1 mph"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input 
                            type="range"
                            min={0}
                            max={35}
                            value={windSpeed}
                            onChange={(e) => {
                              setWindSpeed(Number(e.target.value));
                              triggerHaptic('click');
                            }}
                            className="flex-1 accent-green-500 h-1.5 rounded-lg cursor-pointer bg-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setWindSpeed(prev => Math.min(35, prev + 1));
                              triggerHaptic('click');
                            }}
                            className={`w-8 h-8 shrink-0 rounded-full border flex items-center justify-center text-slate-400 hover:text-green-400 active:scale-90 transition-all select-none cursor-pointer ${
                              theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-100/50'
                            }`}
                            title="Increase by 1 mph"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1 font-mono">
                          <span className="opacity-70 font-semibold uppercase tracking-wider">Wind Angle</span>
                          <span className="font-extrabold text-green-400">{windAngle}° <span className="opacity-60 font-normal">({getWindDirectionLabel(windAngle)})</span></span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setWindAngle(prev => Math.max(0, prev - 5));
                              triggerHaptic('click');
                            }}
                            className={`w-8 h-8 shrink-0 rounded-full border flex items-center justify-center text-slate-400 hover:text-green-400 active:scale-90 transition-all select-none cursor-pointer ${
                              theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-100/50'
                            }`}
                            title="Decrease by 5 degrees"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input 
                            type="range"
                            min={0}
                            max={360}
                            step={5}
                            value={windAngle}
                            onChange={(e) => {
                              setWindAngle(Number(e.target.value));
                              if (Number(e.target.value) % 45 === 0) triggerHaptic('click');
                            }}
                            className="flex-1 accent-green-500 h-1.5 rounded-lg cursor-pointer bg-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setWindAngle(prev => Math.min(360, prev + 5));
                              triggerHaptic('click');
                            }}
                            className={`w-8 h-8 shrink-0 rounded-full border flex items-center justify-center text-slate-400 hover:text-green-400 active:scale-90 transition-all select-none cursor-pointer ${
                              theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-100/50'
                            }`}
                            title="Increase by 5 degrees"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Wind Direction feedback text */}
                  <div className="flex justify-between text-[10px] font-mono opacity-50 mt-4 pt-3 border-t border-slate-800/40">
                    <span className="flex items-center gap-1"><span>0°</span> <span className="opacity-70">= Headwind</span></span>
                    <span className="flex items-center gap-1"><span>90°</span> <span className="opacity-70">= Right Cross</span></span>
                    <span className="flex items-center gap-1"><span>180°</span> <span className="opacity-70">= Tailwind</span></span>
                  </div>
                </div>

                {/* LIE & SHOT TYPE SELECTIONS */}
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Lie Type selection */}
                  <div className={`p-3 rounded-2xl border flex flex-col justify-between ${
                    theme === 'dark' ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200'
                  }`}>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic mb-1.5">Surface / Lie Type</span>
                    <select
                      value={selectedLie}
                      onChange={(e) => {
                        setSelectedLie(e.target.value as LieType);
                        triggerHaptic('click');
                      }}
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none cursor-pointer ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    >
                      {LIES.map(lie => (
                        <option key={lie} value={lie}>{lie}</option>
                      ))}
                    </select>
                  </div>

                  {/* Shot Type selection */}
                  <div className={`p-3 rounded-2xl border flex flex-col justify-between ${
                    theme === 'dark' ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200'
                  }`}>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic mb-1.5">Shot Style / Pattern</span>
                    <select
                      value={selectedShot}
                      onChange={(e) => {
                        setSelectedShot(e.target.value as ShotType);
                        triggerHaptic('click');
                      }}
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none cursor-pointer ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    >
                      {SHOT_TYPES.map(shot => (
                        <option key={shot} value={shot}>{shot}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ADVANCED / EXPERT ACCORDION */}
                <div className={`rounded-2xl border overflow-hidden ${
                  theme === 'dark' ? 'bg-slate-900/30 border-slate-800/60' : 'bg-slate-100/50 border-slate-200'
                }`}>
                  <button
                    onClick={() => {
                      setAdvancedOpen(!advancedOpen);
                      triggerHaptic('click');
                    }}
                    className={`w-full p-3.5 flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                      theme === 'dark' ? 'hover:bg-slate-900/60' : 'hover:bg-slate-200/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Cpu className="h-4 w-4 text-amber-500" />
                      <span>Advanced Ball Flight Modifiers</span>
                    </div>
                    {advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  <AnimatePresence>
                    {advancedOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={`px-4 pb-4 space-y-3.5 border-t ${
                          theme === 'dark' ? 'border-slate-800/60' : 'border-slate-200'
                        }`}
                      >
                        <div className="grid grid-cols-3 gap-2.5 pt-3">
                          
                          <div>
                            <span className="text-[9px] font-bold uppercase opacity-60 block mb-1">Temp (°F)</span>
                            <input 
                              type="number"
                              min={30}
                              max={110}
                              value={temperature}
                              onChange={(e) => setTemperature(Number(e.target.value))}
                              className={`w-full p-2 rounded-xl text-xs text-center font-mono focus:outline-none ${
                                theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-white text-slate-800'
                              }`}
                            />
                          </div>

                          <div>
                            <span className="text-[9px] font-bold uppercase opacity-60 block mb-1">Altitude (ft)</span>
                            <input 
                              type="number"
                              min={0}
                              max={10000}
                              step={500}
                              value={altitude}
                              onChange={(e) => setAltitude(Number(e.target.value))}
                              className={`w-full p-2 rounded-xl text-xs text-center font-mono focus:outline-none ${
                                theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-white text-slate-800'
                              }`}
                            />
                          </div>

                          <div>
                            <span className="text-[9px] font-bold uppercase opacity-60 block mb-1">Humidity (%)</span>
                            <input 
                              type="number"
                              min={10}
                              max={100}
                              value={humidity}
                              onChange={(e) => setHumidity(Number(e.target.value))}
                              className={`w-full p-2 rounded-xl text-xs text-center font-mono focus:outline-none ${
                                theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-white text-slate-800'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="text-[10px] opacity-50 font-mono space-y-0.5 leading-relaxed bg-black/20 p-2.5 rounded-lg border border-slate-800/30">
                          <div>• Higher temperature lowers air density (adds carry)</div>
                          <div>• For every 1,000 ft of altitude, ball carries 1.5% further</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* CALCULATE BUTTON */}
                <button
                  onClick={handleCalculateShot}
                  className="w-full py-4 rounded-3xl bg-green-500 hover:bg-green-400 active:scale-95 text-slate-950 font-black tracking-widest transition-all text-sm uppercase shadow-lg shadow-green-900/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="h-5 w-5" />
                  <span>Calculate Shot</span>
                </button>

                {/* HISTORY SHORTCUT PREVIEW */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Shot logs database</span>
                  <button
                    onClick={() => {
                      triggerHaptic('click');
                      setShowHistoryModal(true);
                    }}
                    className="text-xs font-bold text-green-500 flex items-center gap-1 cursor-pointer"
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>View All ({history.length})</span>
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN (TABLET/DESKTOP LIVE CADDY SIDEBAR) */}
              <div className="hidden md:flex md:col-span-5 flex-col h-full">
                <div className={`p-5 rounded-3xl border flex-1 flex flex-col justify-between ${
                  theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-500 block italic leading-none">
                          Live Shot Telemetry
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Real-time tablet flight predictor
                        </span>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Telemetry live"></div>
                    </div>

                    {/* Main display showing liveCalculation */}
                    <div className="bg-slate-950/60 rounded-2xl border border-slate-850 p-4 text-center relative overflow-hidden">
                      <div className="absolute -top-12 -right-12 w-24 h-24 bg-green-500/5 rounded-full blur-2xl"></div>
                      <span className="text-[8px] text-green-400 font-black uppercase tracking-[0.3em] block mb-1">RECOMMENDED CLUB</span>
                      <h2 className="text-4xl font-black text-white leading-none tracking-tighter uppercase mb-2">
                        {liveCalculation.recommendedClub || 'N/A'}
                      </h2>
                      
                      <div className="flex justify-center items-center gap-4 mt-3 pt-3 border-t border-slate-800/40">
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-mono text-slate-100 font-black">{liveCalculation.recommendedPower}%</span>
                          <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Swing Power</span>
                        </div>
                        <div className="h-6 w-[1px] bg-slate-800"></div>
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-mono text-slate-100 font-black">
                            {liveCalculation.lateralDrift === 0 ? '0.0y' : `${Math.abs(liveCalculation.lateralDrift)}y`}
                          </span>
                          <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">
                            {liveCalculation.lateralDrift > 0 ? 'Left Bias' : liveCalculation.lateralDrift < 0 ? 'Right Bias' : 'Straight'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Side-by-side details */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className={`p-3 rounded-xl border text-center ${
                        theme === 'dark' ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-100/50 border-slate-200'
                      }`}>
                        <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider block mb-0.5">AIM CORRECTION</span>
                        <strong className={`text-[11px] font-black font-mono block truncate ${
                          liveCalculation.lateralDrift > 0 ? 'text-rose-400' : liveCalculation.lateralDrift < 0 ? 'text-blue-400' : 'text-slate-400'
                        }`}>
                          {liveCalculation.lateralDrift === 0 ? 'AIM STRAIGHT' : 
                           liveCalculation.lateralDrift > 0 ? `AIM ${Math.abs(liveCalculation.lateralDrift)}y LEFT` : `AIM ${Math.abs(liveCalculation.lateralDrift)}y RIGHT`}
                        </strong>
                      </div>

                      <div className={`p-3 rounded-xl border text-center ${
                        theme === 'dark' ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-100/50 border-slate-200'
                      }`}>
                        <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider block mb-0.5">PLAYS LIKE DIST.</span>
                        <strong className="text-[11px] font-black font-mono text-green-400 block">
                          {liveCalculation.playsLikeDistance.toFixed(1)} YARDS
                        </strong>
                      </div>
                    </div>

                    {/* Decomposition components */}
                    <div className="space-y-1.5 text-[10px] font-mono opacity-90 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Target Yardage:</span>
                        <span className="text-slate-300 font-bold">{targetDistance}y</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Elevation Offset:</span>
                        <span className={liveCalculation.slopeAdjustment > 0 ? 'text-rose-400' : liveCalculation.slopeAdjustment < 0 ? 'text-green-400' : 'text-slate-300'}>
                          {liveCalculation.slopeAdjustment > 0 ? `+${liveCalculation.slopeAdjustment.toFixed(1)}y` : liveCalculation.slopeAdjustment < 0 ? `${liveCalculation.slopeAdjustment.toFixed(1)}y` : '0.0y'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Wind Adjustment:</span>
                        <span className={liveCalculation.windDistanceAdjustment > 0 ? 'text-rose-400' : liveCalculation.windDistanceAdjustment < 0 ? 'text-green-400' : 'text-slate-300'}>
                          {liveCalculation.windDistanceAdjustment > 0 ? `+${liveCalculation.windDistanceAdjustment.toFixed(1)}y` : liveCalculation.windDistanceAdjustment < 0 ? `${liveCalculation.windDistanceAdjustment.toFixed(1)}y` : '0.0y'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Lie Penalty:</span>
                        <span className={liveCalculation.liePenaltyFactor > 1 ? 'text-rose-400' : 'text-slate-300'}>
                          {liveCalculation.liePenaltyFactor > 1 ? `x${liveCalculation.liePenaltyFactor.toFixed(2)}` : 'None'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <button
                      type="button"
                      onClick={handleCalculateShot}
                      className="w-full py-3 bg-green-500 hover:bg-green-400 text-slate-950 font-black rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-green-950/20"
                    >
                      <History className="h-4 w-4" />
                      <span>Log Shot to Database</span>
                    </button>
                  </div>
                </div>
              </div>

            </motion.div>
            )}

            {/* TAB 2: PRACTICE MODE */}
            {activeTab === 'practice' && (
              <motion.div
                key="practice"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="p-4 grid grid-cols-1 md:grid-cols-12 gap-5"
              >
                <div className="md:col-span-7 space-y-4">
                {/* Visual Trajectory Display */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic">
                      🎯 Interactive Flight Trail
                    </span>
                    <span className="text-[10px] font-mono text-green-400 font-semibold bg-green-500/10 px-2 py-0.5 rounded-full">
                      Live Simulation Mode
                    </span>
                  </div>

                  <TrajectoryCanvas
                    carry={practiceCalculation.adjustedCarry}
                    total={Math.round(practiceCalculation.adjustedCarry * 1.1)}
                    elevation={practiceElevation}
                    windSpeed={practiceWindSpeed}
                    windAngle={practiceWindAngle}
                    shotType={practiceShot}
                  />
                </div>

                {/* Simulated outputs */}
                <div className={`p-4 rounded-2xl border grid grid-cols-2 gap-4 ${
                  theme === 'dark' ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200'
                }`}>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider italic">RECOMMENDED CLUB</span>
                    <div className="text-xl font-black text-green-400 font-mono">
                      {practiceCalculation.recommendedClub}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider italic">SWING POWER</span>
                    <div className="text-xl font-black text-amber-400 font-mono">
                      {practiceCalculation.recommendedPower}%
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider italic">WIND DRIFT</span>
                    <div className={`text-sm font-bold font-mono ${
                      practiceCalculation.lateralDrift > 0 ? 'text-red-400' : practiceCalculation.lateralDrift < 0 ? 'text-blue-400' : 'text-slate-400'
                    }`}>
                      {practiceCalculation.lateralDrift === 0 ? 'Straight Shot' : 
                       practiceCalculation.lateralDrift > 0 ? `Aim ${Math.abs(practiceCalculation.lateralDrift)}y Left` : `Aim ${Math.abs(practiceCalculation.lateralDrift)}y Right`}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider italic">ADJUSTED DISTANCE</span>
                    <div className="text-sm font-bold text-green-400 font-mono">
                      {practiceCalculation.adjustedCarry} Yards
                    </div>
                  </div>
                </div>
              </div>

                {/* RIGHT COLUMN: SLIDERS & CONFIG (md:col-span-5) */}
                <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
                  {/* Practice Live Sliders */}
                  <div className="space-y-4">
                  <div className={`p-3.5 rounded-2xl border ${
                    theme === 'dark' ? 'bg-slate-900/30 border-slate-800/80' : 'bg-slate-100/50 border-slate-200'
                  }`}>
                    <div className="flex justify-between items-center mb-1 font-mono text-xs">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic">Target Yardage</span>
                      <span className="font-bold text-green-400">{practiceDistance} Yds</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPracticeDistance(prev => Math.max(60, prev - 1));
                          triggerHaptic('click');
                        }}
                        className="w-5 h-5 shrink-0 rounded-full border border-slate-750 dark:border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/50 active:scale-90 transition-all select-none cursor-pointer"
                        title="Decrease by 1 yard"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <input
                        type="range"
                        min={60}
                        max={300}
                        step={1}
                        value={practiceDistance}
                        onChange={(e) => {
                          setPracticeDistance(Number(e.target.value));
                          triggerHaptic('click');
                        }}
                        className="flex-1 accent-green-500 h-1 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPracticeDistance(prev => Math.min(300, prev + 1));
                          triggerHaptic('click');
                        }}
                        className="w-5 h-5 shrink-0 rounded-full border border-slate-750 dark:border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/50 active:scale-90 transition-all select-none cursor-pointer"
                        title="Increase by 1 yard"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-2xl border ${
                    theme === 'dark' ? 'bg-slate-900/30 border-slate-800/80' : 'bg-slate-100/50 border-slate-200'
                  }`}>
                    <div className="flex justify-between items-center mb-1 font-mono text-xs">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic">Slope Elevation</span>
                      <span className="font-bold text-red-400">{practiceElevation} ft</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPracticeElevation(prev => Math.max(-80, prev - 1));
                          triggerHaptic('click');
                        }}
                        className="w-5 h-5 shrink-0 rounded-full border border-slate-750 dark:border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/50 active:scale-90 transition-all select-none cursor-pointer"
                        title="Decrease by 1 ft"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <input
                        type="range"
                        min={-80}
                        max={80}
                        value={practiceElevation}
                        onChange={(e) => {
                          setPracticeElevation(Number(e.target.value));
                          triggerHaptic('click');
                        }}
                        className="flex-1 accent-green-500 h-1 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPracticeElevation(prev => Math.min(80, prev + 1));
                          triggerHaptic('click');
                        }}
                        className="w-5 h-5 shrink-0 rounded-full border border-slate-750 dark:border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/50 active:scale-90 transition-all select-none cursor-pointer"
                        title="Increase by 1 ft"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-2xl border ${
                    theme === 'dark' ? 'bg-slate-900/30 border-slate-800/80' : 'bg-slate-100/50 border-slate-200'
                  }`}>
                    <div className="flex justify-between items-center mb-1 font-mono text-xs">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic">Wind Speed</span>
                      <span className="font-bold text-blue-400">{practiceWindSpeed} mph</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPracticeWindSpeed(prev => Math.max(0, prev - 1));
                          triggerHaptic('click');
                        }}
                        className="w-5 h-5 shrink-0 rounded-full border border-slate-750 dark:border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/50 active:scale-90 transition-all select-none cursor-pointer"
                        title="Decrease by 1 mph"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={30}
                        value={practiceWindSpeed}
                        onChange={(e) => {
                          setPracticeWindSpeed(Number(e.target.value));
                          triggerHaptic('click');
                        }}
                        className="flex-1 accent-green-500 h-1 rounded animate-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPracticeWindSpeed(prev => Math.min(30, prev + 1));
                          triggerHaptic('click');
                        }}
                        className="w-5 h-5 shrink-0 rounded-full border border-slate-750 dark:border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/50 active:scale-90 transition-all select-none cursor-pointer"
                        title="Increase by 1 mph"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic mb-1 block">Lie Preset</span>
                      <select
                        value={practiceLie}
                        onChange={(e) => {
                          setPracticeLie(e.target.value as LieType);
                          triggerHaptic('click');
                        }}
                        className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200'
                        }`}
                      >
                        {LIES.map(lie => (
                          <option key={lie} value={lie}>{lie}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic mb-1 block">Shot Preset</span>
                      <select
                        value={practiceShot}
                        onChange={(e) => {
                          setPracticeShot(e.target.value as ShotType);
                          triggerHaptic('click');
                        }}
                        className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200'
                        }`}
                      >
                        {SHOT_TYPES.map(shot => (
                          <option key={shot} value={shot}>{shot}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
            )}

            {/* TAB 3: CLUB DATABASE */}
            {activeTab === 'clubs' && (
              <motion.div
                key="clubs"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="p-4 space-y-4"
              >
                 <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic block">Club Management</span>
                    <span className="text-xs font-medium text-slate-400">Inventory stores available clubs & loft</span>
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={handleExportClubSet}
                      title="Export Clubs JSON"
                      className={`p-2 rounded-xl border text-slate-400 cursor-pointer ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white'
                      }`}
                    >
                      <FileDown className="h-4 w-4 text-green-500" />
                    </button>
                    
                    <label className={`p-2 rounded-xl border text-slate-400 cursor-pointer flex items-center ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white'
                    }`}>
                      <FileUp className="h-4 w-4 text-amber-500" />
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleImportClubSet} 
                        className="hidden" 
                      />
                    </label>

                    <button
                      onClick={() => setIsAddingClub(true)}
                      className="p-2 bg-green-500 hover:bg-green-400 text-slate-950 font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* ADD CLUB INNER FORM MODAL PANEL */}
                {isAddingClub && (
                  <form onSubmit={handleAddClub} className={`p-4 rounded-2xl border space-y-3.5 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-extrabold uppercase text-green-500">Add New Custom Club</span>
                      <button type="button" onClick={() => setIsAddingClub(false)} className="text-slate-400"><X className="h-4 w-4" /></button>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <span className="text-[9px] font-bold uppercase block opacity-60 mb-1">Club Name</span>
                        <input
                          required
                          type="text"
                          placeholder="e.g., 2-Hybrid"
                          value={newClub.name}
                          onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                          className={`w-full p-2 rounded-xl text-xs focus:outline-none ${
                            theme === 'dark' ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border text-slate-800'
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[9px] font-bold uppercase block opacity-60 mb-1">Loft (deg)</span>
                          <input
                            type="number"
                            value={newClub.loft}
                            onChange={(e) => setNewClub({ ...newClub, loft: Number(e.target.value) })}
                            className={`w-full p-2 rounded-xl text-xs text-center focus:outline-none ${
                              theme === 'dark' ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border text-slate-800'
                            }`}
                          />
                        </div>

                        <div>
                          <span className="text-[9px] font-bold uppercase block opacity-60 mb-1">Carry (yd)</span>
                          <input
                            type="number"
                            value={newClub.carry}
                            onChange={(e) => setNewClub({ ...newClub, carry: Number(e.target.value) })}
                            className={`w-full p-2 rounded-xl text-xs text-center focus:outline-none ${
                              theme === 'dark' ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border text-slate-800'
                            }`}
                          />
                        </div>

                        <div>
                          <span className="text-[9px] font-bold uppercase block opacity-60 mb-1">Spin (rpm)</span>
                          <input
                            type="number"
                            value={newClub.spin}
                            onChange={(e) => setNewClub({ ...newClub, spin: Number(e.target.value) })}
                            className={`w-full p-2 rounded-xl text-xs text-center focus:outline-none ${
                              theme === 'dark' ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border text-slate-800'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] font-bold uppercase block opacity-60 mb-1">Tendency</span>
                          <select
                            value={newClub.tendency}
                            onChange={(e) => setNewClub({ ...newClub, tendency: e.target.value as any })}
                            className={`w-full p-2 rounded-xl text-xs border focus:outline-none cursor-pointer ${
                              theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white text-slate-800'
                            }`}
                          >
                            <option value="Straight">Straight</option>
                            <option value="Slight Draw">Slight Draw</option>
                            <option value="Slight Fade">Slight Fade</option>
                            <option value="Draw">Draw</option>
                            <option value="Fade">Fade</option>
                          </select>
                        </div>

                        <div>
                          <span className="text-[9px] font-bold uppercase block opacity-60 mb-1">Confidence (1-5)</span>
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={newClub.confidence}
                            onChange={(e) => setNewClub({ ...newClub, confidence: Number(e.target.value) })}
                            className={`w-full p-2 rounded-xl text-xs text-center focus:outline-none ${
                              theme === 'dark' ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border text-slate-800'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-green-500 hover:bg-green-400 text-slate-950 font-bold rounded-xl text-xs uppercase cursor-pointer transition-colors"
                    >
                      Save Club Specs
                    </button>
                  </form>
                )}

                {/* CLUB LISTINGS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {clubs.map(club => (
                    <div 
                      key={club.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                        theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full font-mono text-xs font-black flex items-center justify-center border ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800 text-green-400' : 'bg-slate-100 text-green-500'
                        }`}>
                          {club.loft}°
                        </div>
                        
                        <div>
                          <span className="font-extrabold text-sm block">{club.name}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Carry: <strong className="text-slate-200">{club.carry}y</strong> | Total: {club.total}y
                          </span>
                        </div>
                      </div>

                      {/* Right buttons specs */}
                      <div className="flex items-center gap-2">
                        <div className="text-right font-mono text-[10px] hidden sm:block opacity-65">
                          <div>Spin: {club.spin} rpm</div>
                          <div>{club.tendency}</div>
                        </div>

                        <button
                          onClick={() => {
                            setEditingClub(club);
                            triggerHaptic('click');
                          }}
                          className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-green-400 cursor-pointer transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteClub(club.id)}
                          className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* EDITING CLUB DIALOG PANEL OVERLAY */}
                {editingClub && (
                  <div className="p-4 rounded-2xl border bg-slate-900 border-slate-800 space-y-3.5 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase text-amber-500">Edit {editingClub.name} Specification</span>
                      <button onClick={() => setEditingClub(null)} className="text-slate-400"><X className="h-4 w-4" /></button>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <span className="text-[9px] font-bold block opacity-60">Loft (deg)</span>
                        <input
                          type="number"
                          value={editingClub.loft}
                          onChange={(e) => setEditingClub({ ...editingClub, loft: Number(e.target.value) })}
                          className="w-full p-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <span className="text-[9px] font-bold block opacity-60">Carry Distance (yd)</span>
                        <input
                          type="number"
                          value={editingClub.carry}
                          onChange={(e) => setEditingClub({ ...editingClub, carry: Number(e.target.value) })}
                          className="w-full p-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <span className="text-[9px] font-bold block opacity-60">Total Roll (yd)</span>
                        <input
                          type="number"
                          value={editingClub.total}
                          onChange={(e) => setEditingClub({ ...editingClub, total: Number(e.target.value) })}
                          className="w-full p-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <span className="text-[9px] font-bold block opacity-60">Spin Rate (rpm)</span>
                        <input
                          type="number"
                          value={editingClub.spin}
                          onChange={(e) => setEditingClub({ ...editingClub, spin: Number(e.target.value) })}
                          className="w-full p-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateClub}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs uppercase"
                      >
                        Update Specs
                      </button>
                      <button
                        onClick={() => setEditingClub(null)}
                        className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Reset button */}
                <div className="pt-4 text-center">
                  <button
                    onClick={handleResetClubs}
                    className="text-xs font-semibold text-slate-400 hover:text-rose-500 flex items-center gap-1.5 mx-auto cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Reset Database to Factory Defaults</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* TAB 4: INSIGHTS & STATS */}
            {activeTab === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="p-4 space-y-4"
              >
                {/* AI GOLF CADDY MODULE */}
                <div className={`p-4 rounded-3xl border relative overflow-hidden ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-br from-green-950/10 via-slate-900/60 to-slate-950 border-green-900/40' 
                    : 'bg-green-50/40 border-green-200'
                }`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-5 w-5 text-green-400 animate-pulse" />
                      <div>
                        <span className="text-xs font-black uppercase block tracking-wider text-green-400">
                          AI Smart Golf Caddy
                        </span>
                        <span className="text-[9px] opacity-60 block font-mono">Gemini AI Assistant Enabled</span>
                      </div>
                    </div>

                    <button
                      onClick={handleRequestAiRecommendation}
                      disabled={aiLoading}
                      className="px-3.5 py-1.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-slate-950 font-black text-[10px] rounded-xl flex items-center gap-1 uppercase transition-all active:scale-95 cursor-pointer"
                    >
                      {aiLoading ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Cpu className="h-3 w-3" />
                      )}
                      <span>Analyze Shot Layout</span>
                    </button>
                  </div>

                  {/* AI Response Panel */}
                  <div className="space-y-3 mt-3.5">
                    {aiResponse ? (
                      <div className="space-y-3 text-xs leading-relaxed bg-black/30 p-3.5 rounded-2xl border border-slate-800/80">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-slate-200">Optimal Solution:</span>
                          <span className="font-mono text-green-400 font-extrabold">{aiResponse.recommendedClub} ({aiResponse.recommendedPower})</span>
                        </div>
                        
                        <div>
                          <strong className="text-green-300 block mb-0.5">Tactical Setup:</strong>
                          <p className="text-slate-300">{aiResponse.aimAdjustment} | Adjusted Yardage: {aiResponse.adjustedYards}y</p>
                        </div>

                        <div>
                          <strong className="text-green-300 block mb-0.5">Physics Analysis:</strong>
                          <p className="text-slate-400 text-[11px] leading-relaxed">{aiResponse.factorsExplanation}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/40 flex items-start gap-1.5 text-amber-300 text-[11px] italic font-medium">
                          <Info className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                          <span>"{aiResponse.caddyWisdom}"</span>
                        </div>
                      </div>
                    ) : aiError ? (
                      <div className="p-3 bg-rose-500/10 border border-rose-900/30 text-rose-400 rounded-xl text-[11px] leading-relaxed">
                        {aiError}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-900/40 border border-slate-850/60 rounded-xl text-[11px] leading-relaxed opacity-70 text-center">
                        Tap "Analyze Shot Layout" to invoke the AI Caddy engine on your current distance, wind, elevation, and lie parameters!
                      </div>
                    )}
                  </div>
                </div>

                {/* STATISTICS GRAPHS */}
                {history.length > 1 ? (
                  <div className="space-y-3">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic">
                      📊 Performance Metrics & Analytics
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Chart 1: Club Usage Frequencies */}
                    <div className={`p-3 rounded-2xl border ${
                      theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic block mb-2">Calculated Club Frequencies</span>
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={clubUsageData.slice(0, 5)}>
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                            <YAxis stroke="#64748b" fontSize={10} width={20} />
                            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                            <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chart 2: Average Adjusted Distance by Club */}
                    <div className={`p-3 rounded-2xl border ${
                      theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <span className="text-[10px] font-bold block mb-2 opacity-70">Average Target Distance by Club (Yards)</span>
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={avgDistanceByClub.slice(0, 5)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                            <YAxis stroke="#64748b" fontSize={10} width={25} />
                            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                            <Line type="monotone" dataKey="avgDistance" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chart 3: Shot style distribution pie */}
                    <div className={`p-3 rounded-2xl border ${
                      theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <span className="text-[10px] font-bold block mb-2 opacity-70">Shot Style Distributions</span>
                      <div className="flex items-center justify-around">
                        <div className="h-28 w-28">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={shotTypeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={20}
                                outerRadius={40}
                                paddingAngle={3}
                                dataKey="count"
                              >
                                {shotTypeData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'][index % 5]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="text-[10px] font-mono space-y-1.5 opacity-80">
                          {shotTypeData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'][index % 5] }} />
                              <span>{entry.name}: {entry.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
                ) : (
                  <div className="p-10 text-center opacity-60 text-xs">
                    Please perform at least 2 shot calculations to generate interactive analytics dashboards and statistics metrics!
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 5: PROFILE & CUSTOM RULES */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="p-4 grid grid-cols-1 md:grid-cols-2 gap-5"
              >
                {/* Active user profile details */}
                <div className={`p-4 rounded-3xl border ${
                  theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold text-xl border border-green-500/30">
                      <User className="h-6 w-6" />
                    </div>

                    <div>
                      <span className="font-extrabold text-sm block">{activeProfile.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">PGA Simulation Account • ACTIVE</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800/60 text-xs">
                    <div>
                      <span className="opacity-50 block text-[9px] font-bold uppercase mb-0.5">Skill Level</span>
                      <select
                        value={activeProfile.skillLevel}
                        onChange={(e) => {
                          triggerHaptic('click');
                          const updated = profiles.map(p => p.id === activeProfileId ? { ...p, skillLevel: e.target.value as any } : p);
                          saveProfilesToStorage(updated);
                        }}
                        className={`w-full p-2 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Pro">Pro</option>
                      </select>
                    </div>

                    <div>
                      <span className="opacity-50 block text-[9px] font-bold uppercase mb-0.5">Units System</span>
                      <select
                        value={activeProfile.preferredUnits}
                        onChange={(e) => {
                          triggerHaptic('click');
                          const updated = profiles.map(p => p.id === activeProfileId ? { ...p, preferredUnits: e.target.value as any } : p);
                          saveProfilesToStorage(updated);
                        }}
                        className={`w-full p-2 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        <option value="Imperial">Imperial (Yd)</option>
                        <option value="Metric">Metric (M)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* CUSTOM ADJUSTMENT RULES BUILDER */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic block">Custom Adjuster Rules</span>
                      <span className="text-[11px] text-slate-400 block">Trigger custom adjustments on specific triggers</span>
                    </div>

                    <button
                      onClick={() => setIsAddingRule(true)}
                      className="p-2 bg-green-500 hover:bg-green-400 text-slate-950 font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Add New Rule Form inline */}
                  {isAddingRule && (
                    <form onSubmit={handleAddRule} className={`p-4 rounded-2xl border space-y-3 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-green-500">Create Custom Condition</span>
                        <button type="button" onClick={() => setIsAddingRule(false)} className="text-slate-400"><X className="h-4 w-4" /></button>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[9px] font-bold block opacity-60 mb-1">Rule Description</span>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Gale force wind compensation"
                            value={newRule.name}
                            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                            className={`w-full p-2 rounded-xl text-xs focus:outline-none ${
                              theme === 'dark' ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border text-slate-800'
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <span className="text-[9px] font-bold block opacity-60 mb-1">Field</span>
                            <select
                              value={newRule.conditionField}
                              onChange={(e) => setNewRule({ ...newRule, conditionField: e.target.value as any })}
                              className={`w-full p-2 rounded-xl border focus:outline-none cursor-pointer ${
                                theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white'
                              }`}
                            >
                              <option value="windSpeed">Wind Speed</option>
                              <option value="elevation">Elevation</option>
                              <option value="targetDistance">Distance</option>
                              <option value="lieType">Lie Type</option>
                            </select>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold block opacity-60 mb-1">Operator</span>
                            <select
                              value={newRule.conditionOperator}
                              onChange={(e) => setNewRule({ ...newRule, conditionOperator: e.target.value as any })}
                              className={`w-full p-2 rounded-xl border focus:outline-none cursor-pointer ${
                                theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white'
                              }`}
                            >
                              <option value=">">&gt;</option>
                              <option value="<">&lt;</option>
                              <option value="===">===</option>
                            </select>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold block opacity-60 mb-1">Value</span>
                            <input
                              type="text"
                              placeholder="e.g. 15"
                              value={newRule.conditionValue}
                              onChange={(e) => setNewRule({ ...newRule, conditionValue: e.target.value })}
                              className={`w-full p-2 rounded-xl text-center focus:outline-none ${
                                theme === 'dark' ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border text-slate-800'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] font-bold block opacity-60 mb-1">Action</span>
                            <select
                              value={newRule.actionType}
                              onChange={(e) => setNewRule({ ...newRule, actionType: e.target.value as any })}
                              className={`w-full p-2 rounded-xl border focus:outline-none cursor-pointer ${
                                theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white'
                              }`}
                            >
                              <option value="addYards">Add Yards</option>
                              <option value="subtractYards">Subtract Yards</option>
                              <option value="multiplyPower">Multiply Power (%)</option>
                            </select>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold block opacity-60 mb-1">Adjustment Value</span>
                            <input
                              type="number"
                              placeholder="e.g. 5"
                              value={newRule.actionValue}
                              onChange={(e) => setNewRule({ ...newRule, actionValue: Number(e.target.value) })}
                              className={`w-full p-2 rounded-xl text-center focus:outline-none ${
                                theme === 'dark' ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border text-slate-800'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-green-500 hover:bg-green-400 text-slate-950 font-extrabold rounded-xl uppercase text-xs cursor-pointer transition-colors"
                      >
                        Activate Rule
                      </button>
                    </form>
                  )}

                  {/* Rules Listings */}
                  <div className="space-y-2">
                    {activeProfile.customRules && activeProfile.customRules.length > 0 ? (
                      activeProfile.customRules.map((rule: CustomRule) => (
                        <div 
                          key={rule.id}
                          className={`p-3 rounded-2xl border flex items-center justify-between ${
                            theme === 'dark' ? 'bg-slate-900/30 border-slate-800/80' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                rule.active ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'
                              }`}>
                                {rule.active ? 'Active' : 'Disabled'}
                              </span>
                              <strong className="text-xs font-extrabold">{rule.name}</strong>
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono mt-1">
                              If {rule.conditionField} {rule.conditionOperator} {rule.conditionValue} → {rule.actionType === 'addYards' ? `+${rule.actionValue}yd` : rule.actionType === 'subtractYards' ? `-${rule.actionValue}yd` : `${rule.actionValue}% power`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleRule(rule.id)}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase cursor-pointer transition-all ${
                                rule.active 
                                  ? 'bg-green-500 text-slate-950 hover:bg-green-400' 
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {rule.active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-slate-900/20 border border-slate-850/50 rounded-xl text-center text-xs opacity-60">
                        No active custom adjustment rules. Create a formula using the (+) button.
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </div>

        {/* RESULTS DRAWER / DIALOG PANEL */}
        <AnimatePresence>
          {showResultsDrawer && currentCalculation && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={`absolute bottom-0 left-0 right-0 rounded-t-[38px] border-t p-5 z-50 shadow-2xl ${
                theme === 'dark' 
                  ? 'bg-slate-950 border-slate-800 text-slate-100 shadow-green-950/20' 
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="w-12 h-1 rounded-full bg-slate-800 mx-auto mb-4"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-500 block italic">
                    Calculated Recommendation
                  </span>
                  <span className="text-xs font-medium text-slate-400 block">
                    Tournament-grade shot adjustment
                  </span>
                </div>
                <button
                  onClick={() => {
                    triggerHaptic('click');
                    setShowResultsDrawer(false);
                  }}
                  className="p-1.5 rounded-full bg-slate-900/60 text-slate-400 border border-slate-800/60 hover:text-rose-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Main big display */}
              <div className={`bg-slate-900/50 rounded-2xl border border-slate-800 p-6 text-center relative overflow-hidden mb-4`}>
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-green-500/5 rounded-full blur-3xl"></div>
                <span className="text-[9px] text-green-500 font-black uppercase tracking-[0.3em] block mb-1">RECOMMENDED CLUB</span>
                <h2 className="text-5xl font-black text-white leading-none tracking-tighter uppercase mb-2">
                  {currentCalculation.recommendedClub}
                </h2>
                
                <div className="flex justify-center items-center gap-6 mt-3 pt-3 border-t border-slate-800/60">
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-mono text-slate-100 font-black">{currentCalculation.recommendedPower}%</span>
                    <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Swing Power</span>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-800"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-mono text-slate-100 font-black">
                      {currentCalculation.lateralDrift === 0 ? '0.0y' : `${Math.abs(currentCalculation.lateralDrift)}y`}
                    </span>
                    <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">
                      {currentCalculation.lateralDrift >= 0 ? 'Aim Left Bias' : 'Aim Right Bias'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                
                <div className={`p-3 rounded-2xl border text-center ${
                  theme === 'dark' ? 'bg-slate-900/20 border-slate-850' : 'bg-white border-slate-200'
                }`}>
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block italic mb-0.5">AIM ADJUSTMENT</span>
                  <strong className={`text-sm font-bold font-mono ${
                    currentCalculation.lateralDrift > 0 ? 'text-red-400' : currentCalculation.lateralDrift < 0 ? 'text-blue-400' : 'text-slate-400'
                  }`}>
                    {currentCalculation.lateralDrift === 0 ? 'AIM STRAIGHT' : 
                     currentCalculation.lateralDrift > 0 ? `AIM ${Math.abs(currentCalculation.lateralDrift)}y LEFT` : `AIM ${Math.abs(currentCalculation.lateralDrift)}y RIGHT`}
                  </strong>
                </div>

                <div className={`p-3 rounded-2xl border text-center ${
                  theme === 'dark' ? 'bg-slate-900/20 border-slate-850' : 'bg-white border-slate-200'
                }`}>
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block italic mb-0.5">ADJUSTED CARRY</span>
                  <strong className="text-sm font-bold font-mono text-green-400">
                    {currentCalculation.adjustedCarry} yds
                  </strong>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      triggerHaptic('success');
                      // Add calculation as favorite
                      const updated = history.map(h => h.id === currentCalculation.id ? { ...h, isFavorite: true } : h);
                      saveHistoryToStorage(updated);
                      alert('Calculation saved to Favorites for rapid one-tap recall!');
                    }}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-400 text-slate-950 font-black rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Star className="h-4 w-4 fill-slate-950" />
                    <span>Save to Favorites</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic('click');
                      setShowResultsDrawer(false);
                      // Switch to practice tab with the parameters preset
                      setPracticeDistance(targetDistance);
                      setPracticeElevation(elevation);
                      setPracticeWindSpeed(windSpeed);
                      setPracticeWindAngle(windAngle);
                      setPracticeLie(selectedLie);
                      setPracticeShot(selectedShot);
                      setActiveTab('practice');
                    }}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    <span>Animate Trajectory</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FULLSHOT HISTORY MODAL OVERLAY */}
        <AnimatePresence>
          {showHistoryModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0b1220]">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-green-400" />
                  <span className="font-extrabold text-sm uppercase tracking-tight italic">Shot log histories</span>
                </div>
                <button
                  onClick={() => {
                    triggerHaptic('click');
                    setShowHistoryModal(false);
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Search and filters bar */}
              <div className="p-3 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by club or lie..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs bg-slate-950 border border-slate-800 focus:outline-none text-white"
                  />
                </div>

                <button
                  onClick={() => {
                    triggerHaptic('click');
                    setShowFavoritesOnly(!showFavoritesOnly);
                  }}
                  className={`p-2 rounded-xl border text-xs flex items-center gap-1 cursor-pointer ${
                    showFavoritesOnly 
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400' 
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  <Star className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline font-bold uppercase text-[9px]">Favorites</span>
                </button>

                <button
                  onClick={handleExportCSVHistory}
                  title="Export History CSV"
                  className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-green-400"
                >
                  <FileDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* History list wrapper */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/30 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleFavorite(item.id)}
                            className="text-amber-400"
                          >
                            <Star className={`h-4 w-4 ${item.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}`} />
                          </button>
                          <strong className="text-sm font-extrabold font-mono text-slate-200">
                            {item.targetDistance} yards ({item.lieType})
                          </strong>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Slope: {item.elevation > 0 ? `+${item.elevation}ft` : `${item.elevation}ft`} | Wind: {item.windSpeed}mph @ {item.windAngle}°
                        </span>
                        <span className="text-[9px] text-slate-500 block font-mono">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>

                      {/* outputs */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-green-400 font-extrabold font-mono block text-sm">
                            {item.recommendedClub}
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono block">
                            {item.recommendedPower}% power
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteHistoryItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-xs opacity-60">
                    No calculations found matching your query filters.
                  </div>
                )}
              </div>

              {/* Footer clearing bar */}
              <div className="p-3 border-t border-slate-800 bg-[#0b1220] flex items-center justify-between">
                <button
                  onClick={handleClearHistory}
                  className="text-xs font-bold text-rose-400 hover:text-rose-500 flex items-center gap-1 cursor-pointer"
                >
                  <Trash className="h-3.5 w-3.5" />
                  <span>Clear All Logs</span>
                </button>
                
                <span className="text-[10px] font-mono text-slate-500">
                  Total calculation logs: {history.length}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FULL CALIBRATION SETTINGS & FORMULAS MODAL OVERLAY */}
        <AnimatePresence>
          {showSettingsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-850 flex items-center justify-between bg-[#0b1220]">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-green-400 animate-spin-slow" />
                  <span className="font-extrabold text-sm uppercase tracking-tight italic">Calibrations & Wind Formulas</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('click');
                    setShowSettingsModal(false);
                  }}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-200">
                
                {/* Visual Concept explanation header */}
                <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-2xl space-y-2">
                  <span className="text-[10px] text-green-400 uppercase font-black tracking-wider block">Calibrate calculation constants</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tweak the physical multipliers and coefficients that the engine uses to calculate target carries, elevations, and vector wind deflection. Custom constants are saved directly to your golfer profile.
                  </p>
                </div>

                {/* Section 1: Calibration constants with precision buttons */}
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Physics Multipliers</span>
                    <span className="text-[9px] text-slate-500 font-mono">Real-time update</span>
                  </div>

                  {/* Headwind factor */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-300">Headwind Penalty Factor</span>
                      <span className="font-mono text-green-400 font-bold">{(activeProfile.windHeadwindCoef ?? 1.15).toFixed(2)}y / mph</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const current = activeProfile.windHeadwindCoef ?? 1.15;
                          const nextVal = Math.max(0.50, Math.round((current - 0.05) * 100) / 100);
                          updateProfileCalibrations({ windHeadwindCoef: nextVal });
                          triggerHaptic('click');
                        }}
                        className="w-7 h-7 shrink-0 rounded-full border border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/40 active:scale-90 transition-all select-none cursor-pointer"
                        title="Decrease by 0.05"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="range"
                        min={0.50}
                        max={2.50}
                        step={0.05}
                        value={activeProfile.windHeadwindCoef ?? 1.15}
                        onChange={(e) => {
                          updateProfileCalibrations({ windHeadwindCoef: Number(e.target.value) });
                          triggerHaptic('click');
                        }}
                        className="flex-1 accent-green-500 h-1.5 rounded cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = activeProfile.windHeadwindCoef ?? 1.15;
                          const nextVal = Math.min(2.50, Math.round((current + 0.05) * 100) / 100);
                          updateProfileCalibrations({ windHeadwindCoef: nextVal });
                          triggerHaptic('click');
                        }}
                        className="w-7 h-7 shrink-0 rounded-full border border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/40 active:scale-90 transition-all select-none cursor-pointer"
                        title="Increase by 0.05"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-500 block leading-tight">Yards added to effective distance per 1 mph of pure headwind. Standard is 1.15.</span>
                  </div>

                  {/* Tailwind factor */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-300">Tailwind Boost Factor</span>
                      <span className="font-mono text-green-400 font-bold">{(activeProfile.windTailwindCoef ?? 0.80).toFixed(2)}y / mph</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const current = activeProfile.windTailwindCoef ?? 0.80;
                          const nextVal = Math.max(0.30, Math.round((current - 0.05) * 100) / 100);
                          updateProfileCalibrations({ windTailwindCoef: nextVal });
                          triggerHaptic('click');
                        }}
                        className="w-7 h-7 shrink-0 rounded-full border border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/40 active:scale-90 transition-all select-none cursor-pointer"
                        title="Decrease by 0.05"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="range"
                        min={0.30}
                        max={1.80}
                        step={0.05}
                        value={activeProfile.windTailwindCoef ?? 0.80}
                        onChange={(e) => {
                          updateProfileCalibrations({ windTailwindCoef: Number(e.target.value) });
                          triggerHaptic('click');
                        }}
                        className="flex-1 accent-green-500 h-1.5 rounded cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = activeProfile.windTailwindCoef ?? 0.80;
                          const nextVal = Math.min(1.80, Math.round((current + 0.05) * 100) / 100);
                          updateProfileCalibrations({ windTailwindCoef: nextVal });
                          triggerHaptic('click');
                        }}
                        className="w-7 h-7 shrink-0 rounded-full border border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/40 active:scale-90 transition-all select-none cursor-pointer"
                        title="Increase by 0.05"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-500 block leading-tight">Yards subtracted from effective distance per 1 mph of pure tailwind. Standard is 0.80.</span>
                  </div>

                  {/* Short Headwind factor (50-100y) */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-slate-900/20 border border-slate-900/60">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-300">Short Shot Headwind Factor (50-100y)</span>
                      <span className="font-mono text-green-400 font-bold">{(activeProfile.windHeadwindCoefShort ?? 0.70).toFixed(2)}y / mph</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const current = activeProfile.windHeadwindCoefShort ?? 0.70;
                          const nextVal = Math.max(0.10, Math.round((current - 0.05) * 100) / 100);
                          updateProfileCalibrations({ windHeadwindCoefShort: nextVal });
                          triggerHaptic('click');
                        }}
                        className="w-7 h-7 shrink-0 rounded-full border border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/40 active:scale-90 transition-all select-none cursor-pointer"
                        title="Decrease by 0.05"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="range"
                        min={0.10}
                        max={1.80}
                        step={0.05}
                        value={activeProfile.windHeadwindCoefShort ?? 0.70}
                        onChange={(e) => {
                          updateProfileCalibrations({ windHeadwindCoefShort: Number(e.target.value) });
                          triggerHaptic('click');
                        }}
                        className="flex-1 accent-green-500 h-1.5 rounded cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = activeProfile.windHeadwindCoefShort ?? 0.70;
                          const nextVal = Math.min(1.80, Math.round((current + 0.05) * 100) / 100);
                          updateProfileCalibrations({ windHeadwindCoefShort: nextVal });
                          triggerHaptic('click');
                        }}
                        className="w-7 h-7 shrink-0 rounded-full border border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/40 active:scale-90 transition-all select-none cursor-pointer"
                        title="Increase by 0.05"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-500 block leading-tight">Yards added to effective distance per 1 mph of headwind for 50-100y shots. Standard is 0.70.</span>
                  </div>

                  {/* Short Tailwind factor (50-100y) */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-slate-900/20 border border-slate-900/60">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-300">Short Shot Tailwind Factor (50-100y)</span>
                      <span className="font-mono text-green-400 font-bold">{(activeProfile.windTailwindCoefShort ?? 0.50).toFixed(2)}y / mph</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const current = activeProfile.windTailwindCoefShort ?? 0.50;
                          const nextVal = Math.max(0.10, Math.round((current - 0.05) * 100) / 100);
                          updateProfileCalibrations({ windTailwindCoefShort: nextVal });
                          triggerHaptic('click');
                        }}
                        className="w-7 h-7 shrink-0 rounded-full border border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/40 active:scale-90 transition-all select-none cursor-pointer"
                        title="Decrease by 0.05"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="range"
                        min={0.10}
                        max={1.50}
                        step={0.05}
                        value={activeProfile.windTailwindCoefShort ?? 0.50}
                        onChange={(e) => {
                          updateProfileCalibrations({ windTailwindCoefShort: Number(e.target.value) });
                          triggerHaptic('click');
                        }}
                        className="flex-1 accent-green-500 h-1.5 rounded cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = activeProfile.windTailwindCoefShort ?? 0.50;
                          const nextVal = Math.min(1.50, Math.round((current + 0.05) * 100) / 100);
                          updateProfileCalibrations({ windTailwindCoefShort: nextVal });
                          triggerHaptic('click');
                        }}
                        className="w-7 h-7 shrink-0 rounded-full border border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/40 active:scale-90 transition-all select-none cursor-pointer"
                        title="Increase by 0.05"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-500 block leading-tight">Yards subtracted from effective distance per 1 mph of tailwind for 50-100y shots. Standard is 0.50.</span>
                  </div>

                  {/* Uphill Slope ratio */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-300">Uphill Slope Ratio</span>
                      <span className="font-mono text-green-400 font-bold">{(activeProfile.elevationUphillRatio ?? 3.0).toFixed(1)} ft / yd</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const current = activeProfile.elevationUphillRatio ?? 3.0;
                          const nextVal = Math.max(1.5, Math.round((current - 0.1) * 10) / 10);
                          updateProfileCalibrations({ elevationUphillRatio: nextVal });
                          triggerHaptic('click');
                        }}
                        className="w-7 h-7 shrink-0 rounded-full border border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/40 active:scale-90 transition-all select-none cursor-pointer"
                        title="Decrease by 0.1"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="range"
                        min={1.5}
                        max={5.0}
                        step={0.1}
                        value={activeProfile.elevationUphillRatio ?? 3.0}
                        onChange={(e) => {
                          updateProfileCalibrations({ elevationUphillRatio: Number(e.target.value) });
                          triggerHaptic('click');
                        }}
                        className="flex-1 accent-green-500 h-1.5 rounded cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = activeProfile.elevationUphillRatio ?? 3.0;
                          const nextVal = Math.min(5.0, Math.round((current + 0.1) * 10) / 10);
                          updateProfileCalibrations({ elevationUphillRatio: nextVal });
                          triggerHaptic('click');
                        }}
                        className="w-7 h-7 shrink-0 rounded-full border border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/40 active:scale-90 transition-all select-none cursor-pointer"
                        title="Increase by 0.1"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-500 block leading-tight">Feet of uphill elevation change required to add 1 yard to play distance. Standard is 3.0.</span>
                  </div>

                  {/* Downhill Slope ratio */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-300">Downhill Slope Ratio</span>
                      <span className="font-mono text-green-400 font-bold">{(activeProfile.elevationDownhillRatio ?? 4.5).toFixed(1)} ft / yd</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const current = activeProfile.elevationDownhillRatio ?? 4.5;
                          const nextVal = Math.max(2.0, Math.round((current - 0.1) * 10) / 10);
                          updateProfileCalibrations({ elevationDownhillRatio: nextVal });
                          triggerHaptic('click');
                        }}
                        className="w-7 h-7 shrink-0 rounded-full border border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/40 active:scale-90 transition-all select-none cursor-pointer"
                        title="Decrease by 0.1"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="range"
                        min={2.0}
                        max={7.0}
                        step={0.1}
                        value={activeProfile.elevationDownhillRatio ?? 4.5}
                        onChange={(e) => {
                          updateProfileCalibrations({ elevationDownhillRatio: Number(e.target.value) });
                          triggerHaptic('click');
                        }}
                        className="flex-1 accent-green-500 h-1.5 rounded cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = activeProfile.elevationDownhillRatio ?? 4.5;
                          const nextVal = Math.min(7.0, Math.round((current + 0.1) * 10) / 10);
                          updateProfileCalibrations({ elevationDownhillRatio: nextVal });
                          triggerHaptic('click');
                        }}
                        className="w-7 h-7 shrink-0 rounded-full border border-slate-800 hover:border-green-500 flex items-center justify-center text-slate-400 hover:text-green-400 bg-slate-900/40 active:scale-90 transition-all select-none cursor-pointer"
                        title="Increase by 0.1"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-500 block leading-tight">Feet of downhill elevation change required to subtract 1 yard from play distance. Standard is 4.5.</span>
                  </div>
                </div>

                {/* Reset button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateProfileCalibrations({
                        windHeadwindCoef: undefined,
                        windTailwindCoef: undefined,
                        windHeadwindCoefShort: undefined,
                        windTailwindCoefShort: undefined,
                        elevationUphillRatio: undefined,
                        elevationDownhillRatio: undefined
                      });
                      triggerHaptic('success');
                      alert('Calibration constants restored to system factory defaults!');
                    }}
                    className="w-full py-2 border border-dashed border-slate-800 hover:border-green-500 text-slate-400 hover:text-green-400 font-mono text-[10px] font-bold uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Reset Constants to Factory Defaults
                  </button>
                </div>

                {/* Section 2: Wind Formula Reference Manual */}
                <div className="space-y-3.5 bg-slate-950 border border-slate-900 p-4 rounded-2xl">
                  <div className="flex items-center gap-1.5 border-b border-slate-900 pb-2">
                    <Info className="h-4 w-4 text-green-400" />
                    <span className="text-[10px] text-slate-200 uppercase font-black tracking-wider">Wind & Physical Calculation Formulas</span>
                  </div>

                  <div className="space-y-4 text-[11px] leading-relaxed text-slate-400">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-200 uppercase text-[10px] tracking-wide text-green-500">1. Vector Wind Decomposition</h4>
                      <p>
                        The direct angle of the wind is processed trigonometrically to find headwind/tailwind and crosswind components. Let <code className="text-amber-400 font-mono font-bold">Angle</code> be the input wind direction (0° to 360°):
                      </p>
                      <pre className="p-2.5 rounded-lg bg-slate-900/60 text-[9.5px] font-mono text-slate-300 leading-normal border border-slate-800 overflow-x-auto">
{`// Convert Angle to Radians
AngleRad = Angle * (π / 180)

// Calculate directional vector scales
CosAngle = Cos(AngleRad)
SinAngle = Sin(AngleRad)

// Project wind velocity components
Headwind = WindSpeed * CosAngle
Crosswind = WindSpeed * SinAngle`}
                      </pre>
                      <p className="text-[10px]">
                        • Positive <code className="font-mono text-slate-300">Headwind</code> indicates direct resistance (wind in your face).<br />
                        • Negative <code className="font-mono text-slate-300">Headwind</code> indicates a helpful tailwind breeze.<br />
                        • Positive <code className="font-mono text-slate-300">Crosswind</code> acts right-to-left. Negative acts left-to-right.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-200 uppercase text-[10px] tracking-wide text-green-500">2. Wind Distance Correction</h4>
                      <p>
                        Pure wind resistance plays non-linearly. For shots between 50 and 100 yards, we use specialized short-range multipliers. Otherwise, we use standard multipliers:
                      </p>
                      <pre className="p-2.5 rounded-lg bg-slate-900/60 text-[9.5px] font-mono text-slate-300 leading-normal border border-slate-800 overflow-x-auto">
{`const isShortShot = TargetDistance >= 50 && TargetDistance <= 100;
const headwindCoef = isShortShot ? HeadwindPenaltyFactorShort : HeadwindPenaltyFactor;
const tailwindCoef = isShortShot ? TailwindBoostFactorShort : TailwindBoostFactor;

if (Headwind > 0) {
  // Headwind increases Effective Distance
  WindAdjustment = Headwind * headwindCoef
} else {
  // Tailwind decreases Effective Distance
  WindAdjustment = Headwind * tailwindCoef
}

// Special case: Knockdown shots reduce wind effect by 40%
if (ShotType === "Knockdown") {
  WindAdjustment = WindAdjustment * 0.60
}`}
                      </pre>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-200 uppercase text-[10px] tracking-wide text-green-500">3. Lateral Wind Deflection (Drift)</h4>
                      <p>
                        The crosswind vector shifts the ball left or right. Lower velocity / higher launch shots drift exponentially.
                      </p>
                      <pre className="p-2.5 rounded-lg bg-slate-900/60 text-[9.5px] font-mono text-slate-300 leading-normal border border-slate-800 overflow-x-auto">
{`// Base deflection scale factor is 1.1 at 150 yards
LateralDrift = Crosswind * 1.1 * (TargetDistance / 150)

// Shot type offset adjustments
if (ShotType === "Fade") {
  LateralDrift += 4.0 // Natural fade drifts right
} else if (ShotType === "Draw") {
  LateralDrift -= 4.0 // Natural draw drifts left
} else if (ShotType === "Knockdown") {
  LateralDrift *= 0.65 // Penetrates wind better
}`}
                      </pre>
                      <p className="text-[10px]">
                        • Positive result means drift to the <strong>RIGHT</strong> (requiring left alignment correction).<br />
                        • Negative result means drift to the <strong>LEFT</strong> (requiring right alignment correction).
                      </p>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-200 uppercase text-[10px] tracking-wide text-green-500">4. Elevation / Slope Adjustments</h4>
                      <p>
                        Elevation affects gravity hangtime and collision points. Uphill shots have shorter carry; downhill shots have longer.
                      </p>
                      <pre className="p-2.5 rounded-lg bg-slate-900/60 text-[9.5px] font-mono text-slate-300 leading-normal border border-slate-800 overflow-x-auto">
{`if (Elevation > 0) {
  // Uphill: plays longer
  ElevationAdjustment = Elevation / UphillSlopeRatio
} else {
  // Downhill: plays shorter
  ElevationAdjustment = Elevation / DownhillSlopeRatio
}`}
                      </pre>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-200 uppercase text-[10px] tracking-wide text-green-500">5. Atmospheric Density (Temp & Altitude)</h4>
                      <p>
                        Higher air temperature and high altitude values lower the air density, providing less aerodynamic drag and increasing carry distance.
                      </p>
                      <pre className="p-2.5 rounded-lg bg-slate-900/60 text-[9.5px] font-mono text-slate-300 leading-normal border border-slate-800 overflow-x-auto">
{`TempMultiplier = 1 + ((Temperature - 70) / 10) * 0.01
AltitudeMultiplier = 1 + (Altitude / 1000) * 0.015

AtmosphericMultiplier = TempMultiplier * AltitudeMultiplier

// Adjusts Effective Distance accordingly
EffectiveDistance = (TargetDistance + SlopeAdj + WindAdj) / AtmosphericMultiplier`}
                      </pre>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM NAVIGATION TAB BAR */}
        <div className={`absolute bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around z-30 select-none ${
          theme === 'dark' ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <button
            onClick={() => {
              setActiveTab('calc');
              triggerHaptic('click');
            }}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'calc' ? 'text-green-400 scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Calc</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('practice');
              triggerHaptic('click');
            }}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'practice' ? 'text-green-400 scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Practice</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('clubs');
              triggerHaptic('click');
            }}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'clubs' ? 'text-green-400 scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Clubs</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('insights');
              triggerHaptic('click');
            }}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'insights' ? 'text-green-400 scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Caddy</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('profile');
              triggerHaptic('click');
            }}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'profile' ? 'text-green-400 scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Profile</span>
          </button>
        </div>

      </div>
    </MobileSimulator>
  );
}
