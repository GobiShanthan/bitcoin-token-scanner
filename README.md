# Bitcoin Token Scanner

An MVC-structured application for scanning and exploring tokens in the Bitcoin blockchain.

## Setup Instructions

1. Install dependencies:
```
npm install
```

2. Make sure you have a Bitcoin Core node running on regtest mode with the following configuration:
```
username: admin
password: 1234
port: 18443
host: localhost
```
You can modify these settings in `config/config.js` if needed.

3. Start the application:
```
npm start
```

For development with auto-reload:
```
npm run dev
```

4. Open your browser and visit: [http://localhost:3000](http://localhost:3000)

## Project Structure

- `app.js` - Main application entry point
- `config/` - Configuration files
- `controllers/` - Request handlers
- `models/` - Data and business logic
- `services/` - External service integrations
- `utils/` - Utility functions
- `routes/` - Route definitions
- `views/` - EJS templates
- `public/` - Static assets

## Features

- Scan the Bitcoin blockchain for TSB tokens
- View detailed information about each token
- Explore transaction details
- RESTful API for programmatic access

## API Endpoints

- `GET /api/tokens` - Get all tokens
- `GET /api/token/:txid` - Get token by transaction ID
- `GET /api/status` - Get Bitcoin node status