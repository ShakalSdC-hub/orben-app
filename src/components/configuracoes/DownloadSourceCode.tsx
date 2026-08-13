import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const rootFileAllowlist = new Set([
  "package.json",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "vite.config.ts",
  "tailwind.config.ts",
  "postcss.config.js",
  "eslint.config.js",
  "index.html",
  "components.json",
  "README.md",
  "robots.txt",
]);

const binaryAssets = ["/src/assets/orben-logo.jpeg"];

export function DownloadSourceCodeButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Coletar src/, public/ e arquivos da raiz via Vite glob (raw import)
      const srcFiles = import.meta.glob("/src/**/*", { query: "?raw", import: "default", eager: true });
      const publicFiles = import.meta.glob("/public/**/*", { query: "?raw", import: "default", eager: true });
      const rootFiles = import.meta.glob("/*", { query: "?raw", import: "default", eager: true });

      for (const [path, content] of Object.entries(srcFiles)) {
        zip.file(path.replace(/^\/+/, ""), content as string);
      }

      for (const [path, content] of Object.entries(publicFiles)) {
        zip.file(path.replace(/^\/+/, ""), content as string);
      }

      for (const [path, content] of Object.entries(rootFiles)) {
        const fileName = path.replace(/^\/+/, "");
        if (rootFileAllowlist.has(fileName)) {
          zip.file(fileName, content as string);
        }
      }

      // Adicionar assets binários
      await Promise.all(
        binaryAssets.map(async (asset) => {
          try {
            const response = await fetch(asset);
            if (response.ok) {
              const blob = await response.blob();
              zip.file(asset.replace(/^\/+/, ""), blob);
            }
          } catch (e) {
            console.warn(`Não foi possível incluir ${asset}`, e);
          }
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orben-source-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Download iniciado!", description: "O código fonte está sendo baixado." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao gerar ZIP", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={isLoading} variant="outline" className="w-fit">
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Baixar Código Fonte (ZIP)
    </Button>
  );
}
