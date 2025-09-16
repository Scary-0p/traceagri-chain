import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { LogOut, Package, Truck, Store, Eye, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect } from "react";

export default function Dashboard() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getRoleIcon = () => {
    switch (user.role) {
      case "farmer":
        return <Package className="h-8 w-8" />;
      case "distributor":
        return <Truck className="h-8 w-8" />;
      case "retailer":
        return <Store className="h-8 w-8" />;
      case "government":
        return <Eye className="h-8 w-8" />;
      default:
        return <BarChart3 className="h-8 w-8" />;
    }
  };

  const getRoleTitle = () => {
    switch (user.role) {
      case "farmer":
        return "Farmer Portal";
      case "distributor":
        return "Distributor Dashboard";
      case "retailer":
        return "Retailer Interface";
      case "government":
        return "Government Dashboard";
      default:
        return "Dashboard";
    }
  };

  const getQuickActions = () => {
    switch (user.role) {
      case "farmer":
        return [
          { label: "Create New Batch", action: () => navigate("/batches/create"), primary: true },
          { label: "My Batches", action: () => navigate("/batches") },
          { label: "Sales History", action: () => navigate("/sales") },
        ];
      case "distributor":
        return [
          { label: "Receive Batch", action: () => navigate("/batches/receive"), primary: true },
          { label: "My Inventory", action: () => navigate("/batches") },
          { label: "Transfer History", action: () => navigate("/transfers") },
        ];
      case "retailer":
        return [
          { label: "Receive Batch", action: () => navigate("/batches/receive"), primary: true },
          { label: "My Products", action: () => navigate("/batches") },
          { label: "Mark as Sold", action: () => navigate("/sales") },
        ];
      case "government":
        return [
          { label: "View All Batches", action: () => navigate("/batches"), primary: true },
          { label: "Analytics", action: () => navigate("/analytics") },
          { label: "Export Reports", action: () => navigate("/reports") },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img
                src="/logo.svg"
                alt="AgriTrace"
                className="h-8 w-8 cursor-pointer"
                onClick={() => navigate("/")}
              />
              <div>
                <h1 className="text-xl font-semibold tracking-tight">{getRoleTitle()}</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  {getRoleIcon()}
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {user.role === "farmer" && "Manage Your Crops"}
                    {user.role === "distributor" && "Handle Distribution"}
                    {user.role === "retailer" && "Manage Retail Operations"}
                    {user.role === "government" && "Monitor Supply Chain"}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1">
                    {user.role === "farmer" && "Create batches, track sales, and manage your farm operations"}
                    {user.role === "distributor" && "Receive, transport, and transfer agricultural products"}
                    {user.role === "retailer" && "Manage inventory and track product origins"}
                    {user.role === "government" && "Oversee agricultural supply chain transparency"}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {getQuickActions().map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <Button
                      variant={action.primary ? "default" : "outline"}
                      className="w-full h-auto py-4"
                      onClick={action.action}
                    >
                      {action.label}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Role-specific Information */}
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.role === "farmer" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    1. Create a new crop batch with harvest details
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Generate QR codes for traceability
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Transfer batches to distributors when sold
                  </p>
                </div>
              )}
              {user.role === "distributor" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    1. Receive batches from farmers by scanning QR codes
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Update transport and handling status
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Transfer to retailers when ready
                  </p>
                </div>
              )}
              {user.role === "retailer" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    1. Receive products from distributors
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. View complete product journey and pricing
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Mark products as sold to complete the chain
                  </p>
                </div>
              )}
              {user.role === "government" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    1. Monitor all agricultural transactions in real-time
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Generate compliance and audit reports
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Track pricing trends and detect anomalies
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
