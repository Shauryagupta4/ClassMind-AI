import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('pastelBrutal');

  useEffect(() => {
    document.body.className = 'theme-pastelBrutal';
  }, []);

  const pastelBrutalStyles = {
    bgMain: 'bg-[#FFF9F5]', // Creamy peach neo-brutalist canvas
    bgCard: 'bg-white',
    borderCard: 'border-4 border-black',
    textPrimary: 'text-black font-black',
    textSecondary: 'text-zinc-800 font-bold',
    accent: 'text-[#FF6584]', // Bubblegum pink accent
    accentBg: 'bg-[#FFCCD5]', // Soft pastel rose
    accentBorder: 'border-4 border-black',
    accentHover: 'hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all',
    cardClass: 'bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] rounded-2xl md:rounded-3xl hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_#000] transition-all duration-200',
    badgeClass: 'bg-[#FFF1C5] text-black border-2 border-black font-black uppercase tracking-wider text-xs shadow-[3px_3px_0px_#000] rounded-xl',
    pillClass: 'bg-[#E8D7F1] text-black border-2 border-black font-bold text-xs shadow-[2px_2px_0px_#000] rounded-xl',
    buttonTextClass: 'text-black font-black',
    iconContainerClass: 'bg-[#C7E9DE] border-4 border-black text-black rounded-3xl shadow-[5px_5px_0px_#000] rotate-[-2deg]',
    inputClass: 'bg-white border-4 border-black text-black font-bold placeholder-zinc-400 rounded-2xl shadow-[4px_4px_0px_#000] focus:outline-none focus:bg-[#FFF0F5] transition-all',
    buttonClass: 'px-8 py-4 bg-[#FFCCD5] text-black font-black uppercase tracking-widest text-sm rounded-2xl border-4 border-black shadow-[5px_5px_0px_0px_#000] hover:-translate-y-1 hover:bg-[#FFB3C1] hover:shadow-[7px_7px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-200',
    buttonSmallClass: 'px-4 py-2 bg-[#FFF1C5] text-black font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 hover:bg-[#FFE29A] hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-200',
  };

  const value = {
    theme: 'pastelBrutal',
    setTheme,
    styles: {
      pastelBrutal: pastelBrutalStyles,
    }
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
