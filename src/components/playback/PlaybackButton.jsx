// File: src/components/playback/PlaybackButton.jsx
import React from 'react';

const PlaybackButton = ({ isPlaying, onClick, fileName }) => {
  return (
    <button 
      className="play-button" 
      onClick={() => onClick(fileName)}
      aria-label={isPlaying ? 'Pause' : 'Play'}
    >
      {isPlaying ? '⏹️' : '▶️'}
    </button>
  );
};

export default PlaybackButton;