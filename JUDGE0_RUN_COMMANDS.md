# Judge0 Run Commands

## Local Docker Run (via Makefile)

We now use a `Makefile` to simplify running the Judge0 environments.

Start the entire development environment (NextGen App + Judge0 Dev):

```bash
make dev-up
```

Alternatively, to start *only* the Judge0 dev environment:

```bash
make judge0-dev-up
```

Watch logs across all services:

```bash
make logs
```

Stop services:

```bash
make dev-down
```

Stop services and delete the Postgres volume (Warning: Destructive!):

```bash
make clean-all
```

## Start Redis And Postgres Only

*(Note: In the new setup, the dev environment bundles everything together. If you need to manually manage them, you can still use standard docker-compose commands.)*

```bash
docker compose -f docker-compose.dev.yml up -d redis db
```

Then start Judge0:

```bash
docker compose -f docker-compose-judge0-prod.yml up -d server worker
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

Then restart Judge0 using the Makefile:

```bash
make clean-all
make dev-up
```
