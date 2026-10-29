import React from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

export const GlobalLoadingIndicator: React.FC = () => {
  const { loading } = useApp();

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-amber-400 to-indigo-600 z-50 origin-left animate-pulse"
        />
      )}
    </AnimatePresence>
  );
};
