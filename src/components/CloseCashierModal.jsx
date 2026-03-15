import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const CloseCashierModal = ({ isOpen, onClose, onConfirm, session, currentBalance }) => {
  const [saldoFinal, setSaldoFinal] = useState('');
  const [observacoes, setObservacoes] = useState('');

  if (!isOpen || !session) return null;

  // Assuming currentBalance passed is calculated externally (initial + sales - withdrawals + supplies)
  // But wait, the prompt says "Total de Vendas" as a display field, and "Saldo Esperado".
  // Let's assume currentBalance IS the expected balance.
  // We can roughly calculate Total Sales = currentBalance - initialBalance (simplification for display)
  const totalVendas = Math.max(0, currentBalance - (session.saldo_inicial || 0));
  
  const diferenca = (parseFloat(saldoFinal) || 0) - currentBalance;

  const handleSubmit = (e) => {
    e.preventDefault();
    const saldo = parseFloat(saldoFinal);
    if (isNaN(saldo) || saldo < 0) return alert("Saldo final inválido.");

    onConfirm(saldo, observacoes);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#1a2332] rounded-xl border border-gray-700 shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="bg-[#2d3e52] p-4 border-b border-gray-600 flex justify-between items-center">
            <div className="flex items-center gap-2 text-white font-bold">
              <Lock className="w-5 h-5 text-red-500" />
              <span>FECHAR CAIXA</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            <div className="bg-[#2d3e52] rounded p-4 space-y-2 text-sm border border-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-400">Funcionário:</span>
                <span className="text-white font-bold">{session.funcionario?.nome || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Abertura:</span>
                <span className="text-white">{session.data_hora ? format(new Date(session.data_hora), 'HH:mm') : '-'}</span>
              </div>
              <div className="border-t border-gray-600 pt-2 flex justify-between">
                <span className="text-gray-400">Saldo Inicial:</span>
                <span className="text-white">R$ {Number(session.saldo_inicial).toFixed(2)}</span>
              </div>
               <div className="flex justify-between">
                <span className="text-gray-400">Total Vendas (Est.):</span>
                <span className="text-[#00d084]">R$ {totalVendas.toFixed(2)}</span>
              </div>
               <div className="flex justify-between font-bold text-base pt-1">
                <span className="text-white">Saldo Esperado:</span>
                <span className="text-[#00d084]">R$ {currentBalance.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block uppercase font-bold">Saldo Final (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={saldoFinal}
                onChange={(e) => setSaldoFinal(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#2d3e52] border border-gray-600 rounded px-3 py-2 text-white focus:border-[#00d084] focus:outline-none text-lg font-mono"
              />
            </div>

            <div className={`text-center p-2 rounded ${diferenca >= 0 ? 'bg-[#00d084]/10 text-[#00d084]' : 'bg-red-500/10 text-red-500'}`}>
              <span className="text-xs font-bold uppercase block">Diferença</span>
              <span className="font-mono font-bold text-lg">
                {diferenca > 0 ? '+' : ''}R$ {diferenca.toFixed(2)}
              </span>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block uppercase font-bold">Observações</label>
              <textarea
                rows="3"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full bg-[#2d3e52] border border-gray-600 rounded px-3 py-2 text-white resize-none focus:border-[#00d084] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <Button
                type="button"
                onClick={onClose}
                className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
              >
                CANCELAR
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-500/20"
              >
                FECHAR CAIXA
              </Button>
            </div>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CloseCashierModal;