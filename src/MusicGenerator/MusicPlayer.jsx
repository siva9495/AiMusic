import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Download, Loader2, Volume2, VolumeX,
  SkipBack, SkipForward, Music2
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';

const MusicPlayer = ({ generatedLyrics, songType, lyricsStyle, userInput }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState(null);
  
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);

  const generateMusic = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      // First API call to generate music prompt
      const musicPromptResponse = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          lyrics: generatedLyrics,
          gener: songType,
          mood: lyricsStyle,
          description: userInput
        })
      });

      if (!musicPromptResponse.ok) throw new Error('Failed to generate music prompt');
      const promptData = await musicPromptResponse.json();

      // Initialize Beatoven.ai track
      const trackResponse = await fetch('https://public-api.beatoven.ai/api/v1/tracks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BEATOVEN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: { text: promptData.answer }
        })
      });

      if (!trackResponse.ok) throw new Error('Failed to initialize track');
      const trackData = await trackResponse.json();
      const trackId = trackData.tracks[0];

      // Start composition
      setGenerationProgress(33);
      const composeResponse = await fetch(`https://public-api.beatoven.ai/api/v1/tracks/compose/${trackId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BEATOVEN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: 'mp3',
          looping: false
        })
      });

      if (!composeResponse.ok) throw new Error('Failed to start composition');
      const composeData = await composeResponse.json();
      const taskId = composeData.task_id;

      // Poll for completion
      setGenerationProgress(66);
      const trackUrl = await pollCompositionStatus(taskId);
      setGenerationProgress(100);
      setAudioUrl(trackUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const pollCompositionStatus = async (taskId) => {
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      const response = await fetch(`https://public-api.beatoven.ai/api/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.BEATOVEN_API_KEY}`
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

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-none shadow-xl hover:shadow-2xl transition-all duration-300 mt-8">
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
                <span className="text-white/90">Generating Your Music...</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          )}

          {audioUrl && (
            <div className="space-y-6">
              <div className="relative w-full h-2 bg-white/10 rounded-full cursor-pointer"
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
  );
};

export default MusicPlayer;