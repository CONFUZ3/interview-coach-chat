
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  FileText, 
  MessageSquare, 
  UserCircle, 
  FilePlus
} from "lucide-react";

interface SidebarNavProps {
  closeMenu?: () => void;
}

export default function SidebarNav({ closeMenu }: SidebarNavProps) {
  const location = useLocation();
  
  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: <Home className="h-4 w-4 mr-2" /> 
    },
    { 
      path: '/resume', 
      label: 'Career Coach', 
      icon: <MessageSquare className="h-4 w-4 mr-2" /> 
    },
    { 
      path: '/resume-builder', 
      label: 'Resume Builder', 
      icon: <FilePlus className="h-4 w-4 mr-2" /> 
    },
    { 
      path: '/interview', 
      label: 'Interview Prep', 
      icon: <FileText className="h-4 w-4 mr-2" /> 
    },
    { 
      path: '/profile', 
      label: 'Profile', 
      icon: <UserCircle className="h-4 w-4 mr-2" /> 
    }
  ];
  
  const handleClick = () => {
    if (closeMenu) closeMenu();
  };
  
  return (
    <nav className="space-y-1 w-full p-2">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          onClick={handleClick}
          className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors w-full
            ${location.pathname === item.path 
              ? 'bg-accent text-accent-foreground font-medium' 
              : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
            }`}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
