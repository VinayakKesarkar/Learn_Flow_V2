import { useEffect, useState, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import YouTube, { YouTubeProps } from "react-youtube";
import { CheckCircle, Lock, PlayCircle, ChevronRight, ChevronLeft, Loader2, Menu, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLmsSubjectTree, useLmsVideo, useLmsVideoProgress, useLmsUpdateProgress, useLmsSubjectProgress } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { QuestionForm } from "@/components/discussion/QuestionForm";
import { QuestionList } from "@/components/discussion/QuestionList";
import { CertificateCard } from "@/components/certificates/CertificateCard";
import { MessageSquare, Award } from "lucide-react";

export default function VideoPage() {
  const { subjectId, videoId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const sId = parseInt(subjectId || "0", 10);
  const vId = parseInt(videoId || "0", 10);

  const { data: tree, isLoading: loadingTree } = useLmsSubjectTree(sId);
  const { data: video, isLoading: loadingVideo, error: videoError } = useLmsVideo(vId);
  const { data: progress } = useLmsVideoProgress(vId);
  const { data: subjectProgress } = useLmsSubjectProgress(sId);
  
  const updateProgressMutation = useLmsUpdateProgress();
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Extract YouTube ID
  const extractVideoId = (url: string) => {
    if (!url) return "";
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
    return match ? match[1] : url; // Assume string is ID if regex fails
  };

  // Error handling for un-enrolled or not found
  useEffect(() => {
    if (videoError) {
      toast({
        title: "Access Denied",
        description: "You must be enrolled to view this lesson.",
        variant: "destructive"
      });
      setLocation(`/subjects/${sId}`);
    }
  }, [videoError, sId, setLocation, toast]);

  // Video Progress Tracking
  useEffect(() => {
    if (!isPlaying || !video || video.locked || !playerRef.current) return;
    
    const interval = setInterval(() => {
      const currentTime = playerRef.current.getCurrentTime();
      if (currentTime > 0) {
        updateProgressMutation.mutate({
          videoId: vId,
          data: { lastPositionSeconds: Math.floor(currentTime), isCompleted: false }
        });
      }
    }, 5000); // Ping every 5s
    
    return () => clearInterval(interval);
  }, [isPlaying, video, vId]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    if (progress?.lastPositionSeconds && !progress.isCompleted) {
      event.target.seekTo(progress.lastPositionSeconds);
    }
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 1 = playing, 2 = paused, 0 = ended
    setIsPlaying(event.data === 1);
  };

  const onEnd: YouTubeProps['onEnd'] = () => {
    setIsPlaying(false);
    if (!video) return;
    
    updateProgressMutation.mutate(
      {
        videoId: vId,
        data: { 
          lastPositionSeconds: video.durationSeconds || playerRef.current?.getDuration() || 0, 
          isCompleted: true 
        }
      },
      {
        onSuccess: () => {
          toast({ title: "Lesson completed!", description: "Great job. Ready for the next one?" });
          // Auto-advance logic could go here, but keeping it manual via button is often better UX
        }
      }
    );
  };

  if (loadingTree || loadingVideo) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!video || !tree) return null;

  // Flatten tree for prev/next lookups and sidebar rendering
  const flatVideos = tree.sections.flatMap(s => s.videos);

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200">
      <div className="p-4 border-b border-slate-800">
        <Link href={`/subjects/${sId}`} className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Course
        </Link>
        <h2 className="font-display font-bold text-white text-lg leading-tight">{tree.title}</h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {tree.sections.map((section) => (
            <div key={section.id}>
              <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-wider mb-3 px-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.videos.map((v) => {
                  const isActive = v.id === vId;
                  const isClickable = !v.locked;
                  
                  return (
                    <div 
                      key={v.id}
                      onClick={() => {
                        if (isClickable && !isActive) {
                          setLocation(`/subjects/${sId}/video/${v.id}`);
                          setIsSidebarOpen(false);
                        }
                      }}
                      className={cn(
                        "flex gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                        isActive ? "bg-primary text-white shadow-md shadow-primary/20" : 
                        isClickable ? "hover:bg-slate-800 text-slate-300 cursor-pointer" : "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {v.isCompleted ? (
                          <CheckCircle className={cn("h-4 w-4", isActive ? "text-white" : "text-green-500")} />
                        ) : v.locked ? (
                          <Lock className="h-4 w-4 text-slate-500" />
                        ) : (
                          <PlayCircle className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium leading-snug line-clamp-2",
                          isActive ? "text-white" : isClickable ? "text-slate-200" : "text-slate-500"
                        )}>
                          {v.title}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden flex-col md:flex-row">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-80 shrink-0 border-r border-slate-800">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <Link href={`/subjects/${sId}`} className="text-slate-300">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold truncate px-4">{tree.title}</span>
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800 hover:text-white">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 border-slate-800 bg-slate-900">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        <ScrollArea className="flex-1 bg-background">
          <div className="mx-auto max-w-5xl w-full">
            
            {/* Video Player Area */}
            <div className="w-full bg-black aspect-video relative shadow-xl z-10">
              {video.locked ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-center p-6">
                  <div className="bg-slate-800 p-4 rounded-full mb-4">
                    <Lock className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Lesson Locked</h3>
                  <p className="text-slate-400 max-w-md">
                    {video.unlockReason || "You must complete the previous lessons before accessing this content."}
                  </p>
                  {video.previousVideoId && (
                    <Button 
                      className="mt-6 hover-elevate shadow-lg shadow-primary/20" 
                      onClick={() => setLocation(`/subjects/${sId}/video/${video.previousVideoId}`)}
                    >
                      <ChevronLeft className="mr-2 w-4 h-4" /> Go to Previous Lesson
                    </Button>
                  )}
                </div>
              ) : (
                <YouTube
                  videoId={extractVideoId(video.youtubeUrl)}
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: {
                      autoplay: 0,
                      rel: 0,
                      modestbranding: 1,
                    },
                  }}
                  onReady={onReady}
                  onStateChange={onStateChange}
                  onEnd={onEnd}
                  className="absolute inset-0 w-full h-full"
                  iframeClassName="w-full h-full"
                />
              )}
            </div>

            {/* Video Details */}
            <div className="p-6 md:p-8 lg:p-10 max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
                <div>
                  <Badge variant="outline" className="mb-3 border-primary/20 text-primary bg-primary/5">
                    Section: {video.sectionTitle}
                  </Badge>
                  <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tight">
                    {video.title}
                  </h1>
                </div>
                
                {progress?.isCompleted && (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 px-3 py-1.5 shadow-sm whitespace-nowrap shrink-0">
                    <CheckCircle className="w-4 h-4 mr-1.5 inline" /> Completed
                  </Badge>
                )}
              </div>

              <div className="prose prose-slate dark:prose-invert max-w-none mb-10">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {video.description || "No description provided for this lesson."}
                </p>
              </div>

              <Separator className="my-8" />

              {/* Navigation Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {video.previousVideoId ? (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full sm:w-auto h-12 hover-elevate bg-white"
                    onClick={() => setLocation(`/subjects/${sId}/video/${video.previousVideoId}`)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" /> Previous Lesson
                  </Button>
                ) : (
                  <div className="w-full sm:w-auto"></div>
                )}
                
                {video.nextVideoId && (
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto h-12 shadow-md shadow-primary/20 hover-elevate"
                    onClick={() => setLocation(`/subjects/${sId}/video/${video.nextVideoId}`)}
                  >
                    Next Lesson <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>

              {/* Certificate (shows when course is 100% complete) */}
              {subjectProgress?.percentComplete === 100 && (
                <div className="mt-8">
                  <CertificateCard
                    subjectId={sId}
                    subjectTitle={tree?.sections?.[0]?.videos?.[0]?.title ?? ""}
                    percentComplete={100}
                  />
                </div>
              )}

              {/* Lesson Discussion */}
              <Separator className="my-10" />
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold font-display">Lesson Discussion</h2>
                </div>
                <QuestionForm videoId={vId} />
                <QuestionList videoId={vId} />
              </div>
            </div>
            
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

// Utility for class merging
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
