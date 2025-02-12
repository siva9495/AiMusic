import React, { useState } from 'react';
import { Copy, Download, Loader2, Music, PenTool, Check } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

const ModernLyricsGenerator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLyrics, setGeneratedLyrics] = useState('');
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    songType: '',
    lyricsStyle: '',
    userInput: ''
  });

  const songTypes = ['Pop', 'Rock', 'Jazz', 'Classical', 'Hip Hop', 'R&B'];
  const lyricsStyles = ['Emotional', 'Motivational', 'Love', 'Sad', 'Upbeat', 'Story-based'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Prepare payload as FormData (API expects form fields)
      const payload = new FormData();
      payload.append('gener', formData.songType);
      payload.append('mood', formData.lyricsStyle);
      payload.append('description', formData.userInput);

      const response = await fetch('https://hound-causal-thankfully.ngrok-free.app/song', {
        method: 'POST',
        body: payload,
      });

      if (!response.ok) {
        throw new Error('Failed to generate lyrics');
      }

      const data = await response.json();

      // Extract lyrics from the nested structure: data.answer.response
      const lyrics = data?.answer?.response || 'No lyrics generated';
      setGeneratedLyrics(lyrics);

      // Reset the form fields so that it appears fresh (unselected/empty)
      setFormData({
        songType: '',
        lyricsStyle: '',
        userInput: ''
      });
    } catch (error) {
      console.error('Error generating lyrics:', error);
      setGeneratedLyrics('Error generating lyrics. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLyrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedLyrics], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-lyrics.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Always show the form */}
        <div className="max-w-2xl mx-auto mb-6 sm:mb-10">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-300 mb-3 sm:mb-4">
              Lyrics Creator
            </h1>
            <p className="text-base sm:text-lg text-purple-200/80">
              Transform your ideas into beautiful lyrics
            </p>
          </div>
  
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            <Card className="bg-white/5 backdrop-blur-lg border-none shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardContent className="p-4 sm:p-8 space-y-6 sm:space-y-8">
                <div className="space-y-3 sm:space-y-4">
                  <label className="text-white text-base sm:text-lg font-medium flex items-center gap-2">
                    <Music className="w-5 h-5" /> Select Genre
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {songTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, songType: type })}
                        className={`p-2 sm:p-3 rounded-xl text-sm sm:text-base transition-all duration-300 transform hover:scale-105
                          ${formData.songType === type 
                            ? 'bg-purple-500 text-white shadow-lg' 
                            : 'bg-white/5 text-white hover:bg-white/10'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
  
                <div className="space-y-3 sm:space-y-4">
                  <label className="text-white text-base sm:text-lg font-medium flex items-center gap-2">
                    <PenTool className="w-5 h-5" /> Choose Mood Style
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {lyricsStyles.map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setFormData({ ...formData, lyricsStyle: style })}
                        className={`p-2 sm:p-3 rounded-xl text-sm sm:text-base transition-all duration-300 transform hover:scale-105
                          ${formData.lyricsStyle === style 
                            ? 'bg-purple-500 text-white shadow-lg' 
                            : 'bg-white/5 text-white hover:bg-white/10'}`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
  
                <div className="space-y-3 sm:space-y-4">
                  <label className="text-white text-base sm:text-lg font-medium">Your Vision</label>
                  <textarea
                    value={formData.userInput}
                    onChange={(e) => setFormData({ ...formData, userInput: e.target.value })}
                    placeholder="Describe your song idea..."
                    className="w-full h-24 sm:h-32 bg-white/5 text-white border-white/10 rounded-xl p-3 sm:p-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base"
                  />
                </div>
  
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3 sm:py-4 rounded-xl font-medium transition-all duration-300 hover:opacity-90 disabled:opacity-50 shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Your Lyrics...
                    </span>
                  ) : 'Generate Lyrics'}
                </button>
              </CardContent>
            </Card>
          </form>
        </div>
  
        {/* Display generated lyrics */}
        {generatedLyrics && (
          <div className="mb-8 sm:mb-12 animate-fade-in">
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
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 text-white text-sm sm:text-base"
                    >
                      <Download className="w-4 sm:w-5 h-4 sm:h-5" />
                      Download
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
                      <p 
                        key={index} 
                        className="text-white/90 leading-relaxed text-base sm:text-lg"
                      >
                        {cleanLine}
                      </p>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernLyricsGenerator;
