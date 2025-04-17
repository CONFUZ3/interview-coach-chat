
import { Card } from "@/components/ui/card";
import { Copy, DownloadCloud, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageType } from "./ChatInterface";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatMessageProps {
  message: MessageType;
  onCopy?: () => void;
  onDownload?: () => void;
  onDownloadLatex?: () => void;
}

export default function ChatMessage({ message, onCopy, onDownload, onDownloadLatex }: ChatMessageProps) {
  if (message.isTyping) {
    return (
      <div className="flex justify-start mb-4">
        <Card className="chat-message-ai">
          <div className="typing-indicator">
            <div className="typing-indicator-dot"></div>
            <div className="typing-indicator-dot"></div>
            <div className="typing-indicator-dot"></div>
          </div>
        </Card>
      </div>
    );
  }

  const isAI = message.type === "ai";
  const isResume = message.format === "resume";
  const isLatex = message.format === "latex";
  const isFeedback = message.format === "feedback";

  return (
    <div className={`flex ${isAI ? "justify-start" : "justify-end"} mb-4`}>
      <Card className={isAI ? "chat-message-ai" : "chat-message-user"}>
        <div className="flex justify-between items-start">
          <div className={`${isResume || isFeedback ? "prose prose-sm dark:prose-invert max-w-none" : ""}`}>
            {isLatex ? (
              <Tabs defaultValue="preview">
                <TabsList className="mb-2">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="source">LaTeX Source</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="prose prose-sm dark:prose-invert max-w-none">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      LaTeX resume generated successfully. Use the download buttons to get your formatted resume.
                    </p>
                    <pre className="text-xs p-2 bg-muted rounded-md max-h-60 overflow-auto">
                      {extractResumePreviewFromLatex(message.content)}
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="source">
                  <pre className="text-xs p-2 bg-muted rounded-md max-h-60 overflow-auto whitespace-pre-wrap font-mono">
                    {message.content}
                  </pre>
                </TabsContent>
              </Tabs>
            ) : isResume ? (
              <div dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, "<br>") }} />
            ) : (
              message.content.split("\n").map((line, index) => (
                <p key={index} className={`${index > 0 ? "mt-2" : ""} ${isFeedback ? "italic text-amber-600 dark:text-amber-400" : ""}`}>
                  {line}
                </p>
              ))
            )}
          </div>
          
          {isAI && message.content.length > 20 && (
            <div className="ml-4 flex flex-col space-y-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onCopy} className="h-8 w-8">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy to clipboard</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {(isResume || isLatex) && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={onDownload} className="h-8 w-8">
                          <DownloadCloud className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download as PDF</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {isLatex && onDownloadLatex && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={onDownloadLatex} className="h-8 w-8">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download LaTeX source</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground mt-2">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </Card>
    </div>
  );
}

// Helper function to extract meaningful content from LaTeX for preview
function extractResumePreviewFromLatex(latexCode: string): string {
  // Extract sections and content for a basic preview
  const sections: string[] = [];
  let inDocument = false;
  let currentSection = "";
  
  latexCode.split('\n').forEach(line => {
    if (line.includes('\\begin{document}')) {
      inDocument = true;
      return;
    }
    
    if (line.includes('\\end{document}')) {
      inDocument = false;
      return;
    }
    
    if (!inDocument) return;
    
    // Detect sections
    if (line.match(/\\section\{([^}]+)\}/)) {
      const sectionName = line.match(/\\section\{([^}]+)\}/)?.[1];
      if (sectionName) {
        sections.push(`## ${sectionName}`);
      }
      return;
    }
    
    // Detect subsections
    if (line.match(/\\subsection\{([^}]+)\}/)) {
      const subsectionName = line.match(/\\subsection\{([^}]+)\}/)?.[1];
      if (subsectionName) {
        sections.push(`### ${subsectionName}`);
      }
      return;
    }
    
    // Clean up some LaTeX commands for better preview
    const cleanedLine = line
      .replace(/\\textbf\{([^}]+)\}/g, "**$1**")
      .replace(/\\textit\{([^}]+)\}/g, "*$1*")
      .replace(/\\item\s?/g, "- ")
      .replace(/\\\\/, "")
      .replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, "$2 ($1)")
      .trim();
      
    if (cleanedLine.length > 0 && !cleanedLine.startsWith("\\")) {
      sections.push(cleanedLine);
    }
  });
  
  return sections.join('\n');
}
