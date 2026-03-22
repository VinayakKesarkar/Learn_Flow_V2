import { Link, useParams, useLocation } from "wouter";
import { CheckCircle, Lock, PlayCircle, Loader2, ArrowLeft, BookOpen, Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLmsSubject, useLmsEnroll, useLmsSubjectTree, useLmsSubjectProgress } from "@/hooks/use-api";
import { AppShell } from "@/components/layout";
import { useAuthStore } from "@/store/auth-store";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { ReviewList, ReviewSummary } from "@/components/reviews/ReviewList";

export default function SubjectDetails() {
  const { subjectId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  const id = parseInt(subjectId || "0", 10);
  
  const { data: subject, isLoading: loadingSubject } = useLmsSubject(id);
  const { data: tree, isLoading: loadingTree } = useLmsSubjectTree(id);
  const { data: progress } = useLmsSubjectProgress(id);
  const enrollMutation = useLmsEnroll();

  const handleEnroll = async () => {
    if (!user) {
      setLocation("/auth/login");
      return;
    }
    try {
      await enrollMutation.mutateAsync({ subjectId: id });
      toast({
        title: "Successfully enrolled!",
        description: "You can now access the course videos.",
      });
    } catch (e: any) {
      toast({
        title: "Enrollment failed",
        description: e.message || "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const findNextVideoUrl = () => {
    if (progress?.lastVideoId) {
      return `/subjects/${id}/video/${progress.lastVideoId}`;
    }
    // Fallback to first video in tree
    const firstSection = tree?.sections?.[0];
    const firstVideo = firstSection?.videos?.[0];
    if (firstVideo) {
      return `/subjects/${id}/video/${firstVideo.id}`;
    }
    return "#";
  };

  if (loadingSubject || loadingTree) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!subject || !tree) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl py-24 text-center">
          <h2 className="text-2xl font-bold">Subject not found</h2>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/">Browse all courses</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Subject Header */}
      <div className="bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/20 opacity-30" />
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 relative z-10">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-300 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to courses
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4 text-slate-300 border-slate-600 bg-slate-800/50 backdrop-blur">
                {subject.totalVideos} Lessons
              </Badge>
              <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-4">
                {subject.title}
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
                {subject.description || "Comprehensive learning path with structured progression to guarantee mastery."}
              </p>
            </div>
            
            <div className="shrink-0 w-full md:w-auto bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl">
              {!subject.isEnrolled ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Enrollment</span>
                    <span className="font-bold text-green-400">Free</span>
                  </div>
                  <Button 
                    size="lg" 
                    className="w-full h-12 text-lg shadow-lg hover-elevate bg-primary hover:bg-primary/90"
                    onClick={handleEnroll}
                    disabled={enrollMutation.isPending}
                  >
                    {enrollMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Enroll Now"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 min-w-[240px]">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-300">Your Progress</span>
                      <span className="font-bold">{progress?.percentComplete || 0}%</span>
                    </div>
                    <Progress value={progress?.percentComplete || 0} className="h-3 bg-slate-700/50" />
                  </div>
                  <Button asChild size="lg" className="w-full h-12 text-lg hover-elevate bg-white text-slate-900 hover:bg-slate-100">
                    <Link href={findNextVideoUrl()}>
                      {progress?.completedVideos ? "Continue Learning" : "Start Course"}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum Section */}
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Course Curriculum</h2>
        </div>

        <Card className="shadow-md border-border/50 overflow-hidden">
          <Accordion type="multiple" defaultValue={tree.sections.map(s => s.id.toString())} className="w-full">
            {tree.sections.map((section, idx) => (
              <AccordionItem value={section.id.toString()} key={section.id} className={idx === tree.sections.length - 1 ? "border-none" : ""}>
                <AccordionTrigger className="px-6 py-4 hover:bg-slate-50/50 data-[state=open]:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-semibold text-lg">{section.title}</span>
                    <Badge variant="secondary" className="font-medium bg-muted/50">
                      {section.videos.length} videos
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0 border-t bg-white">
                  <div className="flex flex-col divide-y divide-border/30">
                    {section.videos.map((video) => {
                      const isClickable = subject.isEnrolled && !video.locked;
                      
                      return (
                        <div key={video.id} className={`flex items-center px-6 py-4 transition-colors ${
                          isClickable ? "hover:bg-slate-50 group cursor-pointer" : "opacity-60 bg-slate-50/30"
                        }`}>
                          <div className="mr-4 flex-shrink-0">
                            {video.isCompleted ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : video.locked ? (
                              <Lock className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <PlayCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          
                          <div className="flex-grow">
                            <h4 className={`font-medium ${isClickable ? "group-hover:text-primary transition-colors" : "text-muted-foreground"}`}>
                              {video.title}
                            </h4>
                          </div>
                          
                          <div className="flex-shrink-0 ml-4">
                            {isClickable ? (
                              <Button asChild variant="ghost" size="sm" className="hidden sm:flex hover-elevate">
                                <Link href={`/subjects/${subject.id}/video/${video.id}`}>
                                  {video.isCompleted ? "Re-watch" : "Watch"}
                                </Link>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground font-medium flex items-center">
                                <Lock className="w-3 h-3 mr-1 inline" />
                                Locked
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </div>

      {/* Reviews Section */}
      <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <Separator className="mb-12" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Student Reviews</h2>
            </div>
            <ReviewSummary subjectId={id} />
            <ReviewList subjectId={id} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Rate this course</h3>
            </div>
            <ReviewForm subjectId={id} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
