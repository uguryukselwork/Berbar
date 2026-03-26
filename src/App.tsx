import { useState, useRef } from 'react';
import { Upload, Camera, Download, Scissors, Loader2, Box } from 'lucide-react';
import { uploadImage } from './lib/supabase';

const HAIRSTYLES = [
  'Fade',
  'Buzz Cut',
  'Undercut',
  'Pompadour',
  'Crew Cut',
  'Side Part',
  'Mohawk',
  'Long Waves',
];

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [selectedHairstyle, setSelectedHairstyle] = useState<string>('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [is3DView, setIs3DView] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setIsUploading(true);
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        const url = await uploadImage(file);
        setUploadedImageUrl(url);
        setResultImage(null);
      } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload image. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const processHairstyle = async () => {
    if (!uploadedImageUrl || !selectedHairstyle) return;

    setIsProcessing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/style-preview`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: uploadedImageUrl,
            hairstyle: selectedHairstyle,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error('API request failed');
      }

      const data = await response.json();

      if (data.success && data.image_url) {
        setResultImage(data.image_url);
      } else {
        alert(data.error || 'Failed to process image. Please try again.');
      }
    } catch (error) {
      console.error('Error processing hairstyle:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;

    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `hairstyle-preview-${selectedHairstyle.toLowerCase().replace(' ', '-')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetApp = () => {
    setSelectedImage(null);
    setUploadedImageUrl(null);
    setSelectedHairstyle('');
    setResultImage(null);
    setIs3DView(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-amber-500/20 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Scissors className="w-8 h-8 text-amber-500" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-amber-300 bg-clip-text text-transparent">
              StylePreview
            </h1>
          </div>
          <p className="text-zinc-400 mt-2">Transform your look with AI-powered hairstyle previews</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!selectedImage ? (
          /* Upload Section */
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full max-w-2xl border-2 border-dashed rounded-xl p-12 transition-all ${
                isDragging
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-zinc-700 bg-zinc-900/50'
              }`}
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
                  {isUploading ? (
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                  ) : (
                    <Upload className="w-10 h-10 text-amber-500" />
                  )}
                </div>

                <div className="text-center">
                  <h2 className="text-2xl font-semibold mb-2">
                    {isUploading ? 'Uploading...' : 'Upload Your Photo'}
                  </h2>
                  <p className="text-zinc-400">
                    {isUploading ? 'Please wait while we upload your image' : 'Drag and drop your photo here, or use the buttons below'}
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-5 h-5" />
                    Choose File
                  </button>

                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-amber-500/30 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-5 h-5" />
                    Take Photo
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Preview and Results Section */
          <div className="space-y-8">
            {/* Hairstyle Selector */}
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <h2 className="text-xl font-semibold mb-4 text-amber-500">Choose a Hairstyle</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {HAIRSTYLES.map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedHairstyle(style)}
                    disabled={isProcessing}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      selectedHairstyle === style
                        ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/30'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {style}
                  </button>
                ))}
              </div>

              {selectedHairstyle && !resultImage && (
                <button
                  onClick={processHairstyle}
                  disabled={isProcessing}
                  className="mt-6 w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing Your New Look...
                    </>
                  ) : (
                    <>
                      <Scissors className="w-5 h-5" />
                      Apply {selectedHairstyle}
                    </>
                  )}
                </button>
              )}
            </div>

            {/* 3D View Toggle */}
            {resultImage && (
              <div className="flex justify-center">
                <button
                  onClick={() => setIs3DView(!is3DView)}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-amber-500/30 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                >
                  <Box className="w-5 h-5" />
                  {is3DView ? 'Switch to 2D View' : 'Switch to 3D View'}
                </button>
              </div>
            )}

            {/* Before/After Display */}
            <div className={`grid gap-6 ${is3DView ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
              {!is3DView && (
                <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                  <h3 className="text-lg font-semibold mb-4 text-amber-500">Before</h3>
                  <div className="relative rounded-lg overflow-hidden bg-zinc-800">
                    <img
                      src={selectedImage}
                      alt="Original"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}

              {/* After */}
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                <h3 className="text-lg font-semibold mb-4 text-amber-500">
                  {is3DView ? '3D Interactive View' : 'After'}
                </h3>
                <div className={`relative rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center ${is3DView ? 'aspect-video' : 'aspect-square'}`}>
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                      <p className="text-zinc-400">Creating your new look...</p>
                    </div>
                  ) : resultImage ? (
                    <div className={`relative w-full h-full ${is3DView ? 'perspective-3d' : ''}`}>
                      <img
                        src={resultImage}
                        alt="Result"
                        className={`w-full h-full object-cover transition-all duration-700 ${
                          is3DView ? 'transform-3d hover:scale-110' : ''
                        }`}
                        style={is3DView ? {
                          transform: 'rotateY(0deg)',
                          transformStyle: 'preserve-3d',
                        } : undefined}
                      />
                      {is3DView && (
                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                      )}
                    </div>
                  ) : (
                    <p className="text-zinc-500">Select a hairstyle to preview</p>
                  )}
                </div>
                {is3DView && resultImage && (
                  <p className="text-center text-zinc-500 text-sm mt-4">
                    Hover over the image to interact
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              {resultImage && (
                <button
                  onClick={downloadResult}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Result
                </button>
              )}

              <button
                onClick={resetApp}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-semibold rounded-lg transition-colors"
              >
                Try Another Photo
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-6 border-t border-zinc-800 text-center text-zinc-500">
        <p>Powered by AI Technology • StylePreview 2026</p>
      </footer>
    </div>
  );
}

export default App;
