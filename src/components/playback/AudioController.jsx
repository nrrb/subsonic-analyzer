// This is a non-UI utility to manage audio playback
import { useRef, useEffect, useState } from 'react';

export const useAudioController = () => {
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaybackShelf, setShowPlaybackShelf] = useState(false);
  
  const audioContextRef = useRef(null);
  const audioElementRef = useRef(null);
  const audioSourcesRef = useRef({});
  const progressIntervalRef = useRef(null);
  const hideShelfTimeoutRef = useRef(null);

  useEffect(() => {
    // Initialize Audio Context on component mount
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContext();
    audioElementRef.current = new Audio();

    // Handle audio element events
    audioElementRef.current.addEventListener('ended', handlePlaybackEnded);
    
    // Add timeupdate event listener for tracking playback progress
    audioElementRef.current.addEventListener('timeupdate', updatePlaybackProgress);
    
    // Add loadedmetadata event listener to get duration
    audioElementRef.current.addEventListener('loadedmetadata', () => {
      setDuration(audioElementRef.current.duration);
    });

    return () => {
      // Clean up audio context on component unmount
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      // Clean up audio element
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.removeEventListener('ended', handlePlaybackEnded);
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
    };
  }, []);

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

  const handlePlaybackEnded = () => {
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
  };

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

  // Play/Pause audio
  const togglePlayback = (fileName, fileData = null) => {
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
      } else if (fileData) {
        // If file data is provided, create and play from a new blob URL
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
          const blobUrl = URL.createObjectURL(new Blob([e.target.result]));
          audioSourcesRef.current[fileName] = blobUrl;
          audioElementRef.current.src = blobUrl;
          audioElementRef.current.play();
          setCurrentlyPlaying(fileName);
        };
        fileReader.readAsArrayBuffer(fileData);
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
      
      audioElementRef.current.play();
      setCurrentlyPlaying(fileName);
      // Show playback shelf when starting playback
      setShowPlaybackShelf(true);
    }
  };

  // Format current time as MM:SS
  const formatCurrentTime = () => {
    if (!audioElementRef.current) return "0:00";
    const currentTime = audioElementRef.current.currentTime;
    const mins = Math.floor(currentTime / 60);
    const secs = Math.floor(currentTime % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Add an audio to the sources map for later playback
  const addAudioSource = (fileName, arrayBuffer) => {
    const blobUrl = URL.createObjectURL(new Blob([arrayBuffer]));
    audioSourcesRef.current[fileName] = blobUrl;
  };

  // Hide the playback shelf
  const hidePlaybackShelf = () => {
    setShowPlaybackShelf(false);
  };

  return {
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
  };
};

export default useAudioController;