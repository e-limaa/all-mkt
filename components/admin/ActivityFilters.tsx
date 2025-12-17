
import React, { useState } from 'react';
import { parseDate } from "chrono-node";
import { Input } from "@/components/ui/input";
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, FilterX, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface ActivityLogFiltersProps {
    startDate: Date | undefined;
    endDate: Date | undefined;
    selectedActions: string[];
    regional?: string;
    userId?: string;
    onDateChange: (range: { from?: Date; to?: Date } | undefined) => void;
    onActionChange: (actions: string[]) => void;
    onRegionalChange: (regional: string | undefined) => void;
    onUserChange: (userId: string | undefined) => void;
    regionalOptions: { value: string; label: string }[];
    userOptions: { value: string; label: string }[];
    isLoading?: boolean;
}

const ACTION_OPTIONS = [
    { value: 'upload_asset', label: 'Upload de Arquivo' },
    { value: 'download_asset', label: 'Download de Arquivo' },
    { value: 'delete_asset', label: 'Exclusão de Arquivo' },
    { value: 'update_asset', label: 'Edição de Arquivo' },
    { value: 'create_project', label: 'Criar Projeto' },
    { value: 'update_project', label: 'Editar Projeto' },
    { value: 'delete_project', label: 'Excluir Projeto' },
    { value: 'create_campaign', label: 'Criar Campanha' },
    { value: 'update_campaign', label: 'Editar Campanha' },
    { value: 'delete_campaign', label: 'Excluir Campanha' },
    { value: 'create_user', label: 'Criar Usuário' },
    { value: 'update_user', label: 'Editar Usuário' },
    { value: 'create_shared_link', label: 'Criar Link' },
];

