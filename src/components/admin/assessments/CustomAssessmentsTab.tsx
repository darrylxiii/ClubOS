import { memo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCustomAssessments } from '@/hooks/useCustomAssessments';
import { AssessmentTemplate } from '@/types/assessment';
import { Plus, Edit, Trash, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const CustomAssessmentsTab = memo(() => {
  const { getTemplates, deleteTemplate, loading } = useCustomAssessments();
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data } = await getTemplates();
    if (data) {
      setTemplates(data);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this assessment template?')) {
      await deleteTemplate(id);
      loadTemplates();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Custom Assessment Templates</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage custom assessments for your organization
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No custom assessments yet</p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="text-4xl">{template.icon}</div>
                  <Badge variant={template.is_active ? 'default' : 'secondary'}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{template.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="capitalize">
                    {template.category}
                  </Badge>
                  <Badge variant="outline">
                    {template.estimated_time} min
                  </Badge>
                  {template.is_public && (
                    <Badge variant="outline">Public</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
});

CustomAssessmentsTab.displayName = 'CustomAssessmentsTab';
