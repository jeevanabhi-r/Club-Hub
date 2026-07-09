import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { BrandLogo } from "./BrandLogo";
import { 
  Search, 
  Moon, 
  Sun,
  X,
  Menu
} from "lucide-react";

interface NavbarProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  onMenuClick?: () => void;
}

export default function Navbar({ onSearch, searchQuery, onMenuClick }: NavbarProps) {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-40 flex h-20 w-full items-center justify-between px-4 md:px-6 border-b border-[#2A2A2A] bg-[#080808] backdrop-blur-md">
      {/* Brand Logo & Mobile Menu Hamburger (visible only on mobile) */}
      <div className="flex items-center md:hidden mr-4 shrink-0 gap-2">
        <button
          onClick={onMenuClick}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-[#151515] border border-[#2B2B2B] text-[#8A8A8A] hover:text-white focus:outline-none cursor-pointer"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <BrandLogo size="sm" />
      </div>

      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7A7A7A] pointer-events-none z-10" />
        <input
          type="text"
          placeholder="Search events, clubs, departments..."
          className="search-input w-full h-[48px] rounded-[14px] bg-[#151515] border border-[#2B2B2B] text-xs md:text-sm pl-14 pr-12 text-white placeholder-[#8A8A8A] focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/15 transition-all duration-200"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
        />
        {searchQuery && (
          <button 
            onClick={() => onSearch("")} 
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-[#FF6B00] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="hidden md:flex items-center space-x-3 md:space-x-4 ml-4 shrink-0">
        {/* Theme Toggle (Aesthetics) */}
        <button 
          onClick={toggleTheme}
          className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] bg-[#151515] border border-[#2B2B2B] text-zinc-400 hover:text-white hover:border-[#FF6B00] focus:outline-none transition-all duration-200"
          title="Toggle Theme"
        >
          {isDarkMode ? <Moon className="h-4 w-4 text-[#FF6B00]" /> : <Sun className="h-4 w-4" />}
        </button>
      </div>
    </nav>
  );
}
