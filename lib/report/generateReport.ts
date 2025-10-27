import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatNumber, timeAgo } from '../../utils/format';
import type { ReportDateRange } from '../../components/ExportReportDialog';
import type { DashboardStats } from '../../contexts/AssetContext';

type TrendPoint = { month: string; uploads: number; downloads: number };
type DistributionPoint = { name: string; assets: number };
type AssetTypePoint = { name: string; value: number; color: string };

export type DashboardReportPayload = {
  stats: DashboardStats;
  assetTypeData: AssetTypePoint[];
  campaignData: DistributionPoint[];
  projectData: DistributionPoint[];
  trendData: TrendPoint[];
  companyName?: string | null;
};

export type IndicatorId =
  | 'totalMaterials'
  | 'downloads'
  | 'activeUsers'
  | 'activeLinks'
  | 'assetTypes'
  | 'campaignDistribution'
  | 'projectDistribution'
  | 'recentActivity'
  | 'trend';

const MAX_PAGE_HEIGHT = 812; // A4 portrait height (pt)
const SECTION_SPACING = 24;

const ensurePageSpace = (doc: jsPDF, cursorY: number, heightNeeded: number, margin: number) => {
  if (cursorY + heightNeeded > MAX_PAGE_HEIGHT - margin) {
    doc.addPage();
    doc.setFont('helvetica', 'normal', 'latin1');
    return margin;
  }
  return cursorY;
};

const drawSectionTitle = (doc: jsPDF, x: number, y: number, title: string) => {
  doc.setFont('helvetica', 'bold', 'latin1');
  doc.setFontSize(14);
  doc.setTextColor('#1f2937');
  doc.text(title, x, y);
  doc.setDrawColor('#dc2626');
  doc.setLineWidth(1);
  doc.line(x, y + 6, x + 70, y + 6);
  return y + 20;
};

const drawMetricRow = (doc: jsPDF, x: number, y: number, label: string, value: string) => {
  doc.setFont('helvetica', 'normal', 'latin1');
  doc.setFontSize(11);
  doc.setTextColor('#64748b');
  doc.text(label.toUpperCase(), x, y);
  doc.setFont('helvetica', 'bold', 'latin1');
  doc.setFontSize(18);
  doc.setTextColor('#0f172a');
  doc.text(value, x, y + 22);
  return y + 40;
};

const drawHorizontalBar = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: number,
  maxValue: number,
  color: string,
) => {
  const barHeight = 18;
  const availableWidth = width;
  const percentage = maxValue > 0 ? value / maxValue : 0;
  const barWidth = Math.max(availableWidth * percentage, 6);

  doc.setFont('helvetica', 'normal', 'latin1');
  doc.setFontSize(11);
  doc.setTextColor('#1f2937');
  doc.text(`${label} · ${formatNumber(value)}`, x, y + 12);

  doc.setDrawColor('#e2e8f0');
  doc.roundedRect(x, y + 18, availableWidth, barHeight, 6, 6);
  doc.setFillColor(color);
  doc.roundedRect(x, y + 18, barWidth, barHeight, 6, 6, 'F');

  return y + barHeight + 30;
};
const drawTable = ({
  doc,
  x,
  y,
  width,
  rows,
  columns,
  maxRows = 8,
}: {
  doc: jsPDF;
  x: number;
  y: number;
  width: number;
  rows: Array<string[]>;
  columns: string[];
  maxRows?: number;
}) => {
  let cursorY = y;
  const columnWidths = [0.65, 0.35].map((ratio) => width * ratio);

  doc.setFont('helvetica', 'bold', 'latin1');
  doc.setFontSize(11);
  doc.setTextColor('#475569');
  let columnX = x;
  columns.forEach((column, index) => {
    doc.text(column, columnX, cursorY);
    columnX += columnWidths[index];
  });
  cursorY += 12;
  doc.setDrawColor('#e2e8f0');
  doc.line(x, cursorY, x + width, cursorY);
  cursorY += 14;

  doc.setFont('helvetica', 'normal', 'latin1');
  doc.setTextColor('#0f172a');
  rows.slice(0, maxRows).forEach((row, idx) => {
    const backgroundColor = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
    doc.setFillColor(backgroundColor);
    doc.rect(x, cursorY - 12, width, 24, 'F');
    let valueX = x + 8;
    row.forEach((value, colIdx) => {
      doc.text(String(value), valueX, cursorY + 4);
      valueX += columnWidths[colIdx];
    });
    cursorY += 24;
  });

  if (rows.length > maxRows) {
    doc.setFont('helvetica', 'italic', 'latin1');
    doc.setFontSize(10);
    doc.setTextColor('#6b7280');
    doc.text(`+ ${rows.length - maxRows} registros adicionais`, x, cursorY + 6);
    cursorY += 16;
  }

  return cursorY;
};

