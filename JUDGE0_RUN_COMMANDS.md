# Judge0 Run Commands

## Local Docker Run

Start all services:

```bash
docker compose up -d
```

Check running containers:

```bash
docker compose ps
```

Watch server logs:

```bash
docker compose logs -f server
```

Watch worker logs:

```bash
docker compose logs -f worker
```

Stop services:

```bash
docker compose down
```

Stop services and delete the Postgres volume:

```bash
docker compose down -v
```

## Start Redis And Postgres Only

```bash
docker compose up -d redis db
```

Then start Judge0:

```bash
docker compose up -d server worker
```

## Local API Test

Check system info:

```bash
curl http://localhost:2358/system_info
```

Open API docs:

```text
http://localhost:2358/docs
```

Create a Python submission locally:

```bash
curl -X POST "http://localhost:2358/submissions?base64_encoded=false&wait=true" \
  -H "Content-Type: application/json" \
  -d '{
    "language_id": 71,
    "source_code": "print(\"Hello from Judge0\")",
    "stdin": ""
  }'
```

List available languages:

```bash
curl http://localhost:2358/languages
```

## Cloudflare Tunnel

Run the configured Cloudflare tunnel:

```bash
cloudflared tunnel run judge0
```

Public API docs:

```text
https://judge0.kaarma.studio/docs
```

Public system info test:

```bash
curl https://judge0.kaarma.studio/system_info
```

Create a Python submission through the public URL:

```bash
curl -X POST "https://judge0.kaarma.studio/submissions?base64_encoded=false&wait=true" \
  -H "Content-Type: application/json" \
  -d '{
    "language_id": 71,
    "source_code": "print(\"Hello from Judge0\")",
    "stdin": ""
  }'
```

Expected success status:

```json
{
  "stdout": "Hello from Judge0\n",
  "status": {
    "id": 3,
    "description": "Accepted"
  }
}
```

## Config Notes

The local Docker setup uses `judge0.conf`.

Required values:

```env
REDIS_HOST=redis
REDIS_PASSWORD=dd7344b5c7342fd734cfab13bc7c008ac53bcec102ec8bc3
POSTGRES_HOST=db
POSTGRES_DB=judge0
POSTGRES_USER=judge0
POSTGRES_PASSWORD=aee89df2f788e79cdba8fcb26ce05f08c76fcc3d586ffe1f
```

Redis and Postgres are initialized automatically by Docker Compose. No manual database/user/password setup inside the containers is needed.

## Sandbox Fix For Ubuntu

If submissions fail with this error:

```text
Failed to create control group /sys/fs/cgroup/memory/box-.../: No such file or directory
No such file or directory @ rb_sysopen - /box/script.py
```

Enable cgroup v1 on the Ubuntu host.

Edit:

```bash
sudo nano /etc/default/grub
```

Set or update:

```bash
GRUB_CMDLINE_LINUX="systemd.unified_cgroup_hierarchy=0"
```

Apply and reboot:

```bash
sudo update-grub
sudo reboot
```

After reboot, verify:

```bash
ls /sys/fs/cgroup/memory
```

Then restart Judge0:

```bash
docker compose down -v
docker compose up -d
```
