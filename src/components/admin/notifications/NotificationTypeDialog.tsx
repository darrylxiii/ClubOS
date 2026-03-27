import { useTranslation } from 'react-i18next';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  NotificationTypeWithAssignments,
  NOTIFICATION_CATEGORIES,
  useUpdateNotificationType,
  useCreateNotificationType,
} from "@/hooks/useNotificationTypes";

const formSchema = z.object({
  key: z.string().min(1, "Key is required").regex(/^[a-z_]+$/, "Key must be lowercase with underscores only"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["low", "normal", "high", "critical"]),
  edge_function: z.string().optional(),
  default_enabled: z.boolean(),
  allow_user_override: z.boolean(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface NotificationTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationType?: NotificationTypeWithAssignments;
}

export function NotificationTypeDialog({
  open,
  onOpenChange,
  notificationType,
}: NotificationTypeDialogProps) {
  const { t } = useTranslation('common');
  const updateMutation = useUpdateNotificationType();
  const createMutation = useCreateNotificationType();
  const isEditing = !!notificationType;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: notificationType?.key || "",
      name: notificationType?.name || "",
      description: notificationType?.description || "",
      category: notificationType?.category || "system",
      priority: notificationType?.priority || "normal",
      edge_function: notificationType?.edge_function || "",
      default_enabled: notificationType?.default_enabled ?? true,
      allow_user_override: notificationType?.allow_user_override ?? true,
      is_active: notificationType?.is_active ?? true,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: notificationType.id,
          updates: values,
        });
      } else {
        await createMutation.mutateAsync(values as any);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isSubmitting = updateMutation.isPending || createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Notification Type" : "Create Notification Type"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("key", "Key")}</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="notification_key"
                      disabled={isEditing}
                    />
                  </FormControl>
                  <FormDescription>
                    Unique identifier (lowercase, underscores only)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("display_name", "Display Name")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("notification_name", "Notification Name")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("description", "Description")}</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder={t("what_this_notification_is", "What this notification is for...")}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("category", "Category")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("select_category", "Select category")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NOTIFICATION_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.key} value={cat.key}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("priority", "Priority")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("select_priority", "Select priority")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">{t("low", "Low")}</SelectItem>
                        <SelectItem value="normal">{t("normal", "Normal")}</SelectItem>
                        <SelectItem value="high">{t("high", "High")}</SelectItem>
                        <SelectItem value="critical">{t("critical", "Critical")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="edge_function"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("edge_function", "Edge Function")}</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder={t("sendnotificationemail", "send-notification-email")}
                    />
                  </FormControl>
                  <FormDescription>
                    The edge function that sends this notification
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 pt-2">
              <FormField
                control={form.control}
                name="default_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t("enabled_by_default", "Enabled by Default")}</FormLabel>
                      <FormDescription>
                        New users will receive this notification
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allow_user_override"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t("allow_user_override", "Allow User Override")}</FormLabel>
                      <FormDescription>
                        Users can disable this notification
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t("active", "Active")}</FormLabel>
                      <FormDescription>
                        This notification type is currently in use
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
