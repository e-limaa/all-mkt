# Documentação do Componente Card

## Visão Geral

Componente de card para exibição de empreendimentos imobiliários, desenvolvido a partir do design do Figma. Apresenta informações como imagem, título, localização, data de lançamento, criador e ações.

## Estrutura de Arquivos

```
/imports/
  ├── Card.tsx                    # Componente principal
  ├── svg-feo1wkj7xw.ts          # Ícones SVG
  └── figma:asset/...            # Imagem do empreendimento
```

## Uso Básico

```tsx
import Card from "./imports/Card";

function App() {
  return (
    <div className="p-8">
      <Card />
    </div>
  );
}
```

## Estrutura do Componente

O componente atualmente possui dados estáticos. Para torná-lo dinâmico, você precisa modificá-lo para aceitar props.

### Dados Atuais (Estáticos)

```tsx
{
  badge: "Lançamento",
  titulo: "Residencial Vista Alegre",
  localizacao: "São Paulo",
  dataLancamento: "14/06/2024",
  criadoPor: "Eduardo Lima",
  dataCriacao: "14/06/2024",
  quantidadeMateriais: 6,
  imagem: "[URL da imagem]"
}
```

## Como Tornar o Componente Dinâmico

### 1. Criar Interface de Props

```tsx
interface CardProps {
  badge?: string;
  titulo: string;
  localizacao: string;
  dataLancamento: string;
  criadoPor: string;
  dataCriacao: string;
  quantidadeMateriais: number;
  imagemUrl: string;
  onVisualizarMateriais?: () => void;
  onAbrirMenu?: () => void;
}
```

### 2. Modificar o Componente Principal

```tsx
export default function Card({
  badge = "Lançamento",
  titulo,
  localizacao,
  dataLancamento,
  criadoPor,
  dataCriacao,
  quantidadeMateriais,
  imagemUrl,
  onVisualizarMateriais,
  onAbrirMenu
}: CardProps) {
  // Componente modificado para usar as props
}
```

### 3. Exemplo de Uso com Dados Dinâmicos

```tsx
import Card from "./imports/Card";

const empreendimentos = [
  {
    id: 1,
    titulo: "Residencial Vista Alegre",
    localizacao: "São Paulo",
    dataLancamento: "14/06/2024",
    criadoPor: "Eduardo Lima",
    dataCriacao: "14/06/2024",
    quantidadeMateriais: 6,
    imagemUrl: "https://exemplo.com/imagem.jpg"
  },
  // ... mais empreendimentos
];

function ListaEmpreendimentos() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
      {empreendimentos.map((emp) => (
        <Card
          key={emp.id}
          titulo={emp.titulo}
          localizacao={emp.localizacao}
          dataLancamento={emp.dataLancamento}
          criadoPor={emp.criadoPor}
          dataCriacao={emp.dataCriacao}
          quantidadeMateriais={emp.quantidadeMateriais}
          imagemUrl={emp.imagemUrl}
          onVisualizarMateriais={() => console.log(`Ver materiais de ${emp.titulo}`)}
          onAbrirMenu={() => console.log(`Menu de ${emp.titulo}`)}
        />
      ))}
    </div>
  );
}
```

## Componentes Internos

### Badge
Exibe o status do empreendimento (ex: "Lançamento")

### EmpreendimentoManager
Contém a imagem principal e o badge

### Heading
Título do empreendimento

### Container
Localização com ícone de pin

### Container1
Data de lançamento com ícone de calendário

### Container2
Informações do criador

### Container3
Data de criação

### ButtonBrandS
Botão principal para visualizar materiais

### Button
Botão de menu com três pontos

## Estilização

### Cores Principais
- **Fundo do card**: `#0e0e0e`
- **Borda**: `#2a2a2a`
- **Badge vermelho**: `#d50037`
- **Texto primário**: `#ffffff` (branco)
- **Texto secundário**: `#888888` (cinza)

### Dimensões
- **Largura recomendada**: `280px`
- **Altura da imagem**: `141.75px`
- **Border radius**: `14.5px`
- **Padding interno**: `16px`

