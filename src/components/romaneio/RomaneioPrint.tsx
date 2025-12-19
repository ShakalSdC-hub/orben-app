import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SaidaItem {
  sublote_id: string;
  peso_kg: number;
  sublotes?: {
    codigo: string;
    tipo_produto_id: string | null;
    tipos_produto?: { nome: string } | null;
  };
}

interface Saida {
  id: string;
  codigo: string;
  data_saida: string;
  tipo_saida: string;
  peso_total_kg: number;
  valor_unitario: number | null;
  valor_total: number | null;
  custos_cobrados: number | null;
  nota_fiscal: string | null;
  motorista: string | null;
  placa_veiculo: string | null;
  observacoes: string | null;
  clientes?: { razao_social: string; cnpj?: string; endereco?: string; cidade?: string; estado?: string } | null;
  parceiros?: { razao_social: string } | null;
  saida_itens?: SaidaItem[];
}

interface RomaneioPrintProps {
  saida: Saida;
  isOpen: boolean;
  onClose: () => void;
}

export function RomaneioPrint({ saida, isOpen, onClose }: RomaneioPrintProps) {
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
          <title>Romaneio ${saida.codigo}</title>
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
            .totals { margin-top: 15px; }
            .totals-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
            .totals-row.final { font-weight: bold; font-size: 14px; border-bottom: 2px solid #000; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
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

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Romaneio de Saída</span>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="p-4 bg-white text-black">
          {/* Header */}
          <div className="header">
            <h1>ROMANEIO DE SAÍDA</h1>
            <p>IBRAC - Indústria Brasileira de Cobre</p>
          </div>

          {/* Info Grid */}
          <div className="info-grid">
            <div className="info-box">
              <h3>Código</h3>
              <p>{saida.codigo}</p>
            </div>
            <div className="info-box">
              <h3>Data</h3>
              <p>{format(new Date(saida.data_saida), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
            <div className="info-box">
              <h3>Tipo de Saída</h3>
              <p>{saida.tipo_saida}</p>
            </div>
            <div className="info-box">
              <h3>Nota Fiscal</h3>
              <p>{saida.nota_fiscal || "-"}</p>
            </div>
          </div>

          {/* Cliente */}
          {saida.clientes && (
            <div className="info-box" style={{ marginBottom: "15px" }}>
              <h3>Cliente</h3>
              <p>{saida.clientes.razao_social}</p>
              {saida.clientes.cnpj && <p style={{ fontSize: "10px", fontWeight: "normal" }}>CNPJ: {saida.clientes.cnpj}</p>}
              {saida.clientes.endereco && (
                <p style={{ fontSize: "10px", fontWeight: "normal" }}>
                  {saida.clientes.endereco} - {saida.clientes.cidade}/{saida.clientes.estado}
                </p>
              )}
            </div>
          )}

          {/* Transporte */}
          <div className="info-grid">
            <div className="info-box">
              <h3>Transportadora</h3>
              <p>{saida.parceiros?.razao_social || "-"}</p>
            </div>
            <div className="info-box">
              <h3>Motorista</h3>
              <p>{saida.motorista || "-"}</p>
            </div>
            <div className="info-box">
              <h3>Placa</h3>
              <p>{saida.placa_veiculo || "-"}</p>
            </div>
          </div>

          {/* Itens */}
          <table>
            <thead>
              <tr>
                <th>Lote</th>
                <th>Produto</th>
                <th className="text-right">Peso (kg)</th>
              </tr>
            </thead>
            <tbody>
              {saida.saida_itens?.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.sublotes?.codigo || item.sublote_id}</td>
                  <td>{item.sublotes?.tipos_produto?.nome || "-"}</td>
                  <td className="text-right">{item.peso_kg.toLocaleString("pt-BR")} kg</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="totals">
            <div className="totals-row">
              <span>Peso Total:</span>
              <span>{saida.peso_total_kg.toLocaleString("pt-BR")} kg</span>
            </div>
            {saida.valor_unitario && (
              <div className="totals-row">
                <span>Valor Unitário:</span>
                <span>{formatCurrency(saida.valor_unitario)}/kg</span>
              </div>
            )}
            {saida.custos_cobrados !== null && saida.custos_cobrados > 0 && (
              <div className="totals-row">
                <span>Custos Cobrados:</span>
                <span>{formatCurrency(saida.custos_cobrados)}</span>
              </div>
            )}
            {saida.valor_total && (
              <div className="totals-row final">
                <span>Valor Total:</span>
                <span>{formatCurrency(saida.valor_total)}</span>
              </div>
            )}
          </div>

          {/* Observações */}
          {saida.observacoes && (
            <div className="info-box" style={{ marginTop: "15px" }}>
              <h3>Observações</h3>
              <p style={{ fontWeight: "normal" }}>{saida.observacoes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="signatures">
            <div className="signature">
              <div className="signature-line">Expedição</div>
            </div>
            <div className="signature">
              <div className="signature-line">Motorista</div>
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
