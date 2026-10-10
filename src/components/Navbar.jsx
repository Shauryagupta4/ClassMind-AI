import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, User, LogOut, Sparkles, FolderArchive, Shield } from 'lucide-react';

export default function Navbar({ onOpenAuth, onOpenHistory, onResetHome, savedCount = 0 }) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#FFF9F5]/90 backdrop-blur-md border-b-4 border-black px-4 md:px-8 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div 
          onClick={onResetHome}
          className="flex items-center gap-2 cursor-pointer select-none group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#FFCCD5] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center font-black text-black group-hover:rotate-6 transition-transform">
            ⚡
          </div>
          <span className="text-xl md:text-2xl font-black uppercase tracking-tight text-black">
            ClassMind <span className="bg-[#FFCCD5] px-1.5 py-0.5 border-2 border-black rounded-lg text-xs md:text-sm font-black shadow-[2px_2px_0px_#000]">AI</span>
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Saved Vault Button */}
          <button
            onClick={onOpenHistory}
            className="px-3 md:px-4 py-2 rounded-xl bg-white border-2 border-black text-xs font-mono font-black uppercase tracking-wider text-black shadow-[2px_2px_0px_#000] hover:bg-[#FFF1C5] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <FolderArchive className="w-4 h-4 text-black" />
            <span className="hidden sm:inline">Revision Vault</span>
            {savedCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#FFCCD5] border border-black rounded-full text-[10px]">
                {savedCount}
              </span>
            )}
          </button>

          {/* User Profile / Auth Button */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="px-3 md:px-4 py-2 rounded-xl bg-[#C7E9DE] border-2 border-black text-xs font-mono font-black uppercase tracking-wider text-black shadow-[2px_2px_0px_#000] hover:bg-[#b2e0d3] hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-black" />
                <span className="max-w-[100px] truncate hidden md:inline">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Scholar'}
                </span>
                <span className="text-[10px] bg-black/10 px-1 py-0.5 rounded">▼</span>
              </button>

              {menuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 bg-white border-3 border-black rounded-2xl p-2 shadow-[4px_4px_0px_#000] z-50 flex flex-col gap-1"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b-2 border-black/10 mb-1">
                    <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Logged in as</p>
                    <p className="text-xs font-black text-black truncate">{user.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenHistory();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-black hover:bg-[#FFF1C5] rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>My Saved Notes</span>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onResetHome?.();
                      signOut();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-[#FFCCD5] rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 md:px-4 py-2 rounded-xl bg-[#FFCCD5] border-2 border-black text-xs font-mono font-black uppercase tracking-wider text-black shadow-[2px_2px_0px_#000] hover:bg-[#ffb3c1] hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-black" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
