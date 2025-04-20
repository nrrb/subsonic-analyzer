import React from 'react';
import PlaybackButton from '../playback/PlaybackButton';

const AnalysisResults = ({ 
  results, 
  currentlyPlaying, 
  togglePlayback, 
  formatDuration 
}) => {
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

  return (
    <div className="results">
      <h2>Analysis Results</h2>
      <p>
        Energy values for {results.length > 0 ? `${results[0].lowerFreq}-${results[0].upperFreq}` : '20-150'} Hz range, 
        normalized by track duration and scaled for easy comparison:
      </p>
      
      <table>
        <thead>
          <tr>
            <th></th>
            <th>File Name</th>
            <th>Energy ({results.length > 0 ? `${results[0].lowerFreq}-${results[0].upperFreq}` : '20-150'} Hz)</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => {
            const isPlaying = currentlyPlaying === result.fileName;
            
            return (
              <tr key={index} className={isPlaying ? 'playing' : ''}>
                <td className="play-cell">
                  <PlaybackButton 
                    isPlaying={isPlaying}
                    onClick={togglePlayback}
                    fileName={result.fileName}
                  />
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
  );
};

export default AnalysisResults;