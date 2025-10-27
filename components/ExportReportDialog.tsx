import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { CalendarRange, Loader2 } from 'lucide-react';
import { cn } from './ui/utils';

export type IndicatorOption = {
  id: string;
  label: string;
  description?: string;
};

export type ReportDateRange = {
  startDate: string;
  endDate: string;
};

export interface ExportReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicators: IndicatorOption[];
  defaultSelected?: string[];
  defaultDateRange: ReportDateRange;
  onGenerate: (payload: { indicators: string[]; dateRange: ReportDateRange }) => Promise<void> | void;
  isGenerating?: boolean;
}

export function ExportReportDialog({
  open,
  onOpenChange,
  indicators,
  defaultSelected = indicators.map((indicator) => indicator.id),
  defaultDateRange,
  onGenerate,
  isGenerating = false,
}: ExportReportDialogProps) {
  const initialRange = useMemo(() => defaultDateRange, [defaultDateRange.startDate, defaultDateRange.endDate]);

  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(defaultSelected);
  const [dateRange, setDateRange] = useState<ReportDateRange>(initialRange);
  const [errors, setErrors] = useState<{ dateRange?: string; indicators?: string }>({});

  useEffect(() => {
    if (open) {
      setSelectedIndicators(defaultSelected);
      setDateRange(initialRange);
      setErrors({});
    }
  }, [open, defaultSelected, initialRange]);

  const toggleIndicator = (indicatorId: string) => {
    setSelectedIndicators((prev) =>
      prev.includes(indicatorId) ? prev.filter((id) => id !== indicatorId) : [...prev, indicatorId],
    );
  };

  const handleDateChange = (key: keyof ReportDateRange, value: string) => {
    setDateRange((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!dateRange.startDate || !dateRange.endDate) {
      newErrors.dateRange = 'Informe a data inicial e final.';
    } else if (dateRange.endDate < dateRange.startDate) {
      newErrors.dateRange = 'A data final deve ser posterior à data inicial.';
    }
    if (selectedIndicators.length === 0) {
      newErrors.indicators = 'Selecione ao menos um indicador.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = async () => {
    if (!validate()) return;
    await onGenerate({ indicators: selectedIndicators, dateRange });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-[#0f0f11] text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-white">
            <CalendarRange className="h-5 w-5 text-primary" />
            Exportar Relatório
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Personalize o período e os indicadores que farão parte do relatório em PDF. Os dados serão gerados com o
            tema alinhado ao visual do painel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4">
          <section className="space-y-3">
            <Label className="text-sm font-medium text-white/80">Período</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="start-date" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Data inicial
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(event) => handleDateChange('startDate', event.target.value)}
                  className="bg-card border-border text-sm text-white"
                  max={dateRange.endDate || undefined}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="end-date" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Data final
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(event) => handleDateChange('endDate', event.target.value)}
                  className="bg-card border-border text-sm text-white"
                  min={dateRange.startDate || undefined}
                />
              </div>
            </div>
            {errors.dateRange && <p className="text-xs text-red-400">{errors.dateRange}</p>}
          </section>

          <section className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-white/80">Indicadores</Label>
              <p className="text-xs text-muted-foreground">
                Selecione quais cards, gráficos e listas entrarão no PDF final.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {indicators.map((indicator) => {
                const checked = selectedIndicators.includes(indicator.id);
                return (
                  <button
                    type="button"
                    key={indicator.id}
                    onClick={() => toggleIndicator(indicator.id)}
                    className={cn(
                      'group flex h-full items-start gap-3 rounded-xl border bg-background/60 p-3 text-left transition-colors',
                      checked ? 'border-primary/70 bg-primary/5' : 'border-border/60 hover:border-primary/40',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleIndicator(indicator.id)}
                      className="mt-1 border-border bg-background"
                      aria-label={`Selecionar indicador ${indicator.label}`}
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{indicator.label}</p>
                      {indicator.description ? (
                        <p className="text-xs text-muted-foreground">{indicator.description}</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.indicators && <p className="text-xs text-red-400">{errors.indicators}</p>}
          </section>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-border bg-background hover:bg-muted/60"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              'Gerar relatório'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExportReportDialog;



