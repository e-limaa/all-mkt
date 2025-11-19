import jsPDF from 'jspdf';
import { format } from 'date-fns';

export type IndicatorId =
    | 'totalMaterials'
    | 'downloads'
    | 'activeUsers'
    | 'activeLinks'
    | 'assetTypes'
    | 'campaignDistribution'
    | 'projectDistribution'
    | 'recentActivity';

interface ReportData {
    indicators: IndicatorId[];
    dateRange: { startDate: string; endDate: string };
    data: {
        stats: any; // Using any for now to avoid complex type duplication, but ideally should match AssetContext types
        assetTypeData: { name: string; value: number; color: string }[];
        campaignData: { name: string; assets: number }[];
        projectData: { name: string; assets: number }[];
        companyName: string;
    };
}

export const generateReport = async ({ indicators, dateRange, data }: ReportData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.text('Relatório de Performance DAM', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`${data.companyName} - Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    doc.text(`Período: ${format(new Date(dateRange.startDate), 'dd/MM/yyyy')} a ${format(new Date(dateRange.endDate), 'dd/MM/yyyy')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    doc.setTextColor(0);

    // Indicators
    if (indicators.includes('totalMaterials')) {
        addSection(doc, 'Total de Materiais', `${data.stats.totalAssets} assets cadastrados`, margin, yPos);
        yPos += 20;
    }

    if (indicators.includes('downloads')) {
        addSection(doc, 'Downloads', `${data.stats.downloadCount} downloads realizados`, margin, yPos);
        yPos += 20;
    }

    if (indicators.includes('activeUsers')) {
        addSection(doc, 'Usuários Ativos', `${data.stats.totalUsers} usuários`, margin, yPos);
        yPos += 20;
    }

    if (indicators.includes('activeLinks')) {
        addSection(doc, 'Links Ativos', `${data.stats.activeSharedLinks} links compartilhados`, margin, yPos);
        yPos += 20;
    }

    if (indicators.includes('assetTypes')) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Tipos de Material', margin, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        data.data.assetTypeData.forEach((item: any) => {
            doc.text(`${item.name}: ${item.value}`, margin + 5, yPos);
            yPos += 7;
        });
        yPos += 10;
    }

    if (indicators.includes('campaignDistribution')) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Materiais por Campanha', margin, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        data.data.campaignData.forEach((item: any) => {
            doc.text(`${item.name}: ${item.assets}`, margin + 5, yPos);
            yPos += 7;
        });
        yPos += 10;
    }

    if (indicators.includes('projectDistribution')) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Materiais por Empreendimento', margin, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        data.data.projectData.forEach((item: any) => {
            doc.text(`${item.name}: ${item.assets}`, margin + 5, yPos);
            yPos += 7;
        });
        yPos += 10;
    }

    // Save
    doc.save(`relatorio-dam-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

function addSection(doc: jsPDF, title: string, content: string, x: number, y: number) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, x, y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(content, x, y + 7);
}
