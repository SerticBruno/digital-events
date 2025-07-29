# Digital Events Platform

A comprehensive event management system for handling large-scale events with digital invitations, QR code entry, and automated follow-ups. Built with Next.js 14, TypeScript, and Prisma.

## Features

### 🎯 Core Functionality
- **Digital Invitations**: Send personalized "Save the Date" and formal invitations
- **QR Code Entry**: Secure entry system with unique QR codes for each guest
- **Response Tracking**: Monitor invitation responses in real-time
- **Post-Event Surveys**: Automated feedback collection from attendees
- **VIP Management**: Special handling for VIP guests with different QR codes

### 📧 Email Campaigns
- Save the Date communications (multiple flights)
- Formal invitations with response tracking
- QR code delivery for confirmed attendees
- Post-event survey distribution to attendees who used their QR codes

### 📊 Dashboard
- Real-time event statistics
- Guest list management
- Email campaign controls
- Response tracking and analytics

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Hook Form** - Form handling

### Backend
- **Next.js API Routes** - Server-side API
- **Prisma** - Database ORM
- **SQLite** - Development database (PostgreSQL for production)

### Email Service
- **Resend** - Transactional email service
- **Custom HTML templates** - Professional email designs

### QR Codes
- **qrcode** - QR code generation
- **React QR Code** - Frontend QR display

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd digital-events
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   # Database
   DATABASE_URL="file:./dev.db"
   
   # Email Service (Resend)
   RESEND_API_KEY="your_resend_api_key_here"
   
   # App Configuration
   NEXTAUTH_SECRET="your_nextauth_secret_here"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Survey Configuration
   GOOGLE_FORM_URL="https://forms.google.com/your-form-id"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── events/            # Event management
│   │   ├── guests/            # Guest management
│   │   ├── email/             # Email sending
│   │   └── qr/                # QR code validation
│   ├── dashboard/             # Admin dashboard
│   ├── respond/               # Guest response pages
│   └── survey/                # Survey pages
├── lib/
│   ├── db.ts                  # Database connection
│   ├── email.ts               # Email service
│   └── qr.ts                  # QR code utilities
└── components/                # Reusable components
```

## Database Schema

### Events
- Basic event information (name, date, location)
- Capacity and description

### Guests
- Contact information
- VIP status
- Company and position

### Invitations
- Email tracking (sent, opened, responded)
- Response status
- Plus-one handling

### QR Codes
- Unique codes for entry
- Usage tracking
- VIP vs Regular types

### Surveys
- Post-event feedback sent to attendees who used their QR codes
- Google Form integration for easy survey management
- Survey status tracking in the dashboard

## Email Workflow

1. **Save the Date** → Sent to all guests
2. **Formal Invitation** → Sent with response options
3. **QR Code** → Sent to confirmed attendees
4. **Survey** → Sent to attendees who used their QR codes (attended the event)

## Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Environment Variables for Production
```env
DATABASE_URL="postgresql://username:password@host:port/database"
RESEND_API_KEY="re_..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="https://yourdomain.com"
GOOGLE_FORM_URL="https://forms.google.com/your-form-id"
```

### Database Migration
```bash
npx prisma db push --accept-data-loss
```

## API Endpoints

### Events
- `GET /api/events` - List all events
- `POST /api/events` - Create new event

### Guests
- `GET /api/guests?eventId=...` - List guests for event
- `POST /api/guests` - Add new guest

### Email
- `POST /api/email/send` - Send email campaigns

### QR Codes
- `POST /api/qr/validate` - Validate and use QR code

### Surveys
- `POST /api/surveys/send` - Send surveys to attendees who used their QR codes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please contact the development team.

---

**Built with ❤️ for seamless event management**