export function ActivityLogFilters({
    startDate,
    endDate,
    selectedActions,
    regional,
    userId,
    onDateChange,
    onActionChange,
    onRegionalChange,
    onUserChange,
    regionalOptions,
    userOptions,
    isLoading,
}: ActivityLogFiltersProps) {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Calendar29 Logic state
    // We initialize the input value based on props
    const initialInputValue = startDate
        ? endDate
            ? `${format(startDate, 'dd/MM/yy', { locale: ptBR })} - ${format(endDate, 'dd/MM/yy', { locale: ptBR })}`
            : format(startDate, 'dd/MM/yy', { locale: ptBR })
        : "";

    const [inputValue, setInputValue] = useState(initialInputValue);

    // Sync input value if props change externally (e.g. clear filters)
    React.useEffect(() => {
        const newValue = startDate
            ? endDate
                ? `${format(startDate, 'dd/MM/yy', { locale: ptBR })} - ${format(endDate, 'dd/MM/yy', { locale: ptBR })}`
                : format(startDate, 'dd/MM/yy', { locale: ptBR })
            : "";
        setInputValue(newValue);
    }, [startDate, endDate]);

    const handleActionToggle = (actionValue: string) => {
        if (selectedActions.includes(actionValue)) {
            onActionChange(selectedActions.filter((a) => a !== actionValue));
        } else {
            onActionChange([...selectedActions, actionValue]);
        }
    };

    const clearFilters = () => {
        onDateChange(undefined);
        onActionChange([]);
        onRegionalChange(undefined);
        onUserChange(undefined);
        setInputValue("");
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">

                {/* Calendar29 Adaptation */}
                <div className="relative flex gap-2 w-[240px]">
                    <Input
                        id="date"
                        value={inputValue}
                        placeholder="Selecione data ou período..."
                        className="bg-background pr-10"
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            // Simple parsing attempt using chrono-node for start date
                            // Full natural language range parsing is complex, so we stick to single date parsing for "jump to"
                            // or just let user search. For now, we rely on Calendar select for ranges.
                            const parsedDate = parseDate(e.target.value);
                            if (parsedDate) {
                                // If user types a date, we jump to it. 
                                // We could treat it as single day selection.
                                onDateChange({ from: parsedDate, to: parsedDate });
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setIsCalendarOpen(true);
                            }
                        }}
                    />
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                id="date-picker"
                                variant="ghost"
                                className="absolute top-1/2 right-2 size-6 -translate-y-1/2 p-0 h-6 w-6 hover:bg-transparent"
                            >
                                <CalendarIcon className="size-3.5" />
                                <span className="sr-only">Abrir calendário</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="range"
                                selected={startDate ? { from: startDate, to: endDate } : undefined}
                                onSelect={(range) => {
                                    // Same logic as before: single click = single day (to=from)
                                    let effectiveRange = range;
                                    if (range?.from && !range?.to) {
                                        effectiveRange = { from: range.from, to: range.from };
                                    }
                                    onDateChange(effectiveRange);

                                    // Update input text immediately
                                    if (effectiveRange?.from) {
                                        if (effectiveRange.to) {
                                            setInputValue(`${format(effectiveRange.from, 'dd/MM/yy', { locale: ptBR })} - ${format(effectiveRange.to, 'dd/MM/yy', { locale: ptBR })}`);
                                            // If user selected a range (different dates), close. 
                                            // If same date (single click), maybe keep open for 2nd click? 
                                            // User complaint was about "confusion". 
                                            // Let's keep logic: if range is complete (to exists), maybe close?
                                            // But with to=from logic, it's always complete.
                                            // Let's just update and let user close or click outside.
                                        } else {
                                            setInputValue(format(effectiveRange.from, 'dd/MM/yy', { locale: ptBR }));
                                        }
                                    } else {
                                        setInputValue("");
                                    }
                                }}
                                initialFocus
                                locale={ptBR}
                                numberOfMonths={1} // Reverted to 1 based on feedback
                                className="rounded-lg border shadow-sm"
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-[180px] justify-between font-normal">
                            <span className="truncate">
                                {regional ? (regionalOptions.find(r => r.value === regional)?.label || regional) : "Regional"}
                            </span>
                            {regional ? (
                                <FilterX
                                    className="ml-2 h-4 w-4 opacity-50 hover:opacity-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRegionalChange(undefined);
                                    }}
                                />
                            ) : (
                                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[180px]">
                        <DropdownMenuLabel>Filtrar por Regional</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <ScrollArea className="h-[200px]">
                            {regionalOptions.map((option) => (
                                <DropdownMenuCheckboxItem
                                    key={option.value}
                                    checked={regional === option.value}
                                    onCheckedChange={() => onRegionalChange(regional === option.value ? undefined : option.value)}
                                >
                                    {option.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-[180px] justify-between font-normal">
                            <span className="truncate">
                                {userId ? (userOptions.find(u => u.value === userId)?.label || "Usuário") : "Usuário"}
                            </span>
                            {userId ? (
                                <FilterX
                                    className="ml-2 h-4 w-4 opacity-50 hover:opacity-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUserChange(undefined);
                                    }}
                                />
                            ) : (
                                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[180px]">
                        <DropdownMenuLabel>Filtrar por Usuário</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <ScrollArea className="h-[200px]">
                            {userOptions.map((option) => (
                                <DropdownMenuCheckboxItem
                                    key={option.value}
                                    checked={userId === option.value}
                                    onCheckedChange={() => onUserChange(userId === option.value ? undefined : option.value)}
                                >
                                    {option.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-[200px] justify-between font-normal">
                            <span className="truncate">Tipos de atividade</span>
                            <div className="flex items-center">
                                {selectedActions.length > 0 && (
                                    <Badge variant="secondary" className="mr-2 h-5 rounded-sm px-1 text-xs">
                                        {selectedActions.length}
                                    </Badge>
                                )}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[200px]">
                        <DropdownMenuLabel>Filtrar por ação</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <ScrollArea className="h-[300px]">
                            {ACTION_OPTIONS.map((option) => (
                                <DropdownMenuCheckboxItem
                                    key={option.value}
                                    checked={selectedActions.includes(option.value)}
                                    onCheckedChange={() => handleActionToggle(option.value)}
                                >
                                    {option.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>

                {(startDate || selectedActions.length > 0 || regional || userId) && (
                    <Button variant="ghost" onClick={clearFilters} className="h-10 px-2 lg:px-3">
                        <FilterX className="mr-2 h-4 w-4" />
                        Limpar
                    </Button>
                )}
            </div>
        </div>
    );
}
