import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PartyPopper, Building } from 'lucide-react';
import { motion } from 'framer-motion';

export const ChoicePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-blue-500 to-blue-600 flex flex-col items-center justify-center px-4"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.4 }}
          className="bg-white rounded-full p-4 inline-block mb-6"
        >
          <PartyPopper className="w-12 h-12 text-blue-500" />
        </motion.div>
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-4xl font-bold text-white mb-4"
        >
          EventConnect
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-blue-100 text-lg mb-8"
        >
          Choose your account type
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        className="w-full max-w-md space-y-6"
      >
        {/* User Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/userlogin')}
          className="w-full bg-white text-blue-500 py-4 px-6 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-200 flex items-center justify-center space-x-3"
        >
          <PartyPopper className="w-6 h-6" />
          <span>I'm a User</span>
        </motion.button>

        {/* Organizer Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/orglogin')}
          className="w-full bg-yellow-500 text-white py-4 px-6 rounded-lg font-semibold hover:bg-yellow-600 transition-colors duration-200 flex items-center justify-center space-x-3"
        >
          <Building className="w-6 h-6" />
          <span>I'm an Organizer</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};