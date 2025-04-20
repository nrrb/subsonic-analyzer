// File: src/components/SubsonicAnalyzer.jsx
import { useState, useRef, useEffect } from 'react';
import FFT from 'fft.js';
import './SubsonicAnalyzer.css';

const SubsonicAnalyzer = () => {
  const [files, setFiles] = useState([]);
  const [fileProgress, setFileProgress] = useState({});
  const [results, setResults] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [freqRange, setFreqRange] = useState({ lower: 20, upper: 150 });
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  // Add a state for tracking current playback time
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  // Add a state for the playback shelf visibility
  const [showPlaybackShelf, setShowPlaybackShelf] = useState(false);
  const fileInputRef = useRef(null);
  const uploadAreaRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioElementRef = useRef(null);
  const audioSourcesRef = useRef({});
  // Add a ref for the playback progress update interval
  const progressIntervalRef = useRef(null);
  // Add ref for the hide shelf timeout
  const hideShelfTimeoutRef = useRef(null);

  useEffect(() => {
    // Initialize Audio Context on component mount
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContext();
    audioElementRef.current = new Audio();

    // Handle audio element events
    audioElementRef.current.addEventListener('ended', () => {
      setCurrentlyPlaying(null);
      setPlaybackProgress(0);
      // Clear the progress update interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Auto-hide the playback shelf after a short delay when playback ends
      if (hideShelfTimeoutRef.current) {
        clearTimeout(hideShelfTimeoutRef.current);
      }
      hideShelfTimeoutRef.current = setTimeout(() => {
        setShowPlaybackShelf(false);
      }, 1500);
    });

    // Add timeupdate event listener for tracking playback progress
    audioElementRef.current.addEventListener('timeupdate', updatePlaybackProgress);
    
    // Add loadedmetadata event listener to get duration
    audioElementRef.current.addEventListener('loadedmetadata', () => {
      setDuration(audioElementRef.current.duration);
    });

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
      
      // Clean up audio element
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.removeEventListener('ended', () => {});
        audioElementRef.current.removeEventListener('timeupdate', updatePlaybackProgress);
        audioElementRef.current.removeEventListener('loadedmetadata', () => {});
      }
      
      // Clear the progress update interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      // Clear any pending hide shelf timeout
      if (hideShelfTimeoutRef.current) {
        clearTimeout(hideShelfTimeoutRef.current);
      }
      
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  // Show playback shelf when a track is playing
  useEffect(() => {
    if (currentlyPlaying) {
      setShowPlaybackShelf(true);
      // Clear any pending hide timeout
      if (hideShelfTimeoutRef.current) {
        clearTimeout(hideShelfTimeoutRef.current);
        hideShelfTimeoutRef.current = null;
      }
    }
  }, [currentlyPlaying]);

  // Function to update playback progress
  const updatePlaybackProgress = () => {
    if (audioElementRef.current && !audioElementRef.current.paused) {
      const progress = (audioElementRef.current.currentTime / audioElementRef.current.duration) * 100;
      setPlaybackProgress(progress);
    }
  };

  // Function to seek to a position in the audio
  const seekTo = (e) => {
    if (currentlyPlaying && audioElementRef.current) {
      // Get the clicked position relative to the progress bar width
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      
      // Calculate the new time and set it
      const newTime = clickPosition * audioElementRef.current.duration;
      audioElementRef.current.currentTime = newTime;
      
      // Update the progress state immediately for smoother UI
      setPlaybackProgress(clickPosition * 100);
    }
  };

  // Watch for new files and start analysis automatically
  useEffect(() => {
    if (files.length > 0 && !analyzing) {
      analyzeFiles();
    }
  }, [files]);

  // Play/Pause audio
  const togglePlayback = (fileName) => {
    if (currentlyPlaying === fileName) {
      // Pause the currently playing audio
      audioElementRef.current.pause();
      setCurrentlyPlaying(null);
      
      // Clear the progress update interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Auto-hide the playback shelf after a short delay
      if (hideShelfTimeoutRef.current) {
        clearTimeout(hideShelfTimeoutRef.current);
      }
      hideShelfTimeoutRef.current = setTimeout(() => {
        setShowPlaybackShelf(false);
      }, 1500);
    } else {
      // If another song is playing, pause it first
      if (currentlyPlaying) {
        audioElementRef.current.pause();
        
        // Clear the existing progress update interval
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }
      
      // Reset playback progress for the new track
      setPlaybackProgress(0);
      
      // Check if we have the audio data in our cache
      if (audioSourcesRef.current[fileName]) {
        // Play from the cached source
        audioElementRef.current.src = audioSourcesRef.current[fileName];
      } else {
        // Find the file in our original files list
        const file = files.find(f => f.name === fileName) || 
                    // Also check completed files that might have been removed from the files state
                    Object.keys(audioSourcesRef.current).includes(fileName);
        
        if (file) {
          const fileReader = new FileReader();
          fileReader.onload = (e) => {
            const blobUrl = URL.createObjectURL(new Blob([e.target.result]));
            audioSourcesRef.current[fileName] = blobUrl;
            audioElementRef.current.src = blobUrl;
            audioElementRef.current.play();
            setCurrentlyPlaying(fileName);
          };
          fileReader.readAsArrayBuffer(file);
          return;
        } else {
          // Try to find it in the previously analyzed files
          const fileUrl = audioSourcesRef.current[fileName];
          if (fileUrl) {
            audioElementRef.current.src = fileUrl;
          } else {
            console.error(`Could not find audio data for ${fileName}`);
            return;
          }
        }
      }
      
      audioElementRef.current.play();
      setCurrentlyPlaying(fileName);
      // Show playback shelf when starting playback
      setShowPlaybackShelf(true);
    }
  };

  // Utility function for trapezoidal integration
  const trapezoidalIntegration = (y, x) => {
    let sum = 0;
    for (let i = 1; i < x.length; i++) {
      sum += (x[i] - x[i-1]) * (y[i] + y[i-1]) / 2;
    }
    return sum;
  };

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
      const fileId = `${file.name}-${file.lastModified}`;
      newProgress[fileId] = 0;
    });
    
    setFileProgress(prev => ({...prev, ...newProgress}));
    setFiles(prevFiles => [...prevFiles, ...mp3Files]);
    // Analysis will start automatically due to useEffect
  };

  // Generate a unique ID for a file
  const getFileId = (file) => `${file.name}-${file.lastModified}`;

  // Handle file input change
  const handleFileInputChange = (e) => {
    handleFiles(e.target.files);
  };

  // Handle drag and drop events
  const handleDragOver = (e) => {
    e.preventDefault();
    uploadAreaRef.current.classList.add('dragging');
  };

  const handleDragLeave = () => {
    uploadAreaRef.current.classList.remove('dragging');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    uploadAreaRef.current.classList.remove('dragging');
    handleFiles(e.dataTransfer.files);
  };

  // Read file as ArrayBuffer
  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      // Track progress of file reading
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const fileId = getFileId(file);
          const readProgress = Math.round((event.loaded / event.total) * 20); // 0-20%
          updateProgress(fileId, readProgress);
        }
      };
      
      reader.onload = () => {
        // Store the audio data for later playback
        const blobUrl = URL.createObjectURL(new Blob([reader.result]));
        audioSourcesRef.current[file.name] = blobUrl;
        
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Decode audio data
  const decodeAudioData = (arrayBuffer, fileId) => {
    return new Promise((resolve, reject) => {
      // Update progress to show we're starting decoding
      updateProgress(fileId, 20); // 20%
      
      const decodeStartTime = performance.now();
      
      audioContextRef.current.decodeAudioData(
        arrayBuffer,
        (decodedData) => {
          // Decoding complete
          updateProgress(fileId, 40); // 40%
          resolve(decodedData);
        },
        reject
      );
    });
  };

  // Compute power spectral density using fft.js
  const computePowerSpectralDensity = (timeData, sampleRate) => {
    // FFT works best with power of 2
    const fftSize = Math.pow(2, Math.ceil(Math.log2(timeData.length)));
    
    // Create FFT instance
    const fft = new FFT(fftSize);
    
    // Prepare input and output arrays
    const input = new Float64Array(fftSize);
    const output = new Float64Array(fftSize * 2); // Complex output (real, imag pairs)
    
    // Copy and zero-pad the input data
    input.set(timeData);
    
    // Apply Hann window function
    for (let i = 0; i < timeData.length; i++) {
      input[i] *= 0.5 * (1 - Math.cos(2 * Math.PI * i / (timeData.length - 1)));
    }
    
    // Perform FFT
    fft.realTransform(output, input);
    
    // Compute power spectrum (half of the FFT size is meaningful for real signals)
    const powerSpectrum = new Float64Array(fftSize / 2);
    
    for (let i = 0; i < fftSize / 2; i++) {
      const real = output[2 * i];
      const imag = output[2 * i + 1];
      // Power = real^2 + imag^2
      powerSpectrum[i] = (real * real + imag * imag) / (fftSize * fftSize);
    }
    
    // Create frequency array
    const frequencies = new Float64Array(fftSize / 2);
    const freqResolution = sampleRate / fftSize;
    
    for (let i = 0; i < fftSize / 2; i++) {
      frequencies[i] = i * freqResolution;
    }
    
    return { frequencies, powerSpectrum };
  };

  // Compute subsonic energy with progress tracking
  const computeSubsonicEnergy = async (audioBuffer, fileId, lowFreq = freqRange.lower, highFreq = freqRange.upper, scaleFactor = 1e6) => {
    // Get channel data (mono or mix of all channels)
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    
    // Update progress - starting analysis
    updateProgress(fileId, 40); // 40%
    
    // Mix all channels to mono if needed
    let audioData;
    if (numChannels === 1) {
      audioData = audioBuffer.getChannelData(0);
    } else {
      audioData = new Float32Array(length);
      for (let c = 0; c < numChannels; c++) {
        const channelData = audioBuffer.getChannelData(c);
        for (let i = 0; i < length; i++) {
          audioData[i] += channelData[i] / numChannels;
        }
      }
    }
    
    // Update progress - mixed channels
    updateProgress(fileId, 50); // 50%
    
    // Process audio in chunks for better frequency resolution
    const chunkSize = 16384; // Power of 2 for FFT
    const numChunks = Math.floor(length / chunkSize);
    
    if (numChunks === 0) {
      updateProgress(fileId, 100); // 100% (done)
      return { energy: 0, normalizedEnergy: 0, scaledEnergy: 0, duration: length / sampleRate };
    }
    
    // Convert Float32Array to Float64Array for fft.js
    const audioDataDouble = new Float64Array(audioData);
    
    // Create aggregate power spectrum
    let aggregatePowerSpectrum = null;
    let frequencies = null;
    
    // Process chunks with progress tracking
    for (let chunk = 0; chunk < numChunks; chunk++) {
      // Calculate progress based on chunk processing (from 50% to 90%)
      const chunkProgress = 50 + Math.round((chunk / numChunks) * 40);
      updateProgress(fileId, chunkProgress);
      
      // Process some chunks asynchronously to allow UI updates
      if (chunk % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      const offset = chunk * chunkSize;
      const chunkData = audioDataDouble.slice(offset, offset + chunkSize);
      
      // Compute PSD for this chunk
      const { frequencies: freqs, powerSpectrum } = computePowerSpectralDensity(chunkData, sampleRate);
      
      // Store frequencies from first chunk
      if (chunk === 0) {
        frequencies = freqs;
        aggregatePowerSpectrum = new Float64Array(powerSpectrum.length).fill(0);
      }
      
      // Accumulate power spectrum
      for (let i = 0; i < powerSpectrum.length; i++) {
        aggregatePowerSpectrum[i] += powerSpectrum[i] / numChunks;
      }
    }
    
    // Update progress - finished FFT processing
    updateProgress(fileId, 90); // 90%
    
    // Find frequency bins corresponding to our range
    const freqResolution = sampleRate / chunkSize;
    const lowBin = Math.floor(lowFreq / freqResolution);
    const highBin = Math.ceil(highFreq / freqResolution);
    
    // Extract the relevant frequencies and powers
    const relevantFreqs = frequencies.slice(lowBin, highBin + 1);
    const relevantPowers = aggregatePowerSpectrum.slice(lowBin, highBin + 1);
    
    // Calculate energy using trapezoidal integration
    const energy = trapezoidalIntegration(relevantPowers, relevantFreqs);
    
    // Normalize by duration
    const duration = length / sampleRate;
    const normalizedEnergy = energy / duration;
    
    // Scale for readability
    const scaledEnergy = normalizedEnergy * scaleFactor;
    
    // Update progress - completed
    updateProgress(fileId, 100); // 100%
    
    return {
      energy,
      normalizedEnergy,
      scaledEnergy,
      duration
    };
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
        const arrayBuffer = await readFileAsArrayBuffer(file);
        
        // Decode the audio data with progress tracking
        const audioBuffer = await decodeAudioData(arrayBuffer, fileId);
        
        // Analyze the audio with progress tracking
        const result = await computeSubsonicEnergy(audioBuffer, fileId);
        
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

  // Download results as CSV
  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "file_name,subsonic_energy,duration_seconds,lower_freq,upper_freq\n";
    
    results.forEach(result => {
      csvContent += `"${result.fileName}",${result.energy.toFixed(2)},${result.duration.toFixed(2)},${result.lowerFreq},${result.upperFreq}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "subsonic_analysis.csv");
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
  };

  // Format duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format current time as MM:SS
  const formatCurrentTime = () => {
    if (!audioElementRef.current) return "0:00";
    const currentTime = audioElementRef.current.currentTime;
    const mins = Math.floor(currentTime / 60);
    const secs = Math.floor(currentTime % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get filename of currently playing track
  const getCurrentlyPlayingFilename = () => {
    if (!currentlyPlaying) return "";
    // Find the result that matches the current playing filename
    const result = results.find(r => r.fileName === currentlyPlaying);
    if (result) {
      return result.fileName;
    }
    return currentlyPlaying;
  };

  return (
    <div className="subsonic-analyzer">
      <h1>Subsonic Energy Analyzer</h1>
      
      <div className="header-with-settings">
        <p>Upload MP3 files to calculate their subsonic energy ({freqRange.lower}-{freqRange.upper} Hz) values.</p>
        <button 
          id="settings-button"
          className="settings-button" 
          onClick={toggleSettings}
          aria-label="Adjust frequency range"
        >
          🕶️
        </button>
        
        {showSettings && (
          <div id="settings-menu" className="settings-menu">
            <h3>Frequency Range Settings</h3>
            <div className="settings-row">
              <label htmlFor="lower-freq">Lower Bound (Hz):</label>
              <input
                id="lower-freq"
                type="number"
                min="0"
                max={freqRange.upper - 1}
                value={freqRange.lower}
                onChange={(e) => handleFreqRangeChange(e, 'lower')}
              />
            </div>
            <div className="settings-row">
              <label htmlFor="upper-freq">Upper Bound (Hz):</label>
              <input
                id="upper-freq"
                type="number"
                min={freqRange.lower + 1}
                max="22050"
                value={freqRange.upper}
                onChange={(e) => handleFreqRangeChange(e, 'upper')}
              />
            </div>
            <div className="frequency-info">
              <p>Current range: {freqRange.lower} Hz - {freqRange.upper} Hz</p>
              <p className="note">Note: 0 &lt; Lower Bound &lt; Upper Bound &lt; 22050</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="container">
        <div 
          ref={uploadAreaRef}
          className="upload-area"
          onClick={() => fileInputRef.current.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p>Drag and drop MP3 files here, or click to select files</p>
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".mp3" 
            multiple
            onChange={handleFileInputChange}
          />
        </div>
        
        {files.length > 0 && (
          <div className="file-list">
            {files.map((file, index) => {
              const fileId = getFileId(file);
              const progress = fileProgress[fileId] || 0;
              const isPlaying = currentlyPlaying === file.name;
              
              return (
                <div className={`file-item ${isPlaying ? 'is-playing' : ''}`} key={fileId}>
                  <div 
                    className={`progress-bar ${progress === -1 ? 'progress-error' : ''}`}
                    style={{ width: `${progress === -1 ? 100 : progress}%` }}
                  ></div>
                  
                  <div className="file-content">
                    <span className="filename">{file.name}</span>
                    <span className="status">
                      {progress < 100 ? 
                        (progress === -1 ? 'Error' : `${progress}%`) : 
                        'Complete'}
                    </span>
                    
                    {/* Play button for files */}
                    {progress === 100 && (
                      <button 
                        className="play-button" 
                        onClick={() => togglePlayback(file.name)}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? '⏹️' : '▶️'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {showResults && (
          <div className="results">
            <h2>Analysis Results</h2>
            <p>Energy values for {results.length > 0 ? `${results[0].lowerFreq}-${results[0].upperFreq}` : `${freqRange.lower}-${freqRange.upper}`} Hz range, normalized by track duration and scaled for easy comparison:</p>
            
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>File Name</th>
                  <th>Energy ({results.length > 0 ? `${results[0].lowerFreq}-${results[0].upperFreq}` : `${freqRange.lower}-${freqRange.upper}`} Hz)</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => {
                  const isPlaying = currentlyPlaying === result.fileName;
                  
                  return (
                    <tr key={index} className={isPlaying ? 'playing' : ''}>
                      <td className="play-cell">
                        <button 
                          className="play-button" 
                          onClick={() => togglePlayback(result.fileName)}
                          aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? '⏹️' : '▶️'}
                        </button>
                      </td>
                      <td className="filename-cell">
                        {result.fileName}
                      </td>
                      <td>{result.energy.toFixed(2)}</td>
                      <td>{formatDuration(result.duration)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <button className="download-btn" onClick={downloadCSV}>
              Download CSV
            </button>
          </div>
        )}
      </div>
      
      {/* Playback shelf that slides out from the bottom */}
      <div className={`playback-shelf ${showPlaybackShelf ? 'show' : 'hide'}`}>
        <div className="playback-shelf-content">
          <div className="playback-shelf-info">
            <div className="currently-playing-title">
              {getCurrentlyPlayingFilename()}
            </div>
            <div className="playback-shelf-times">
              <div className="playback-time">{formatCurrentTime()}</div>
              <div className="playback-duration">{formatDuration(audioElementRef.current?.duration || 0)}</div>
            </div>
          </div>
          
          <div 
            className="playback-scrub-bar"
            onClick={seekTo}
          >
            <div 
              className="playback-progress" 
              style={{ width: `${playbackProgress}%` }}
            ></div>
          </div>
          
          <button 
            className="playback-shelf-close" 
            onClick={() => {
              if (currentlyPlaying) {
                togglePlayback(currentlyPlaying);
              } else {
                setShowPlaybackShelf(false);
              }
            }}
          >
            {currentlyPlaying ? '⏹️' : '×'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubsonicAnalyzer;