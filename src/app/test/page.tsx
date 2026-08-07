import { getProducts } from "@/services/products.service";

export default async function TestPage() {
  const products = await getProducts();

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-3xl font-bold">
        Test
      </h1>

      <pre className="rounded-lg border p-4">
        {JSON.stringify(products, null, 2)}
      </pre>
    </main>
  );
}