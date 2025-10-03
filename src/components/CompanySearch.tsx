import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { Building2 } from "lucide-react";

interface Company {
  name: string;
  domain?: string;
  logo?: string;
}

interface CompanySearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (company: Company) => void;
}

export const CompanySearch = ({ value, onChange, onSelect }: CompanySearchProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const searchCompanies = async () => {
      if (value.trim().length < 2) {
        setCompanies([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('search-companies', {
          body: { query: value }
        });

        if (error) throw error;

        setCompanies(data.companies || []);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching companies:', error);
        setCompanies([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchCompanies, 300);
    return () => clearTimeout(debounceTimer);
  }, [value]);

  const handleSelect = (company: Company) => {
    onSelect(company);
    setShowResults(false);
    onChange("");
  };

  return (
    <div className="relative">
      <Input
        placeholder="Search for a company..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.length >= 2 && setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
        className="bg-background/50"
      />
      
      {showResults && (companies.length > 0 || isLoading) && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-[300px] overflow-hidden">
          <Command className="bg-transparent">
            <CommandList>
              {isLoading ? (
                <CommandEmpty>Searching companies...</CommandEmpty>
              ) : companies.length === 0 ? (
                <CommandEmpty>No companies found</CommandEmpty>
              ) : (
                <CommandGroup>
                  {companies.map((company, index) => (
                    <CommandItem
                      key={`${company.name}-${index}`}
                      value={company.name}
                      onSelect={() => handleSelect(company)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      {company.logo ? (
                        <img 
                          src={company.logo} 
                          alt={company.name}
                          className="w-6 h-6 rounded object-cover"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-muted-foreground" />
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{company.name}</span>
                        {company.domain && (
                          <span className="text-xs text-muted-foreground">{company.domain}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
};
