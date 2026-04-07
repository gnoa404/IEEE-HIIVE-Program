/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Download, User, Image as ImageIcon, RefreshCw, Sparkles, AlertCircle, ZoomIn, Move } from 'lucide-react';

// The user provided a specific frame image with a white shape for the photo.
const FRAME_PATH = '/frame.png';

export default function App() {
  const [name, setName] = useState('');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [frameImage, setFrameImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [frameError, setFrameError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameImgRef = useRef<HTMLImageElement | null>(null);
  const userImgRef = useRef<HTMLImageElement | null>(null);

  // Load the frame image
  useEffect(() => {
    const img = new Image();
    img.src = FRAME_PATH;
    img.onload = () => {
      frameImgRef.current = img;
      setFrameImage(FRAME_PATH);
      drawCanvas();
    };
    img.onerror = () => {
      setFrameError(true);
    };
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use 1080x1080 as base resolution as requested
    const baseSize = 1080;
    canvas.width = baseSize;
    canvas.height = baseSize;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Coordinates for the photo window (based on the 1080x1080 canvas)
    const windowX = 100;
    const windowY = 185;
    const windowWidth = 880;
    const windowHeight = 545;
    const borderRadius = 28;

    // 1. Draw User Photo (First, so it's under the frame)
    if (userImgRef.current) {
      const img = userImgRef.current;
      
      ctx.save();
      // Create clipping path for the rounded window to ensure it doesn't leak outside
      ctx.beginPath();
      ctx.moveTo(windowX + borderRadius, windowY);
      ctx.lineTo(windowX + windowWidth - borderRadius, windowY);
      ctx.quadraticCurveTo(windowX + windowWidth, windowY, windowX + windowWidth, windowY + borderRadius);
      ctx.lineTo(windowX + windowWidth, windowY + windowHeight - borderRadius);
      ctx.quadraticCurveTo(windowX + windowWidth, windowY + windowHeight, windowX + windowWidth - borderRadius, windowY + windowHeight);
      ctx.lineTo(windowX + borderRadius, windowY + windowHeight);
      ctx.quadraticCurveTo(windowX, windowY + windowHeight, windowX, windowY + windowHeight - borderRadius);
      ctx.lineTo(windowX, windowY + borderRadius);
      ctx.quadraticCurveTo(windowX, windowY, windowX + borderRadius, windowY);
      ctx.closePath();
      ctx.clip();

      const imgAspect = img.width / img.height;
      const windowAspect = windowWidth / windowHeight;

      let drawWidth, drawHeight;

      if (imgAspect > windowAspect) {
        drawHeight = windowHeight * zoom;
        drawWidth = (img.width * (windowHeight / img.height)) * zoom;
      } else {
        drawWidth = windowWidth * zoom;
        drawHeight = (img.height * (windowWidth / img.width)) * zoom;
      }

      const offsetX = windowX + (windowWidth - drawWidth) / 2 + offset.x;
      const offsetY = windowY + (windowHeight - drawHeight) / 2 + offset.y;

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();
    } else {
      // Placeholder background for the window area if no photo
      ctx.fillStyle = '#0F1D33';
      ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
    }

    // 2. Draw Frame Overlay (On top of the photo)
    if (frameImgRef.current) {
      ctx.drawImage(frameImgRef.current, 0, 0, canvas.width, canvas.height);
    }

    // 3. Draw Name Text (On top of everything)
    if (name) {
      // Adjusted barY based on user feedback (moving it down by 5px from 685 to 690)
      const barX = 100;
      const barY = 690; 
      const barWidth = 880;
      const barHeight = 80;
      const centerX = barX + barWidth / 2;
      const centerY = barY + barHeight / 2; 

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Auto-shrink font size
      let fontSize = 52;
      ctx.font = `900 ${fontSize}px Orbitron`;
      
      // Measure text and shrink if needed
      while (ctx.measureText(name).width > barWidth - 60 && fontSize > 18) {
        fontSize--;
        ctx.font = `900 ${fontSize}px Orbitron`;
      }

      // Subtle shadow for depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillText(name, centerX, centerY);
      
      ctx.shadowBlur = 0;
    }
  }, [name, zoom, offset]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUserImage(dataUrl);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          userImgRef.current = img;
          drawCanvas();
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);
    setTimeout(() => {
      const link = document.createElement('a');
      const fileName = name ? `${name.replace(/\s+/g, '-').toLowerCase()}-HIIVE-Frame.png` : 'HIIVE-Frame.png';
      link.download = fileName;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      setIsGenerating(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-[#0A1628]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-6xl bg-[#0F1D33] rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-800"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Controls Section */}
          <div className="lg:col-span-5 p-8 lg:p-12 flex flex-col gap-8 bg-[#0A1628] text-white">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white font-orbitron">HIIVE GENERATOR</h1>
              </div>
              <p className="text-slate-400 font-orbitron text-xs uppercase tracking-widest">IEEE HIIVE Program</p>
            </div>

            <div className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-xs font-bold text-teal-400 flex items-center gap-2 uppercase tracking-widest font-orbitron">
                  <User className="w-4 h-4" /> Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="ENTER FULL NAME..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0F1D33] border border-slate-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-white placeholder:text-slate-600 font-orbitron"
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-teal-400 flex items-center gap-2 uppercase tracking-widest font-orbitron">
                  <ImageIcon className="w-4 h-4" /> Photo
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full px-4 py-6 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 group-hover:border-teal-500/50 transition-colors bg-[#0F1D33]/50">
                    <Upload className="w-6 h-6 text-slate-500 group-hover:text-teal-400 transition-colors" />
                    <span className="text-xs text-slate-500 group-hover:text-slate-300 font-orbitron">
                      {userImage ? 'CHANGE PHOTO' : 'UPLOAD PHOTO'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Adjustments */}
              {userImage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 p-4 bg-[#0F1D33] rounded-xl border border-slate-800"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-slate-500 font-orbitron uppercase tracking-widest">
                      <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Zoom</span>
                      <span>{Math.round(zoom * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="3" 
                      step="0.01" 
                      value={zoom} 
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-500 font-orbitron uppercase tracking-widest flex items-center gap-1"><Move className="w-3 h-3" /> X-Offset</span>
                      <input 
                        type="range" 
                        min="-300" 
                        max="300" 
                        value={offset.x} 
                        onChange={(e) => setOffset(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-500 font-orbitron uppercase tracking-widest flex items-center gap-1"><Move className="w-3 h-3 rotate-90" /> Y-Offset</span>
                      <input 
                        type="range" 
                        min="-300" 
                        max="300" 
                        value={offset.y} 
                        onChange={(e) => setOffset(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="mt-auto pt-8">
              <button
                onClick={handleDownload}
                disabled={!userImage || !frameImage || isGenerating}
                className={`w-full py-4 px-6 rounded-xl font-bold font-orbitron uppercase tracking-widest flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
                  !userImage || !frameImage || isGenerating
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20'
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download PNG
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-7 p-8 lg:p-12 bg-[#0F1D33] flex items-center justify-center relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-teal-500/5 blur-[120px] rounded-full pointer-events-none" />
            
            <div className="relative w-full aspect-square max-w-[600px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={userImage ? 'preview' : 'empty'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative z-10 w-full h-full rounded-3xl overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.8)] bg-[#0A1628] border border-slate-800"
                >
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain"
                  />
                </motion.div>
              </AnimatePresence>

              {/* IEEE Decorative Corner */}
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-teal-500/10 blur-3xl rounded-full" />
            </div>
          </div>
        </div>
      </motion.div>

      <footer className="mt-8 text-slate-600 text-[10px] font-orbitron uppercase tracking-[0.2em] flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <span>Powered by</span>
          <span className="font-bold text-teal-400">IEEE SIGHT Egypt Section</span>
        </div>
        <p className="opacity-50">Where Technology serves Humanity</p>
        <p className="mt-2 text-teal-500/60 font-bold">Designed by Omar Magdy</p>
      </footer>
    </div>
  );
}
