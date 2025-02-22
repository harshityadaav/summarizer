'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FaBars, FaSignOutAlt } from 'react-icons/fa'; // Import hamburger menu and logout icons

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // State for mobile menu

  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  // Check if the user is logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };

    checkUser();
  }, [pathname]);

  // Handle scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header
      className={`bg-white shadow-md p-4 px-6 flex justify-between items-center fixed top-0 left-0 right-0 transition-transform duration-300 ${
        isVisible ? 'transform translate-y-0' : 'transform -translate-y-full'
      }`}
    >
      {/* Logo */}
      <h1 className="text-lg md:text-xl font-bold text-indigo-600">Summarizer</h1>

      {/* Hamburger Menu (Mobile) */}
      <div className="md:hidden">
        <button onClick={toggleMenu} className="focus:outline-none">
          <FaBars className="text-indigo-600 text-2xl" />
        </button>
      </div>

      {/* Logout Button (Visible on Desktop and Mobile when Menu is Open) */}
      {isLoggedIn && (
        <div
          className={`${
            isMenuOpen ? 'block' : 'hidden'
          } md:block absolute md:static top-16 right-4 bg-white md:bg-transparent shadow-md md:shadow-none rounded-md p-2 md:p-0`}
        >
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-3 py-1 md:px-4 md:py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm md:text-base flex items-center gap-2"
          >
            <FaSignOutAlt className="text-lg" /> {/* Logout Icon */}
            <span>Logout</span> {/* Logout Text */}
          </button>
        </div>
      )}
    </header>
  );
}