## Dependências

### Fontes
- Tenda:Medium
- Tenda:Regular

### Ícones SVG
Todos os ícones estão incluídos no arquivo `svg-feo1wkj7xw.ts`

### Imagens
- Usar `figma:asset` para assets do Figma
- Ou substituir por URLs de imagens da sua aplicação

## Responsividade

### Layout Sugerido

```tsx
// Mobile: 1 coluna
<div className="grid grid-cols-1 gap-4 p-4">
  <Card {...props} />
</div>

// Tablet: 2 colunas
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
  <Card {...props} />
</div>

// Desktop: 3 ou 4 colunas
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-8">
  <Card {...props} />
</div>
```

## Interatividade Recomendada

### Eventos do Card

```tsx
// Hover no card
<div className="transition-transform hover:scale-105 hover:shadow-xl">
  <Card {...props} />
</div>

// Click no card inteiro
<div onClick={() => abrirDetalhes(empreendimento.id)}>
  <Card {...props} />
</div>
```

### Estados do Componente

```tsx
// Loading
<div className="animate-pulse">
  <div className="bg-gray-800 h-[141.75px] rounded-t-[14.5px]" />
  {/* ... skeleton do restante */}
</div>

// Erro
<div className="border-2 border-red-500">
  <Card {...props} />
</div>

// Selecionado
<div className="ring-2 ring-blue-500">
  <Card {...props} />
</div>
```

## Integração com Backend

### Exemplo com API

```tsx
import { useState, useEffect } from 'react';
import Card from "./imports/Card";

interface Empreendimento {
  id: number;
  titulo: string;
  localizacao: string;
  dataLancamento: string;
  criadoPor: string;
  dataCriacao: string;
  quantidadeMateriais: number;
  imagemUrl: string;
}

function EmpreendimentosPage() {
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/empreendimentos')
      .then(res => res.json())
      .then(data => {
        setEmpreendimentos(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
      {empreendimentos.map(emp => (
        <Card
          key={emp.id}
          {...emp}
        />
      ))}
    </div>
  );
}
```

## Customização

### Variantes do Badge

```tsx
// Lançamento (vermelho)
<div className="bg-red-600">Lançamento</div>

// Em obras (amarelo)
<div className="bg-yellow-600">Em Obras</div>

// Concluído (verde)
<div className="bg-green-600">Concluído</div>

// Vendido (azul)
<div className="bg-blue-600">Vendido</div>
```

### Tamanhos Diferentes

```tsx
// Pequeno
<div className="w-[240px]">
  <Card {...props} />
</div>

// Médio (padrão)
<div className="w-[280px]">
  <Card {...props} />
</div>

// Grande
<div className="w-[320px]">
  <Card {...props} />
</div>
```

## Checklist de Implementação

- [ ] Copiar arquivos `/imports/Card.tsx` e `/imports/svg-feo1wkj7xw.ts`
- [ ] Adicionar as fontes Tenda:Medium e Tenda:Regular
- [ ] Substituir `figma:asset` por URLs de imagens reais
- [ ] Criar interface de props para dados dinâmicos
- [ ] Modificar componente para aceitar props
- [ ] Implementar handlers de eventos (onClick, etc)
- [ ] Adicionar estados de loading e erro
- [ ] Integrar com sua API/backend
- [ ] Testar responsividade
- [ ] Adicionar testes unitários (opcional)

## Próximos Passos

1. **Tornar dinâmico**: Adicionar props ao componente
2. **Adicionar interatividade**: Implementar handlers de click
3. **Estados visuais**: Loading, hover, selected, error
4. **Integração**: Conectar com sua API
5. **Acessibilidade**: Adicionar ARIA labels e keyboard navigation
6. **Testes**: Criar testes unitários e de integração

## Suporte

Para dúvidas ou problemas, verifique:
- Estrutura de arquivos está correta
- Todas as dependências estão instaladas
- Imagens estão sendo carregadas corretamente
- Props estão sendo passadas corretamente
