import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ItemEntrada {
  id: string;
  peso_kg: number;
  sublotes?: {
    codigo: string;
    tipos_produto?: { nome: string } | null;
  } | null;
}

interface Beneficiamento {
  id: string;
  codigo: string;
  data_inicio: string;
  data_fim: string | null;
  tipo_beneficiamento: string;
  peso_entrada_kg: number | null;
  peso_saida_kg: number | null;
  perda_real_pct: number | null;
  perda_cobrada_pct: number | null;
  custo_frete_ida: number | null;
  custo_frete_volta: number | null;
  custo_mo_terceiro: number | null;
  custo_mo_ibrac: number | null;
  motorista: string | null;
  placa_veiculo: string | null;
  observacoes: string | null;
  status: string;
  processos?: { nome: string } | null;
  fornecedores?: { razao_social: string } | null;
  parceiros?: { razao_social: string } | null;
  beneficiamento_itens_entrada?: ItemEntrada[];
}

interface BeneficiamentoRomaneioPrintProps {
  beneficiamento: Beneficiamento;
  isOpen: boolean;
  onClose: () => void;
}

export function BeneficiamentoRomaneioPrint({ beneficiamento, isOpen, onClose }: BeneficiamentoRomaneioPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Romaneio de Beneficiamento ${beneficiamento.codigo}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .header h1 { font-size: 18px; margin-bottom: 5px; }
            .header p { font-size: 10px; color: #666; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
            .info-box { border: 1px solid #ccc; padding: 8px; border-radius: 4px; }
            .info-box h3 { font-size: 10px; color: #666; margin-bottom: 4px; text-transform: uppercase; }
            .info-box p { font-size: 12px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f5f5f5; font-size: 10px; text-transform: uppercase; }
            td { font-size: 11px; }
            .text-right { text-align: right; }
            .section-title { font-size: 12px; font-weight: bold; margin: 15px 0 5px 0; }
            .totals { margin-top: 15px; }
            .totals-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
            .totals-row.final { font-weight: bold; font-size: 14px; border-bottom: 2px solid #000; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 40px; }
            .signature { text-align: center; }
            .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const formatWeight = (kg: number | null) => kg ? `${kg.toLocaleString("pt-BR")} kg` : "-";

  const formatCurrency = (value: number | null) => {
    if (value === null || value === 0) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const custoTotal = (beneficiamento.custo_frete_ida || 0) + 
                     (beneficiamento.custo_frete_volta || 0) + 
                     (beneficiamento.custo_mo_terceiro || 0) + 
                     (beneficiamento.custo_mo_ibrac || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Romaneio de Beneficiamento</span>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="p-4 bg-white text-black">
          {/* Header */}
          <div className="header">
            <h1>ROMANEIO DE BENEFICIAMENTO</h1>
            <p>IBRAC - Indústria Brasileira de Cobre</p>
          </div>

          {/* Info Grid */}
          <div className="info-grid">
            <div className="info-box">
              <h3>Código</h3>
              <p>{beneficiamento.codigo}</p>
            </div>
            <div className="info-box">
              <h3>Status</h3>
              <p style={{ textTransform: "capitalize" }}>{beneficiamento.status.replace("_", " ")}</p>
            </div>
            <div className="info-box">
              <h3>Data Início</h3>
              <p>{format(new Date(beneficiamento.data_inicio), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
            <div className="info-box">
              <h3>Data Fim</h3>
              <p>{beneficiamento.data_fim ? format(new Date(beneficiamento.data_fim), "dd/MM/yyyy", { locale: ptBR }) : "-"}</p>
            </div>
          </div>

          {/* Processo e Tipo */}
          <div className="info-grid">
            <div className="info-box">
              <h3>Processo</h3>
              <p>{beneficiamento.processos?.nome || "-"}</p>
            </div>
            <div className="info-box">
              <h3>Tipo</h3>
              <p>{beneficiamento.tipo_beneficiamento === "interno" ? "Interno" : "Externo (Terceiro)"}</p>
            </div>
            {beneficiamento.tipo_beneficiamento === "externo" && beneficiamento.fornecedores && (
              <div className="info-box">
                <h3>Fornecedor Terceiro</h3>
                <p>{beneficiamento.fornecedores.razao_social}</p>
              </div>
            )}
          </div>

          {/* Transporte */}
          <div className="info-grid">
            <div className="info-box">
              <h3>Transportadora</h3>
              <p>{beneficiamento.parceiros?.razao_social || "-"}</p>
            </div>
            <div className="info-box">
              <h3>Motorista</h3>
              <p>{beneficiamento.motorista || "-"}</p>
            </div>
            <div className="info-box">
              <h3>Placa</h3>
              <p>{beneficiamento.placa_veiculo || "-"}</p>
            </div>
          </div>

          {/* Lotes de Entrada */}
          {beneficiamento.beneficiamento_itens_entrada && beneficiamento.beneficiamento_itens_entrada.length > 0 && (
            <>
              <h3 className="section-title">Lotes de Entrada</h3>
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Produto</th>
                    <th className="text-right">Peso (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiamento.beneficiamento_itens_entrada.map((item) => (
                    <tr key={item.id}>
                      <td>{item.sublotes?.codigo || "-"}</td>
                      <td>{item.sublotes?.tipos_produto?.nome || "-"}</td>
                      <td className="text-right">{formatWeight(item.peso_kg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Pesos e Perdas */}
          <div className="totals">
            <div className="totals-row">
              <span>Peso Entrada:</span>
              <span>{formatWeight(beneficiamento.peso_entrada_kg)}</span>
            </div>
            <div className="totals-row">
              <span>Peso Saída:</span>
              <span>{formatWeight(beneficiamento.peso_saida_kg)}</span>
            </div>
            {beneficiamento.perda_real_pct !== null && beneficiamento.perda_real_pct > 0 && (
              <div className="totals-row">
                <span>Perda Real:</span>
                <span>{beneficiamento.perda_real_pct.toFixed(2)}%</span>
              </div>
            )}
            {beneficiamento.perda_cobrada_pct !== null && beneficiamento.perda_cobrada_pct > 0 && (
              <div className="totals-row">
                <span>Perda Cobrada:</span>
                <span>{beneficiamento.perda_cobrada_pct.toFixed(2)}%</span>
              </div>
            )}
          </div>

          {/* Custos */}
          <h3 className="section-title" style={{ marginTop: "20px" }}>Custos</h3>
          <div className="totals">
            {beneficiamento.custo_frete_ida !== null && beneficiamento.custo_frete_ida > 0 && (
              <div className="totals-row">
                <span>Frete Ida:</span>
                <span>{formatCurrency(beneficiamento.custo_frete_ida)}</span>
              </div>
            )}
            {beneficiamento.custo_frete_volta !== null && beneficiamento.custo_frete_volta > 0 && (
              <div className="totals-row">
                <span>Frete Volta:</span>
                <span>{formatCurrency(beneficiamento.custo_frete_volta)}</span>
              </div>
            )}
            {beneficiamento.custo_mo_terceiro !== null && beneficiamento.custo_mo_terceiro > 0 && (
              <div className="totals-row">
                <span>Mão de Obra Terceiro:</span>
                <span>{formatCurrency(beneficiamento.custo_mo_terceiro)}</span>
              </div>
            )}
            {beneficiamento.custo_mo_ibrac !== null && beneficiamento.custo_mo_ibrac > 0 && (
              <div className="totals-row">
                <span>Mão de Obra IBRAC:</span>
                <span>{formatCurrency(beneficiamento.custo_mo_ibrac)}</span>
              </div>
            )}
            {custoTotal > 0 && (
              <div className="totals-row final">
                <span>Custo Total:</span>
                <span>{formatCurrency(custoTotal)}</span>
              </div>
            )}
          </div>

          {/* Observações */}
          {beneficiamento.observacoes && (
            <div className="info-box" style={{ marginTop: "15px" }}>
              <h3>Observações</h3>
              <p style={{ fontWeight: "normal" }}>{beneficiamento.observacoes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="signatures">
            <div className="signature">
              <div className="signature-line">PCP</div>
            </div>
            <div className="signature">
              <div className="signature-line">Motorista</div>
            </div>
            <div className="signature">
              <div className="signature-line">Responsável</div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <p>Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
