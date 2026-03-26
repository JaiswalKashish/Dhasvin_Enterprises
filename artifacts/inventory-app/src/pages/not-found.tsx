import { Link } from "wouter";
import { PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-4">
      <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mb-6 text-muted-foreground">
        <PackageX className="w-10 h-10" />
      </div>
      <h1 className="text-4xl font-display font-bold text-foreground mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved to another URL.
      </p>
      <Link href="/">
        <Button variant="gradient">Return to Dashboard</Button>
      </Link>
    </div>
  );
}
