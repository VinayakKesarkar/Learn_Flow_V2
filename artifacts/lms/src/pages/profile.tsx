import { Link, useLocation } from "wouter";
import { BookOpen, LogOut, Loader2, GraduationCap, LayoutDashboard, Lock, ChevronRight, PlayCircle, CheckCircle2, Clock } from "lucide-react";
import { AppShell } from "@/components/layout";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLmsEnrolledSubjects } from "@/hooks/use-api";
import { motion } from "framer-motion";

export default function Profile() {
  const { user, logout } = useAuthStore();
  const [, setLocation] = useLocation();
  const { data, isLoading } = useLmsEnrolledSubjects();

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <Lock className="w-16 h-16 text-muted-foreground mb-6" />
          <h2 className="text-2xl font-bold mb-2">Please log in</h2>
          <p className="text-muted-foreground mb-6">You need to be logged in to view your profile.</p>
          <Button asChild size="lg"><Link href="/auth/login">Go to Login</Link></Button>
        </div>
      </AppShell>
    );
  }

  const enrolledSubjects = data?.subjects ?? [];
  const totalCompleted = enrolledSubjects.reduce((sum, s) => sum + s.completedVideos, 0);
  const totalVideos = enrolledSubjects.reduce((sum, s) => sum + s.totalVideos, 0);

  return (
    <AppShell>
      {/* Profile Header */}
      <div className="bg-slate-900 pb-32 pt-12 border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            <Avatar className="h-24 w-24 border-4 border-slate-700 shadow-xl bg-white">
              <AvatarFallback className="text-3xl text-primary font-bold bg-slate-100">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left text-white mb-2">
              <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
              <p className="text-slate-400 mt-1">{user.email}</p>
              {!isLoading && enrolledSubjects.length > 0 && (
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-sm text-slate-300">
                    <span className="font-bold text-white">{enrolledSubjects.length}</span> course{enrolledSubjects.length !== 1 ? "s" : ""} enrolled
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-sm text-slate-300">
                    <span className="font-bold text-white">{totalCompleted}</span> / {totalVideos} lessons completed
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Dashboard */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-lg border-border/50">
              <CardHeader className="border-b bg-slate-50/50 pb-4">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-primary" />
                  <CardTitle>My Learning Dashboard</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">

                {isLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>

                ) : enrolledSubjects.length === 0 ? (
                  /* Empty state — no enrollments */
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-border rounded-2xl bg-slate-50/50"
                  >
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                      <GraduationCap className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      You haven't enrolled in any courses yet
                    </h3>
                    <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
                      Start your learning journey by browsing our course catalog. Enroll in a course to track your progress here.
                    </p>
                    <Button asChild size="lg" className="shadow-md shadow-primary/20 hover-elevate">
                      <Link href="/">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Browse Courses
                      </Link>
                    </Button>
                  </motion.div>

                ) : (
                  /* Enrolled courses list */
                  <div className="space-y-4">
                    {enrolledSubjects.map((subject, i) => (
                      <motion.div
                        key={subject.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="group rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all bg-white overflow-hidden"
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                <BookOpen className="h-6 w-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                  {subject.title}
                                </h4>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <PlayCircle className="w-3.5 h-3.5" />
                                    {subject.totalVideos} lessons
                                  </span>
                                  {subject.completedVideos > 0 && (
                                    <span className="text-sm text-green-600 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      {subject.completedVideos} completed
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {subject.percentComplete === 100 ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                                </Badge>
                              ) : subject.percentComplete > 0 ? (
                                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
                                  <Clock className="w-3 h-3 mr-1" /> In Progress
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Not started
                                </Badge>
                              )}
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="hover-elevate text-primary hover:text-primary"
                              >
                                <Link href={
                                  subject.lastVideoId
                                    ? `/subjects/${subject.id}/video/${subject.lastVideoId}`
                                    : `/subjects/${subject.id}`
                                }>
                                  {subject.lastVideoId ? "Continue" : "Start"}
                                  <ChevronRight className="w-4 h-4 ml-1" />
                                </Link>
                              </Button>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-muted-foreground">Progress</span>
                              <span className="text-xs font-medium text-foreground">{subject.percentComplete}%</span>
                            </div>
                            <Progress value={subject.percentComplete} className="h-1.5" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: Account details */}
          <div className="space-y-8">
            <Card className="shadow-lg border-border/50">
              <CardHeader className="border-b bg-slate-50/50">
                <CardTitle className="text-lg">Account Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="font-medium mt-1">{user.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="font-medium mt-1 text-sm truncate">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                  <p className="font-medium mt-1">{new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="font-medium mt-1 text-green-600 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Active
                  </p>
                </div>
                {!isLoading && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-50 rounded-lg p-3 text-center border">
                      <p className="text-2xl font-bold text-primary">{enrolledSubjects.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Enrolled</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border">
                      <p className="text-2xl font-bold text-green-600">{totalCompleted}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Lessons Done</p>
                    </div>
                  </div>
                )}
                <div className="pt-4 mt-2 border-t">
                  <Button
                    variant="destructive"
                    className="w-full hover-elevate"
                    onClick={() => { logout(); setLocation("/"); }}
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Log Out
                  </Button>
                </div>
              </CardContent>
            </Card>

            {enrolledSubjects.length === 0 && !isLoading && (
              <Card className="shadow-sm border-dashed border-primary/30 bg-primary/5">
                <CardContent className="p-5 text-center">
                  <BookOpen className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">Ready to learn?</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Browse our catalog and enroll in your first course.
                  </p>
                  <Button asChild size="sm" className="w-full">
                    <Link href="/">Explore Courses</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
