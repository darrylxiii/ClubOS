import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper } from "lucide-react";
import { NewsArticleCard } from "@/components/company/NewsArticleCard";
import { useTranslation } from 'react-i18next';

interface CompanyNewsTabProps {
  newsArticles: any[];
  newsLoading: boolean;
  isAdmin: boolean;
  isCompanyMember: boolean;
  companyLogoUrl: string | null;
  setAddNewsDialogOpen: (open: boolean) => void;
}

export const CompanyNewsTab = ({
  newsArticles,
  newsLoading,
  isAdmin,
  isCompanyMember,
  companyLogoUrl,
  setAddNewsDialogOpen,
}: CompanyNewsTabProps) => {
  const { t } = useTranslation('companies');
  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t('newsPress', 'News & Press')}</h2>
          <p className="text-muted-foreground">{t('latestNewsArticlesAndPress', 'Latest news articles and press mentions')}</p>
        </div>
        {(isAdmin || isCompanyMember) && (
          <Button onClick={() => setAddNewsDialogOpen(true)}>
            <Newspaper className="w-4 h-4 mr-2" />{t('addArticle', 'Add Article')}</Button>
        )}
      </div>

      {newsLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('loadingNewsArticles', 'Loading news articles...')}</div>
      ) : newsArticles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">{t('noNewsArticlesYet', 'No news articles yet')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {(isAdmin || isCompanyMember)
                ? "Add your first press mention or news article."
                : "Check back soon for news and press coverage."}
            </p>
            {(isAdmin || isCompanyMember) && (
              <Button onClick={() => setAddNewsDialogOpen(true)}>
                <Newspaper className="w-4 h-4 mr-2" />{t('addFirstArticle', 'Add First Article')}</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {newsArticles.map((article) => (
            <NewsArticleCard
              key={article.id}
              article={article}
              companyLogoUrl={companyLogoUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
};
