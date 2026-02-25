import { useState, useEffect } from "react";
import { apiClient, getImageUrl } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MouthPhotosProps {
  patientId: string;
}

interface MouthPhoto {
  id: string;
  image_url: string;
  created_at: string;
}

const MouthPhotos = ({ patientId }: MouthPhotosProps) => {
  const [photos, setPhotos] = useState<MouthPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [erroredPhotos, setErroredPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPhotos();
  }, [patientId]);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const data = await apiClient.request<MouthPhoto[]>(`/api/uploads/patient-mouth-photos/${patientId}`);
      setPhotos(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Echec du chargement des photos" );
      console.error(error);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = input.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        try {
          await apiClient.request(`/api/uploads/patient-mouth-photos/${patientId}`, {
            method: "POST",
            data: formData,
          });
        } catch (uploadError) {
          toast.error(`Echec de l'envoi de ${file.name}`);
        }
      }

      toast.success("Photos envoyees avec succes");
      fetchPhotos();
    } catch (error) {
      toast.error("Echec de l'envoi");
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await apiClient.request(`/api/uploads/patient-mouth-photos/${photoId}`, {
        method: "DELETE",
      });
      toast.success("Photo supprimee");
      fetchPhotos();
    } catch (error) {
      toast.error("Echec de la suppression de la photo");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Photos buccales</CardTitle>
          <CardDescription>Images buccales du patient</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos buccales</CardTitle>
        <CardDescription>Importer et gerer les images buccales du patient</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <input
              type="file"
              id="mouth-photo-upload"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <Button
              onClick={() => document.getElementById("mouth-photo-upload")?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer des photos
                </>
              )}
            </Button>
          </div>

          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune photo buccale pour le moment</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={getImageUrl(photo.image_url)}
                    crossOrigin="anonymous"
                    alt="Photo buccale"
                    className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90"  // 👈 ADD cursor-pointer
                    onClick={() => {  // 👈 ADD THIS
                      setSelectedImage(photo.image_url);
                      setIsModalOpen(true);
                    }}
                    onLoad={() => console.debug('[MouthPhotos] loaded', photo.id, getImageUrl(photo.image_url))}
                    onError={(e) => {
                      console.error('[MouthPhotos] failed to load', photo.id, getImageUrl(photo.image_url), e);
                      setErroredPhotos(prev => new Set(prev).add(photo.id));
                    }}
                  />

                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                    onClick={() => handleDeletePhoto(photo.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(photo.created_at).toLocaleDateString()}
                  </p>
                  {erroredPhotos.has(photo.id) && (
                    <div className="text-xs text-red-600 mt-1 break-words">
                      {getImageUrl(photo.image_url)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      {isModalOpen && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              className="absolute -top-12 right-0 text-white text-2xl hover:text-gray-300"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={getImageUrl(selectedImage!)}
              alt="Pleine taille"
              className="max-w-full max-h-full object-contain"
              crossOrigin="anonymous"
            />
          </div>
        </div>
      )}
    </Card>
  );
};

export default MouthPhotos;
