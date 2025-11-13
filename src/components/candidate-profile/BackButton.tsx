import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  fromJob?: string;
  fromCompany?: string;
  fromAdmin?: boolean;
  fromSearch?: boolean;
}

export const BackButton = ({ fromJob, fromCompany, fromAdmin, fromSearch }: Props) => {
  const navigate = useNavigate();
  
  const getBackDestination = () => {
    if (fromJob) return { 
      path: `/jobs/${fromJob}/dashboard`, 
      label: 'Back to Job Dashboard' 
    };
    if (fromCompany) return { 
      path: `/company-applications`, 
      label: 'Back to Applications' 
    };
    if (fromAdmin) return { 
      path: `/admin/candidates`, 
      label: 'Back to Candidate Hub' 
    };
    if (fromSearch) return { 
      path: `/search`, 
      label: 'Back to Search Results' 
    };
    return { path: '/home', label: 'Back to Home' };
  };
  
  const destination = getBackDestination();
  
  return (
    <Button variant="ghost" size="sm" onClick={() => navigate(destination.path)}>
      <ArrowLeft className="w-4 h-4 mr-2" />
      {destination.label}
    </Button>
  );
};
