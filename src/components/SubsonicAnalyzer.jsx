// File: src/components/SubsonicAnalyzer.jsx
import { useState, useRef, useEffect } from 'react';
import useAudioController from './playback/AudioController';
import PlaybackShelf from './playback/PlaybackShelf';
import FileUploader from './fileManagement/FileUploader';
import AnalysisResults from './analysis/AnalysisResults';
import FrequencySettings from './analysis/FrequencySettings';
import { readFileAsArrayBuffer, decodeAudioData, computeSubsonicEnergy } from './analysis/AudioAnalyzer';
import './SubsonicAnalyzer.css';

const SubsonicAnalyzer = () => {
  // File and analysis state
  const [files, setFiles] = useState([]);
  const [fileProgress, setFileProgress] = useState({});
  const [results, setResults] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [freqRange, setFreqRange] = useState({ lower: 20, upper: 150 });
  
  // Audio context reference
  const audioContextRef = useRef(null);
  
  // Get playback controller
  const { 
    currentlyPlaying,
    playbackProgress,
    duration,
    showPlaybackShelf,
    togglePlayback,
    seekTo,
    formatCurrentTime,
    formatDuration,
    addAudioSource,
    hidePlaybackShelf
  } = useAudioController();

  useEffect(() => {
    // Initialize Audio Context on component mount
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContext();
    
    // Close settings menu when clicking outside
    const handleClickOutside = (e) => {
      const settingsMenu = document.getElementById('settings-menu');
      const settingsButton = document.getElementById('settings-button');
      
      if (
        showSettings && 
        settingsMenu && 
        !settingsMenu.contains(e.target) && 
        settingsButton && 
        !settingsButton.contains(e.target)
      ) {
        setShowSettings(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      // Clean up audio context on component unmount
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  // Watch for new files and start analysis automatically
  useEffect(() => {
    if (files.length > 0 && !analyzing) {
      analyzeFiles();
    }
  }, [files]);

  // Handle frequency range changes
  const handleFreqRangeChange = (e, type) => {
    const value = parseInt(e.target.value, 10);
    
    if (type === 'lower') {
      if (value >= 0 && value < freqRange.upper) {
        setFreqRange(prev => ({ ...prev, lower: value }));
      }
    } else if (type === 'upper') {
      if (value > freqRange.lower && value <= 22050) {
        setFreqRange(prev => ({ ...prev, upper: value }));
      }
    }
  };

  // Toggle settings menu
  const toggleSettings = () => {
    setShowSettings(prev => !prev);
  };

  // Update progress for a specific file
  const updateProgress = (fileId, progress) => {
    setFileProgress(prev => ({
      ...prev,
      [fileId]: progress
    }));
  };

  // Generate a unique ID for a file
  const getFileId = (file) => `${file.name}-${file.lastModified}`;

  // Handle file selection
  const handleFiles = (fileList) => {
    const mp3Files = Array.from(fileList).filter(
      file => file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3')
    );
    
    if (mp3Files.length === 0) {
      alert('Please select MP3 files only.');
      return;
    }
    
    // Initialize progress for each file
    const newProgress = {};
    mp3Files.forEach(file => {
      // Use file name + modification time as a unique ID
      const fileId = getFileId(file);
      newProgress[fileId] = 0;
    });
    
    setFileProgress(prev => ({...prev, ...newProgress}));
    setFiles(prevFiles => [...prevFiles, ...mp3Files]);
    // Analysis will start automatically due to useEffect
  };

  // Analyze files
  const analyzeFiles = async () => {
    setAnalyzing(true);
    const newResults = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = getFileId(file);
      
      try {
        // Read the file with progress tracking
        const arrayBuffer = await readFileAsArrayBuffer(file, updateProgress);
        
        // Store audio data for later playback
        addAudioSource(file.name, arrayBuffer);
        
        // Decode the audio data with progress tracking
        const audioBuffer = await decodeAudioData(audioContextRef.current, arrayBuffer, fileId, updateProgress);
        
        // Analyze the audio with progress tracking
        const result = await computeSubsonicEnergy(
          audioBuffer, 
          fileId, 
          updateProgress, 
          freqRange.lower, 
          freqRange.upper
        );
        
        newResults.push({
          fileName: file.name,
          energy: result.scaledEnergy,
          duration: result.duration,
          lowerFreq: freqRange.lower,
          upperFreq: freqRange.upper
        });
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        // Mark as failed
        updateProgress(fileId, -1);
      }
    }
    
    // Sort results by energy (descending)
    newResults.sort((a, b) => b.energy - a.energy);
    
    setResults(prevResults => [...newResults, ...prevResults]);
    setShowResults(true);
    setAnalyzing(false);
    
    // Don't clear files immediately to allow users to see 100% completion
    setTimeout(() => {
      setFiles([]);
      setFileProgress({});
    }, 2000);
  };

  return (
    <div className="subsonic-analyzer">
      <h1>Subsonic Energy Analyzer</h1>
      
      <FrequencySettings 
        freqRange={freqRange}
        handleFreqRangeChange={handleFreqRangeChange}
        showSettings={showSettings}
        toggleSettings={toggleSettings}
      />
      
      <div className="container">
        <FileUploader 
          files={files}
          fileProgress={fileProgress}
          handleFiles={handleFiles}
          currentlyPlaying={currentlyPlaying}
          togglePlayback={togglePlayback}
        />
        
        {showResults && (
          <AnalysisResults 
            results={results}
            currentlyPlaying={currentlyPlaying}
            togglePlayback={togglePlayback}
            formatDuration={formatDuration}
          />
        )}
      </div>
      
      <PlaybackShelf 
        currentlyPlaying={currentlyPlaying}
        duration={duration}
        playbackProgress={playbackProgress}
        showPlaybackShelf={showPlaybackShelf}
        formatCurrentTime={formatCurrentTime}
        formatDuration={formatDuration}
        seekTo={seekTo}
        togglePlayback={togglePlayback}
      />
    </div>
  );
};

export default SubsonicAnalyzer;