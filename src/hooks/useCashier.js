import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useCashier = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cashierSession, setCashierSession] = useState(null);
  const [loading, setLoading] = useState(false);

  const getCurrentCashierSession = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Find the last movement. If it's 'abertura', the cashier is open.
      // Using maybeSingle() to avoid "0 rows" error when no session exists
      const { data, error } = await supabase
        .from('caixa_movimentacoes')
        .select(`
          *,
          funcionario:funcionarios(nome)
        `)
        .eq('user_id', user.id)
        .order('data_hora', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data && data.tipo === 'abertura') {
        setCashierSession(data);
      } else {
        setCashierSession(null);
      }
    } catch (err) {
      console.error('Error fetching cashier session:', err);
      // Don't show toast for "no rows" if it's just empty, but maybeSingle handles that.
      // Only show error if it's a real error
      if (err.code !== 'PGRST116') { // PGRST116 is the "0 rows" error code, but maybeSingle prevents it.
         toast({
          title: 'Erro ao verificar status do caixa',
          description: 'Não foi possível verificar se o caixa está aberto.',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const openCashier = async (funcionarioId, saldoInicial, observacoes) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('caixa_movimentacoes')
        .insert([{
          user_id: user.id,
          funcionario_id: funcionarioId,
          tipo: 'abertura',
          saldo_inicial: saldoInicial,
          observacoes,
          data_hora: new Date().toISOString()
        }])
        .select(`
          *,
          funcionario:funcionarios(nome)
        `)
        .maybeSingle(); // Use maybeSingle for safety

      if (error) throw error;
      if (!data) throw new Error("Falha ao abrir caixa: Nenhum dado retornado.");

      setCashierSession(data);
      toast({
        title: `Caixa aberto por ${data.funcionario?.nome || 'Funcionário'}`,
        className: 'bg-[#00d084] text-white border-none'
      });
      return data;
    } catch (err) {
      console.error('Error opening cashier:', err);
      toast({
        title: 'Erro ao abrir caixa',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    }
  };

  const closeCashier = async (saldoFinal, observacoes) => {
    if (!user || !cashierSession) return;
    try {
      const { data, error } = await supabase
        .from('caixa_movimentacoes')
        .insert([{
          user_id: user.id,
          funcionario_id: cashierSession.funcionario_id,
          tipo: 'fechamento',
          saldo_inicial: cashierSession.saldo_inicial,
          saldo_final: saldoFinal,
          observacoes,
          data_hora: new Date().toISOString()
        }])
        .select(`
           *,
           funcionario:funcionarios(nome)
        `)
        .maybeSingle(); // Use maybeSingle for safety

      if (error) throw error;
      if (!data) throw new Error("Falha ao fechar caixa: Nenhum dado retornado.");

      const employeeName = data.funcionario?.nome || cashierSession.funcionario?.nome || 'Funcionário';
      setCashierSession(null);
      toast({
        title: `Caixa fechado por ${employeeName}`,
        className: 'bg-[#00d084] text-white border-none'
      });
      return data;
    } catch (err) {
      console.error('Error closing cashier:', err);
      toast({
        title: 'Erro ao fechar caixa',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    }
  };

  return {
    cashierSession,
    loading,
    getCurrentCashierSession,
    openCashier,
    closeCashier
  };
};