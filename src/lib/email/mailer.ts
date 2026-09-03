import { Resend } from 'resend';

export async function sendPaymentReceiptEmail({
  to,
  userName,
  amount,
  trxId,
  paymentMethod,
  date,
  premiumUntil,
}: {
  to: string;
  userName?: string;
  amount: number;
  trxId: string;
  paymentMethod: string;
  date: string;
  premiumUntil: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'AnimeHub <support@animehub.web.id>';

  const formattedAmount = `Rp ${amount.toLocaleString('id-ID')}`;
  const formattedUntil = new Date(premiumUntil).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const htmlContent = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Bukti Pembayaran VIP AnimeHub</title>
    </head>
    <body style="margin:0; padding:0; background-color:#09090b; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#f4f4f5;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#09090b; padding: 40px 16px;">
        <tr>
          <td align="center">
            
            <!-- SINGLE UNIFIED CARD CONTAINER -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 460px; background-color:#18181b; border-radius: 20px; border: 1px solid #27272a; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
              
              <!-- BRAND TOP HEADER -->
              <tr>
                <td style="background-color: #09090b; padding: 20px 28px; border-bottom: 1px solid #27272a;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td valign="middle">
                        <span style="font-size: 22px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.5px;">
                          <span style="color: #ffffff;">Anime</span><span style="color: #fbbf24;">Hub</span>
                        </span>
                      </td>
                      <td align="right" valign="middle">
                        <span style="color: #22c55e; font-size: 12px; font-weight: 600; background-color: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); padding: 4px 10px; border-radius: 20px;">
                          Pembayaran Lunas
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- CARD BODY -->
              <tr>
                <td style="padding: 32px 28px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    
                    <!-- HERO GREETING & AMOUNT -->
                    <tr>
                      <td style="padding-bottom: 24px; border-bottom: 1px dashed #27272a;">
                        <span style="color:#a1a1aa; font-size: 13px; font-weight: 500; display: block; margin-bottom: 4px;">Halo <strong>${userName || 'Pengguna'}</strong>, berikut bukti pembayaran langganan kamu:</span>
                        <h1 style="margin: 8px 0 4px 0; font-size: 38px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">${formattedAmount}</h1>
                        <span style="color:#71717a; font-size: 12px; font-weight: 500; display: block;">Ditagihkan pada ${date}</span>
                      </td>
                    </tr>

                    <!-- DETAILS BLOCK -->
                    <tr>
                      <td style="padding-top: 20px; padding-bottom: 20px; border-bottom: 1px solid #27272a;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
                          <tr>
                            <td style="color: #a1a1aa; padding-bottom: 10px;">ID Transaksi</td>
                            <td align="right" style="color: #ffffff; font-weight: 600; font-family: monospace; padding-bottom: 10px;">${trxId}</td>
                          </tr>
                          <tr>
                            <td style="color: #a1a1aa; padding-bottom: 10px;">Metode Pembayaran</td>
                            <td align="right" style="color: #ffffff; font-weight: 600; padding-bottom: 10px;">${paymentMethod}</td>
                          </tr>
                          <tr>
                            <td style="color: #a1a1aa; padding-bottom: 10px;">Item / Layanan</td>
                            <td align="right" style="color: #ffffff; font-weight: 600; padding-bottom: 10px;">AnimeHub VIP (+30 Hari)</td>
                          </tr>
                          <tr>
                            <td style="color: #a1a1aa;">Masa Aktif VIP</td>
                            <td align="right" style="color: #22c55e; font-weight: 700;">Sampai ${formattedUntil}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- VIP BENEFITS SUMMARY IN INNER BOX -->
                    <tr>
                      <td style="padding-top: 20px;">
                        <table border="0" cellpadding="14" cellspacing="0" width="100%" style="background-color: #09090b; border: 1px solid #27272a; border-radius: 12px;">
                          <tr>
                            <td>
                              <span style="color: #fbbf24; font-size: 12px; font-weight: 700; display: block; margin-bottom: 6px; text-transform: uppercase;">Keuntungan VIP Kamu Aktif:</span>
                              <span style="color: #d4d4d8; font-size: 12px; line-height: 1.6; display: block;">
                                • Streaming Bebas Iklan Banner & Pop-up<br/>
                                • Akses Fitur Ruang Nobar (Watch Party)<br/>
                                • Server Prioritas Kecepatan Tinggi
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- SUPPORT LINK -->
                    <tr>
                      <td style="padding-top: 24px; text-align: center;">
                        <span style="color: #71717a; font-size: 12px; display: block;">Butuh bantuan dengan transaksi ini?</span>
                        <a href="mailto:animehub.support@gmail.com" style="color: #fbbf24; text-decoration: none; font-size: 12px; font-weight: 600; margin-top: 4px; display: inline-block;">Hubungi Tim Support AnimeHub &rarr;</a>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>

              <!-- FOOTER INSIDE CARD -->
              <tr>
                <td style="background-color: #09090b; padding: 14px 28px; border-top: 1px solid #27272a; text-align: center; font-size: 11px; color: #52525b;">
                  AnimeHub Billing System • Otomatis & Terverifikasi
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const textFallback = `Bukti Pembayaran Resmi AnimeHub VIP\n\nTotal Pembayaran: ${formattedAmount}\nNomor Transaksi: ${trxId}\nMetode Pembayaran: ${paymentMethod}\nTanggal: ${date}\nMasa Aktif Sampai: ${formattedUntil}\n\nTerima kasih telah berlangganan AnimeHub VIP!`;

  if (!resendApiKey) {
    console.log(`[Email Mock] RESEND_API_KEY is missing in .env.local. Receipt generated for ${to}:`, { trxId, amount });
    return { success: true, mocked: true };
  }

  const resend = new Resend(resendApiKey);
  const data = await resend.emails.send({
    from: emailFrom,
    to,
    replyTo: 'animehub.support@gmail.com',
    subject: `Kuitansi Pembayaran AnimeHub VIP #${trxId}`,
    text: textFallback,
    html: htmlContent,
  });

  console.log('[Resend Email Result]', data);
  return data;
}
