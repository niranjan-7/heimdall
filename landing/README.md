# Heimdall — Official Animated Landing Page

The modern, cinematic landing page for **Heimdall** — The standalone Windows, macOS, and Linux VLC & mpv Watch-History & Media Companion App.

Built with **React 19**, **Vite**, **TypeScript**, **Tailwind CSS v4**, **Framer Motion**, and **Canvas Confetti**.

---

## 🚀 Live Local Development

To run the landing page locally:

```bash
# Navigate to landing directory
cd landing

# Install dependencies
npm install

# Start Vite dev server on port 5174
npm run dev -- --port 5174
```

Then visit:
- **Local:** `http://localhost:5174`
- **LAN Wi-Fi:** `http://192.168.29.195:5174`

Or from the root directory:
```bash
npm run landing:dev
```

---

## 📦 Production Build

```bash
cd landing
npm run build
```

This compiles a minified, optimized production bundle to `landing/dist/`.

---

## ⚡ Deploying to Vercel

### Option 1: Via Vercel Web Dashboard (Recommended & Easiest)

1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select the repository: `niranjan-7/heimdall`.
3. In the project settings, configure:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click "Edit" and choose `landing`
   - **Build Command:** `npm run build` (detected automatically)
   - **Output Directory:** `dist` (detected automatically)
4. Click **Deploy**. Vercel will build and assign an instant production URL (e.g. `heimdall-app.vercel.app`).

### Option 2: Via Vercel CLI

If you have Vercel CLI installed:

```bash
cd landing
npx vercel
```

Follow the prompts:
- Set up and deploy `c:\code\Heimdall\landing`? **Y**
- Which scope do you want to deploy to? **Select your account**
- Link to existing project? **N**
- Project name: `heimdall`
- Directory located: `./`
- Modify settings? **N**

For subsequent production deploys:
```bash
npx vercel --prod
```
