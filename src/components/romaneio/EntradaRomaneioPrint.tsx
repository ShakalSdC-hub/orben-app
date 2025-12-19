import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Sublote {
  id: string;
  codigo: string;
  peso_kg: number;
  status: string;
}

interface Entrada {
  id: string;
  codigo: string;
  data_entrada: string;
  tipo_material: string;
  peso_bruto_kg: number;
  peso_liquido_kg: number;
  peso_nf_kg: number | null;
  nota_fiscal: string | null;
  motorista: string | null;
  placa_veiculo: string | null;
  observacoes: string | null;
  teor_cobre: number | null;
  valor_unitario: number | null;
  valor_total: number | null;
  parceiros?: { razao_social: string } | null;
  donos_material?: { nome: string } | null;
  tipos_produto?: { nome: string } | null;
  sublotes?: Sublote[];
}

interface EntradaRomaneioPrintProps {
  entrada: Entrada;
  isOpen: boolean;
  onClose: () => void;
}

export function EntradaRomaneioPrint({ entrada, isOpen, onClose }: EntradaRomaneioPrintProps) {
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
          <title>Romaneio de Entrada ${entrada.codigo}</title>
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

  const formatWeight = (kg: number) => `${kg.toLocaleString("pt-BR")} kg`;

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Romaneio de Entrada</span>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="p-4 bg-white text-black">
          {/* Header */}
          <div className="header">
            <h1>ROMANEIO DE ENTRADA</h1>
            <p>IBRAC - Indústria Brasileira de Cobre</p>
          </div>

          {/* Info Grid */}
          <div className="info-grid">
            <div className="info-box">
              <h3>Código</h3>
              <p>{entrada.codigo}</p>
            </div>
            <div className="info-box">
              <h3>Data</h3>
              <p>{format(new Date(entrada.data_entrada), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
            <div className="info-box">
              <h3>Tipo Material</h3>
              <p>{entrada.tipo_material}</p>
            </div>
            <div className="info-box">
              <h3>Nota Fiscal</h3>
              <p>{entrada.nota_fiscal || "-"}</p>
            </div>
          </div>

          {/* Fornecedor/Dono */}
          <div className="info-grid">
            <div className="info-box">
              <h3>Fornecedor/Parceiro</h3>
              <p>{entrada.parceiros?.razao_social || "-"}</p>
            </div>
            <div className="info-box">
              <h3>Dono do Material</h3>
              <p>{entrada.donos_material?.nome || "-"}</p>
            </div>
            <div className="info-box">
              <h3>Tipo de Produto</h3>
              <p>{entrada.tipos_produto?.nome || "-"}</p>
            </div>
            {entrada.teor_cobre && (
              <div className="info-box">
                <h3>Teor de Cobre</h3>
                <p>{entrada.teor_cobre}%</p>
              </div>
            )}
          </div>

          {/* Transporte */}
          <div className="info-grid">
            <div className="info-box">
              <h3>Motorista</h3>
              <p>{entrada.motorista || "-"}</p>
            </div>
            <div className="info-box">
              <h3>Placa</h3>
              <p>{entrada.placa_veiculo || "-"}</p>
            </div>
          </div>

          {/* Volumes/Tickets */}
          {entrada.sublotes && entrada.sublotes.length > 0 && (
            <>
              <h3 style={{ marginTop: "15px", marginBottom: "5px", fontSize: "12px", fontWeight: "bold" }}>Volumes/Tickets</h3>
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th className="text-right">Peso (kg)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entrada.sublotes.map((sublote) => (
                    <tr key={sublote.id}>
                      <td>{sublote.codigo}</td>
                      <td className="text-right">{formatWeight(sublote.peso_kg)}</td>
                      <td>{sublote.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Totals */}
          <div className="totals">
            <div className="totals-row">
              <span>Peso Bruto:</span>
              <span>{formatWeight(entrada.peso_bruto_kg)}</span>
            </div>
            <div className="totals-row final">
              <span>Peso Líquido:</span>
              <span>{formatWeight(entrada.peso_liquido_kg)}</span>
            </div>
            {entrada.peso_nf_kg && (
              <div className="totals-row">
                <span>Peso NF:</span>
                <span>{formatWeight(entrada.peso_nf_kg)}</span>
              </div>
            )}
            {entrada.valor_unitario && (
              <div className="totals-row">
                <span>Valor Unitário:</span>
                <span>{formatCurrency(entrada.valor_unitario)}/kg</span>
              </div>
            )}
            {entrada.valor_total && (
              <div className="totals-row final">
                <span>Valor Total:</span>
                <span>{formatCurrency(entrada.valor_total)}</span>
              </div>
            )}
          </div>

          {/* Observações */}
          {entrada.observacoes && (
            <div className="info-box" style={{ marginTop: "15px" }}>
              <h3>Observações</h3>
              <p style={{ fontWeight: "normal" }}>{entrada.observacoes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="signatures">
            <div className="signature">
              <div className="signature-line">Conferente</div>
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
