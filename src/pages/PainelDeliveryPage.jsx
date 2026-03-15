import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { AlertTriangle, CheckCircle2, Copy, Link2, Package, ShoppingBag } from 'lucide-react';
import ModuleShell from '@/components/delivery/ModuleShell';
import MetricCard from '@/components/delivery/MetricCard';
import PanelCard from '@/components/delivery/PanelCard';
import StatusBadge from '@/components/delivery/StatusBadge';
import { Button } from '@/components/ui/button';
import { useDeliveryHub } from '@/hooks/useDeliveryHub';
import { deliveryFormatting } from '@/services/deliveryHubService';
import {
  instaDeliveryOrigemMap,
  instaDeliveryPaymentMap,
  instaDeliveryStatusMap,
  mapInstaDeliveryPayload,
} from '@/services/instaDeliveryService';

const samplePayload = JSON.stringify(
  {
    order_id: 123,
    status: 1,
    origem: 1,
    store_id: 179734,
    cadastro_nacional: '13667295000104',
    data_venda: '2028-11-01 19:23:17',
    valor_venda: '278',
    observacoes_venda: null,
    forma_pagamento: ['01'],
    valor_pago: [278],
    valor_troco: 0,
    nome_destinatario: 'Joao da Silva',
    telefone_destinatario: '11999999999',
    codigo_parceiro: 99999,
    cadastro_nacional_destinatario: '09312085999',
    codigo_item: [1065505, 1066300],
    quantidade_item: [1, 6],
    valor_unitario_item: ['18', '50'],
    valor_total_item: ['18', '300'],
    descricao_item: ['PIZZAILO DE FRANGO', 'item grupo 5'],
    grupo_item: ['Bebidas', 'Lanches'],
    ncm_item: [null, null],
    valor_desconto: 60,
    desconto_real: true,
    valor_acrescimo: '0',
    cep_destinatario: '8123884',
    bairro_destinatario: 'Bairro exemplo',
    logradouro_destinatario: 'Endereco exemplo',
    numero_destinatario: 552,
    complemento_destinatario: 'Complemento exemplo',
    valor_taxa: '20',
    cidade: 'Sorocaba',
    codigo_externo_item: ['123', '345', '678'],
    agendamento: 'Dia 10/07 - 19:00 as 19:20',
    referencia: 'Atras da padaria',
  },
  null,
  2,
);

