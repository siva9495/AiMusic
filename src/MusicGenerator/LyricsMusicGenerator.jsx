import React, { useState, useRef } from 'react';
import { 
  Play, Pause, Download, Loader2, Volume2, VolumeX,
  SkipBack, SkipForward, Music2, Copy, Check 
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';

const LyricsMusicGenerator = ({ generatedLyrics, songType, lyricsStyle, userInput }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);

  // Exposing the API key in the frontend is not secure.
  // For production, consider moving all Beatoven calls to your backend.
  const BEATOVEN_API_KEY = "UTciFPiN5fDDNxTIDcr5zcewaHwW1UcQKEaYna2nrAOA";

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLyrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateMusic = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      // Step 1: Get music prompt from your backend /music endpoint
      setGenerationStage('Generating music prompt...');
      const promptResponse = await fetch('https://hound-causal-thankfully.ngrok-free.app/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          lyrics: generatedLyrics,
          gener: songType,
          mood: lyricsStyle,
          description: userInput
        })
      });
  
      if (!promptResponse.ok) {
        throw new Error('Failed to generate music prompt');
      }
  
      const promptData = await promptResponse.json();
      let musicPrompt = promptData.answer;
  
      // Extract the string if musicPrompt is an object with a "response" property
      if (typeof musicPrompt === 'object' && musicPrompt.response) {
        musicPrompt = musicPrompt.response;
      }
  
      // Step 2: Create track with Beatoven.ai
      setGenerationStage('Creating music track...');
      const createTrackResponse = await fetch('https://public-api.beatoven.ai/api/v1/tracks', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer Fxa-zM-JgAIDTHghDb8pKw', // Ensure proper formatting with space after "Bearer"
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: { text: musicPrompt }
        })
      });
  
      if (!createTrackResponse.ok) {
        const errorText = await createTrackResponse.text();
        throw new Error(`Failed to create track: ${createTrackResponse.status} - ${errorText}`);
      }
  
      const trackData = await createTrackResponse.json();
      console.log('Track created successfully:', trackData);
      const trackId = trackData.tracks[0];
  
      // Step 3: Start composition
      setGenerationStage('Composing music...');
      const composeResponse = await fetch(`https://public-api.beatoven.ai/api/v1/tracks/compose/${trackId}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer Fxa-zM-JgAIDTHghDb8pKw',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: 'mp3',
          looping: false
        })
      });
  
      if (!composeResponse.ok) {
        const errorText = await composeResponse.text();
        throw new Error(`Failed to start composition: ${composeResponse.status} - ${errorText}`);
      }
      
      const composeData = await composeResponse.json();
      const taskId = composeData.task_id;
  
      // Step 4: Poll for completion
      setGenerationStage('Finalizing composition...');
      const trackUrl = await pollCompositionStatus(taskId);
      setAudioUrl(trackUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
      setGenerationStage('');
    }
  };
  
  
  

  const pollCompositionStatus = async (taskId) => {
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      const response = await fetch(`https://public-api.beatoven.ai/api/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': 'Bearer Fxa-zM-JgAIDTHghDb8pKw',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to check composition status');
      const statusData = await response.json();

      if (statusData.status === 'composed') {
        return statusData.meta.track_url;
      } else if (statusData.status === 'failed') {
        throw new Error(statusData.meta.error || 'Composition failed');
      }

      await new Promise(resolve => setTimeout(resolve, 10000));
      retries++;
    }

    throw new Error('Composition timed out');
  };

  // Player control functions
  const handlePlayPause = () => {
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const handleProgressBarClick = (e) => {
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pos * audioRef.current.duration;
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = async () => {
    if (!audioUrl) return;
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${songType}-${lyricsStyle}-music.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download music');
    }
  };

  return (
    <div className="space-y-8">
      {/* Generated Lyrics Display */}
      <Card className="bg-white/10 backdrop-blur-xl border-none shadow-2xl">
        <CardContent className="p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-0 sm:justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Your Generated Lyrics</h2>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 text-white text-sm sm:text-base"
              >
                {copied ? <Check className="w-4 sm:w-5 h-4 sm:h-5" /> : <Copy className="w-4 sm:w-5 h-4 sm:h-5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="bg-black/30 rounded-xl p-4 sm:p-6">
            {generatedLyrics.split('\n').map((line, index) => {
              const cleanLine = line.replace(/\\$/, '').trim();
              if (!cleanLine) {
                return <div key={index} className="h-3 sm:h-4" />;
              }
              if (cleanLine.startsWith('###')) {
                const headerText = cleanLine.replace(/^###\s*/, '');
                return (
                  <div key={index} className="mt-6 sm:mt-8 mb-3 sm:mb-4 first:mt-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-purple-300">
                      {headerText}
                    </h3>
                  </div>
                );
              }
              return (
                <p key={index} className="text-white/90 leading-relaxed text-base sm:text-lg">
                  {cleanLine}
                </p>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Music Generation and Player */}
      <Card className="bg-white/5 backdrop-blur-lg border-none shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-6">
            {!audioUrl && !isGenerating && (
              <button
                onClick={generateMusic}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-4 rounded-xl font-medium transition-all duration-300 hover:opacity-90 flex items-center justify-center gap-2"
              >
                <Music2 className="w-5 h-5" />
                Generate Music
              </button>
            )}

            {isGenerating && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  <span className="text-white/90">{generationStage}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full animate-pulse" />
                </div>
              </div>
            )}

            {audioUrl && (
              <div className="space-y-6">
                <div 
                  className="relative w-full h-2 bg-white/10 rounded-full cursor-pointer"
                  ref={progressBarRef}
                  onClick={handleProgressBarClick}
                >
                  <div
                    className="absolute h-2 bg-purple-500 rounded-full"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-white/60">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => { audioRef.current.currentTime -= 10 }}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <SkipBack className="w-6 h-6 text-white" />
                  </button>

                  <button
                    onClick={handlePlayPause}
                    className="p-4 bg-purple-500 rounded-full hover:bg-purple-600 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white" />
                    ) : (
                      <Play className="w-8 h-8 text-white" />
                    )}
                  </button>

                  <button
                    onClick={() => { audioRef.current.currentTime += 10 }}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <SkipForward className="w-6 h-6 text-white" />
                  </button>
                </div>

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="w-6 h-6 text-white" />
                    ) : (
                      <Volume2 className="w-6 h-6 text-white" />
                    )}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-400 text-center p-4 bg-red-500/10 rounded-lg">
                {error}
              </div>
            )}

            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LyricsMusicGenerator;