const drawTrendChart = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  data: TrendPoint[],
) => {
  if (data.length < 2) {
    doc.setFont('helvetica', 'italic', 'latin1');
    doc.setFontSize(10);
    doc.setTextColor('#6b7280');
    doc.text('Dados insuficientes para gerar o grã¡fico.', x, y + 14);
    return y + 36;
  }

  const padding = 24;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const originX = x + padding;
  const originY = y + padding + chartHeight;
  const maxValue = Math.max(...data.flatMap((item) => [item.uploads, item.downloads]), 1);
  const stepX = chartWidth / (data.length - 1);

  doc.setDrawColor('#e2e8f0');
  doc.setLineWidth(0.5);
  doc.line(originX, originY, originX + chartWidth, originY); // eixo X
  doc.line(originX, originY, originX, originY - chartHeight); // eixo Y

  const mapPoint = (value: number, index: number) => {
    const px = originX + index * stepX;
    const py = originY - (value / maxValue) * chartHeight;
    return { x: px, y: py };
  };

  const drawSeries = (values: number[], color: string) => {
    const points = values.map((value, index) => mapPoint(value, index));
    doc.setDrawColor(color);
    doc.setLineWidth(1.4);
    points.forEach((point, index) => {
      if (index === 0) return;
      const prev = points[index - 1];
      doc.line(prev.x, prev.y, point.x, point.y);
    });
    doc.setFillColor(color);
    points.forEach((point) => {
      doc.circle(point.x, point.y, 3, 'F');
    });
  };

  drawSeries(data.map((point) => point.uploads), '#dc2626');
  drawSeries(data.map((point) => point.downloads), '#2563eb');

  doc.setFont('helvetica', 'normal', 'latin1');
  doc.setFontSize(10);
  doc.setTextColor('#475569');
  data.forEach((point, index) => {
    const px = originX + index * stepX;
    doc.text(point.month, px - 6, originY + 14);
  });

  doc.setFont('helvetica', 'bold', 'latin1');
  doc.setFontSize(10);
  doc.setFillColor('#dc2626');
  doc.rect(originX, y + padding - 12, 10, 10, 'F');
  doc.text('Uploads', originX + 14, y + padding - 4);
  doc.setFillColor('#2563eb');
  doc.rect(originX + 70, y + padding - 12, 10, 10, 'F');
  doc.text('Downloads', originX + 86, y + padding - 4);

  return y + height + 12;
};

