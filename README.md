# Hope — Simple Login Demo

This small project provides a login/register page backed by SQLite and a Node/Express server. It supports a "Remember me" option via a long-lived cookie stored on the server.

Quick start

1. Install dependencies

```powershell
npm install
```

2. Start the server

```powershell
npm start
```

3. Open the UI in your browser:

```
http://localhost:3000/wassup.html
```

Notes

- Credentials are stored in `data.sqlite3` in the project root (passwords are hashed with bcrypt).
- The server sets a `remember` cookie when "Remember me" is checked. To clear it, click Logout.
- This project is a simple demo and not hardened for production use.
