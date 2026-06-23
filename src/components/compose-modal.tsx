'use client';

import { useEffect, useState, useRef, useTransition } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { createPost } from '@/server/actions/posts';
import { uploadToCloudinary } from '@/server/actions/upload';
import { toast } from 'sonner';
import { Loader2, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComposeModal({ open, onOpenChange }: ComposeModalProps) {
  const [content, setContent] = useState('');
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea on content change
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);

  useEffect(() => {
    if (!open) return;
    
    // Fetch profile of the logged-in user on client side
    const fetchProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', user.id)
            .maybeSingle();
          if (data) {
            setProfile(data);
          }
        }
      } catch (err) {
        console.error('Error fetching profile in compose modal:', err);
      }
    };

    fetchProfile();
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const charLimit = 500;
  const charsRemaining = charLimit - content.length;
  const isOverLimit = charsRemaining < 0;
  const isValid = (content.trim().length > 0 || selectedFile !== null) && !isOverLimit;

  const handlePostSubmit = () => {
    if (!isValid || isPending) return;

    startTransition(async () => {
      try {
        let attachmentUrl: string | null = null;

        // 1. Upload to Cloudinary if image is selected
        if (selectedFile) {
          const formData = new FormData();
          formData.append('file', selectedFile);
          attachmentUrl = await uploadToCloudinary(formData);
        }

        // 2. Create post with the optional attachmentUrl
        await createPost(content, attachmentUrl);
        
        toast.success('Thread posted successfully!');
        setContent('');
        removeSelectedFile();
        onOpenChange(false);
      } catch (err: any) {
        toast.error(err.message || 'Failed to create post. Please try again.');
      }
    });
  };

  const displayName = profile?.display_name || 'User';
  const avatarUrl = profile?.avatar_url || null;
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!isPending) onOpenChange(val); }}>
      <DialogContent 
        className="flex flex-col max-h-[85dvh] md:max-h-[80vh] w-[95vw] md:max-w-[550px] p-0 gap-0 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-background shadow-2xl"
        showCloseButton={false}
      >
        <DialogHeader className="relative border-b border-zinc-150 dark:border-zinc-900 px-5 py-4 flex-row items-center justify-between space-y-0 flex-shrink-0">
          <DialogTitle className="font-bold text-base">New Thread</DialogTitle>
          <DialogDescription className="sr-only">Create a new post on Signal</DialogDescription>
          
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650 dark:text-zinc-500 dark:hover:text-zinc-350 transition-colors p-1.5 rounded-lg cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        {/* Scrollable Content Wrapper */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          <div className="flex gap-3">
            {/* Left column: User Avatar */}
            <div className="flex-shrink-0">
              <Avatar className="h-10 w-10 border border-zinc-200 dark:border-zinc-800">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="font-semibold text-xs bg-zinc-100 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-350">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Right column: Form */}
            <div className="flex-1 min-w-0 flex flex-col space-y-3">
              <div className="font-bold text-sm select-none">{displayName}</div>
              
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind?"
                  disabled={isPending}
                  className="w-full text-[15px] bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder-zinc-400 dark:placeholder-zinc-600 disabled:opacity-50 resize-none font-sans leading-relaxed min-h-[100px]"
                  autoFocus
                />
              </div>

              {/* Selected Image Preview with responsive containment */}
              {imagePreview && (
                <div className="relative mt-2 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex justify-center items-center max-h-[220px] w-full">
                  <img 
                    src={imagePreview} 
                    alt="Upload preview" 
                    className="max-h-[220px] w-auto object-contain rounded-xl" 
                  />
                  <button
                    type="button"
                    onClick={removeSelectedFile}
                    className="absolute top-2.5 right-2.5 bg-black/70 hover:bg-black text-white p-1.5 rounded-full cursor-pointer transition-colors shadow-md animate-in fade-in duration-200"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-zinc-150 dark:border-zinc-900 px-5 py-4 flex-shrink-0 bg-background">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-zinc-400 hover:text-zinc-650 dark:text-zinc-500 dark:hover:text-zinc-350 transition-colors p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
              title="Add image"
              disabled={isPending}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <span className={cn(
              "text-xs font-mono select-none",
              isOverLimit ? "text-red-500 font-bold" : "text-zinc-400 dark:text-zinc-500"
            )}>
              {charsRemaining} characters left
            </span>
          </div>
          
          <Button
            onClick={handlePostSubmit}
            disabled={!isValid || isPending}
            className="rounded-xl px-5 h-9 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 font-semibold cursor-pointer transition-all"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
