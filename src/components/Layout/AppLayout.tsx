
import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { 
  FileText, 
  MessageSquare, 
  User, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  ChevronLeft 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    // Check if user is authenticated
    const user = localStorage.getItem("careerAI-user");
    if (!user) {
      navigate("/");
    } else {
      try {
        const userData = JSON.parse(user);
        setUserName(userData.name || "User");
      } catch (error) {
        console.error("Failed to parse user data", error);
      }
    }
  }, [navigate]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("careerAI-user");
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    navigate("/");
  };

  // Navigation links
  const navLinks = [
    {
      name: "Resume Builder",
      path: "/resume",
      icon: FileText,
    },
    {
      name: "Mock Interview",
      path: "/interview",
      icon: MessageSquare,
    },
    {
      name: "My Profile",
      path: "/profile",
      icon: User,
    },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 transition-all duration-300 transform bg-card border-r shadow-sm lg:translate-x-0 lg:static lg:inset-0 ${
          isSidebarOpen ? "translate-x-0 w-64" : "w-20 -translate-x-full lg:translate-x-0"
        } ${isMobileMenuOpen ? "translate-x-0" : ""} lg:flex flex-col hidden`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className={`flex items-center ${isSidebarOpen ? "" : "justify-center w-full"}`}>
            {isSidebarOpen ? (
              <h1 className="text-xl font-bold text-primary">CareerAI Coach</h1>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                AI
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex"
          >
            {isSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </Button>
        </div>
        
        <div className="flex flex-col flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center ${isSidebarOpen ? "px-3" : "justify-center"} py-2 rounded-md transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <link.icon className="w-5 h-5 flex-shrink-0" />
                {isSidebarOpen && <span className="ml-3">{link.name}</span>}
              </Link>
            );
          })}
        </div>
        
        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            className={`flex items-center ${isSidebarOpen ? "px-3 w-full" : "justify-center"} py-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </div>
      
      {/* Mobile Header */}
      <div className="sticky top-0 inset-x-0 z-20 bg-card border-b lg:hidden">
        <div className="flex items-center justify-between h-16 px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          <h1 className="text-xl font-bold text-primary">CareerAI Coach</h1>
          
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-sm font-medium">{userName.charAt(0)}</span>
          </div>
        </div>
      </div>
      
      {/* Mobile Sidebar */}
      <div 
        className={`fixed inset-0 z-20 bg-background/80 backdrop-blur-sm transition-opacity lg:hidden ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 transition-transform transform bg-card border-r shadow-sm lg:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <h1 className="text-xl font-bold text-primary">CareerAI Coach</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex flex-col flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-foreground hover:bg-muted"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <link.icon className="w-5 h-5 flex-shrink-0" />
                <span className="ml-3">{link.name}</span>
              </Link>
            );
          })}
        </div>
        
        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}
