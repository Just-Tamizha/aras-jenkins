# Database & AML Build Automation Tool

## Overview
This project is a **Node.js-based build automation utility** that executes SQL scripts and Aras Innovator AML XML files in a controlled, ordered, and repeatable manner. It is suitable for **local builds, CI/CD pipelines, and environment provisioning**.

---

## Features

- SQL Server connectivity validation
- Ordered execution of admin SQL scripts
- Ordered execution of regular SQL scripts
- Ordered execution of AML XML files
- OAuth-based login to Aras Innovator
- Automatic OAuth endpoint discovery
- Robust logging and failure handling

---

## Prerequisites

### Software Requirements

- Node.js **v18+** (required for native `fetch`)
- Microsoft SQL Server Command Line Utilities (`sqlcmd` available in PATH)
- Aras Innovator instance with OAuth enabled

### Access Requirements

- SQL Server reachable from the execution machine
- HTTP access to Aras Innovator

---

## Installation / Download

1. Clone or download the project:
   ```bash
   git clone <repository-url>
   ```
   OR download as ZIP and extract it.

2. Ensure `sqlcmd` is available:
   ```bash
   sqlcmd -?
   ```

3. Verify Node.js version:
   ```bash
   node -v
   ```

---

## Usage

### Command Syntax

```bash
node build.js <db_server> <db_database> <db_user> <db_password>
```

### Example

```bash
node build.js localhost InnovatorSolutions sa Password@123
```

`baseUrl` is automatically derived as:
```
http://localhost/<db_database>
```

---

## Project Structure

```
.
├── adminsql/
│   ├── 1.sql
│   ├── 2.sql
│   └── ...
├── sql/
│   ├── 1.sql
│   ├── 2.sql
│   └── ...
├── xml-input/
│   ├── 1-admin-innovator.xml
│   ├── 2-user-password.xml
│   └── ...
├── build.js
└── README.md
```

---

## SQL Execution Rules

- Only files matching `<number>.sql` are executed
- Executed in ascending numeric order
- `adminsql/` runs before `sql/`
- Any failure stops the build immediately

---

## XML Execution Rules

### Filename Format

```
<SEQ>-<username>-<password>.xml
```

### Example

```
1-admin-innovator.xml
2-user-password.xml
```

### Behavior

- Executed in sequence order
- Logs into Aras per XML file
- Login failure skips that XML only
- AML execution errors are logged as warnings

---

## Authentication (Aras OAuth)

- OAuth discovery via:
  ```
  /Server/OAuthServerDiscovery.aspx
  ```
- Passwords are MD5 hashed and uppercased (Aras requirement)
- OAuth token retrieved using `IOMApp` client

---

## AML Execution

- Endpoint:
  ```
  /server/odata/method.AUTOMATION_AML_VS24
  ```
- Authorization: Bearer Token
- Payload: AML XML content

---

## Build Flow

1. Validate required folders
2. Validate SQL login
3. Execute admin SQL scripts
4. Execute regular SQL scripts
5. Execute AML XML files
6. Exit with success or failure code

---

## Error Handling

| Scenario | Build Result |
|--------|--------------|
| SQL connection failure | Build stops |
| SQL script failure | Build stops |
| Invalid XML filename | File skipped |
| Aras login failure | File skipped |
| AML execution error | Warning logged |

---

## Security Notes

- Avoid committing real credentials
- Use environment variables or pipeline secrets
- XML filenames contain passwords – protect repository access
- Use temporary or low-privilege Aras accounts

---

## Troubleshooting

### sqlcmd Not Found

Install Microsoft SQL Server Command Line Utilities and ensure PATH is set.

### OAuth Discovery Fails

- Verify Aras version supports OAuth
- Ensure `/Server/OAuthServerDiscovery.aspx` is reachable

---

## Recommended Enhancements

- Environment variable–based configuration
- Dry-run mode
- XML schema validation
- CI/CD pipeline integration
- Secure secret handling

---

## License

Internal / Project-specific usage