const indicatorRenderers: Record<IndicatorId, { title: string; render: SectionRenderer }> = {
  totalMaterials: {
    title: 'Total de Materiais',
    render: ({ doc, cursorY, pageWidth, margin }, data) => {
      cursorY = drawSectionTitle(doc, margin, cursorY, 'Total de Materiais');
      return drawMetricRow(doc, margin, cursorY, 'Total de Materiais', formatNumber(data.stats.totalAssets));
    },
  },
  downloads: {
    title: 'Downloads',
    render: ({ doc, cursorY, pageWidth, margin }, data) => {
      cursorY = drawSectionTitle(doc, margin, cursorY, 'Downloads');
      return drawMetricRow(doc, margin, cursorY, 'Downloads', formatNumber(data.stats.downloadCount));
    },
  },
  activeUsers: {
    title: 'Usuários Ativos',
    render: ({ doc, cursorY, pageWidth, margin }, data) => {
      cursorY = drawSectionTitle(doc, margin, cursorY, 'Usuários Ativos');
      return drawMetricRow(doc, margin, cursorY, 'Usuários Ativos', formatNumber(data.stats.totalUsers));
    },
  },
  activeLinks: {
    title: 'Links Ativos',
    render: ({ doc, cursorY, pageWidth, margin }, data) => {
      cursorY = drawSectionTitle(doc, margin, cursorY, 'Links Ativos');
      return drawMetricRow(doc, margin, cursorY, 'Links Ativos', formatNumber(data.stats.activeSharedLinks));
    },
  },
  assetTypes: {
    title: 'Tipos de Material',
    render: ({ doc, cursorY, pageWidth, margin }, data) => {
      cursorY = drawSectionTitle(doc, margin, cursorY, 'Tipos de Material');
      const maxValue = Math.max(...data.assetTypeData.map((item) => item.value), 1);
      data.assetTypeData.forEach((item) => {
        cursorY = drawHorizontalBar(
          doc,
          margin,
          cursorY,
          pageWidth - margin * 2,
          item.name,
          item.value,
          maxValue,
          item.color,
        );
      });
      return cursorY;
    },
  },
  campaignDistribution: {
    title: 'Materiais por Campanha',
    render: ({ doc, cursorY, pageWidth, margin }, data) => {
      cursorY = drawSectionTitle(doc, margin, cursorY, 'Materiais por Campanha');
      const tableRows = data.campaignData.map((campaign) => [campaign.name, formatNumber(campaign.assets)]);
      return drawTable({
        doc,
        x: margin,
        y: cursorY,
        width: pageWidth - margin * 2,
        rows: tableRows,
        columns: ['Campanha', 'Materiais'],
      });
    },
  },
  projectDistribution: {
    title: 'Materiais por Empreendimento',
    render: ({ doc, cursorY, pageWidth, margin }, data) => {
      cursorY = drawSectionTitle(doc, margin, cursorY, 'Materiais por Empreendimento');
      const tableRows = data.projectData.map((project) => [project.name, formatNumber(project.assets)]);
      return drawTable({
        doc,
        x: margin,
        y: cursorY,
        width: pageWidth - margin * 2,
        rows: tableRows,
        columns: ['Empreendimento', 'Materiais'],
      });
    },
  },
  recentActivity: {
    title: 'Atividade Recente',
    render: ({ doc, cursorY, pageWidth, margin }, data) => {
      cursorY = drawSectionTitle(doc, margin, cursorY, 'Atividade Recente');
      doc.setFont('helvetica', 'normal', 'latin1');
      doc.setFontSize(11);
      doc.setTextColor('#0f172a');

      data.stats.recentActivity.slice(0, 8).forEach((activity, index) => {
        cursorY = ensurePageSpace(doc, cursorY, 26, margin);
        const backgroundColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';
        doc.setFillColor(backgroundColor);
        doc.rect(margin, cursorY - 12, pageWidth - margin * 2, 24, 'F');

        doc.text(`${activity.userName} enviou â€œ${activity.assetName}â€`, margin + 8, cursorY);
        doc.setFont('helvetica', 'italic', 'latin1');
        doc.setFontSize(10);
        doc.setTextColor('#6b7280');
        const details = [
          activity.categoryName ? `Categoria: ${activity.categoryName}` : null,
          timeAgo(activity.timestamp),
        ]
          .filter(Boolean)
          .join(' · ');
        doc.text(details, margin + 8, cursorY + 12);
        doc.setFont('helvetica', 'normal', 'latin1');
        doc.setFontSize(11);
        doc.setTextColor('#0f172a');
        cursorY += 24;
      });

      if (data.stats.recentActivity.length > 8) {
        doc.setFont('helvetica', 'italic', 'latin1');
        doc.setFontSize(10);
        doc.setTextColor('#6b7280');
        doc.text(
          `+ ${data.stats.recentActivity.length - 8} registros adicionais`,
          margin,
          cursorY + 6,
        );
        cursorY += 16;
      }

      return cursorY;
    },
  },
  trend: {
    title: 'Tendãªncia de Uploads e Downloads',
    render: ({ doc, cursorY, pageWidth, margin }, data) => {
      cursorY = drawSectionTitle(doc, margin, cursorY, 'Tendãªncia de Uploads e Downloads');
      return drawTrendChart(doc, margin, cursorY, pageWidth - margin * 2, 160, data.trendData);
    },
  },
};

