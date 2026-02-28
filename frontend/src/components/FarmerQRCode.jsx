import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Download, QrCode, Printer, Share2, Copy } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FarmerQRCode = ({ farmerId, farmerName, showActions = true, size = 200 }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState(null);

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
    } catch (error) {
      console.error('Error loading QR code:', error);
      // Fallback: generate simple QR data
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

  const copyQRData = () => {
    if (qrData) {
      navigator.clipboard.writeText(qrData);
      toast.success('Données QR copiées');
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
            border: 2px solid #0f766e;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            max-width: 350px;
          }
          .logo {
            color: #0f766e;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .qr-container {
            margin: 20px 0;
          }
          .name {
            font-size: 20px;
            font-weight: bold;
            margin: 15px 0 5px;
          }
          .info {
            color: #666;
            font-size: 14px;
            margin: 5px 0;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #999;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🌱 GreenLink</div>
          <div class="qr-container">
            <img src="${cardData?.qr_code_image || ''}" width="200" height="200" />
          </div>
          <div class="name">${farmerName || 'Producteur'}</div>
          <div class="info">${cardData?.village || ''}</div>
          <div class="info">${cardData?.cooperative || ''}</div>
          <div class="info">ID: ${farmerId?.slice(-8)}</div>
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
              Télécharger
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
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={copyQRData}
            >
              <Copy className="w-4 h-4 mr-1" />
              Copier
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
