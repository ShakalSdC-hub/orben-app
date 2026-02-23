import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Zap,
  DollarSign,
  Scale,
  RefreshCw,
  Save,
  Printer,
  History,
  Loader2,
  Plus,
  Trash2,
  CalendarDays,
  FileText,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from "recharts";

interface Parcela {
  numero: number;
  percentual: number;
  dias: number;
  dataVencimento: string;
  valor: number;
  jurosPct?: number;
  jurosRs?: number;
  valorComFinanceiro?: number;
}

export default function Simulador() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Filtro de cotação LME
  const [lmeTipoFiltro, setLmeTipoFiltro] = useState<"dia" | "semana" | "mes" | "manual">("semana");
  const [lmeSemana, setLmeSemana] = useState<string>("");
  const [lmeData, setLmeData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [lmeMes, setLmeMes] = useState<string>(format(new Date(), "yyyy-MM"));

  // Common inputs
  const [cobreUsdT, setCobreUsdT] = useState(11500);
  const [dolarBrl, setDolarBrl] = useState(5.40);
  const [dataCompra, setDataCompra] = useState(format(new Date(), "yyyy-MM-dd"));

  // LME Vergalhão inputs
  const [fatorImposto, setFatorImposto] = useState(0.7986);
  const [pctLmeNegociada, setPctLmeNegociada] = useState(8);
  const [parcelas, setParcelas] = useState<Parcela[]>([
    { numero: 1, percentual: 40, dias: 40, dataVencimento: "", valor: 0 },
    { numero: 2, percentual: 30, dias: 50, dataVencimento: "", valor: 0 },
    { numero: 3, percentual: 30, dias: 60, dataVencimento: "", valor: 0 },
  ]);

  // Taxa financeira para cálculo prorata (% ao mês) - Vergalhão
  const [taxaFinanceiraMensal, setTaxaFinanceiraMensal] = useState(1.80);
  // Taxa financeira para cálculo prorata (% ao mês) - Sucata (independente)
  const [taxaFinanceiraSucata, setTaxaFinanceiraSucata] = useState(1.80);

  // Sucata inputs
  const [pctLmeSucata, setPctLmeSucata] = useState(97);
  const [custoCompraKg, setCustoCompraKg] = useState(66.09);
  const [custoMO, setCustoMO] = useState(3.40);
  const [prazoSucataDias, setPrazoSucataDias] = useState(40);
  const [pesoKg, setPesoKg] = useState(10000);

  // === Estados para Orçamento Serviço Terceiros ===
  const [orcNomeCliente, setOrcNomeCliente] = useState("");
  const [orcMaterialRecebido, setOrcMaterialRecebido] = useState("Sucata");
  const [orcQtdRecebidaKg, setOrcQtdRecebidaKg] = useState(10000);
  const [orcPrecoCompraKg, setOrcPrecoCompraKg] = useState(70);
  const [orcCustoFreteKg, setOrcCustoFreteKg] = useState(0);
  const [orcCustoMoTerceiraKg, setOrcCustoMoTerceiraKg] = useState(0);
  const [orcCustoMoInternaKg, setOrcCustoMoInternaKg] = useState(3.40);
  const [orcPerdaRealPct, setOrcPerdaRealPct] = useState(3); // Perda efetiva do processo
  const [orcPerdaClientePct, setOrcPerdaClientePct] = useState(5); // Perda informada ao cliente
  const [orcCobrancaMode, setOrcCobrancaMode] = useState<"percentual" | "valor">("valor");
  const [orcCobrancaValor, setOrcCobrancaValor] = useState(7.10);
  const [orcMaterialRetornado, setOrcMaterialRetornado] = useState("Fio de Cobre 1,83mm");
  const [orcEditingId, setOrcEditingId] = useState<string | null>(null);

  // Buscar histórico diário
  const { data: historico = [] } = useQuery({
    queryKey: ["historico_lme_simulador"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_lme")
        .select("*")
        .eq("is_media_semanal", false)
        .order("data", { ascending: false })
        .limit(90);
      if (error) throw error;
      return data;
    },
  });

  // Buscar médias semanais da tabela lme_semana_config (fonte oficial)
  const { data: semanasConfig = [] } = useQuery({
    queryKey: ["lme_semana_config_simulador"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lme_semana_config")
        .select("*")
        .order("ano", { ascending: false })
        .order("semana", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Transformar para o formato esperado pelo componente
  const mediasSemanais = semanasConfig.map((config: any) => ({
    semana_numero: config.semana,
    ano: config.ano,
    key: config.ano * 100 + config.semana,
    cobre_brl_kg: config.lme_base_brl_kg,
    dolar_brl: config.dolar_brl,
    cobre_usd_t: config.lme_cobre_usd_t,
    lme_final: config.lme_final_brl_kg,
    data_inicio: config.data_inicio,
    data_fim: config.data_fim,
    registros_count: 5,
  })).sort((a: any, b: any) => b.key - a.key);

  // Buscar histórico de simulações
  const { data: historicoSimulacoes = [] } = useQuery({
    queryKey: ["simulacoes-lme"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulacoes_lme")
        .select("*")
        .order("data_simulacao", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Buscar histórico de orçamentos de terceiros
  const { data: historicoOrcamentos = [] } = useQuery({
    queryKey: ["orcamentos-servico-terceiros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos_servico_terceiros")
        .select("*")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Gerar opções de semanas disponíveis (usando médias oficiais)
  const semanasDisponiveis = mediasSemanais.map((m: any) => ({
    value: String(m.key),
    label: `S${m.semana_numero} (${m.ano})`,
    data: m
  }));

  // Auto-selecionar a primeira semana disponível
  useEffect(() => {
    if (mediasSemanais.length > 0 && !lmeSemana) {
      setLmeSemana(String(mediasSemanais[0]?.key || ""));
    }
  }, [mediasSemanais, lmeSemana]);

  // Calcular média
  const calcularMedia = (registros: any[], campo: string) => {
    const validos = registros.filter((h: any) => h[campo] != null && h[campo] > 0);
    if (validos.length === 0) return 0;
    return validos.reduce((acc: number, h: any) => acc + h[campo], 0) / validos.length;
  };

  // Função para obter cotação LME baseado no filtro selecionado
  const getLmeCotacao = () => {
    if (lmeTipoFiltro === "manual") {
      return null; // Usa valores manuais
    } else if (lmeTipoFiltro === "dia") {
      const registro = historico.find((h: any) => h.data === lmeData);
      if (registro) {
        return {
          cobre_usd_t: registro.cobre_usd_t,
          dolar_brl: registro.dolar_brl,
          label: format(parseISO(lmeData), "dd/MM/yyyy", { locale: ptBR })
        };
      }
      return null;
    } else if (lmeTipoFiltro === "semana") {
      // Usar médias semanais OFICIAIS importadas do banco
      const media = mediasSemanais.find((m: any) => String(m.key) === lmeSemana);
      if (media) {
        return {
          cobre_usd_t: media.cobre_usd_t,
          dolar_brl: media.dolar_brl,
          label: `S${media.semana_numero} (${media.ano})`
        };
      }
      return null;
    } else if (lmeTipoFiltro === "mes") {
      const [ano, mes] = lmeMes.split("-").map(Number);
      const inicioMes = new Date(ano, mes - 1, 1);
      const fimMes = new Date(ano, mes, 0);
      const registrosMes = historico.filter((h: any) => {
        const dataRegistro = parseISO(h.data);
        return isWithinInterval(dataRegistro, { start: inicioMes, end: fimMes });
      });
      if (registrosMes.length === 0) return null;
      
      const cobreMedia = calcularMedia(registrosMes, 'cobre_usd_t');
      const dolarMedia = calcularMedia(registrosMes, 'dolar_brl');
      return {
        cobre_usd_t: cobreMedia,
        dolar_brl: dolarMedia,
        label: format(inicioMes, "MMMM yyyy", { locale: ptBR })
      };
    }
    return null;
  };

  const lmeCotacao = getLmeCotacao();

  // Atualizar valores quando cotação mudar (se não for manual)
  useEffect(() => {
    if (lmeTipoFiltro !== "manual" && lmeCotacao) {
      if (lmeCotacao.cobre_usd_t) setCobreUsdT(Number(lmeCotacao.cobre_usd_t));
      if (lmeCotacao.dolar_brl) setDolarBrl(Number(lmeCotacao.dolar_brl));
    }
  }, [lmeCotacao, lmeTipoFiltro]);

  // Atualizar datas de vencimento das parcelas
  useEffect(() => {
    if (dataCompra) {
      const baseDate = new Date(dataCompra);
      setParcelas(prev => prev.map(p => ({
        ...p,
        dataVencimento: format(addDays(baseDate, p.dias), "yyyy-MM-dd")
      })));
    }
  }, [dataCompra]);

  // === CÁLCULOS LME VERGALHÃO ===
  const lmeSemanaBrlKg = (cobreUsdT * dolarBrl) / 1000;
  const precoComImposto = lmeSemanaBrlKg / fatorImposto;
  const precoAVista = precoComImposto * (1 - pctLmeNegociada / 100);

  // Calcular valores das parcelas com custo financeiro prorata
  // Fórmula: Juros (%) = Taxa Mensal × (Dias / 30)
  //          Juros (R$) = Valor Base × Juros (%)
  //          Valor Total = Valor Base + Juros (R$)
  const parcelasComValor = parcelas.map(p => {
    const percentualAuto = 100 / parcelas.length;
    const valorBase = precoAVista * (percentualAuto / 100);
    const jurosPct = (taxaFinanceiraMensal / 100) * (p.dias / 30);
    const jurosRs = valorBase * jurosPct;
    return {
      ...p,
      percentual: percentualAuto,
      valor: valorBase,
      jurosPct,
      jurosRs,
      valorComFinanceiro: valorBase + jurosRs
    };
  });

  const totalParcelas = parcelasComValor.reduce((acc, p) => acc + p.valor, 0);
  const totalJuros = parcelasComValor.reduce((acc, p) => acc + (p.jurosRs || 0), 0);
  const totalComFinanceiro = parcelasComValor.reduce((acc, p) => acc + (p.valorComFinanceiro || 0), 0);

  // === CÁLCULOS SUCATA ===
  const totalMediaBrl = (cobreUsdT * dolarBrl);
  const precoFinalKg = (totalMediaBrl / 1000) * (pctLmeSucata / 100);
  const valorVendaSucata = precoFinalKg * pesoKg;
  const valorCompra = custoCompraKg * pesoKg;
  const valorMO = custoMO * pesoKg;
  
  // Cálculo do custo financeiro prorata para sucata (usa taxa separada)
  const jurosProrataSucata = (taxaFinanceiraSucata / 100) * (prazoSucataDias / 30);
  const custoFinanceiroRsKg = custoCompraKg * jurosProrataSucata;
  const valorFinanceiro = custoFinanceiroRsKg * pesoKg;
  
  const difOperacoes = valorCompra - valorVendaSucata;
  const saldoOperacao = valorVendaSucata - valorCompra - valorMO - valorFinanceiro;
  const precoIndustrializado = custoCompraKg + custoMO + custoFinanceiroRsKg + (difOperacoes > 0 ? difOperacoes / pesoKg : 0);

  // === COMPARATIVO ===
  const diferenca = totalComFinanceiro - precoIndustrializado;
  const economiaPct = ((diferenca / totalComFinanceiro) * 100);
  const valeAPena = saldoOperacao > 0;

  // Dados do gráfico comparativo
  const dadosComparativo = [
    { nome: "Vergalhão LME", valor: totalComFinanceiro, fill: "#f59e0b" },
    { nome: "Sucata + Ind.", valor: precoIndustrializado, fill: "#10b981" },
  ];

  // === CÁLCULOS ORÇAMENTO TERCEIROS ===
  const orcTotalCustosKg = orcCustoFreteKg + orcCustoMoTerceiraKg + orcCustoMoInternaKg;
  
  // Quantidades baseadas nas duas perdas
  const orcQtdRetornadaReal = orcQtdRecebidaKg * (1 - orcPerdaRealPct / 100);    // O que realmente sobra
  const orcQtdRetornadaCliente = orcQtdRecebidaKg * (1 - orcPerdaClientePct / 100); // O que informamos ao cliente
  
  // Diferença de perda = lucro adicional em kg
  const orcDiferencaPerdaKg = orcQtdRetornadaReal - orcQtdRetornadaCliente;
  const orcDiferencaPerdaPct = orcPerdaClientePct - orcPerdaRealPct;
  
  // Lucro da diferença de perda (em R$) - material que "sobra"
  const orcLucroPerdaRs = orcDiferencaPerdaKg * orcPrecoCompraKg;
  
  const orcCustoServicoKg = orcCobrancaMode === "valor" 
    ? orcCobrancaValor 
    : (orcTotalCustosKg * (1 + orcCobrancaValor / 100));
  const orcMargemLucroKg = orcCustoServicoKg - orcTotalCustosKg;
  const orcMargemLucroPct = orcTotalCustosKg > 0 ? (orcMargemLucroKg / orcTotalCustosKg) * 100 : 0;
  
  // Receita do serviço (baseada no que entregamos ao cliente)
  const orcReceitaTotal = orcCustoServicoKg * orcQtdRetornadaCliente;
  
  // Custo operacional (baseado no que recebemos)
  const orcCustoOperacionalTotal = orcTotalCustosKg * orcQtdRecebidaKg;
  
  // LUCRO TOTAL = Lucro do Serviço + Lucro da Diferença de Perda
  const orcLucroServico = orcReceitaTotal - orcCustoOperacionalTotal;
  const orcLucroTotal = orcLucroServico + orcLucroPerdaRs;
  
  // Cálculo para o cliente (usa perda do cliente)
  const orcValorMaterialCliente = orcQtdRecebidaKg * orcPrecoCompraKg;
  const orcCustoBaseKgRetornado = orcQtdRetornadaCliente > 0 
    ? orcValorMaterialCliente / orcQtdRetornadaCliente 
    : 0;
  const orcValorFinalKgCliente = orcCustoBaseKgRetornado + orcCustoServicoKg;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Parcelas handlers
  const addParcela = () => {
    const lastParcela = parcelas[parcelas.length - 1];
    setParcelas([...parcelas, {
      numero: parcelas.length + 1,
      percentual: 0,
      dias: (lastParcela?.dias || 30) + 10,
      dataVencimento: "",
      valor: 0
    }]);
  };

  const removeParcela = (idx: number) => {
    setParcelas(parcelas.filter((_, i) => i !== idx));
  };

  const updateParcela = (idx: number, field: keyof Parcela, value: number) => {
    setParcelas(prev => prev.map((p, i) => 
      i === idx ? { ...p, [field]: value } : p
    ));
  };

  // Exportar para PDF
  const exportToPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Simulação LME - ${format(new Date(), "dd/MM/yyyy HH:mm")}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
            h1 { color: #333; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px; font-size: 18px; }
            h2 { color: #555; margin-top: 20px; font-size: 14px; }
            h3 { color: #666; margin-top: 15px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #f5f5f5; }
            .highlight { background-color: #fef3c7; font-weight: bold; }
            .success { color: #10b981; }
            .danger { color: #ef4444; }
            .section { margin-bottom: 25px; page-break-inside: avoid; }
            .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Simulação LME - Orben</h1>
          <p><strong>Data:</strong> ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
          
          <div class="section">
            <h2>Parâmetros de Mercado</h2>
            <table>
              <tr><th>Cobre (US$/t)</th><td>${cobreUsdT.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
              <tr><th>Dólar (R$/US$)</th><td>R$ ${dolarBrl.toFixed(4)}</td></tr>
              <tr><th>LME Semana (R$/kg)</th><td>${formatCurrency(lmeSemanaBrlKg)}</td></tr>
              <tr><th>Taxa Financeira</th><td>${taxaFinanceiraMensal.toFixed(2)}% a.m.</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h2>Vergalhão LME</h2>
            <table>
              <tr><th>Fator Imposto</th><td>${fatorImposto}</td></tr>
              <tr><th>% LME Negociada</th><td>${pctLmeNegociada}%</td></tr>
              <tr><th>Preço c/ Imposto</th><td>${formatCurrency(precoComImposto)}/kg</td></tr>
              <tr class="highlight"><th>Preço à Vista</th><td>${formatCurrency(precoAVista)}/kg</td></tr>
              <tr><th>Custo Financeiro</th><td>+${formatCurrency(totalJuros)}/kg</td></tr>
              <tr class="highlight"><th>Preço Final a Prazo</th><td>${formatCurrency(totalComFinanceiro)}/kg</td></tr>
            </table>
            
            <h3>Parcelas</h3>
            <table>
              <tr><th>Parcela</th><th>%</th><th>Dias</th><th>Vencimento</th><th>Valor Base</th><th>Juros (%)</th><th>Juros (R$)</th><th>Total</th></tr>
              ${parcelasComValor.map(p => `
                <tr>
                  <td>${p.numero}ª</td>
                  <td>${p.percentual}%</td>
                  <td>${p.dias}</td>
                  <td>${p.dataVencimento ? format(new Date(p.dataVencimento), "dd/MM/yyyy") : "-"}</td>
                  <td>${formatCurrency(p.valor)}</td>
                  <td>${((p.jurosPct || 0) * 100).toFixed(3)}%</td>
                  <td>${formatCurrency(p.jurosRs || 0)}</td>
                  <td>${formatCurrency(p.valorComFinanceiro || 0)}</td>
                </tr>
              `).join('')}
              <tr class="highlight">
                <td colspan="4"><strong>TOTAL</strong></td>
                <td>${formatCurrency(totalParcelas)}</td>
                <td></td>
                <td>${formatCurrency(totalJuros)}</td>
                <td><strong>${formatCurrency(totalComFinanceiro)}/kg</strong></td>
              </tr>
            </table>
          </div>
          
          <div class="section">
            <h2>Sucata + Industrialização</h2>
            <table>
              <tr><th>% LME Sucata</th><td>${pctLmeSucata}%</td></tr>
              <tr><th>Preço Sucata</th><td>${formatCurrency(precoFinalKg)}/kg</td></tr>
              <tr><th>Custo Compra</th><td>${formatCurrency(custoCompraKg)}/kg</td></tr>
              <tr><th>Mão de Obra</th><td>${formatCurrency(custoMO)}/kg</td></tr>
              <tr><th>Prazo (dias)</th><td>${prazoSucataDias}</td></tr>
              <tr><th>Custo Financeiro</th><td>${formatCurrency(custoFinanceiroRsKg)}/kg</td></tr>
              <tr class="highlight"><th>Preço Industrializado</th><td>${formatCurrency(precoIndustrializado)}/kg</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h2>Resultado Comparativo</h2>
            <table>
              <tr><th>Vergalhão LME a Prazo</th><td>${formatCurrency(totalComFinanceiro)}/kg</td></tr>
              <tr><th>Custo Industrializado</th><td>${formatCurrency(precoIndustrializado)}/kg</td></tr>
              <tr><th>Diferença</th><td class="${diferenca > 0 ? 'danger' : 'success'}">${formatCurrency(diferenca)}/kg</td></tr>
              <tr><th>Economia</th><td class="${economiaPct > 0 ? 'danger' : 'success'}">${economiaPct.toFixed(1)}%</td></tr>
              <tr class="highlight"><th>Resultado</th><td class="${valeAPena ? 'success' : 'danger'}">${valeAPena ? "COMPRAR SUCATA" : "COMPRAR VERGALHÃO"}</td></tr>
            </table>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // Salvar simulação
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("simulacoes_lme").insert({
        cobre_usd_t: cobreUsdT,
        dolar_brl: dolarBrl,
        fator_imposto: fatorImposto,
        pct_lme_negociada: pctLmeNegociada,
        lme_semana_brl_kg: lmeSemanaBrlKg,
        preco_com_imposto: precoComImposto,
        preco_a_vista: precoAVista,
        preco_a_prazo: totalComFinanceiro,
        // Novos campos
        taxa_financeira_mensal: taxaFinanceiraMensal,
        total_juros_lme: totalJuros,
        preco_final_prazo: totalComFinanceiro,
        pct_lme_sucata: pctLmeSucata,
        prazo_sucata_dias: prazoSucataDias,
        custo_sucata_kg: precoIndustrializado,
        economia_pct_new: economiaPct,
        resultado_new: valeAPena ? "COMPRAR SUCATA" : "COMPRAR VERGALHÃO",
        parcelas_json: parcelasComValor.map(p => ({
          numero: p.numero,
          percentual: p.percentual,
          dias: p.dias,
          valor: p.valor,
          jurosPct: p.jurosPct,
          jurosRs: p.jurosRs,
          valorComFinanceiro: p.valorComFinanceiro
        })),
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulacoes-lme"] });
      toast({ title: "Simulação salva", description: "Registro salvo no histórico." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Salvar orçamento de terceiros
  const saveOrcamentoMutation = useMutation({
    mutationFn: async () => {
      if (!orcNomeCliente.trim()) {
        throw new Error("Nome do cliente é obrigatório");
      }
      const payload = {
        nome_cliente: orcNomeCliente,
        material_recebido: orcMaterialRecebido,
        qtd_recebida_kg: orcQtdRecebidaKg,
        preco_compra_kg: orcPrecoCompraKg,
        custo_frete_kg: orcCustoFreteKg,
        custo_mo_terceira_kg: orcCustoMoTerceiraKg,
        custo_mo_interna_kg: orcCustoMoInternaKg,
        perda_real_pct: orcPerdaRealPct,
        perda_cliente_pct: orcPerdaClientePct,
        perda_pct: orcPerdaClientePct, // Manter compatibilidade
        lucro_perda_kg: orcLucroPerdaRs,
        total_custos_kg: orcTotalCustosKg,
        cobranca_mode: orcCobrancaMode,
        cobranca_valor: orcCobrancaValor,
        custo_servico_kg: orcCustoServicoKg,
        material_retornado: orcMaterialRetornado,
        qtd_retornada_kg: orcQtdRetornadaCliente,
        valor_final_kg_cliente: orcValorFinalKgCliente,
        margem_lucro_kg: orcMargemLucroKg,
        lucro_total: orcLucroTotal,
        created_by: user?.id,
      };
      
      if (orcEditingId) {
        const { error } = await supabase
          .from("orcamentos_servico_terceiros")
          .update(payload)
          .eq("id", orcEditingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("orcamentos_servico_terceiros")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos-servico-terceiros"] });
      toast({ 
        title: orcEditingId ? "Orçamento atualizado" : "Orçamento salvo", 
        description: "Registro salvo no histórico." 
      });
      setOrcEditingId(null);
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const loadOrcamento = (orc: any) => {
    setOrcNomeCliente(orc.nome_cliente || "");
    setOrcMaterialRecebido(orc.material_recebido || "");
    setOrcQtdRecebidaKg(orc.qtd_recebida_kg || 0);
    setOrcPrecoCompraKg(orc.preco_compra_kg || 0);
    setOrcCustoFreteKg(orc.custo_frete_kg || 0);
    setOrcCustoMoTerceiraKg(orc.custo_mo_terceira_kg || 0);
    setOrcCustoMoInternaKg(orc.custo_mo_interna_kg || 0);
    setOrcPerdaRealPct(orc.perda_real_pct ?? orc.perda_pct ?? 0);
    setOrcPerdaClientePct(orc.perda_cliente_pct ?? orc.perda_pct ?? 0);
    setOrcCobrancaMode(orc.cobranca_mode || "valor");
    setOrcCobrancaValor(orc.cobranca_valor || 0);
    setOrcMaterialRetornado(orc.material_retornado || "");
    setOrcEditingId(orc.id);
    toast({ title: "Orçamento carregado", description: `Cliente: ${orc.nome_cliente}` });
  };

  const novoOrcamento = () => {
    setOrcNomeCliente("");
    setOrcMaterialRecebido("Sucata");
    setOrcQtdRecebidaKg(10000);
    setOrcPrecoCompraKg(70);
    setOrcCustoFreteKg(0);
    setOrcCustoMoTerceiraKg(0);
    setOrcCustoMoInternaKg(3.40);
    setOrcPerdaRealPct(3);
    setOrcPerdaClientePct(5);
    setOrcCobrancaMode("valor");
    setOrcCobrancaValor(7.10);
    setOrcMaterialRetornado("Fio de Cobre 1,83mm");
    setOrcEditingId(null);
  };

  // PDF Orçamento Ibrac (Interno)
  const exportPdfIbrac = () => {
    const printContent = `
      <html>
        <head>
          <title>Orçamento Serviço Terceiros - Ibrac - ${format(new Date(), "dd/MM/yyyy HH:mm")}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; }
            h1 { color: #0ea5e9; border-bottom: 3px solid #0ea5e9; padding-bottom: 10px; }
            h2 { color: #555; margin-top: 25px; border-left: 4px solid #0ea5e9; padding-left: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; width: 40%; }
            .highlight { background-color: #fef3c7; font-weight: bold; }
            .success { color: #10b981; font-weight: bold; }
            .danger { color: #ef4444; }
            .total-row { background-color: #e0f2fe; font-weight: bold; }
            .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #0ea5e9; }
            .confidential { color: #ef4444; font-size: 12px; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <div class="logo">IBRAC - Orçamento Interno</div>
            <div>
              <p><strong>Data:</strong> ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
              <p class="confidential">DOCUMENTO CONFIDENCIAL - USO INTERNO</p>
            </div>
          </div>
          
          <h1>Orçamento Serviço para Terceiros</h1>
          
          <h2>Dados do Cliente</h2>
          <table>
            <tr><th>Cliente</th><td>${orcNomeCliente || "Não informado"}</td></tr>
            <tr><th>Material Recebido</th><td>${orcMaterialRecebido}</td></tr>
            <tr><th>Quantidade Recebida</th><td>${orcQtdRecebidaKg.toLocaleString("pt-BR")} kg</td></tr>
            <tr><th>Preço Compra Cliente</th><td>${formatCurrency(orcPrecoCompraKg)}/kg</td></tr>
            <tr><th>Valor Total Material</th><td>${formatCurrency(orcValorMaterialCliente)}</td></tr>
          </table>
          
          <h2>Custos Operacionais (por kg)</h2>
          <table>
            <tr><th>Custos de Frete</th><td>\${formatCurrency(orcCustoFreteKg)}/kg</td></tr>
            <tr><th>Custos MO Terceirizada</th><td>\${formatCurrency(orcCustoMoTerceiraKg)}/kg</td></tr>
            <tr><th>Custos MO Interna</th><td>\${formatCurrency(orcCustoMoInternaKg)}/kg</td></tr>
            <tr class="total-row"><th>TOTAL CUSTOS</th><td>\${formatCurrency(orcTotalCustosKg)}/kg</td></tr>
          </table>
          
          <h2>Análise de Perdas</h2>
          <table>
            <tr><th>Perda Real (efetiva)</th><td>\${orcPerdaRealPct}%</td><td>\${(orcQtdRecebidaKg * orcPerdaRealPct / 100).toLocaleString("pt-BR")} kg</td></tr>
            <tr><th>Perda Cliente (informada)</th><td>\${orcPerdaClientePct}%</td><td>\${(orcQtdRecebidaKg * orcPerdaClientePct / 100).toLocaleString("pt-BR")} kg</td></tr>
            <tr><th>Qtd Retornada Real</th><td colspan="2">\${orcQtdRetornadaReal.toLocaleString("pt-BR")} kg</td></tr>
            <tr><th>Qtd Entregue ao Cliente</th><td colspan="2">\${orcQtdRetornadaCliente.toLocaleString("pt-BR")} kg</td></tr>
            \${orcDiferencaPerdaPct > 0 ? \`
              <tr class="highlight" style="background-color: #dcfce7;">
                <th style="color: #16a34a;">Diferença (Lucro)</th>
                <td style="color: #16a34a;">\${orcDiferencaPerdaPct.toFixed(1)}%</td>
                <td style="color: #16a34a; font-weight: bold;">\${orcDiferencaPerdaKg.toLocaleString("pt-BR")} kg = \${formatCurrency(orcLucroPerdaRs)}</td>
              </tr>
            \` : ''}
          </table>
          
          <h2>Cobrança e Margem</h2>
          <table>
            <tr><th>Modo de Cobrança</th><td>\${orcCobrancaMode === "valor" ? "Valor fixo por kg" : "Acréscimo percentual"}</td></tr>
            <tr><th>Valor/Acréscimo</th><td>\${orcCobrancaMode === "valor" ? formatCurrency(orcCobrancaValor) + "/kg" : orcCobrancaValor + "%"}</td></tr>
            <tr class="highlight"><th>Cobrança Serviço Final</th><td>\${formatCurrency(orcCustoServicoKg)}/kg</td></tr>
            <tr><th>Margem de Lucro</th><td class="success">\${formatCurrency(orcMargemLucroKg)}/kg (\${orcMargemLucroPct.toFixed(1)}%)</td></tr>
          </table>
          
          <h2>Resultado da Operação</h2>
          <table>
            <tr><th>Quantidade Retornada Cliente</th><td>\${orcQtdRetornadaCliente.toLocaleString("pt-BR")} kg</td></tr>
            <tr><th>Material Retornado</th><td>\${orcMaterialRetornado}</td></tr>
            <tr><th>Custo Total Operação</th><td>\${formatCurrency(orcCustoOperacionalTotal)}</td></tr>
            <tr><th>Receita Total</th><td>\${formatCurrency(orcReceitaTotal)}</td></tr>
          </table>
          
          <h2>Composição do Lucro</h2>
          <table>
            <tr><th>Lucro do Serviço</th><td>\${formatCurrency(orcLucroServico)}</td></tr>
            <tr style="background-color: #dcfce7;"><th style="color: #16a34a;">Lucro da Diferença de Perda</th><td class="success">\${formatCurrency(orcLucroPerdaRs)}</td></tr>
            <tr class="total-row"><th>LUCRO TOTAL</th><td class="\${orcLucroTotal >= 0 ? 'success' : 'danger'}">\${formatCurrency(orcLucroTotal)}</td></tr>
          </table>
          
          <h2>Valor Final para Cliente</h2>
          <table>
            <tr class="highlight">
              <th>Valor por KG Retornado</th>
              <td style="font-size: 18px;">\${formatCurrency(orcValorFinalKgCliente)}/kg</td>
            </tr>
          </table>
          <p style="font-size: 12px; color: #666;">
            <strong>Memória de cálculo:</strong> (\${orcQtdRecebidaKg.toLocaleString("pt-BR")} kg × \${formatCurrency(orcPrecoCompraKg)}) / \${orcQtdRetornadaCliente.toLocaleString("pt-BR")} kg + \${formatCurrency(orcCustoServicoKg)} = \${formatCurrency(orcValorFinalKgCliente)}/kg
          </p>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // PDF Cliente (Simplificado)
  const exportPdfCliente = () => {
    const printContent = `
      <html>
        <head>
          <title>Proposta de Serviço - ${orcNomeCliente || "Cliente"} - ${format(new Date(), "dd/MM/yyyy")}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; }
            h1 { color: #0ea5e9; text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 15px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #0ea5e9; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8fafc; width: 50%; }
            .highlight { background-color: #e0f2fe; }
            .total { background-color: #0ea5e9; color: white; font-size: 18px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            .memory { font-size: 11px; color: #888; margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">IBRAC</div>
            <p>Proposta de Serviço de Beneficiamento</p>
            <p><strong>Data:</strong> ${format(new Date(), "dd/MM/yyyy")}</p>
          </div>
          
          <h1>Proposta Comercial</h1>
          
          ${orcNomeCliente ? `<p><strong>Cliente:</strong> ${orcNomeCliente}</p>` : ''}
          
          <table>
            <tr><th>Material Enviado</th><td>${orcMaterialRecebido}</td></tr>
            <tr><th>Quantidade Enviada</th><td>${orcQtdRecebidaKg.toLocaleString("pt-BR")} kg</td></tr>
            <tr><th>Valor Unitário do Material</th><td>${formatCurrency(orcPrecoCompraKg)}/kg</td></tr>
            <tr class="highlight"><th>Valor Total do Material</th><td>${formatCurrency(orcValorMaterialCliente)}</td></tr>
          </table>
          
          <table>
            <tr><th>Custo do Serviço</th><td>\${formatCurrency(orcCustoServicoKg)}/kg</td></tr>
            <tr><th>Material Retornado</th><td>\${orcMaterialRetornado}</td></tr>
            <tr><th>Quantidade Retornada</th><td>\${orcQtdRetornadaCliente.toLocaleString("pt-BR")} kg</td></tr>
          </table>
          
          <table>
            <tr class="total">
              <th style="background-color: #0ea5e9; color: white;">VALOR FINAL POR KG</th>
              <td style="background-color: #0ea5e9; color: white; font-weight: bold;">\${formatCurrency(orcValorFinalKgCliente)}/kg</td>
            </tr>
          </table>
          
          <div class="memory">
            <strong>Composição do valor:</strong><br/>
            Valor do material: \${formatCurrency(orcValorMaterialCliente)} / \${orcQtdRetornadaCliente.toLocaleString("pt-BR")} kg = \${formatCurrency(orcCustoBaseKgRetornado)}/kg<br/>
            Custo do serviço: + \${formatCurrency(orcCustoServicoKg)}/kg<br/>
            <strong>Total: \${formatCurrency(orcValorFinalKgCliente)}/kg</strong>
          </div>
          
          <div class="footer">
            <p>Esta proposta é válida por 7 dias.</p>
            <p>IBRAC - Indústria Brasileira de Cobre</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Simulador LME</h1>
            <p className="text-muted-foreground">
              Simule compra de Vergalhão LME ou Sucata + Industrialização
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <FileText className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Resetar
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-gradient-copper hover:opacity-90 shadow-copper"
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="vergalhao" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="vergalhao">Vergalhão LME</TabsTrigger>
            <TabsTrigger value="sucata">Sucata + Industrialização</TabsTrigger>
            <TabsTrigger value="orcamento">Orçamento Terceiros</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* ========== TAB VERGALHÃO LME ========== */}
          <TabsContent value="vergalhao">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                {/* Cotação LME */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      Cotação LME
                    </CardTitle>
                    <CardDescription>
                      Parâmetros do mercado
                      {lmeCotacao && lmeTipoFiltro !== "manual" && (
                        <span className="text-xs ml-2">({lmeCotacao.label})</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Filtro de cotação */}
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <Label className="text-sm">Usar cotação:</Label>
                      <Select value={lmeTipoFiltro} onValueChange={(v: "dia" | "semana" | "mes" | "manual") => setLmeTipoFiltro(v)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="semana">Média Semanal</SelectItem>
                          <SelectItem value="dia">Dia Específico</SelectItem>
                          <SelectItem value="mes">Média Mensal</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {lmeTipoFiltro === "dia" && (
                        <Input 
                          type="date" 
                          value={lmeData} 
                          onChange={(e) => setLmeData(e.target.value)}
                          className="w-40"
                        />
                      )}
                      
                      {lmeTipoFiltro === "semana" && (
                        <Select value={lmeSemana} onValueChange={setLmeSemana}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {semanasDisponiveis.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {lmeTipoFiltro === "mes" && (
                        <Input 
                          type="month" 
                          value={lmeMes} 
                          onChange={(e) => setLmeMes(e.target.value)}
                          className="w-40"
                        />
                      )}
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Cobre (US$/t)</Label>
                        {lmeTipoFiltro !== "manual" ? (
                          <Input
                            type="text"
                            value={cobreUsdT.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            disabled
                            className="bg-muted"
                          />
                        ) : (
                          <Input
                            type="number"
                            value={cobreUsdT}
                            onChange={(e) => setCobreUsdT(Number(e.target.value))}
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Dólar (R$/US$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={dolarBrl}
                          onChange={(e) => setDolarBrl(Number(e.target.value))}
                          disabled={lmeTipoFiltro !== "manual"}
                          className={lmeTipoFiltro !== "manual" ? "bg-muted" : ""}
                        />
                      </div>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Fator Imposto</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={fatorImposto}
                          onChange={(e) => setFatorImposto(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>% LME Negociada (desconto)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={pctLmeNegociada}
                            onChange={(e) => setPctLmeNegociada(Number(e.target.value))}
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Custo Financeiro */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Percent className="h-5 w-5 text-primary" />
                      Custo Financeiro
                    </CardTitle>
                    <CardDescription>Taxa aplicada ao prazo das parcelas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Taxa Financeira (% ao mês)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={taxaFinanceiraMensal}
                          onChange={(e) => setTaxaFinanceiraMensal(Number(e.target.value))}
                          className="pr-14"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">% a.m.</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Parcelas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      Condições de Pagamento
                    </CardTitle>
                    <CardDescription>Configure as parcelas e prazos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Data da Compra</Label>
                        <Input
                          type="date"
                          value={dataCompra}
                          onChange={(e) => setDataCompra(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Parcela</TableHead>
                            <TableHead className="w-20">Dias</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead className="text-right">Valor Base</TableHead>
                            <TableHead className="text-right">Juros (%)</TableHead>
                            <TableHead className="text-right">Juros (R$)</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parcelasComValor.map((p, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{p.numero}ª</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={p.dias}
                                  onChange={(e) => updateParcela(idx, "dias", Number(e.target.value))}
                                  className="h-8 w-16"
                                />
                              </TableCell>
                              <TableCell>
                                {p.dataVencimento ? format(new Date(p.dataVencimento), "dd/MM/yyyy") : "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(p.valor)}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {((p.jurosPct || 0) * 100).toFixed(3)}%
                              </TableCell>
                              <TableCell className="text-right text-orange-600">
                                +{formatCurrency(p.jurosRs || 0)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(p.valorComFinanceiro || 0)}
                              </TableCell>
                              <TableCell>
                                {parcelas.length > 1 && (
                                  <Button variant="ghost" size="icon" onClick={() => removeParcela(idx)} className="h-8 w-8">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/30 font-bold">
                            <TableCell colSpan={4}>TOTAL</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalParcelas)}</TableCell>
                            <TableCell className="text-right"></TableCell>
                            <TableCell className="text-right text-orange-600">+{formatCurrency(totalJuros)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalComFinanceiro)}/kg</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    <Button variant="outline" size="sm" onClick={addParcela}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Parcela
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Resultado Vergalhão */}
              <div className="space-y-6">
                <Card className="border-primary/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calculator className="h-5 w-5" />
                      Resultado Vergalhão
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">LME Semana (R$/kg)</span>
                        <span className="font-medium">{formatCurrency(lmeSemanaBrlKg)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Preço c/ Imposto</span>
                        <span className="font-medium">{formatCurrency(precoComImposto)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Preço à Vista</span>
                        <span className="font-medium">{formatCurrency(precoAVista)}/kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Custo Financeiro</span>
                        <span className="font-medium text-orange-600">+{formatCurrency(totalJuros)}/kg</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Preço Final a Prazo</span>
                        <span className="text-primary">{formatCurrency(totalComFinanceiro)}/kg</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========== TAB SUCATA ========== */}
          <TabsContent value="sucata">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                {/* Cotação LME */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      Média Semana LME
                    </CardTitle>
                    <CardDescription>Base para cálculo do preço da sucata</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Filtro de cotação */}
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <Label className="text-sm">Usar cotação:</Label>
                      <Select value={lmeTipoFiltro} onValueChange={(v: "dia" | "semana" | "mes" | "manual") => setLmeTipoFiltro(v)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="semana">Média Semanal</SelectItem>
                          <SelectItem value="dia">Dia Específico</SelectItem>
                          <SelectItem value="mes">Média Mensal</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {lmeTipoFiltro === "dia" && (
                        <Input 
                          type="date" 
                          value={lmeData} 
                          onChange={(e) => setLmeData(e.target.value)}
                          className="w-40"
                        />
                      )}
                      
                      {lmeTipoFiltro === "semana" && (
                        <Select value={lmeSemana} onValueChange={setLmeSemana}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {semanasDisponiveis.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {lmeTipoFiltro === "mes" && (
                        <Input 
                          type="month" 
                          value={lmeMes} 
                          onChange={(e) => setLmeMes(e.target.value)}
                          className="w-40"
                        />
                      )}
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Cobre (US$/t)</Label>
                        <Input
                          type="number"
                          value={cobreUsdT}
                          onChange={(e) => setCobreUsdT(Number(e.target.value))}
                          disabled={lmeTipoFiltro !== "manual"}
                          className={lmeTipoFiltro !== "manual" ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Dólar (R$/US$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={dolarBrl}
                          onChange={(e) => setDolarBrl(Number(e.target.value))}
                          disabled={lmeTipoFiltro !== "manual"}
                          className={lmeTipoFiltro !== "manual" ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Média (R$/t)</Label>
                        <Input
                          value={formatCurrency(totalMediaBrl)}
                          disabled
                          className="bg-muted font-bold"
                        />
                      </div>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>% LME Sucata (Mista: 97%, Mel: 102%)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="200"
                            value={pctLmeSucata}
                            onChange={(e) => setPctLmeSucata(Number(e.target.value))}
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Preço Final Sucata (R$/kg)</Label>
                        <Input
                          value={formatCurrency(precoFinalKg)}
                          disabled
                          className="bg-muted font-bold text-primary"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Operação Sucata */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="h-5 w-5 text-primary" />
                      Simulação Operação
                    </CardTitle>
                    <CardDescription>Compare venda da sucata vs compra + industrialização</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                      <div className="space-y-2">
                        <Label>Peso (kg)</Label>
                        <Input
                          type="number"
                          value={pesoKg}
                          onChange={(e) => setPesoKg(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Custo Compra (R$/kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={custoCompraKg}
                          onChange={(e) => setCustoCompraKg(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mão de Obra (R$/kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={custoMO}
                          onChange={(e) => setCustoMO(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Taxa Financeira (% a.m.)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={taxaFinanceiraSucata}
                            onChange={(e) => setTaxaFinanceiraSucata(Number(e.target.value))}
                            className="pr-14"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">% a.m.</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Prazo (dias)</Label>
                        <Input
                          type="number"
                          value={prazoSucataDias}
                          onChange={(e) => setPrazoSucataDias(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Custo Financeiro Calculado:</span>
                        <span className="font-medium text-orange-600">{formatCurrency(custoFinanceiroRsKg)}/kg ({(jurosProrataSucata * 100).toFixed(3)}%)</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Tabela de cálculo */}
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Venda da Sucata</TableCell>
                            <TableCell className="text-right">{pesoKg.toLocaleString("pt-BR")} kg</TableCell>
                            <TableCell className="text-right">{formatCurrency(precoFinalKg)}/kg</TableCell>
                            <TableCell className="text-right font-bold text-success">
                              {formatCurrency(valorVendaSucata)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">(-) Compra</TableCell>
                            <TableCell className="text-right">{pesoKg.toLocaleString("pt-BR")} kg</TableCell>
                            <TableCell className="text-right">{formatCurrency(custoCompraKg)}/kg</TableCell>
                            <TableCell className="text-right font-bold text-destructive">
                              {formatCurrency(valorCompra)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={3} className="font-medium">Diferença das Operações</TableCell>
                            <TableCell className={cn("text-right font-bold", difOperacoes > 0 ? "text-destructive" : "text-success")}>
                              {formatCurrency(valorVendaSucata - valorCompra)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">(-) Mão de Obra</TableCell>
                            <TableCell className="text-right">{pesoKg.toLocaleString("pt-BR")} kg</TableCell>
                            <TableCell className="text-right">{formatCurrency(custoMO)}/kg</TableCell>
                            <TableCell className="text-right font-bold text-destructive">
                              {formatCurrency(valorMO)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">(-) Financeiro</TableCell>
                            <TableCell className="text-right">{pesoKg.toLocaleString("pt-BR")} kg</TableCell>
                            <TableCell className="text-right">{formatCurrency(custoFinanceiroRsKg)}/kg</TableCell>
                            <TableCell className="text-right font-bold text-destructive">
                              {formatCurrency(valorFinanceiro)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-primary/10">
                            <TableCell colSpan={3} className="font-bold text-lg">SALDO</TableCell>
                            <TableCell className={cn("text-right font-bold text-lg", saldoOperacao > 0 ? "text-success" : "text-destructive")}>
                              {formatCurrency(saldoOperacao)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={3} className="font-bold">Preço do KG (Industrialização)</TableCell>
                            <TableCell className="text-right font-bold text-primary text-lg">
                              {formatCurrency(precoIndustrializado)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Resultado Sucata */}
              <div className="space-y-6">
                <Card className={cn(valeAPena ? "border-success/50" : "border-destructive/50")}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Zap className="h-5 w-5" />
                      Resultado Comparativo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div
                      className={cn(
                        "rounded-lg p-4 text-center",
                        valeAPena ? "bg-success/10" : "bg-destructive/10"
                      )}
                    >
                      <div
                        className={cn(
                          "inline-flex h-12 w-12 items-center justify-center rounded-full mb-2",
                          valeAPena ? "bg-success/20" : "bg-destructive/20"
                        )}
                      >
                        {valeAPena ? (
                          <TrendingUp className="h-6 w-6 text-success" />
                        ) : (
                          <TrendingDown className="h-6 w-6 text-destructive" />
                        )}
                      </div>
                      <p
                        className={cn(
                          "text-xl font-bold",
                          valeAPena ? "text-success" : "text-destructive"
                        )}
                      >
                        {valeAPena ? "OPERAÇÃO VIÁVEL" : "OPERAÇÃO INVIÁVEL"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {valeAPena
                          ? `Lucro de ${formatCurrency(saldoOperacao)}`
                          : `Prejuízo de ${formatCurrency(Math.abs(saldoOperacao))}`}
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="rounded-lg bg-primary/5 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Vergalhão LME a Prazo</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(totalComFinanceiro)}/kg
                        </p>
                      </div>
                      <div className="text-center text-2xl font-bold text-muted-foreground">vs</div>
                      <div className="rounded-lg bg-primary/5 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Custo Industrializado</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(precoIndustrializado)}/kg
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Diferença</span>
                        <span className={cn("font-bold", diferenca > 0 ? "text-destructive" : "text-success")}>
                          {formatCurrency(diferenca)}/kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Economia</span>
                        <span className={cn("font-bold", economiaPct > 0 ? "text-destructive" : "text-success")}>
                          {economiaPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Gráfico Comparativo */}
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-3">Comparativo Visual</p>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={dadosComparativo} 
                            layout="vertical"
                            margin={{ top: 5, right: 60, bottom: 5, left: 80 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis 
                              type="number" 
                              tickFormatter={(v) => `R$ ${v.toFixed(0)}`}
                              domain={['dataMin - 5', 'dataMax + 5']}
                            />
                            <YAxis type="category" dataKey="nome" width={80} fontSize={12} />
                            <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                              {dadosComparativo.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                              <LabelList 
                                dataKey="valor" 
                                position="right" 
                                formatter={(v: number) => formatCurrency(v)} 
                                style={{ fontSize: 11, fontWeight: 'bold' }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========== TAB ORÇAMENTO TERCEIROS ========== */}
          <TabsContent value="orcamento">
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Coluna Formulário */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Card: Material Recebido */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" />
                        Material Recebido
                      </CardTitle>
                      <CardDescription>Informações do material enviado pelo cliente</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nome do Cliente *</Label>
                        <Input
                          value={orcNomeCliente}
                          onChange={(e) => setOrcNomeCliente(e.target.value)}
                          placeholder="Ex: Cliente XYZ"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Material</Label>
                        <Input
                          value={orcMaterialRecebido}
                          onChange={(e) => setOrcMaterialRecebido(e.target.value)}
                          placeholder="Ex: Sucata de Cobre"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantidade Recebida (kg)</Label>
                        <Input
                          type="number"
                          value={orcQtdRecebidaKg}
                          onChange={(e) => setOrcQtdRecebidaKg(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço de Compra do Cliente (R$/kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={orcPrecoCompraKg}
                          onChange={(e) => setOrcPrecoCompraKg(Number(e.target.value))}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card: Custos Operacionais */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Custos Operacionais (R$/kg)
                      </CardTitle>
                      <CardDescription>Custos de produção e operação por kg</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Custos de Frete</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              value={orcCustoFreteKg}
                              onChange={(e) => setOrcCustoFreteKg(Number(e.target.value))}
                              className="pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$/kg</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Custos MO Terceirizada</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              value={orcCustoMoTerceiraKg}
                              onChange={(e) => setOrcCustoMoTerceiraKg(Number(e.target.value))}
                              className="pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$/kg</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Custos MO Interna</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              value={orcCustoMoInternaKg}
                              onChange={(e) => setOrcCustoMoInternaKg(Number(e.target.value))}
                              className="pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$/kg</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            Perda Real (%)
                            <span className="text-xs text-muted-foreground">(efetiva)</span>
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              value={orcPerdaRealPct}
                              onChange={(e) => setOrcPerdaRealPct(Number(e.target.value))}
                              className="pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            Perda Cliente (%)
                            <span className="text-xs text-muted-foreground">(informada)</span>
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              value={orcPerdaClientePct}
                              onChange={(e) => setOrcPerdaClientePct(Number(e.target.value))}
                              className="pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mostrar diferença de perda se houver */}
                      {orcDiferencaPerdaPct > 0 && (
                        <div className="flex justify-between items-center p-2 bg-success/10 rounded-lg border border-success/20">
                          <span className="text-sm text-success font-medium">
                            Lucro Diferença de Perda ({orcDiferencaPerdaPct.toFixed(1)}% = {orcDiferencaPerdaKg.toLocaleString("pt-BR")} kg)
                          </span>
                          <span className="font-bold text-success">+{formatCurrency(orcLucroPerdaRs)}</span>
                        </div>
                      )}
                      
                      <Separator />
                      
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">Total Custos Operacionais</span>
                        <span className="text-xl font-bold text-primary">{formatCurrency(orcTotalCustosKg)}/kg</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card: Cobrança do Serviço */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Percent className="h-5 w-5 text-primary" />
                        Cobrança do Serviço
                      </CardTitle>
                      <CardDescription>Defina quanto será cobrado do cliente</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                        <Label>Modo de cobrança:</Label>
                        <Select value={orcCobrancaMode} onValueChange={(v: "percentual" | "valor") => setOrcCobrancaMode(v)}>
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="valor">Valor por KG (R$/kg)</SelectItem>
                            <SelectItem value="percentual">Acréscimo % sobre custos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>{orcCobrancaMode === "valor" ? "Valor a Cobrar (R$/kg)" : "Acréscimo (%)"}</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              value={orcCobrancaValor}
                              onChange={(e) => setOrcCobrancaValor(Number(e.target.value))}
                              className="pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              {orcCobrancaMode === "valor" ? "R$/kg" : "%"}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Material Retornado</Label>
                          <Input
                            value={orcMaterialRetornado}
                            onChange={(e) => setOrcMaterialRetornado(e.target.value)}
                            placeholder="Ex: Fio de Cobre 1,83mm"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Coluna Resultados */}
                <div className="space-y-6">
                  {/* Card Resumo Interno (Ibrac) */}
                  <Card className="border-primary/20">
                    <CardHeader className="bg-primary/5 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Resumo Ibrac (Interno)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Qtd Recebida</span>
                        <span className="font-medium">{orcQtdRecebidaKg.toLocaleString("pt-BR")} kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Perda Real ({orcPerdaRealPct}%)</span>
                        <span className="font-medium text-destructive">-{(orcQtdRecebidaKg * orcPerdaRealPct / 100).toLocaleString("pt-BR")} kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Qtd Retornada Real</span>
                        <span className="font-medium">{orcQtdRetornadaReal.toLocaleString("pt-BR")} kg</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Perda Cliente ({orcPerdaClientePct}%)</span>
                        <span className="font-medium">{(orcQtdRecebidaKg * orcPerdaClientePct / 100).toLocaleString("pt-BR")} kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Qtd Entregue ao Cliente</span>
                        <span className="font-medium">{orcQtdRetornadaCliente.toLocaleString("pt-BR")} kg</span>
                      </div>
                      
                      {/* Lucro da diferença de perda */}
                      {orcDiferencaPerdaPct > 0 && (
                        <div className="p-2 bg-success/10 rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span className="text-success font-medium">Diferença de Perda</span>
                            <span className="text-success font-medium">{orcDiferencaPerdaKg.toLocaleString("pt-BR")} kg</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-success">Lucro Adicional</span>
                            <span className="text-success font-bold">{formatCurrency(orcLucroPerdaRs)}</span>
                          </div>
                        </div>
                      )}
                      
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Custo Operacional/kg</span>
                        <span className="font-medium">{formatCurrency(orcTotalCustosKg)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cobrança Serviço/kg</span>
                        <span className="font-medium text-primary">{formatCurrency(orcCustoServicoKg)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Margem Lucro/kg</span>
                        <span className={cn("font-medium", orcMargemLucroKg >= 0 ? "text-success" : "text-destructive")}>
                          {formatCurrency(orcMargemLucroKg)} ({orcMargemLucroPct.toFixed(1)}%)
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Custo Total Operação</span>
                        <span className="font-medium">{formatCurrency(orcCustoOperacionalTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Receita Total</span>
                        <span className="font-medium text-primary">{formatCurrency(orcReceitaTotal)}</span>
                      </div>
                      
                      {/* Composição do Lucro */}
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Lucro Serviço</span>
                        <span className="font-medium">{formatCurrency(orcLucroServico)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Lucro Perda</span>
                        <span className="font-medium text-success">{formatCurrency(orcLucroPerdaRs)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Lucro Total</span>
                        <span className={orcLucroTotal >= 0 ? "text-success" : "text-destructive"}>{formatCurrency(orcLucroTotal)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card Resumo Cliente */}
                  <Card className="border-success/30 bg-success/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Resumo para Cliente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Material Enviado</span>
                        <span className="font-medium">{orcMaterialRecebido}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quantidade Enviada</span>
                        <span className="font-medium">{orcQtdRecebidaKg.toLocaleString("pt-BR")} kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Preço Unitário</span>
                        <span className="font-medium">{formatCurrency(orcPrecoCompraKg)}/kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor Total Material</span>
                        <span className="font-medium">{formatCurrency(orcValorMaterialCliente)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Custo Serviço</span>
                        <span className="font-medium">{formatCurrency(orcCustoServicoKg)}/kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Material Retornado</span>
                        <span className="font-medium">{orcMaterialRetornado}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quantidade Retornada</span>
                        <span className="font-medium">{orcQtdRetornadaCliente.toLocaleString("pt-BR")} kg</span>
                      </div>
                      <Separator />
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Valor Final por KG</span>
                          <span className="text-primary">{formatCurrency(orcValorFinalKgCliente)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          ({formatCurrency(orcValorMaterialCliente)} / {orcQtdRetornadaCliente.toLocaleString("pt-BR")} kg) + {formatCurrency(orcCustoServicoKg)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Botões de Ação */}
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={() => saveOrcamentoMutation.mutate()} 
                      disabled={saveOrcamentoMutation.isPending || !orcNomeCliente.trim()}
                      className="w-full bg-gradient-copper hover:opacity-90"
                    >
                      {saveOrcamentoMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {orcEditingId ? "Atualizar Orçamento" : "Salvar Orçamento"}
                    </Button>
                    <Button onClick={exportPdfIbrac} variant="outline" className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      PDF Ibrac (Interno)
                    </Button>
                    <Button variant="outline" onClick={exportPdfCliente} className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      PDF Cliente
                    </Button>
                  </div>
                </div>
              </div>

              {/* Histórico de Orçamentos */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Histórico de Orçamentos
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={novoOrcamento}>
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Orçamento
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Qtd (kg)</TableHead>
                        <TableHead className="text-right">Custo Serviço</TableHead>
                        <TableHead className="text-right">Valor Final/kg</TableHead>
                        <TableHead className="text-right">Lucro</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!historicoOrcamentos?.length ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            Nenhum orçamento salvo
                          </TableCell>
                        </TableRow>
                      ) : (
                        historicoOrcamentos.map((orc: any) => (
                          <TableRow key={orc.id} className={orcEditingId === orc.id ? "bg-primary/5" : ""}>
                            <TableCell>{format(new Date(orc.created_at), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="font-medium">{orc.nome_cliente}</TableCell>
                            <TableCell>{orc.material_recebido}</TableCell>
                            <TableCell className="text-right">{orc.qtd_recebida_kg?.toLocaleString("pt-BR")}</TableCell>
                            <TableCell className="text-right">{formatCurrency(orc.custo_servico_kg)}/kg</TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {formatCurrency(orc.valor_final_kg_cliente)}/kg
                            </TableCell>
                            <TableCell className={cn("text-right", orc.lucro_total >= 0 ? "text-success" : "text-destructive")}>
                              {formatCurrency(orc.lucro_total)}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => loadOrcamento(orc)}
                                title="Carregar orçamento"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========== TAB HISTÓRICO ========== */}
          <TabsContent value="historico">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Simulações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cobre (US$/t)</TableHead>
                      <TableHead>Dólar</TableHead>
                      <TableHead>Taxa Fin.</TableHead>
                      <TableHead>Preço à Vista</TableHead>
                      <TableHead>Preço a Prazo</TableHead>
                      <TableHead>Custo Sucata</TableHead>
                      <TableHead>Economia</TableHead>
                      <TableHead>Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!historicoSimulacoes?.length ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          Nenhuma simulação salva
                        </TableCell>
                      </TableRow>
                    ) : (
                      historicoSimulacoes.map((sim: any) => (
                        <TableRow key={sim.id}>
                          <TableCell>{format(new Date(sim.data_simulacao), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell>{sim.cobre_usd_t?.toLocaleString("pt-BR")}</TableCell>
                          <TableCell>{sim.dolar_brl?.toFixed(4)}</TableCell>
                          <TableCell>{sim.taxa_financeira_mensal?.toFixed(2) || "0.00"}%</TableCell>
                          <TableCell>{formatCurrency(sim.preco_a_vista)}</TableCell>
                          <TableCell>{formatCurrency(sim.preco_final_prazo || sim.preco_a_prazo)}</TableCell>
                          <TableCell>{formatCurrency(sim.custo_sucata_kg)}</TableCell>
                          <TableCell className={cn((sim.economia_pct_new || sim.economia_pct) > 0 ? "text-destructive" : "text-success")}>
                            {(sim.economia_pct_new || sim.economia_pct)?.toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-medium",
                              (sim.resultado_new || sim.resultado)?.includes("SUCATA") ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                            )}>
                              {sim.resultado_new || sim.resultado}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
