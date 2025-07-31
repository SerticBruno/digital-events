# SendGrid Setup Guide

Ovaj vodič će vas provesti kroz setup SendGrid-a za email delivery.

## 📋 Prerequisites

- SendGrid account (Free plan je dovoljan za početak)
- Domain name za slanje emailova
- DNS access za konfiguraciju

## 🚀 Step-by-Step Setup

### 1. SendGrid Account

1. Idite na [sendgrid.com](https://sendgrid.com)
2. Kreirajte account
3. Odaberite **Free plan** (100 emailova/dan)

### 2. API Key Setup

1. U SendGrid dashboard-u, idite na **Settings > API Keys**
2. Kliknite **Create API Key**
3. Odaberite **Full Access** ili **Restricted Access** s **Mail Send** permissions
4. Kopirajte API key (bit će prikazan samo jednom)

### 3. Domain Authentication

1. Idite na **Settings > Sender Authentication**
2. Kliknite **Authenticate Your Domain**
3. Unesite vaš domain (npr. `yourdomain.hr`)
4. Dodajte DNS records koje će vam dati SendGrid

### 4. Environment Variables

Dodajte u `.env.local`:

```env
SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.hr
SENDGRID_FROM_NAME=Event Team
SENDGRID_REPLY_TO=info@yourdomain.hr
```

## 🔧 DNS Configuration

### SPF Record
```
v=spf1 include:sendgrid.net ~all
```

### DKIM Record
SendGrid će vam dati specifičan DKIM record za vaš domain.

### DMARC Record
```
_dmarc.yourdomain.hr TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.hr;"
```

## 🧪 Testing

### 1. Environment Check
```bash
curl http://localhost:3000/api/email/sendgrid-test
```

### 2. Test Email
```bash
curl -X POST http://localhost:3000/api/email/sendgrid-test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Test</h1><p>This is a test email.</p>"
  }'
```

## 📊 Monitoring

### SendGrid Dashboard
- **Activity**: Provjerite delivery status
- **Statistics**: Email metrics
- **Bounces**: Failed deliveries

### Best Practices

1. **Start Small**: Počnite s malim volumenom
2. **Monitor Bounces**: Pratite bounce rate
3. **Clean Lists**: Uklonite invalid emailove
4. **Authenticate**: Koristite SPF, DKIM, DMARC

## 🛠️ Troubleshooting

### Common Issues

1. **API Key Error**
   - Provjerite je li API key ispravan
   - Provjerite permissions

2. **DNS Issues**
   - Pričekajte 24h za DNS propagation
   - Provjerite DNS records

3. **Authentication Failed**
   - Provjerite domain authentication
   - Provjerite SPF/DKIM records

### Support Resources

- [SendGrid Documentation](https://sendgrid.com/docs/)
- [Email Deliverability Guide](https://sendgrid.com/docs/ui/sending-email/deliverability/)
- [API Reference](https://sendgrid.com/docs/api-reference/)

## 📈 Scaling

### Free Plan (100/day)
- Dovoljan za testiranje
- Osnovne features

### Essentials Plan ($15/month)
- 50k emailova/mjesečno
- Dedicated IP (opcionalno)
- Advanced features

### Pro Plan ($89/month)
- 100k emailova/mjesečno
- Dedicated IP
- Advanced analytics

**Napomena**: Za veće volume (1000+ emailova/mjesečno) preporučeno je koristiti Essentials ili Pro plan. 