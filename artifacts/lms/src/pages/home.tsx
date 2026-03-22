import { Link } from "wouter";
import { BookOpen, Users, Clock, PlayCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLmsSubjects } from "@/hooks/use-api";
import { AppShell } from "@/components/layout";
import { motion } from "framer-motion";

export default function Home() {
  const { data, isLoading } = useLmsSubjects({ page: 1, limit: 20 });

  return (
    <AppShell>
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-background border-b">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90" />
        </div>
        
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium text-primary bg-primary/10 border-primary/20">
              Transform Your Career Today
            </Badge>
            <h1 className="font-display text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl mb-6">
              Master New Skills with <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Structured Learning</span>
            </h1>
            <p className="mt-4 text-xl text-muted-foreground leading-relaxed">
              Dive into our expertly crafted courses. Our strict sequential progression ensures you master the fundamentals before moving on.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button size="lg" className="h-14 px-8 text-lg rounded-xl shadow-lg shadow-primary/20 hover-elevate" asChild>
                <a href="#courses">Explore Courses</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Courses Section */}
      <div id="courses" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">Featured Programs</h2>
            <p className="mt-2 text-muted-foreground">Comprehensive subjects designed for structured mastery.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : data?.subjects && data.subjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {data.subjects.map((subject, idx) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
              >
                <Card className="h-full flex flex-col group overflow-hidden border-border/50 hover:border-primary/30 shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="h-48 w-full bg-gradient-to-br from-primary/10 to-accent/10 relative flex items-center justify-center border-b">
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary" className="bg-white/80 backdrop-blur text-foreground font-semibold">
                        {subject.totalVideos} Lessons
                      </Badge>
                    </div>
                    <BookOpen className="w-20 h-20 text-primary/40 group-hover:scale-110 group-hover:text-primary/60 transition-transform duration-500" />
                  </div>
                  
                  <CardHeader className="flex-none">
                    <CardTitle className="text-xl line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {subject.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 mt-2">
                      {subject.description || "No description available."}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-grow">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <PlayCircle className="w-4 h-4" />
                        <span>{subject.totalSections} Sections</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Self-paced</span>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="pt-4 border-t bg-muted/20">
                    <Button asChild className="w-full font-semibold hover-elevate">
                      <Link href={`/subjects/${subject.id}`}>View Curriculum</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-card rounded-2xl border border-dashed">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No subjects found</h3>
            <p className="mt-1 text-muted-foreground">Check back later for new content.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
