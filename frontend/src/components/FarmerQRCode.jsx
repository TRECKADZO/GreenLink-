import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Download, QrCode, Printer, Share2, Copy, Camera, FileDown, User } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FarmerQRCode = ({ farmerId, farmerName, showActions = true, size = 200 }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (farmerId) {
      loadQRCode();
    }
  }, [farmerId]);

  const loadQRCode = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/qrcode/farmer/${farmerId}/card`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to load QR code');
      
      const data = await response.json();
      setCardData(data);
      setQrData(data.qr_code_data);
      if (data.photo_url) {
        setPhotoPreview(data.photo_url);
      }
    } catch (error) {
      console.error('Error loading QR code:', error);
      setQrData(`GREENLINK_FARMER:${farmerId}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/qrcode/farmer/${farmerId}/download?size=400&style=gradient`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr_greenlink_${farmerName?.replace(/\s+/g, '_') || farmerId}.png`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('QR Code téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const downloadPDFCard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/farmer-cards/export-single/${farmerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carte_${farmerName?.replace(/\s+/g, '_') || 'producteur'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Carte PDF téléchargée');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const copyQRData = () => {
    if (qrData) {
      navigator.clipboard.writeText(qrData);
      toast.success('Données QR copiées');
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }

    setUploading(true);
    try {
      // Convertir en base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result;
        setPhotoPreview(base64);

        // Envoyer au serveur
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/users/me/photo`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ photo_url: base64 })
        });

        if (response.ok) {
          toast.success('Photo mise à jour');
        } else {
          // Si l'API n'existe pas encore, on garde juste le preview local
          console.log('Photo stored locally');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setUploading(false);
    }
  };

  const printQRCode = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code - ${farmerName || 'Producteur'}</title>
        <style>
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            font-family: Arial, sans-serif;
          }
          .card {
            border: 3px solid #0f766e;
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          .logo {
            color: #0f766e;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .photo {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #0f766e;
            margin-bottom: 15px;
          }
          .photo-placeholder {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #0f766e, #10b981);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 28px;
            font-weight: bold;
            margin: 0 auto 15px;
          }
          .qr-container {
            margin: 20px 0;
            padding: 10px;
            background: white;
            border-radius: 10px;
          }
          .name {
            font-size: 22px;
            font-weight: bold;
            color: #1e293b;
            margin: 15px 0 5px;
          }
          .info {
            color: #64748b;
            font-size: 14px;
            margin: 5px 0;
          }
          .coop {
            color: #0f766e;
            font-size: 13px;
            font-weight: 600;
          }
          .id {
            color: #94a3b8;
            font-size: 11px;
            font-family: monospace;
            margin-top: 10px;
          }
          .footer {
            margin-top: 20px;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🌱 GreenLink</div>
          ${photoPreview ? 
            `<img src="${photoPreview}" class="photo" />` : 
            `<div class="photo-placeholder">${(farmerName || 'P').split(' ').map(n => n[0]).join('').slice(0,2)}</div>`
          }
          <div class="qr-container">
            <img src="${cardData?.qr_code_image || ''}" width="180" height="180" />
          </div>
          <div class="name">${farmerName || 'Producteur'}</div>
          <div class="info">${cardData?.village || ''}</div>
          <div class="coop">${cardData?.cooperative || ''}</div>
          <div class="id">ID: ${farmerId?.slice(-8)}</div>
          <div class="footer">Scannez ce code avec l'app GreenLink</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-[200px] h-[200px] bg-slate-800 rounded-lg"></div>
            <div className="h-4 w-32 bg-slate-800 rounded mt-4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <QrCode className="w-5 h-5 text-emerald-400" />
          Mon QR Code GreenLink
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {/* Photo Section */}
        <div className="relative mb-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoChange}
            accept="image/*"
            className="hidden"
          />
          {photoPreview ? (
            <img 
              src={photoPreview} 
              alt="Photo producteur"
              className="w-20 h-20 rounded-full object-cover border-3 border-emerald-500"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white text-2xl font-bold">
              {(farmerName || 'P').split(' ').map(n => n[0]).join('').slice(0,2)}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white hover:bg-emerald-600 transition-colors"
            disabled={uploading}
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Display */}
        <div className="bg-white p-4 rounded-xl shadow-lg">
          {qrData && (
            <QRCodeSVG
              value={qrData}
              size={size}
              level="H"
              includeMargin={false}
              fgColor="#0f766e"
              bgColor="#ffffff"
            />
          )}
        </div>
        
        {/* Farmer Info */}
        <div className="text-center mt-4 space-y-1">
          <p className="text-white font-bold text-lg">{farmerName || 'Producteur'}</p>
          {cardData?.village && (
            <p className="text-slate-400 text-sm">{cardData.village}</p>
          )}
          {cardData?.cooperative && (
            <Badge variant="outline" className="border-emerald-500 text-emerald-400">
              {cardData.cooperative}
            </Badge>
          )}
          <p className="text-slate-500 text-xs font-mono">ID: {farmerId?.slice(-8)}</p>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={downloadQRCode}
            >
              <Download className="w-4 h-4 mr-1" />
              QR Code
            </Button>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={downloadPDFCard}
            >
              <FileDown className="w-4 h-4 mr-1" />
              Carte PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={printQRCode}
            >
              <Printer className="w-4 h-4 mr-1" />
              Imprimer
            </Button>
          </div>
        )}

        {/* Instructions */}
        <p className="text-slate-500 text-xs text-center mt-4 max-w-xs">
          Les agents de terrain peuvent scanner ce QR code avec l'application GreenLink pour accéder à votre profil.
        </p>
      </CardContent>
    </Card>
  );
};

export default FarmerQRCode;
