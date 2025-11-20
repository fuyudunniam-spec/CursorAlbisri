import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const InventarisTest = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Inventaris Module</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Halaman test untuk memastikan modul inventaris berfungsi.</p>
          <div className="space-y-4">
            <div>
              <p>Count: {count}</p>
              <Button onClick={() => setCount(count + 1)}>
                Increment
              </Button>
            </div>
            <div className="text-green-600">
              ✅ Halaman berhasil dimuat!
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventarisTest;
