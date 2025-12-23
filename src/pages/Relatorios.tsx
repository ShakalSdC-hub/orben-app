import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar } from "lucide-react";

export default function Relatorios() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground">
              Relatórios gerenciais - em construção para novo modelo
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Em Construção
            </CardTitle>
            <CardDescription>
              Os relatórios serão atualizados para o novo modelo de dados com os 3 cenários de operação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calendar className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Relatórios em desenvolvimento</p>
              <p className="text-sm">Os novos relatórios serão implementados em breve</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