const PainelDeliveryPage = () => {
  const { snapshot, saveAppSettings, createDeliveryOrder, updateOrderStatus } = useDeliveryHub();
  const appInfo = snapshot.settings?.appInfo || {};
  const [configDraft, setConfigDraft] = useState({
    businessId: appInfo.instaBusinessId || '',
    webhookUrl: appInfo.instaWebhookUrl || '',
    webhookUrl2: appInfo.instaWebhookUrl2 || '',
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState('');
  const [payloadText, setPayloadText] = useState(samplePayload);
  const [importResult, setImportResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const suggestedWebhook = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/api/webhooks/instadelivery`;
  }, []);

  useEffect(() => {
    setConfigDraft({
      businessId: appInfo.instaBusinessId || '',
      webhookUrl: appInfo.instaWebhookUrl || '',
      webhookUrl2: appInfo.instaWebhookUrl2 || '',
    });
  }, [appInfo.instaBusinessId, appInfo.instaWebhookUrl, appInfo.instaWebhookUrl2]);

  const instaOrders = useMemo(
    () => snapshot.orders.filter((order) => order.origem === 'instadelivery'),
    [snapshot.orders],
  );
  const totalInsta = instaOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = instaOrders.filter(
    (order) => String(order.createdAt || '').slice(0, 10) === todayKey,
  ).length;
  const lastOrder = instaOrders[0];

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setConfigMessage('');
    try {
      await saveAppSettings({
        instaBusinessId: String(configDraft.businessId || '').trim(),
        instaWebhookUrl: String(configDraft.webhookUrl || '').trim(),
        instaWebhookUrl2: String(configDraft.webhookUrl2 || '').trim(),
      });
      setConfigMessage('Configuracao salva com sucesso.');
    } catch (error) {
      setConfigMessage(error.message || 'Falha ao salvar configuracao.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCopy = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setConfigMessage('Link copiado.');
      setTimeout(() => setConfigMessage(''), 1600);
    } catch (error) {
      setConfigMessage('Nao foi possivel copiar o link.');
    }
  };

  const handleImportPayload = async () => {
    setIsImporting(true);
    setImportResult(null);
    try {
      const parsed = JSON.parse(payloadText);
      const mapped = mapInstaDeliveryPayload(parsed, snapshot.products);
      let order = await createDeliveryOrder(mapped.payload);
      if (mapped.status && mapped.status !== 'Novo pedido') {
        order = await updateOrderStatus(order.id, mapped.status);
      }
      setImportResult({
        type: 'success',
        order,
        warnings: mapped.warnings,
      });
    } catch (error) {
      setImportResult({ type: 'error', message: error.message || 'Falha ao importar pedido.' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <ModuleShell
      title="Painel de Delivery"
      subtitle="Integre pedidos do InstaDelivery via webhook e registre tudo no hub de pedidos."
    >
      <Helmet>
        <title>Painel de Delivery - PedidoFlow</title>
      </Helmet>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pedidos InstaDelivery" value={instaOrders.length} />
        <MetricCard label="Pedidos hoje" value={todayCount} />
        <MetricCard label="Valor total" value={deliveryFormatting.formatCurrency(totalInsta)} />
        <MetricCard label="Ultimo pedido" value={lastOrder ? `#${lastOrder.numero}` : '-'} />
      </div>

      <PanelCard
        title="Configuracao do InstaDelivery"
        subtitle="Cadastre o webhook do parceiro e salve o ID do negocio."
        className="mt-6"
      >
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-3 rounded-xl border border-[var(--layout-border)] bg-[var(--layout-surface-2)] p-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--layout-text-muted)]">
                ID do negocio
              </label>
              <input
                value={configDraft.businessId}
                onChange={(event) =>
                  setConfigDraft((current) => ({ ...current, businessId: event.target.value }))
                }
                placeholder="Ex: 179734"
                className="mt-2 w-full rounded-lg border border-[var(--layout-border)] bg-[var(--layout-bg)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--layout-accent)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--layout-text-muted)]">
                Webhook do parceiro
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex min-h-[44px] flex-1 items-center gap-2 rounded-lg border border-[var(--layout-border)] bg-[var(--layout-bg)] px-3">
                  <Link2 className="h-4 w-4 text-[var(--layout-accent)]" />
                  <input
                    value={configDraft.webhookUrl}
                    onChange={(event) =>
                      setConfigDraft((current) => ({ ...current, webhookUrl: event.target.value }))
                    }
                    placeholder="https://seu-dominio.com/api/webhooks/instadelivery"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--layout-text-muted)]"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleCopy(configDraft.webhookUrl)}
                  disabled={!configDraft.webhookUrl}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--layout-text-muted)]">
                Webhook 2 (opcional)
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex min-h-[44px] flex-1 items-center gap-2 rounded-lg border border-[var(--layout-border)] bg-[var(--layout-bg)] px-3">
                  <Link2 className="h-4 w-4 text-[var(--layout-accent)]" />
                  <input
                    value={configDraft.webhookUrl2}
                    onChange={(event) =>
                      setConfigDraft((current) => ({ ...current, webhookUrl2: event.target.value }))
                    }
                    placeholder="https://backup.seu-dominio.com/api/webhooks/instadelivery"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--layout-text-muted)]"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleCopy(configDraft.webhookUrl2)}
                  disabled={!configDraft.webhookUrl2}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="bg-[var(--layout-accent)] text-white hover:bg-[var(--layout-accent-strong)]"
              >
                {savingConfig ? 'Salvando...' : 'Salvar configuracao'}
              </Button>
              {suggestedWebhook ? (
                <Button variant="outline" onClick={() => handleCopy(suggestedWebhook)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar URL sugerida
                </Button>
              ) : null}
            </div>
            {configMessage ? (
              <div className="text-xs text-[var(--layout-text-muted)]">{configMessage}</div>
            ) : null}
          </div>

          <div className="flex h-full flex-col justify-between rounded-xl border border-[var(--layout-border)] bg-[var(--layout-surface-2)] p-5">
            <div className="flex items-start gap-3">
              {configDraft.webhookUrl ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              )}
              <div>
                <div className="text-sm font-semibold text-white">Status da integracao</div>
                <div className="text-xs text-[var(--layout-text-muted)]">
                  {configDraft.webhookUrl
                    ? 'Webhook cadastrado e pronto para receber pedidos.'
                    : 'Informe o webhook do parceiro para ativar a integracao.'}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs text-[var(--layout-text-muted)]">
              <div>
                URL sugerida: <strong className="text-white">{suggestedWebhook || '-'}</strong>
              </div>
              <div>
                Dica: o webhook precisa ser um endpoint backend que receba o JSON e envie para este painel.
              </div>
            </div>
          </div>
        </div>
      </PanelCard>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <PanelCard
          title="Simular recebimento"
          subtitle="Cole o JSON enviado pelo InstaDelivery e importe para o hub."
        >
          <div className="space-y-3">
            <textarea
              rows={18}
              value={payloadText}
              onChange={(event) => setPayloadText(event.target.value)}
              className="w-full rounded-xl border border-[var(--layout-border)] bg-[var(--layout-bg)] p-4 font-mono text-xs text-white outline-none focus:border-[var(--layout-accent)]"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleImportPayload}
                className="bg-[var(--layout-accent)] text-white hover:bg-[var(--layout-accent-strong)]"
                disabled={isImporting}
              >
                {isImporting ? 'Importando...' : 'Importar pedido'}
              </Button>
              <Button variant="outline" onClick={() => setPayloadText(samplePayload)}>
                Restaurar exemplo
              </Button>
            </div>
            {importResult ? (
              <div
                className={`rounded-xl border p-4 text-sm ${
                  importResult.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                }`}
              >
                {importResult.type === 'success' ? (
                  <div className="space-y-2">
                    <div className="font-semibold">
                      Pedido #{importResult.order?.numero} importado com sucesso.
                    </div>
                    {importResult.warnings?.length ? (
                      <div className="text-xs text-amber-100">
                        {importResult.warnings.map((warning) => (
                          <div key={warning}>{warning}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div>{importResult.message}</div>
                )}
              </div>
            ) : null}
          </div>
        </PanelCard>

        <PanelCard title="Mapeamentos" subtitle="Status, origem e forma de pagamento do InstaDelivery.">
          <div className="space-y-4 text-sm text-[var(--layout-text-muted)]">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--layout-text-muted)]">
                Status
              </div>
              <div className="space-y-2">
                {instaDeliveryStatusMap.map((item) => (
                  <div
                    key={item.value}
                    className="flex items-center justify-between rounded-lg bg-[var(--layout-surface-2)] px-3 py-2 text-white"
                  >
                    <span>
                      {item.value} - {item.label}
                    </span>
                    <span className="text-xs text-[var(--layout-text-muted)]">{item.internal}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--layout-text-muted)]">
                Origem
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {Object.entries(instaDeliveryOrigemMap).map(([value, label]) => (
                  <div
                    key={value}
                    className="rounded-lg bg-[var(--layout-surface-2)] px-3 py-2 text-white"
                  >
                    {value} - {label}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--layout-text-muted)]">
                Formas de pagamento
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {Object.entries(instaDeliveryPaymentMap).map(([value, label]) => (
                  <div
                    key={value}
                    className="rounded-lg bg-[var(--layout-surface-2)] px-3 py-2 text-white"
                  >
                    {value.padStart(2, '0')} - {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PanelCard>
      </div>

      <PanelCard
        title="Pedidos recebidos"
        subtitle="Ultimos pedidos importados do InstaDelivery."
        className="mt-6"
      >
        <div className="space-y-3">
          {instaOrders.length === 0 ? (
            <div className="rounded-xl border border-[var(--layout-border)] bg-[var(--layout-surface-2)] p-5 text-sm text-[var(--layout-text-muted)]">
              Nenhum pedido InstaDelivery recebido ainda.
            </div>
          ) : null}
          {instaOrders.slice(0, 6).map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-[var(--layout-border)] bg-[var(--layout-surface-2)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">
                  Pedido #{order.numero} • {order.cliente}
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-2 grid gap-2 text-xs text-[var(--layout-text-muted)] md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-[var(--layout-accent)]" />
                  {deliveryFormatting.formatCurrency(order.total)}
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-[var(--layout-accent)]" />
                  {order.itens.length} itens
                </div>
                <div>Forma de pagamento: {order.forma_pagamento || 'Nao informado'}</div>
                <div>Endereco: {order.endereco || 'Nao informado'} - {order.bairro || ''}</div>
              </div>
              {order.observacoes ? (
                <div className="mt-2 text-xs text-[var(--layout-text-muted)]">
                  Observacoes: {order.observacoes}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </PanelCard>
    </ModuleShell>
  );
};

export default PainelDeliveryPage;
