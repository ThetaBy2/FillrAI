# Run FillrAI on your device

## 1. Project folder
Unzip / clone so the folder is named **fillrai**:

```
fillrai/
  start.sh
  start.bat
  .env
  frontend/
  backend/
  data/
```

Path example: `~/Desktop/fillrai` or `C:\Users\You\Desktop\fillrai`

## 2. Gemini key
In `.env`:

```
GEMINI_API_KEY=your_real_key_here
GEMINI_MODEL=gemini-3.6-flash
```

## 3. MongoDB (database name: **fillrai**)

FillrAI uses MongoDB only. You do **not** need to create the database or any
collections — they are created and filled automatically on first start.

### Docker Compose (recommended)
Install and start Docker Desktop, then from the project folder run:

```bash
docker compose up --build
```

Compose starts MongoDB and the Node.js app together. The root `.env` is configured for this mode.

### Local MongoDB
Install MongoDB Community Server and ensure it is running. For a local Node.js run, set `MONGODB_URL` in `.env` to:

```
MONGODB_URL=mongodb://127.0.0.1:27017
MONGODB_DB=fillrai
```

If your local server has authentication on:

```
MONGODB_URL=mongodb://USER:PASSWORD@127.0.0.1:27017/?authSource=admin
```

### MongoDB Atlas (cloud)
```
MONGODB_URL=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net
MONGODB_DB=fillrai
```

Special characters in the password must be URL-encoded (`@` → `%40`, `#` → `%23`, …).
Allow your IP address in Atlas → Network Access.

Install Node.js 20+ before using the local start scripts.

## 4. Start locally
```bash
cd fillrai
./start.sh          # Mac/Linux
start.bat           # Windows
```

## 5. Open
http://127.0.0.1:8000

### Demo logins (password for all)
**`fillrai1234`**

- user01@example.com  
- user02@example.com  
- …  
- user50@example.com  

DigiLocker OTP prints in the **server terminal**.


