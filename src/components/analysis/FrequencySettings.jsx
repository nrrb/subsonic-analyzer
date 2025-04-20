// File: src/components/analysis/FrequencySettings.jsx
import React from 'react';

const FrequencySettings = ({ freqRange, handleFreqRangeChange, showSettings, toggleSettings }) => {
  return (
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
  );
};

export default FrequencySettings;
