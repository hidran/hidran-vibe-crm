import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import { 
  FolderKanban, 
  Users, 
  FileText, 
  CheckSquare, 
  BarChart3, 
  Shield,
  ArrowRight
} from "lucide-react";

const Index = () => {
  const features = [
    {
      icon: FolderKanban,
      title: "Project Management",
      description: "Organize projects with customizable workflows, priorities, and deadlines."
    },
    {
      icon: CheckSquare,
      title: "Task Tracking",
      description: "Create, assign, and track tasks with kanban boards and list views."
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Invite team members, assign roles, and collaborate in real-time."
    },
    {
      icon: FileText,
      title: "Invoicing",
      description: "Generate professional invoices and track payments for clients."
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Get insights into project progress, team performance, and budgets."
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with role-based access controls."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="container py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Manage Projects with
            <span className="text-primary"> Clarity</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Streamline your workflow, collaborate with your team, and deliver projects on time. 
            ProjectHub brings everything together in one powerful platform.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth?tab=signup">
              <Button size="lg" className="gap-2">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/features">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-24 border-t border-border">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold">Everything you need to succeed</h2>
          <p className="mt-4 text-muted-foreground">
            Powerful features to help your team stay organized and productive.
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border border-border bg-card">
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-2" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-16 text-center">
            <h2 className="text-3xl font-bold">Ready to get started?</h2>
            <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
              Join thousands of teams already using ProjectHub to deliver better projects, faster.
            </p>
            <Link to="/auth?tab=signup">
              <Button size="lg" variant="secondary" className="mt-8">
                Create Free Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            <span className="font-semibold">ProjectHub</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 ProjectHub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
