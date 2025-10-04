import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Bell, Lock, User, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";

const Settings = () => {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-8 h-8" />
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences</p>
          </div>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Information
                </CardTitle>
                <CardDescription>
                  Update your account details and email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user?.email || ""} 
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact support to change your email address
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" />
                </div>

                <Button onClick={() => toast.success("Password updated successfully")}>
                  Update Password
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Security
                </CardTitle>
                <CardDescription>
                  Manage your security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Active Sessions</Label>
                  <p className="text-sm text-muted-foreground">
                    You're currently logged in on 1 device
                  </p>
                  <Button variant="outline" size="sm">
                    View All Sessions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch 
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <Switch 
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Job Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about new job matches
                    </p>
                  </div>
                  <Switch 
                    checked={jobAlerts}
                    onCheckedChange={setJobAlerts}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Message Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about new messages
                    </p>
                  </div>
                  <Switch 
                    checked={messageNotifications}
                    onCheckedChange={setMessageNotifications}
                  />
                </div>

                <Button onClick={() => toast.success("Notification preferences saved")}>
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>
                  Control who can see your information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Profile Visibility</Label>
                    <p className="text-sm text-muted-foreground">
                      Make your profile visible to companies
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Current Employer Shield</Label>
                    <p className="text-sm text-muted-foreground">
                      Hide your profile from your current employer
                    </p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Contact Information</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow companies to see your contact details
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Data Export</Label>
                  <p className="text-sm text-muted-foreground">
                    Download all your data in a portable format
                  </p>
                  <Button variant="outline" size="sm">
                    Request Data Export
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-destructive">Delete Account</Label>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Display Preferences
                </CardTitle>
                <CardDescription>
                  Customize how the platform looks for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <select className="w-full p-2 border rounded-md bg-background">
                    <option>English</option>
                    <option>Nederlands</option>
                  </select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <select className="w-full p-2 border rounded-md bg-background">
                    <option>Europe/Amsterdam</option>
                    <option>America/New_York</option>
                    <option>Asia/Tokyo</option>
                  </select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select className="w-full p-2 border rounded-md bg-background">
                    <option>EUR (€)</option>
                    <option>USD ($)</option>
                    <option>GBP (£)</option>
                  </select>
                </div>

                <Button onClick={() => toast.success("Preferences saved")}>
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;
