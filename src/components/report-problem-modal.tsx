'use client';

import { useState, useRef, useTransition, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Paperclip, X, AlertCircle } from 'lucide-react';
import { reportProblem } from '@/server/actions/problems';
import { uploadToCloudinary } from '@/server/actions/upload';

interface ReportProblemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportProblemModal({ open, onOpenChange }: ReportProblemModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea on description change
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [description]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedTitle) {
      toast.error('Please enter a title for the issue');
      return;
    }
    if (!trimmedDesc) {
      toast.error('Please enter a description of the issue');
      return;
    }

    startTransition(async () => {
      try {
        let attachmentUrl: string | null = null;

        // 1. Upload file if selected
        if (selectedFile) {
          const formData = new FormData();
          formData.append('file', selectedFile);
          attachmentUrl = await uploadToCloudinary(formData);
        }

        // 2. Submit problem
        await reportProblem({
          title: trimmedTitle,
          description: trimmedDesc,
          attachmentUrl,
        });

        toast.success('Thank you! The problem has been reported successfully.');
        
        // Reset state
        setTitle('');
        setDescription('');
        removeFile();
        onOpenChange(false);
      } catch (err: any) {
        console.error('Submit problem error:', err);
        toast.error(err.message || 'Failed to submit problem report. Please try again.');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!isPending) onOpenChange(val); }}>
      <DialogContent 
        className="flex flex-col max-h-[85dvh] md:max-h-[80vh] w-[95vw] md:max-w-[480px] p-0 gap-0 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-background shadow-2xl"
        showCloseButton={false}
      >
        <DialogHeader className="relative border-b border-zinc-150 dark:border-zinc-900 px-5 py-4 flex-row items-center justify-between space-y-0 flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <DialogTitle className="font-bold text-base">Report a problem</DialogTitle>
            <DialogDescription className="sr-only">Submit a description of an issue to help improve the site</DialogDescription>
          </div>
          
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

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 space-y-4">
          {/* Title Input */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 select-none">
              Issue Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary (e.g. Navigation is slow)"
              disabled={isPending}
              className="w-full text-sm bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-700 placeholder-zinc-400 dark:placeholder-zinc-650 transition-all font-sans"
              maxLength={100}
              autoFocus
            />
          </div>

          {/* Description Textarea */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 select-none">
              Details
            </label>
            <div className="flex flex-col bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-700 transition-all">
              <textarea
                ref={textareaRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please include as many details as possible..."
                disabled={isPending}
                className="w-full text-sm bg-transparent border-0 p-3.5 focus:outline-none focus:ring-0 placeholder-zinc-400 dark:placeholder-zinc-650 disabled:opacity-50 resize-none font-sans leading-relaxed min-h-[120px] max-h-[220px]"
              />

              {/* Attachment Preview */}
              {filePreview && (
                <div className="px-3.5 pb-3">
                  <div className="relative inline-block rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-background max-h-[160px] max-w-[220px] flex justify-center items-center">
                    <img src={filePreview} alt="Upload preview" className="object-contain max-h-[160px] max-w-[220px] rounded-xl" />
                    <button
                      type="button"
                      onClick={removeFile}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1.5 rounded-full cursor-pointer transition-colors shadow-md animate-in fade-in duration-200"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom bar of textarea container */}
              <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-850 px-3 py-2.5 bg-zinc-100/30 dark:bg-zinc-900/10">
                {/* File Upload Trigger */}
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-zinc-400 hover:text-zinc-650 dark:text-zinc-500 dark:hover:text-zinc-350 transition-colors p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
                    title="Attach screenshot or file"
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
                </div>

                {/* Submit button */}
                <Button
                  onClick={handleSubmit}
                  disabled={!title.trim() || !description.trim() || isPending}
                  className="rounded-lg px-4 h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-semibold cursor-pointer transition-all"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Submit
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
