import { useState } from 'react';
import { useAiReports, useGenerateReport, useDeleteReport } from '@/hooks/useSmartFeatures';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, FileText, Loader2, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const periodLabels: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
};

const AiReportsPanel = () => {
  const { data: reports, isLoading } = useAiReports();
  const generateMut = useGenerateReport();
  const deleteMut = useDeleteReport();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState(7);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMut.mutate(id, {
      onSuccess: () => {
        toast.success('Relatório excluído');
        if (selectedReport === id) setSelectedReport(null);
      },
      onError: () => toast.error('Erro ao excluir relatório'),
    });
  };

  const handleGenerate = (days: number) => {
    setActivePeriod(days);
    generateMut.mutate(days, {
      onSuccess: () => toast.success('Relatório gerado com sucesso!'),
      onError: () => toast.error('Erro ao gerar relatório'),
    });
  };

  const selectedData = reports?.find(r => r.id === selectedReport);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Brain className="h-5 w-5 text-accent" />
            Relatórios Inteligentes
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Análise com IA comparando períodos e sugerindo melhorias
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { days: 7, label: '7 dias' },
            { days: 15, label: '15 dias' },
            { days: 30, label: '30 dias' },
          ].map(p => (
            <Button
              key={p.days}
              size="sm"
              variant="outline"
              disabled={generateMut.isPending}
              onClick={() => handleGenerate(p.days)}
              className="gap-1 text-xs"
            >
              {generateMut.isPending && activePeriod === p.days && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              <FileText className="h-3 w-3" />
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
        </div>
      ) : !reports?.length ? (
        <div className="text-center py-12 card-cinematic rounded-xl">
          <Brain className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum relatório gerado ainda</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Gere seu primeiro relatório clicando acima</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Report list */}
          <div className="space-y-2">
            {reports.map(report => {
              const metrics = report.metrics as any;
              const growth = metrics?.growth || 0;
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-300 ${
                    selectedReport === report.id
                      ? 'ring-1 ring-accent/50'
                      : 'hover:bg-muted/30'
                  }`}
                  style={selectedReport === report.id ? {
                    background: 'linear-gradient(135deg, hsl(24 60% 20% / 0.5), hsl(24 50% 14% / 0.5))',
                  } : { background: 'hsl(var(--muted) / 0.2)' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[10px]">
                      {periodLabels[report.report_type] || report.report_type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.summary}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1">
                      {growth >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                      <span className={`text-xs font-medium ${growth >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDelete(report.id, e)}
                      disabled={deleteMut.isPending}
                      className="p-1 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir relatório"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Report detail */}
          <div className="lg:col-span-2">
            {selectedData ? (
              <div className="card-cinematic rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{periodLabels[selectedData.report_type]} — {selectedData.period_days} dias</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(selectedData.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {/* Metrics summary */}
                {selectedData.metrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Faturamento', value: `R$ ${Number((selectedData.metrics as any).currentTotal || 0).toFixed(0)}` },
                      { label: 'Vendas', value: String((selectedData.metrics as any).salesCount || 0) },
                      { label: 'Ticket Médio', value: `R$ ${Number((selectedData.metrics as any).avgTicket || 0).toFixed(2)}` },
                      { label: 'Margem', value: `${Number((selectedData.metrics as any).margin || 0).toFixed(1)}%` },
                    ].map(m => (
                      <div key={m.label} className="rounded-lg p-3 text-center" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
                        <p className="text-[10px] text-muted-foreground">{m.label}</p>
                        <p className="text-sm font-bold font-mono-numbers mt-0.5">{m.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI content */}
                <div className="prose prose-sm prose-invert max-w-none">
                  <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed bg-muted/20 rounded-xl p-4">
                    {selectedData.content}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-cinematic rounded-xl p-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Selecione um relatório para ver detalhes</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiReportsPanel;
