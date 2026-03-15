import React, { useState, useEffect, useCallback } from 'react';
import { X, Wallet, ArrowUpCircle, ArrowDownCircle, DollarSign, Calculator, ShoppingCart, TrendingUp, CreditCard, Smartphone, FileText, Utensils } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCaixaMovimentacoes } from '@/hooks/useCaixaMovimentacoes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const CashSummaryModal = ({ isOpen, onClose, caixaId }) => {
  const { user } = useAuth();
  const { ensureCaixaExists } = useCaixaMovimentacoes();
  const [currentCaixaId, setCurrentCaixaId] = useState(caixaId);
  const [loading, setLoading] = useState(true);
  
  // State for all summary data
  const [summaryData, setSummaryData] = useState({
    salesCount: 0,
    totalSales: 0,
    totalCost: 0,
    profit: 0,
    payments: {
      dinheiro: 0,
      pix: 0,
      debito: 0,
      credito: 0,
      fiado: 0,
      consumo: 0
    },
    suprimentos: 0,
    retiradas: 0,
    saldoInicial: 0,
    saldoFinal: 0,
    history: []
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 1. Ensure Caixa ID
      let cid = currentCaixaId || caixaId;
      if (!cid) {
         const caixa = await ensureCaixaExists();
         if (caixa) {
           cid = caixa.id;
           setCurrentCaixaId(caixa.id);
         }
      }
      
      if (!cid) {
        setLoading(false);
        return;
      }

      // 2. Fetch Caixa Details (Saldo Inicial)
      const { data: caixaData } = await supabase
        .from('caixas')
        .select('saldo_inicial, created_at')
        .eq('id', cid)
        .single();

      const saldoInicial = parseFloat(caixaData?.saldo_inicial || 0);

      // 3. Fetch Sales Data (Today)
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date();
      todayEnd.setHours(23,59,59,999);

      const { data: vendas, error: vendasError } = await supabase
        .from('vendas')
        .select(`
          id, 
          total, 
          forma_pagamento, 
          itens_venda (
            valor_custo,
            quantidade
          )
        `)
        .eq('user_id', user.id)
        .gte('data_criacao', todayStart.toISOString())
        .lte('data_criacao', todayEnd.toISOString())
        .eq('status', 'concluido');

      if (vendasError) console.error("Error fetching vendas:", vendasError);

      // Calculate Sales Metrics
      let salesCount = vendas?.length || 0;
      let totalSales = 0;
      let totalCost = 0;
      const payments = { dinheiro: 0, pix: 0, debito: 0, credito: 0, fiado: 0, consumo: 0 };

      vendas?.forEach(venda => {
        totalSales += Number(venda.total);
        
        // Calculate cost from items
        if (venda.itens_venda) {
          venda.itens_venda.forEach(item => {
            totalCost += (Number(item.valor_custo || 0) * Number(item.quantidade || 0));
          });
        }

        // Aggregate payments
        const method = venda.forma_pagamento?.toLowerCase() || 'outros';
        if (method.includes('dinheiro')) payments.dinheiro += Number(venda.total);
        else if (method.includes('pix')) payments.pix += Number(venda.total);
        else if (method.includes('débito') || method.includes('debito')) payments.debito += Number(venda.total);
        else if (method.includes('crédito') || method.includes('credito')) payments.credito += Number(venda.total);
        else if (method.includes('fiado')) payments.fiado += Number(venda.total);
        else if (method.includes('consumo')) payments.consumo += Number(venda.total);
      });

      // 4. Fetch Movements (Suprimentos/Retiradas)
      const { data: movimentos, error: movError } = await supabase
        .from('caixa_movimentos')
        .select('*')
        .eq('caixa_id', cid)
        .order('data_movimentacao', { ascending: false });

      if (movError) console.error("Error fetching movimentos:", movError);

      let suprimentos = 0;
      let retiradas = 0;
      
      movimentos?.forEach(m => {
        if (m.tipo === 'suprimento') suprimentos += Number(m.valor);
        if (m.tipo === 'retirada') retiradas += Number(m.valor);
      });

      // 5. Final Calculation
      const profit = totalSales - totalCost;
      // FORMULA: Final = Initial + Sales + Supplies - Withdrawals
      const saldoFinal = saldoInicial + totalSales + suprimentos - retiradas;

      setSummaryData({
        salesCount,
        totalSales,
        totalCost,
        profit,
        payments,
        suprimentos,
        retiradas,
        saldoInicial,
        saldoFinal,
        history: movimentos?.slice(0, 20) || []
      });

    } catch (error) {
      console.error("Error loading summary:", error);
    } finally {
      setLoading(false);
    }
  }, [user, caixaId, currentCaixaId, ensureCaixaExists]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#1a2332] rounded-xl w-full max-w-5xl h-[90vh] flex flex-col border border-gray-700 shadow-2xl overflow-hidden"
      >
        {/* HEADER */}
        <div className="bg-[#232f3e] border-b border-gray-700 p-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#00d084]" />
              RESUMO DO CAIXA (F9)
            </h2>
            <p className="text-gray-400 text-xs mt-0.5 capitalize">
              {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 custom-scrollbar">
          
          {loading ? (
             <div className="flex items-center justify-center h-full text-gray-400 animate-pulse">Carregando dados...</div>
          ) : (
            <>
              {/* CARDS SUPERIORES */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard 
                  icon={<ShoppingCart className="w-6 h-6 text-white" />} 
                  title="VENDAS REALIZADAS" 
                  value={summaryData.salesCount} 
                  subText="Quantidade Total"
                  color="bg-[#3B82F6]" 
                  textColor="text-white"
                />
                <SummaryCard 
                  icon={<DollarSign className="w-6 h-6 text-white" />} 
                  title="TOTAL VENDIDO" 
                  value={formatCurrency(summaryData.totalSales)} 
                  subText="Faturamento Bruto"
                  color="bg-[#00d084]" 
                  textColor="text-white"
                />
                <SummaryCard 
                  icon={<TrendingUp className="w-6 h-6 text-white" />} 
                  title="LUCRO ESTIMADO" 
                  value={formatCurrency(summaryData.profit)} 
                  subText="Faturamento - Custo"
                  color="bg-[#60A5FA]" 
                  textColor="text-white"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: Payments & Operations */}
                <div className="lg:col-span-2 space-y-6">
                  
                  <div>
                    <h3 className="text-gray-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Detalhamento por Pagamento
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <PaymentCard icon={<DollarSign className="w-4 h-4" />} label="Dinheiro" value={summaryData.payments.dinheiro} color="border-[#00d084] text-[#00d084]" />
                      <PaymentCard icon={<Smartphone className="w-4 h-4" />} label="Pix" value={summaryData.payments.pix} color="border-[#3B82F6] text-[#3B82F6]" />
                      <PaymentCard icon={<CreditCard className="w-4 h-4" />} label="Débito" value={summaryData.payments.debito} color="border-[#8B5CF6] text-[#8B5CF6]" />
                      <PaymentCard icon={<CreditCard className="w-4 h-4" />} label="Crédito" value={summaryData.payments.credito} color="border-[#F97316] text-[#F97316]" />
                      <PaymentCard icon={<FileText className="w-4 h-4" />} label="Fiado" value={summaryData.payments.fiado} color="border-[#8B5CF6] text-[#8B5CF6]" />
                      <PaymentCard icon={<Utensils className="w-4 h-4" />} label="Consumo" value={summaryData.payments.consumo} color="border-[#F97316] text-[#F97316]" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-gray-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                      <Wallet className="w-4 h-4" /> Operações de Caixa
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#2a3a4a] p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="p-2 bg-[#00d084]/20 rounded-lg text-[#00d084]">
                             <ArrowUpCircle className="w-6 h-6" />
                           </div>
                           <div>
                             <span className="text-xs text-gray-400 block uppercase font-bold">Suprimentos</span>
                             <span className="text-xl font-bold text-[#00d084]">{formatCurrency(summaryData.suprimentos)}</span>
                           </div>
                         </div>
                      </div>
                      <div className="bg-[#2a3a4a] p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="p-2 bg-[#EF4444]/20 rounded-lg text-[#EF4444]">
                             <ArrowDownCircle className="w-6 h-6" />
                           </div>
                           <div>
                             <span className="text-xs text-gray-400 block uppercase font-bold">Retiradas</span>
                             <span className="text-xl font-bold text-[#EF4444]">{formatCurrency(summaryData.retiradas)}</span>
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* RIGHT: Final Result */}
                <div className="space-y-6">
                  <div className="bg-[#232f3e] rounded-xl border border-gray-700 overflow-hidden shadow-lg h-full">
                    <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                      <h3 className="font-bold text-white text-center">BALANÇO GERAL</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      <BalanceRow label="Saldo Inicial" value={summaryData.saldoInicial} />
                      <BalanceRow label="Total de Vendas" value={summaryData.totalSales} isPositive />
                      <BalanceRow label="Total Suprimentos" value={summaryData.suprimentos} isPositive />
                      <BalanceRow label="Total Retiradas" value={summaryData.retiradas} isNegative />
                      
                      <div className="pt-4 border-t border-gray-600 mt-4">
                        <span className="text-xs text-gray-400 uppercase font-bold text-center block mb-1">Saldo Final em Caixa</span>
                        <div className="bg-[#1a2332] rounded-lg p-4 border border-[#00d084]/30 text-center relative overflow-hidden group">
                           <div className="absolute inset-0 bg-[#00d084]/5 group-hover:bg-[#00d084]/10 transition-colors"></div>
                           <span className="text-3xl font-black text-[#00d084] relative z-10">
                             {formatCurrency(summaryData.saldoFinal)}
                           </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* HISTORY */}
              <div className="mt-6">
                <h3 className="text-gray-400 text-xs font-bold uppercase mb-3">Últimas Movimentações</h3>
                <div className="bg-[#2a3a4a] rounded-lg border border-gray-700 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#1f2937] text-gray-400 text-xs uppercase font-bold">
                      <tr>
                        <th className="px-4 py-3">Data/Hora</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Descrição</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                        <th className="px-4 py-3 text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-gray-300">
                      {summaryData.history.length > 0 ? (
                        summaryData.history.map((mov) => {
                          const isPositive = mov.tipo === 'suprimento' || mov.tipo === 'venda' || mov.tipo === 'abertura';
                          return (
                            <tr key={mov.id} className="hover:bg-[#374151] transition-colors">
                              <td className="px-4 py-3 font-mono text-xs">{format(new Date(mov.data_movimentacao), "dd/MM HH:mm", { locale: ptBR })}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                  {mov.tipo}
                                </span>
                              </td>
                              <td className="px-4 py-3 truncate max-w-[200px]">{mov.descricao || '-'}</td>
                              <td className={`px-4 py-3 text-right font-mono font-bold ${isPositive ? 'text-[#00d084]' : 'text-[#EF4444]'}`}>
                                {isPositive ? '+' : '-'} {formatCurrency(mov.valor)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-white">
                                {formatCurrency(mov.saldo_novo)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-4 py-8 text-center text-gray-500">Nenhuma movimentação registrada hoje.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>
      </motion.div>
    </div>
  );
};

const SummaryCard = ({ icon, title, value, subText, color, textColor }) => (
  <div className={`${color} rounded-lg p-5 shadow-lg relative overflow-hidden group`}>
    <div className="absolute right-0 top-0 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
      <div className="w-24 h-24 bg-white rounded-full"></div>
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-2 opacity-90">
        {icon}
        <span className={`text-xs font-bold uppercase tracking-wider ${textColor} opacity-80`}>{title}</span>
      </div>
      <div className={`text-3xl font-black ${textColor} mb-1`}>{value}</div>
      <div className={`text-[10px] ${textColor} opacity-70`}>{subText}</div>
    </div>
  </div>
);

const PaymentCard = ({ icon, label, value, color }) => (
  <div className={`bg-[#2a3a4a] border-l-4 ${color} p-3 rounded-r-lg shadow-sm flex flex-col justify-between h-20`}>
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-[10px] uppercase font-bold flex items-center gap-1">
        {icon} {label}
      </span>
    </div>
    <span className="text-lg font-bold text-white font-mono">
      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
    </span>
  </div>
);

const BalanceRow = ({ label, value, isPositive, isNegative }) => {
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  let colorClass = "text-white";
  let sign = "";
  if (isPositive) { colorClass = "text-[#00d084]"; sign = "+"; }
  if (isNegative) { colorClass = "text-[#EF4444]"; sign = "-"; }

  return (
    <div className="flex justify-between items-center border-b border-gray-700 pb-2 last:border-0 last:pb-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`font-mono font-bold ${colorClass}`}>
        {sign} {formatCurrency(value)}
      </span>
    </div>
  );
};

export default CashSummaryModal;