import { useState, useRef } from "react";
import { Camera, Upload, CheckCircle2, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  deliveryId: string;
  driverId: string;
  existingPhotoUrl?: string | null;
  onUploaded?: () => void;
  readOnly?: boolean;
}

export default function ProofOfDelivery({ deliveryId, driverId, existingPhotoUrl, onUploaded, readOnly = false }: Props) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingPhotoUrl || null);
  const [showFull, setShowFull] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${driverId}/${deliveryId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("delivery-proofs")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("delivery-proofs")
      .getPublicUrl(path);

    const photoUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("deliveries")
      .update({ proof_photo_url: photoUrl } as any)
      .eq("id", deliveryId);

    if (updateError) {
      toast.error("Failed to save proof: " + updateError.message);
    } else {
      toast.success("Proof of delivery uploaded! 📸");
      setPreviewUrl(photoUrl);
      onUploaded?.();
    }
    setUploading(false);
  };

  if (previewUrl) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Proof of Delivery
        </div>
        <div
          className="relative cursor-pointer group rounded-lg overflow-hidden border border-border"
          onClick={() => setShowFull(!showFull)}
        >
          <img
            src={previewUrl}
            alt="Delivery proof"
            className={`w-full object-cover transition-all ${showFull ? "max-h-96" : "max-h-24"}`}
          />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        {!readOnly && (
          <>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Camera className="h-3 w-3" /> Retake
            </Button>
          </>
        )}
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ImageIcon className="h-3.5 w-3.5" />
        No proof photo yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 w-full border-dashed border-primary/30 text-primary hover:bg-primary/5"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Uploading...
          </>
        ) : (
          <>
            <Camera className="h-3.5 w-3.5" />
            Upload Proof Photo
          </>
        )}
      </Button>
    </div>
  );
}
