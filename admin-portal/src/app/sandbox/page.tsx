"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { League_Spartan, Prata } from "next/font/google";

const leagueSpartan = League_Spartan({ 
  subsets: ["latin"], 
  weight: ["400", "700", "800"] 
});

const prata = Prata({ 
  subsets: ["latin"], 
  weight: ["400"] 
});

export default function IDSandbox() {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  
  // 1. THE GACHA SIMULATOR
  // Change this number (1-6) to test different back designs!
  const [gachaVariant, setGachaVariant] = useState(1);
  
  // We now have TWO camera lenses: one for the front, one for the back
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    QRCode.toDataURL("ITMS-TEST89", { margin: 0, width: 200 }).then(setQrDataUrl);
  }, []);

  // 2. The Reusable Export Engine
  const exportCard = async (cardElement: HTMLDivElement | null, fileName: string) => {
    if (!cardElement) return;
    
    const dataUrl = await toPng(cardElement, { 
      cacheBust: true, 
      pixelRatio: 4 // Keeps the 300+ DPI quality
    });
    
    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  };

  // 3. Export Both Sequence
  const handleExportBoth = async () => {
    setIsExporting(true);
    try {
      await exportCard(frontCardRef.current, "Clark_Kent_Front.png");
      
      // A tiny delay ensures the browser doesn't block the second download
      setTimeout(async () => {
        await exportCard(backCardRef.current, `Clark_Kent_Back_v${gachaVariant}.png`);
        setIsExporting(false);
      }, 500);
      
    } catch (err) {
      console.error("Failed to export images", err);
      setIsExporting(false);
    }
  };

  return (
    <main className="p-4 md:p-8 min-h-screen flex flex-col bg-gray-900 text-white items-center">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-blue-400">ID Card Sandbox (Front & Back)</h1>
        <p className="text-sm text-gray-400 mt-2">Currently previewing Gacha Variant #{gachaVariant}</p>
        
        {/* Quick buttons to test your different back designs */}
        <div className="flex gap-2 justify-center mt-4">
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <button 
              key={num}
              onClick={() => setGachaVariant(num)}
              className={`px-3 py-1 rounded text-sm font-bold ${gachaVariant === num ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}
            >
              v{num}
            </button>
          ))}
        </div>
      </header>

      {/* THE CARDS CONTAINER */}
      <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
        
        {/* --- FRONT CARD --- */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-gray-400 font-bold tracking-widest text-sm">FRONT</span>
          <div 
            ref={frontCardRef}
            className="relative bg-white overflow-hidden shadow-2xl rounded-sm"
            style={{ width: "324px", height: "204px" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/id-front.jpg" alt="Front Background" className="absolute inset-0 w-full h-full object-cover z-0" />
            
            <div className="absolute z-10 top-[42px] left-[190px] flex flex-col gap-6">
              <p className={`text-sm text-black m-0 leading-none font-extrabold tracking-tight ${leagueSpartan.className}`}>Clark Kent</p>
              <p className={`text-sm text-black m-0 leading-none font-extrabold tracking-tight ${leagueSpartan.className}`}>10</p>
            </div>

            <div className="absolute z-10 bottom-[35px] left-[100px]">
               <p className={`text-sm tracking-[0.13em] text-black m-0 leading-none ${prata.className}`}>
                 ICMS-T-17FB26
               </p>
            </div>

            {qrDataUrl && (
              <div className="absolute z-10 top-[30px] left-[30px] w-[80px] h-[80px] bg-white p-1 rounded">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        </div>

        {/* --- BACK CARD (GACHA) --- */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-gray-400 font-bold tracking-widest text-sm text-yellow-500">BACK (Variant {gachaVariant})</span>
          <div 
            ref={backCardRef}
            className="relative bg-white overflow-hidden shadow-2xl rounded-sm"
            style={{ width: "324px", height: "204px" }}
          >
            {/* This image dynamically changes based on the Gacha roll!
              Make sure you have id-back-1.jpg through id-back-6.jpg in your public folder.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={`/id-back-${gachaVariant}.jpg`} 
              alt={`Back Background Variant ${gachaVariant}`} 
              className="absolute inset-0 w-full h-full object-cover z-0" 
            />
            
          </div>
        </div>

      </div>

      {/* Export Controls */}
      <div className="mt-12">
        <button 
          onClick={handleExportBoth}
          disabled={isExporting}
          className={`px-8 py-4 rounded-xl font-bold text-lg shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all ${
            isExporting ? "bg-gray-600 cursor-wait" : "bg-blue-600 hover:bg-blue-500 hover:scale-105"
          }`}
        >
          {isExporting ? "Processing High-Res Cards..." : "⬇️ Download Both Cards"}
        </button>
      </div>

    </main>
  );
}