'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import supabase from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Compass, 
  Feather, 
  Star, 
  ArrowRight, 
  Menu, 
  X, 
  User as UserIcon,
  LogOut,
  Sparkles
} from 'lucide-react';

interface HomePageClientProps {
  user: User;
}

export default function HomePageClient({ user }: HomePageClientProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);
  const router = useRouter();

  const quotes = [
    "Ogni seme che pianti diventa parte del tuo paesaggio interiore.",
    "La scrittura non rivela chi sei. Ti trasforma in chi stai diventando.",
    "Nel silenzio tra le parole, nascono le verità più profonde.",
    "Il tuo libro vivente cresce con ogni respiro consapevole."
  ];

  const navigationItems = [
    {
      title: "Il Tuo Mandala",
      description: "Esplora i semi della tua crescita",
      icon: Compass,
      path: "/mandala",
      gradient: "from-purple-500 to-indigo-600"
    },
    {
      title: "Semina Nuove Parole",
      description: "Crea un nuovo capitolo",
      icon: Feather,
      path: "/scrivi?seme=sem_99",
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      title: "Giardino dei Ricordi",
      description: "Rileggi i tuoi capitoli",
      icon: BookOpen,
      path: "/archivio",
      gradient: "from-amber-500 to-orange-600"
    },
    {
      title: "Libro Vivente",
      description: "Il tuo percorso personale",
      icon: Star,
      path: "/libro",
      gradient: "from-rose-500 to-pink-600"
    },
    {
      title: "Percorsi",
      description: "Scopri e sblocca i tuoi archetipi",
      icon: Compass,
      path: "/percorsi",
      gradient: "from-blue-500 to-green-600"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [quotes.length]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-emerald-100/10 to-teal-100/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 p-6"
      >
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="flex items-center space-x-3"
          >
            <div className="text-2xl">🌿</div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              PROMETHEUS
            </h1>
          </motion.div>

          <div className="flex items-center space-x-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="hidden md:flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-white/50"
            >
              <UserIcon size={16} className="text-purple-600" />
              <span className="text-sm font-medium text-gray-700">
                {user.email?.split('@')[0]}
              </span>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/50 hover:bg-white/80 transition-all duration-200"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 right-6 z-30 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/50 min-w-[200px]"
          >
            <div className="space-y-2">
              <div className="md:hidden flex items-center space-x-2 p-2 border-b border-gray-100">
                <UserIcon size={16} className="text-purple-600" />
                <span className="text-sm font-medium text-gray-700">
                  {user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 w-full p-2 text-left hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={16} className="text-red-500" />
                <span className="text-sm text-red-600">Esci</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-16 space-y-8"
          >
            <div className="space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
                className="text-6xl mb-4"
              >
                ✨
              </motion.div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
                Benvenuto nel tuo
                <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Libro Vivente
                </span>
              </h2>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2, delay: 0.8 }}
                className="h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent max-w-md mx-auto"
              />
            </div>

            {/* Rotating Quotes */}
            <div className="h-20 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuote}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.8 }}
                  className="text-center max-w-2xl"
                >
                  <blockquote className="text-lg md:text-xl text-gray-600 italic leading-relaxed">
                    "{quotes[currentQuote]}"
                  </blockquote>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Navigation Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
          >
            {navigationItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(item.path)}
                  className="group cursor-pointer"
                >
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 h-full">
                    <div className="flex items-start justify-between">
                      <div className="space-y-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${item.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                          <IconComponent size={24} className="text-white" />
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-gray-600 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      
                      <motion.div
                        initial={{ x: 0 }}
                        whileHover={{ x: 5 }}
                        className="text-gray-400 group-hover:text-purple-600 transition-colors mt-2"
                      >
                        <ArrowRight size={20} />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Bottom Inspiration */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-center mt-16 space-y-4"
          >
            <div className="flex items-center justify-center space-x-2 text-purple-600">
              <Sparkles size={16} />
              <span className="text-sm font-medium">Il tuo viaggio inizia ora</span>
              <Sparkles size={16} />
            </div>
            <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
              Ogni scelta che fai qui plasma il tuo percorso di crescita. 
              Non c'è fretta, solo presenza.
            </p>
          </motion.div>

        </div>
      </div>
    </div>
  );
}