import { useCallback } from "react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExportOptions {
  filename: string;
  sheetName?: string;
}

export function useExportReport() {
  const exportToExcel = useCallback((data: any[], options: ExportOptions) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || "Dados");
    
    // Auto-width columns
    const maxWidth: Record<string, number> = {};
    data.forEach((row) => {
      Object.keys(row).forEach((key) => {
        const len = String(row[key] || "").length;
        maxWidth[key] = Math.max(maxWidth[key] || 10, len + 2);
      });
    });
    
    worksheet["!cols"] = Object.values(maxWidth).map((width) => ({ wch: Math.min(width, 50) }));
    
    const filename = `${options.filename}_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }, []);

  const formatEntradaReport = useCallback((entradas: any[]) => {
    return entradas.map((e) => ({
      "Código": e.codigo,
      "Data": format(new Date(e.data_entrada), "dd/MM/yyyy"),
      "Parceiro": e.parceiro?.razao_social || e.fornecedor?.razao_social || "-",
      "Dono": e.dono?.nome || "IBRAC",
      "Nota Fiscal": e.nota_fiscal || "-",
      "Tipo Material": e.tipo_material,
      "Peso Bruto (kg)": e.peso_bruto_kg,
      "Peso Líquido (kg)": e.peso_liquido_kg,
      "Valor Unitário": e.valor_unitario || 0,
      "Valor Total": e.valor_total || 0,
      "Status": e.status,
    }));
  }, []);

  const formatSaidaReport = useCallback((saidas: any[]) => {
    return saidas.map((s) => ({
      "Código": s.codigo,
      "Data": format(new Date(s.data_saida), "dd/MM/yyyy"),
      "Tipo": s.tipo_saida,
      "Cliente": s.cliente?.razao_social || s.cliente?.nome_fantasia || "-",
      "Nota Fiscal": s.nota_fiscal || "-",
      "Peso Total (kg)": s.peso_total_kg,
      "Valor Unitário": s.valor_unitario || 0,
      "Valor Total": s.valor_total || 0,
      "Custos Cobrados": s.custos_cobrados || 0,
      "Repasse Dono": s.valor_repasse_dono || 0,
      "Status": s.status,
    }));
  }, []);

  const formatBeneficiamentoReport = useCallback((beneficiamentos: any[]) => {
    return beneficiamentos.map((b) => ({
      "Código": b.codigo,
      "Data Início": b.data_inicio ? format(new Date(b.data_inicio), "dd/MM/yyyy") : "-",
      "Processo": b.processos?.nome || "-",
      "Tipo": b.tipo_beneficiamento,
      "Peso Entrada (kg)": b.peso_entrada_kg || 0,
      "Peso Saída (kg)": b.peso_saida_kg || 0,
      "Perda Real (%)": b.perda_real_pct || 0,
      "Perda Cobrada (%)": b.perda_cobrada_pct || 0,
      "Custo Frete Ida": b.custo_frete_ida || 0,
      "Custo Frete Volta": b.custo_frete_volta || 0,
      "Custo MO Terceiro": b.custo_mo_terceiro || 0,
      "Custo MO IBRAC": b.custo_mo_ibrac || 0,
      "Status": b.status,
    }));
  }, []);

  const formatEstoqueReport = useCallback((sublotes: any[]) => {
    return sublotes.map((s) => ({
      "Código": s.codigo,
      "Entrada": s.entrada?.codigo || "-",
      "Tipo Produto": s.tipo_produto?.nome || "-",
      "Dono": s.dono?.nome || "IBRAC",
      "Parceiro": s.entrada?.parceiro?.razao_social || "-",
      "Local": s.local_estoque?.nome || "-",
      "Peso (kg)": s.peso_kg,
      "Custo Unitário": s.custo_unitario_total || 0,
      "Valor Total": (s.peso_kg * (s.custo_unitario_total || 0)),
      "Status": s.status,
    }));
  }, []);

  const formatRastreabilidadeReport = useCallback((sublotes: any[]) => {
    return sublotes.map((s) => ({
      "Código Lote": s.codigo,
      "Produto": s.tipo_produto?.nome || "-",
      "Dono": s.dono?.nome || "IBRAC",
      "Parceiro/Fornecedor": s.entrada?.parceiro?.razao_social || "-",
      "Entrada Origem": s.entrada?.codigo || "-",
      "Local": s.local_estoque?.nome || "-",
      "Peso (kg)": s.peso_kg,
      "Custo Unitário (R$)": s.custo_unitario_total || 0,
      "Valor Total (R$)": (s.peso_kg * (s.custo_unitario_total || 0)),
      "Origem Beneficiamento": s.lote_pai_id ? "Sim" : "Entrada Direta",
      "Data Criação": s.created_at ? format(new Date(s.created_at), "dd/MM/yyyy") : "-",
      "Status": s.status,
    }));
  }, []);

  const printReport = useCallback((title: string, data: any[], columns: string[]) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const tableRows = data.map((row) =>
      `<tr>${columns.map((col) => `<td style="border:1px solid #ddd;padding:8px;">${row[col] ?? "-"}</td>`).join("")}</tr>`
    ).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; border-bottom: 2px solid #B87333; padding-bottom: 10px; }
          .info { color: #666; margin-bottom: 20px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th { background-color: #B87333; color: white; padding: 12px 8px; text-align: left; }
          td { border: 1px solid #ddd; padding: 8px; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          @media print {
            body { margin: 0; }
            table { font-size: 10px; }
          }
        </style>
      </head>
      <body>
        <h1>IBRAC - ${title}</h1>
        <p class="info">Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        <table>
          <thead>
            <tr>${columns.map((col) => `<th>${col}</th>`).join("")}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }, []);

  return {
    exportToExcel,
    printReport,
    formatEntradaReport,
    formatSaidaReport,
    formatBeneficiamentoReport,
    formatEstoqueReport,
    formatRastreabilidadeReport,
  };
}
