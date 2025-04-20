// This is a non-UI utility for audio analysis
import FFT from 'fft.js';

// Utility function for trapezoidal integration
const trapezoidalIntegration = (y, x) => {
  let sum = 0;
  for (let i = 1; i < x.length; i++) {
    sum += (x[i] - x[i-1]) * (y[i] + y[i-1]) / 2;
  }
  return sum;
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

// Read file as ArrayBuffer with progress tracking
export const readFileAsArrayBuffer = (file, updateProgress) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const fileId = `${file.name}-${file.lastModified}`;
    
    // Track progress of file reading
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const readProgress = Math.round((event.loaded / event.total) * 20); // 0-20%
        updateProgress(fileId, readProgress);
      }
    };
    
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Decode audio data with progress tracking
export const decodeAudioData = (audioContext, arrayBuffer, fileId, updateProgress) => {
  return new Promise((resolve, reject) => {
    // Update progress to show we're starting decoding
    updateProgress(fileId, 20); // 20%
    
    audioContext.decodeAudioData(
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

// Compute subsonic energy with progress tracking
export const computeSubsonicEnergy = async (
  audioBuffer, 
  fileId, 
  updateProgress, 
  lowFreq = 20, 
  highFreq = 150, 
  scaleFactor = 1e6
) => {
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

export default {
  readFileAsArrayBuffer,
  decodeAudioData,
  computeSubsonicEnergy
};