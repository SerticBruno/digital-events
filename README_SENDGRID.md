# SendGrid Setup - Quick Start

Ovaj vodič će vas provesti kroz osnovni setup SendGrid-a za slanje emailova.

## ✅ Što je uključeno

- **Osnovni SendGrid setup** s API key-om
- **Email sending funkcionalnost** s error handling-om
- **Test stranica** za provjeru konfiguracije
- **Environment variables** setup

## 🚀 Quick Start

### 1. SendGrid Account Setup

1. Idite na [sendgrid.com](https://sendgrid.com) i kreirajte account
2. Odaberite **Free plan** (100 emailova/dan)
3. Kreirajte API key u **Settings > API Keys**

### 2. Environment Variables

Dodajte u `.env.local`:

```env
SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.hr
SENDGRID_FROM_NAME=Event Team
SENDGRID_REPLY_TO=info@yourdomain.hr
```

### 3. DNS Configuration

Dodajte ove DNS records za vaš domain:

```txt
# SPF Record
v=spf1 include:sendgrid.net ~all

# DKIM (dobićete od SendGrid-a)
selector._domainkey.yourdomain.hr

# DMARC
_dmarc.yourdomain.hr v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.hr
```

### 4. Test

1. Pokrenite development server: `npm run dev`
2. Idite na `/test-sendgrid`
3. Testirajte slanje emailova

## 📧 API Endpoints

- `POST /api/email/sendgrid-test` - Test email sending
- `GET /api/email/sendgrid-test` - Environment check

## 🔧 Basic Features

- **Email sending** s SendGrid API
- **Error handling** i logging
- **Custom headers** za bolju deliverability
- **Tracking settings** (click, open, subscription)
- **Custom arguments** za analytics

## 📝 Usage Example

```javascript
import { sendSendGridEmail } from '@/lib/sendgrid'

const result = await sendSendGridEmail({
  to: 'guest@example.com',
  subject: 'Event Invitation',
  html: '<h1>Welcome!</h1><p>You are invited...</p>',
  customArgs: {
    event_id: '123',
    guest_type: 'VIP'
  }
})
```

## 🛠️ Troubleshooting

### Common Issues

1. **API Key not set**: Provjerite `SENDGRID_API_KEY` u `.env.local`
2. **From email not verified**: Verificirajte domain u SendGrid dashboard-u
3. **Emails going to spam**: Provjerite SPF, DKIM, DMARC records

### Testing

- Koristite `/test-sendgrid` stranicu za testiranje
- Počnite s malim volumenom (1-2 emaila)
- Provjerite SendGrid dashboard za delivery status

## 📚 Resources

- [SendGrid Documentation](https://sendgrid.com/docs/)
- [Email Deliverability Guide](https://sendgrid.com/docs/ui/sending-email/deliverability/)
- [API Reference](https://sendgrid.com/docs/api-reference/)

**Napomena**: Za veće volume (1000+ emailova/mjesečno) preporučeno je koristiti Essentials ili Pro plan. 