import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SkafferiPage() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-3xl font-bold">📦 Skafferi</h1>

      <Card>
        <CardHeader>
          <CardTitle>Inga produkter ännu</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            Produkter som köps kommer senare automatiskt att hamna här.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}