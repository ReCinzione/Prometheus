'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function AuthCodeErrorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-2xl bg-white/80 backdrop-blur-sm">
        <CardContent className="p-8 text-center space-y-6">
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="mx-auto w-16 h-16 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center"
          >
            <AlertTriangle className="w-8 h-8 text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h1 className="text-2xl font-bold text-gray-800">
              Errore di Autenticazione
            </h1>
            <p className="text-gray-600 leading-relaxed">
              Si &egrave; verificato un problema durante l&apos;accesso. 
              Questo pu&ograve; accadere se il link &egrave; scaduto o se ci sono stati problemi di connessione.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <Button 
              onClick={() => router.push('/login')}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium py-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Riprova l&apos;Accesso
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full border-gray-300 hover:bg-gray-50 font-medium py-3 rounded-xl transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla Home
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="pt-4 border-t border-gray-200"
          >
            <p className="text-sm text-gray-500">
              Se il problema persiste, prova a cancellare i cookie del browser o contatta il supporto.
            </p>
          </motion.div>

        </CardContent>
      </Card>
    </div>
  );
}