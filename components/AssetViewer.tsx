import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import {
  Download,
  Share2,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  FileText,
  Eye,
  Copy,
  ExternalLink,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Save,
  Tag,
  Info
} from 'lucide-react';
import { Asset } from '../types';
import { formatFileSize, formatDate } from '../utils/format';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface AssetViewerProps {
  asset: Asset | null;
  assets: Asset[];
  isOpen: boolean;
  onClose: () => void;
  onAssetChange?: (asset: Asset) => void;
  onDownload?: (asset: Asset) => void;
  onShare?: (asset: Asset) => void;
  onEdit?: (asset: Asset, updates: Partial<Asset>) => void;
  onDelete?: (assetId: string) => void;
}

export function AssetViewer({
  asset,
  assets,
  isOpen,
  onClose,
  onAssetChange,
  onDownload,
  onShare,
  onEdit,
  onDelete
}: AssetViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    tags: ''
  });
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);

  const currentIndex = assets.findIndex(a => a.id === asset?.id);
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < assets.length - 1;

  useEffect(() => {
    if (asset) {
      setEditForm({
        name: asset.name || '',
        description: asset.description || '',
        tags: (asset.tags || []).join(', ')
      });
      setImageZoom(1);
    }
  }, [asset]);

  // Controle de overflow do body quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNavigatePrev = () => {
    if (canNavigatePrev && onAssetChange) {
      onAssetChange(assets[currentIndex - 1]);
    }
  };

  const handleNavigateNext = () => {
    if (canNavigateNext && onAssetChange) {
      onAssetChange(assets[currentIndex + 1]);
    }
  };

  const handleDownload = () => {
    if (asset && onDownload) {
      onDownload(asset);
    }
  };

  const handleShare = () => {
    if (asset && onShare) {
      onShare(asset);
    }
  };

  const handleEdit = () => {
    if (asset && onEdit) {
      const updates = {
        name: editForm.name,
        description: editForm.description,
        tags: editForm.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      };
      onEdit(asset, updates);
      setIsEditing(false);
      toast.success('Material atualizado com sucesso!');
    }
  };

  const handleDelete = () => {
    if (asset && onDelete) {
      const confirmDelete = window.confirm(`Tem certeza que deseja excluir "${asset.name}"?`);
      if (confirmDelete) {
        onDelete(asset.id);
        onClose();
      }
    }
  };

  const handleCopyLink = () => {
    if (asset) {
      navigator.clipboard.writeText(asset.url);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        handleNavigatePrev();
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleNavigateNext();
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!asset || !isOpen) return null;

  const renderPreview = () => {
    switch (asset.type) {
      case 'image':
        return (
          <div className="w-full h-full bg-black/10 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div 
              className="max-w-full max-h-full flex items-center justify-center"
              style={{ transform: `scale(${imageZoom})` }}
            >
              <ImageWithFallback
                src={asset.url}
                alt={asset.name}
                className="max-w-full max-h-full object-contain rounded-lg"
                style={{ maxHeight: '100%', maxWidth: '100%' }}
              />
            </div>
            
            {/* Controles de zoom */}
            <div className="absolute bottom-4 right-4 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setImageZoom(Math.max(0.5, imageZoom - 0.25))}
                disabled={imageZoom <= 0.5}
                className="backdrop-blur-sm bg-black/60 border-white/20 text-white hover:bg-black/80"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setImageZoom(1)}
                className="backdrop-blur-sm bg-black/60 border-white/20 text-white hover:bg-black/80 min-w-[50px]"
              >
                {Math.round(imageZoom * 100)}%
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setImageZoom(Math.min(3, imageZoom + 0.25))}
                disabled={imageZoom >= 3}
                className="backdrop-blur-sm bg-black/60 border-white/20 text-white hover:bg-black/80"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="w-full h-full bg-black rounded-lg flex items-center justify-center relative overflow-hidden">
            <video
              src={asset.url}
              controls
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: '100%', maxWidth: '100%' }}
              muted={isVideoMuted}
            >
              Seu navegador não suporta reprodução de vídeo.
            </video>
            
            {/* Controles customizados */}
            <div className="absolute bottom-4 right-4 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsVideoMuted(!isVideoMuted)}
                className="backdrop-blur-sm bg-black/60 border-white/20 text-white hover:bg-black/80"
              >
                {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.open(asset.url, '_blank')}
                className="backdrop-blur-sm bg-black/60 border-white/20 text-white hover:bg-black/80"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="w-full h-full bg-muted rounded-lg p-8 text-center flex flex-col items-center justify-center">
            <FileText className="w-32 h-32 text-muted-foreground mb-6" />
            <h3 className="text-2xl font-medium mb-4">{asset.name}</h3>
            <p className="text-muted-foreground mb-8 text-lg">
              Documento {asset.format} • {formatFileSize(asset.size)}
            </p>
            <div className="flex gap-3">
              <Button onClick={handleDownload} size="lg">
                <Download className="w-5 h-5 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="lg" onClick={() => window.open(asset.url, '_blank')}>
                <ExternalLink className="w-5 h-5 mr-2" />
                Abrir
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-full bg-muted rounded-lg p-8 text-center flex flex-col items-center justify-center">
            <FileText className="w-32 h-32 text-muted-foreground mb-6" />
            <h3 className="text-2xl font-medium mb-4">{asset.name}</h3>
            <p className="text-muted-foreground mb-8 text-lg">
              Arquivo {asset.format} • {formatFileSize(asset.size)}
            </p>
            <Button onClick={handleDownload} size="lg">
              <Download className="w-5 h-5 mr-2" />
              Download
            </Button>
          </div>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    const badges = {
      image: { label: 'Imagem', variant: 'default' as const },
      video: { label: 'Vídeo', variant: 'secondary' as const },
      document: { label: 'Documento', variant: 'outline' as const },
      archive: { label: 'Arquivo', variant: 'destructive' as const }
    };
    return badges[type as keyof typeof badges] || badges.archive;
  };

  const typeBadge = getTypeBadge(asset.type);

  // Renderizar o modal usando createPortal
  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center overflow-y-auto"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-viewer-title"
      aria-describedby="asset-viewer-description"
    >
      {/* Hidden accessibility elements */}
      <div className="sr-only">
        <h1 id="asset-viewer-title">
          Visualizar Material: {asset.name}
        </h1>
        <p id="asset-viewer-description">
          {isEditing 
            ? `Editando informações do material ${asset.name} (${typeBadge.label})`
            : `Visualização ampliada do material ${asset.name} (${typeBadge.label}). Use as setas para navegar entre materiais.`
          }
        </p>
      </div>

      {/* Modal Content */}
      <div 
        className="modal-container w-[95vw] h-[95vh] bg-background rounded-lg shadow-2xl border border-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header fixo */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-card/50 flex-shrink-0 rounded-t-lg">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Badge variant={typeBadge.variant} className="flex-shrink-0">
              {typeBadge.label}
            </Badge>
            <h2 className="text-xl font-semibold truncate" title={asset.name}>
              {asset.name}
            </h2>
            <span className="text-muted-foreground flex-shrink-0">
              {currentIndex + 1} de {assets.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Navegação */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNavigatePrev}
              disabled={!canNavigatePrev}
              aria-label="Material anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNavigateNext}
              disabled={!canNavigateNext}
              aria-label="Próximo material"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6 mx-2" />
            
            {/* Ações */}
            <Button variant="ghost" size="sm" onClick={handleDownload} aria-label="Baixar material">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleShare} aria-label="Compartilhar material">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopyLink} aria-label="Copiar link">
              <Copy className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(!isEditing)}
              aria-label={isEditing ? "Cancelar edição" : "Editar material"}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} aria-label="Excluir material">
              <Trash2 className="w-4 h-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6 mx-2" />
            
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar visualização">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Layout de duas colunas: Preview à esquerda, Informações à direita */}
        <div className="flex flex-1 overflow-hidden">
          {/* Área de preview da imagem - 70% da largura */}
          <div 
            className="flex-shrink-0 p-6 flex items-center justify-center border-r border-border"
            style={{ width: '70%' }}
            role="main" 
            aria-label="Área de visualização do material"
          >
            {renderPreview()}
          </div>

          {/* Informações do Material - 30% da largura */}
          <div 
            className="flex-shrink-0 overflow-hidden" 
            style={{ width: '30%' }}
          >
            <ScrollArea className="h-full">
              <div className="p-6" role="complementary" aria-label="Informações do material">
                <div className="space-y-6">
                  {/* Título da seção */}
                  <div className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Informações do Material</h3>
                  </div>

                  {/* Edição ou Visualização */}
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-name">Nome do Material</Label>
                        <Input
                          id="edit-name"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="bg-input-background border-border mt-2"
                          aria-describedby="edit-name-help"
                        />
                        <p id="edit-name-help" className="sr-only">Digite o novo nome para o material</p>
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-description">Descrição</Label>
                        <Textarea
                          id="edit-description"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="bg-input-background border-border resize-none mt-2"
                          rows={4}
                          aria-describedby="edit-description-help"
                        />
                        <p id="edit-description-help" className="sr-only">Digite uma descrição para o material</p>
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-tags">Tags (separadas por vírgula)</Label>
                        <Input
                          id="edit-tags"
                          value={editForm.tags}
                          onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                          className="bg-input-background border-border mt-2"
                          placeholder="tag1, tag2, tag3"
                          aria-describedby="edit-tags-help"
                        />
                        <p id="edit-tags-help" className="sr-only">Digite as tags separadas por vírgula</p>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button onClick={handleEdit} className="flex-1">
                          <Save className="w-4 h-4 mr-2" />
                          Salvar
                        </Button>
                        <Button onClick={() => setIsEditing(false)} variant="outline">
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Descrição */}
                      <div>
                        <Label className="text-base font-semibold">Descrição</Label>
                        {asset.description ? (
                          <p className="text-muted-foreground mt-2 leading-relaxed text-sm">
                            {asset.description}
                          </p>
                        ) : (
                          <p className="text-muted-foreground mt-2 italic text-sm">
                            Sem descrição
                          </p>
                        )}
                      </div>

                      <Separator />

                      {/* Tags */}
                      <div>
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Tags
                        </Label>
                        {asset.tags && asset.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-2" role="list" aria-label="Tags do material">
                            {asset.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" role="listitem" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground mt-2 italic text-sm">
                            Nenhuma tag
                          </p>
                        )}
                      </div>

                      <Separator />

                      {/* Categoria */}
                      <div>
                        <Label className="text-base font-semibold">Categoria</Label>
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            {asset.categoryName || 'Sem categoria'}
                          </Badge>
                        </div>
                      </div>

                      <Separator />

                      {/* Detalhes Técnicos */}
                      <div>
                        <Label className="text-base font-semibold">Detalhes Técnicos</Label>
                        <div className="grid grid-cols-1 gap-3 mt-3">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Formato</span>
                            <p className="font-medium text-sm">{asset.format || 'N/A'}</p>
                          </div>
                          
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Tamanho</span>
                            <p className="font-medium text-sm">{formatFileSize(asset.size)}</p>
                          </div>
                          
                          {asset.metadata && asset.metadata.width && asset.metadata.height && (
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">Dimensões</span>
                              <p className="font-medium text-sm">
                                {asset.metadata.width} × {asset.metadata.height}
                              </p>
                            </div>
                          )}
                          
                          {asset.metadata && asset.metadata.duration && (
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">Duração</span>
                              <p className="font-medium text-sm">
                                {Math.floor(asset.metadata.duration / 60)}:
                                {(asset.metadata.duration % 60).toString().padStart(2, '0')}
                              </p>
                            </div>
                          )}
                          
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Downloads</span>
                            <p className="font-medium text-sm">{asset.downloadCount || 0}</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Metadados */}
                      <div>
                        <Label className="text-base font-semibold">Metadados</Label>
                        <div className="space-y-3 mt-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <span className="text-xs text-muted-foreground">Enviado por</span>
                              <p className="font-medium text-sm">{asset.uploadedBy || 'Desconhecido'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <span className="text-xs text-muted-foreground">Data de envio</span>
                              <p className="font-medium text-sm">{formatDate(asset.uploadedAt)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <span className="text-xs text-muted-foreground">Visibilidade</span>
                              <div className="mt-1">
                                <Badge variant={asset.isPublic ? "default" : "secondary"} className="text-xs">
                                  {asset.isPublic ? 'Público' : 'Privado'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Ações */}
                      <div>
                        <Label className="text-base font-semibold">Ações</Label>
                        <div className="flex flex-col gap-2 mt-3">
                          <Button onClick={handleDownload} size="sm" className="w-full">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                          <Button onClick={handleShare} variant="outline" size="sm" className="w-full">
                            <Share2 className="w-4 h-4 mr-2" />
                            Compartilhar
                          </Button>
                          <Button onClick={handleCopyLink} variant="outline" size="sm" className="w-full">
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Link
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}