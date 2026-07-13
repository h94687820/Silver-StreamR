import { useState } from "react";
import { useLocation } from "wouter";
import { useCreatePost, useCreateStory, useRequestUploadUrl } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch"; // Will create this
import { ImagePlus, Video, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Create() {
  const [location, setLocation] = useLocation();
  const isStoryMode = new URLSearchParams(window.location.search).get("type") === "story";
  
  const [mode, setMode] = useState<"post" | "story">(isStoryMode ? "story" : "post");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const requestUrlMutation = useRequestUploadUrl();
  const createPostMutation = useCreatePost();
  const createStoryMutation = useCreateStory();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
  };

  const handleSubmit = async () => {
    if (!content && !file) return;
    if (mode === "story" && !file) {
      alert("Stories require an image or video.");
      return;
    }

    setIsUploading(true);
    try {
      let objectPath = "";
      let mediaType: "image" | "video" = "image";

      if (file) {
        mediaType = file.type.startsWith("video") ? "video" : "image";
        const urlRes = await requestUrlMutation.mutateAsync({
          data: { name: file.name, size: file.size, contentType: file.type }
        });
        
        await fetch(urlRes.uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file
        });
        objectPath = `/api/storage${urlRes.objectPath}`;
      }

      if (mode === "post") {
        await createPostMutation.mutateAsync({
          data: {
            content,
            isPrivate,
            mediaUrls: objectPath ? [objectPath] : undefined,
            mediaType: objectPath ? mediaType : undefined
          }
        });
        queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
        setLocation("/feed");
      } else {
        await createStoryMutation.mutateAsync({
          data: {
            mediaUrl: objectPath,
            mediaType
          }
        });
        queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
        setLocation("/feed");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to upload. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 w-full">
      <div className="flex bg-secondary p-1 rounded-xl mb-6">
        <button 
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "post" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
          onClick={() => setMode("post")}
        >
          Post
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "story" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
          onClick={() => setMode("story")}
        >
          Story
        </button>
      </div>

      <div className="space-y-4">
        {mode === "post" && (
          <Textarea 
            placeholder="What's on your mind?" 
            className="min-h-[120px] text-base resize-none border-none bg-secondary/30 rounded-2xl p-4 focus-visible:ring-0 focus-visible:bg-secondary/50 transition-colors"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        )}

        {preview ? (
          <div className="relative rounded-2xl overflow-hidden bg-secondary">
            <button onClick={removeFile} className="absolute top-2 right-2 z-10 p-1.5 bg-black/50 text-white rounded-full backdrop-blur-md">
              <X className="w-5 h-5" />
            </button>
            {file?.type.startsWith("video") ? (
              <video src={preview} controls className="w-full h-64 object-cover" />
            ) : (
              <img src={preview} className="w-full h-64 object-cover" />
            )}
          </div>
        ) : (
          <div className="flex gap-4">
            <label className="flex-1 flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:bg-secondary/50 transition-colors text-muted-foreground">
              <ImagePlus className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">Add Image</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
            <label className="flex-1 flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:bg-secondary/50 transition-colors text-muted-foreground">
              <Video className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">Add Video</span>
              <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        )}

        {mode === "post" && (
          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
            <div>
              <p className="font-medium text-sm">Private Post</p>
              <p className="text-xs text-muted-foreground">Only visible to your followers</p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
        )}

        <Button 
          className="w-full h-12 rounded-xl text-base silver-shimmer shadow-lg"
          onClick={handleSubmit}
          disabled={isUploading || (!content && !file)}
        >
          {isUploading ? "Publishing..." : `Publish ${mode === "post" ? "Post" : "Story"}`}
        </Button>
      </div>
    </div>
  );
}
