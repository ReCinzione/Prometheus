'use client';

import { useState, useRef, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { User } from '@supabase/supabase-js';
import ReactCrop, { type Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // For file input styling if needed
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UploadCloud, ImageUp } from 'lucide-react';
import { toast } from 'sonner'; // Assuming sonner is used for notifications

interface CoverUploadClientProps {
  user: User;
  bookId: string; // ID of the book to associate the cover with
  currentCoverUrl?: string | null;
  onUploadSuccess: (newCoverUrl: string) => void; // Callback after successful upload
}

// Function to get a Blob from a cropped image canvas
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return Promise.resolve(null);
  }

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  ctx.drawImage(
    image,
    cropX,
    cropY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Canvas is empty');
        resolve(null);
        return;
      }
      // You can add 'blob.name = fileName;' if you need to preserve the name,
      // but Supabase upload will use the path you provide.
      resolve(blob);
    }, 'image/jpeg', 0.9); // Adjust quality as needed
  });
}

const ASPECT_RATIO = 6 / 9; // Standard book cover aspect ratio
const MIN_DIMENSION = 150;

export default function CoverUploadClient({
  user,
  bookId,
  currentCoverUrl,
  onUploadSuccess
}: CoverUploadClientProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If there's an existing cover URL, you might want to display it.
    // For simplicity, this component focuses on new uploads.
  }, [currentCoverUrl]);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Makes crop preview update between images.
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
      setError(null);
    }
  };

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    const crop = makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      ASPECT_RATIO,
      width,
      height
    );
    const centeredCrop = centerCrop(crop, width, height);
    setCrop(centeredCrop);
    setCompletedCrop(undefined); // Clear previous completed crop
  }

  const handleUpload = async () => {
    if (!completedCrop || !imgRef.current || !fileInputRef.current?.files?.[0]) {
      setError('Seleziona un file e definisci un\'area di ritaglio.');
      return;
    }
    setLoading(true);
    setError(null);

    const image = imgRef.current;
    const originalFile = fileInputRef.current.files[0];
    const croppedImageBlob = await getCroppedImg(image, completedCrop, originalFile.name);

    if (!croppedImageBlob) {
      setError('Errore durante il ritaglio dell\'immagine.');
      setLoading(false);
      return;
    }

    const fileExt = originalFile.name.split('.').pop() || 'jpg';
    const fileName = `cover.${fileExt}`;
    const filePath = `${user.id}/${bookId}/${fileName}`;

    try {
      // Delete existing file if it exists to avoid issues with caching or if overwriting is desired.
      // List files in the directory to find the exact name if it might vary (e.g. cover.png vs cover.jpg)
      // For simplicity here, we assume we can overwrite or the old one is removed by a trigger/manually if name changes.
      // A more robust solution might involve deleting the old file by its known path first.
      // const { error: listError, data: existingFiles } = await supabase.storage.from('book_covers').list(`${user.id}/${bookId}`);
      // if (existingFiles && existingFiles.length > 0) {
      //   await supabase.storage.from('book_covers').remove(existingFiles.map(f => `${user.id}/${bookId}/${f.name}`));
      // }


      const { data, error: uploadError } = await supabase.storage
        .from('book_covers') // Bucket name
        .upload(filePath, croppedImageBlob, {
          cacheControl: '3600',
          upsert: true, // True to overwrite if file with same path exists
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('book_covers')
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Impossibile ottenere l\'URL pubblico dell\'immagine.');
      }

      const fullPublicUrl = publicUrlData.publicUrl;

      // Update the 'libri' table with the new cover_image_url
      const { error: dbError } = await supabase
        .from('libri')
        .update({ cover_image_url: fullPublicUrl, updated_at: new Date().toISOString() })
        .eq('id', bookId)
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      toast.success('Copertina caricata e salvata con successo!');
      onUploadSuccess(fullPublicUrl);
      setImgSrc(''); // Clear preview
      setCrop(undefined);
      setCompletedCrop(undefined);
      if(fileInputRef.current) fileInputRef.current.value = "";


    } catch (err: any) {
      console.error('Upload error:', err);
      setError(`Errore caricamento: ${err.message || 'Sconosciuto'}`);
      toast.error(`Errore caricamento: ${err.message || 'Sconosciuto'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Carica Copertina del Libro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label htmlFor="cover-upload-input" className="sr-only">Scegli immagine</label>
          <Input
            id="cover-upload-input"
            type="file"
            accept="image/*"
            onChange={onSelectFile}
            ref={fileInputRef}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-purple-50 file:text-purple-700
              hover:file:bg-purple-100"
          />
           <p className="mt-1 text-xs text-gray-500">
            Consigliato: formato 6:9 (es. 1200x1800 pixel).
          </p>
        </div>

        {imgSrc && (
          <div className="flex flex-col items-center space-y-4">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={ASPECT_RATIO}
              minWidth={MIN_DIMENSION}
              minHeight={MIN_DIMENSION / ASPECT_RATIO}
              circularCrop={false}
              className="w-full max-w-xs sm:max-w-sm md:max-w-md" // Responsive max width
            >
              <img
                alt="Anteprima ritaglio"
                src={imgSrc}
                onLoad={onImageLoad}
                style={{ maxHeight: '70vh', objectFit: 'contain' }}
              />
            </ReactCrop>
            <Button
              onClick={handleUpload}
              disabled={loading || !completedCrop || !imgSrc}
              className="w-full gap-2"
              variant="default"
              size="default" // Added this line
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              Carica e Salva Copertina Ritagliata
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        {currentCoverUrl && !imgSrc && (
          <div className="mt-4 text-center">
            <p className="text-sm font-medium mb-2">Copertina Attuale:</p>
            <img
              src={currentCoverUrl}
              alt="Copertina attuale"
              className="w-32 h-auto mx-auto border shadow-md" // 6:9 aspect ratio = height is 1.5 * width
            />
          </div>
        )}
         {!currentCoverUrl && !imgSrc && (
          <div className="text-center py-8">
            <ImageUp className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">Nessuna copertina impostata.</p>
            <p className="text-xs text-gray-500">Seleziona un'immagine per iniziare.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
