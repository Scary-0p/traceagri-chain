import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Package, Truck, Store, Eye, Scan, Shield, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router";

export default function Landing() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const stakeholders = [
    {
      role: "farmer",
      title: "Farmer Portal",
      description: "Create crop batches, generate QR codes, track sales",
      icon: <Package className="h-8 w-8" />,
      color: "bg-green-50 border-green-200",
    },
    {
      role: "distributor", 
      title: "Distributor Dashboard",
      description: "Receive batches, manage transport, transfer products",
      icon: <Truck className="h-8 w-8" />,
      color: "bg-blue-50 border-blue-200",
    },
    {
      role: "retailer",
      title: "Retailer Interface", 
      description: "Manage inventory, verify origins, track to consumer",
      icon: <Store className="h-8 w-8" />,
      color: "bg-purple-50 border-purple-200",
    },
    {
      role: "government",
      title: "Government Dashboard",
      description: "Monitor supply chain, generate reports, ensure compliance",
      icon: <Eye className="h-8 w-8" />,
      color: "bg-orange-50 border-orange-200",
    },
  ];

  const features = [
    {
      icon: <Scan className="h-6 w-6" />,
      title: "QR Code Traceability",
      description: "Scan any product to see its complete journey from farm to table",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Blockchain Security",
      description: "Immutable records ensure data integrity and prevent fraud",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Real-time Analytics",
      description: "Track pricing trends, volumes, and supply chain efficiency",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img src="/logo.svg" alt="AgriTrace" className="h-8 w-8" />
              <span className="text-xl font-semibold tracking-tight">AgriTrace</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Back
              </Button>
              {isAuthenticated ? (
                <Button onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => navigate("/auth")}>
                    Sign In
                  </Button>
                  <Button onClick={() => navigate("/trace")}>
                    Trace Product
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Agricultural Supply Chain
              <span className="block text-primary">Transparency</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Track every agricultural product from farm to consumer with blockchain-powered 
              traceability, ensuring quality, authenticity, and fair pricing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")}>
                Get Started
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/trace")}>
                <Scan className="h-4 w-4 mr-2" />
                Trace a Product
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Role Switcher */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-center mb-6"
          >
            <h2 className="text-2xl font-bold tracking-tight">Switch User</h2>
            <p className="text-muted-foreground mt-2">
              Jump directly to the experience for Farmers, Retailers, or Consumers.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-all">
              <CardContent className="p-4 flex flex-col items-center gap-3">
                <Package className="h-6 w-6" />
                <div className="font-semibold">Farmer</div>
                <Button
                  className="w-full"
                  onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
                >
                  Go to Farmer
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-all">
              <CardContent className="p-4 flex flex-col items-center gap-3">
                <Store className="h-6 w-6" />
                <div className="font-semibold">Retailer</div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  Go to Retailer
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-all">
              <CardContent className="p-4 flex flex-col items-center gap-3">
                <Scan className="h-6 w-6" />
                <div className="font-semibold">Consumer</div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/trace")}
                >
                  Start Tracing
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stakeholder Portals */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Choose Your Portal
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each stakeholder in the agricultural supply chain has a dedicated interface 
              designed for their specific needs and responsibilities.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stakeholders.map((stakeholder, index) => (
              <motion.div
                key={stakeholder.role}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              >
                <Card className={`cursor-pointer hover:shadow-md transition-all ${stakeholder.color}`}>
                  <CardContent className="p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-background rounded-lg">
                        {stakeholder.icon}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{stakeholder.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {stakeholder.description}
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate("/auth")}
                    >
                      Access Portal
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Key Features
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our platform provides comprehensive tools for agricultural supply chain 
              management and transparency.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                className="text-center"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Consumer Trace Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              For Consumers
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Scan any QR code on agricultural products to see their complete journey, 
              verify authenticity, and check quality certifications.
            </p>
            <Button size="lg" onClick={() => navigate("/trace")}>
              <Scan className="h-4 w-4 mr-2" />
              Start Tracing
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-muted-foreground">
            © 2024 AgriTrace. Ensuring agricultural supply chain transparency.
          </p>
        </div>
      </footer>
    </div>
  );
}