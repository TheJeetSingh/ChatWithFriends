# Real-time Chat Application

A modern real-time chat application built with Next.js, TypeScript, Tailwind CSS, and Pusher for real-time communication. This application is designed to work seamlessly with Vercel's serverless functions.

## Features

- Real-time messaging using Pusher
- Simple username-based authentication (no OAuth keys required)
- Modern UI with Tailwind CSS
- TypeScript for type safety
- Vercel-compatible architecture (no Socket.IO)
- Direct MongoDB integration without ORM

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm or yarn
- MongoDB database (uses Atlas by default)

### Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the environment variables example file:

```bash
cp .env.example .env.local
```

4. Update the `.env.local` file with your:
   - MongoDB connection string (already configured with a database name)
   - Pusher credentials

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment on Vercel

This application is designed to be deployed on Vercel. Connect your GitHub repository to Vercel and make sure to add all the environment variables from your `.env.local` file to your Vercel project settings.

## Architecture

- **Frontend**: React with Next.js App Router
- **Styling**: Tailwind CSS
- **Authentication**: Simple username-based (client-side with cookies)
- **Database**: MongoDB - direct integration
- **Real-time communication**: Pusher
- **API**: Next.js API routes (App Router)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# ChatWithFriends