export type GenerateReportParams = {
  indicators: IndicatorId[];
  dateRange: ReportDateRange;
  data: DashboardReportPayload;
};

export async function generateReport({ indicators, dateRange, data }: GenerateReportParams) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  doc.setFont('helvetica', 'normal', 'latin1');

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  let cursorY = margin;

  const companyName = data.companyName?.trim() || 'ALL MKT';
  const startLabel = dateRange.startDate
    ? format(new Date(dateRange.startDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : 'Inã­cio';
  const endLabel = dateRange.endDate
    ? format(new Date(dateRange.endDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : 'Hoje';

  doc.setFillColor('#fee2e2');
  doc.rect(0, 0, pageWidth, 100, 'F');

  doc.setFont('helvetica', 'bold', 'latin1');
  doc.setFontSize(24);
  doc.setTextColor('#b91c1c');
  doc.text(`${companyName} · Relatã³rio de Insights`, margin, cursorY + 24);

  doc.setFont('helvetica', 'normal', 'latin1');
  doc.setFontSize(12);
  doc.setTextColor('#334155');
  doc.text(`Perã­odo: ${startLabel} â€” ${endLabel}`, margin, cursorY + 50);

  doc.setFont('helvetica', 'italic', 'latin1');
  doc.setFontSize(10);
  doc.setTextColor('#6b7280');
  doc.text(
    `Gerado em ${format(new Date(), "dd/MM/yyyy 'ã s' HH:mm", { locale: ptBR })}`,
    margin,
    cursorY + 68,
  );

  cursorY = 100 + SECTION_SPACING;

  const orderedIndicators = indicators.filter((indicator) => indicatorRenderers[indicator]);
  orderedIndicators.forEach((indicatorId, index) => {
    const renderer = indicatorRenderers[indicatorId];
    if (!renderer) return;
    cursorY = ensurePageSpace(doc, cursorY, 120, margin);
    cursorY = renderer.render({ doc, cursorY, pageWidth, margin }, data) + SECTION_SPACING;
    if (index === orderedIndicators.length - 1) {
      cursorY += 12;
    }
  });

  cursorY = ensurePageSpace(doc, cursorY, 40, margin);
  doc.setDrawColor('#e2e8f0');
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 18;
  doc.setFont('helvetica', 'italic', 'latin1');
  doc.setFontSize(10);
  doc.setTextColor('#6b7280');
  doc.text(
    'Relatã³rio gerado automaticamente pelo ALL MKT · Digital Asset Management.',
    margin,
    cursorY,
  );

  const startFile = dateRange.startDate ? format(new Date(dateRange.startDate), 'yyyy-MM-dd') : 'inicio';
  const endFile = dateRange.endDate ? format(new Date(dateRange.endDate), 'yyyy-MM-dd') : 'hoje';
  const filename = `relatorio-ALLMKT-${startFile}-${endFile}.pdf`;

  doc.save(filename);
}



