import * as React from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const { toast } = useToast();

  const handleExport = (type: string) => {
    toast({
      title: "Export Started",
      description: `Your ${type} report is being generated and will download shortly.`,
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Export your data for external tools and accounting.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileSpreadsheet className="w-5 h-5 mr-2 text-emerald-500" />
                Inventory Valuation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Complete list of all products with current stock levels, unit costs, and total valuation. Useful for accounting and audits.
              </p>
              <Button className="w-full" variant="outline" onClick={() => handleExport('Inventory')}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileText className="w-5 h-5 mr-2 text-blue-500" />
                Sales Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Monthly breakdown of all sales including quantities, revenue, and profit margins. Perfect for performance review.
              </p>
              <Button className="w-full" variant="outline" onClick={() => handleExport('Sales')}>
                <Download className="w-4 h-4 mr-2" /> Export PDF
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileSpreadsheet className="w-5 h-5 mr-2 text-purple-500" />
                Purchase History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Detailed log of all vendor purchases, costs, and received statuses to reconcile with your supplier invoices.
              </p>
              <Button className="w-full" variant="outline" onClick={() => handleExport('Purchases')}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
